import { scaleLinear, scaleTime } from 'd3';
import { Primitive } from 'd3-array';
import { BaseType } from 'd3-selection';
import { err, ok, Result } from 'neverthrow';
import powerbi from 'powerbi-visuals-api';
import { interactivitySelectionService } from 'powerbi-visuals-utils-interactivityutils';
import {
    ArrayConstants,
    AxisLabelSettingsNames,
    ColorSettingsNames,
    FilterType,
    HeatmapSettingsNames,
    LegendSettingsNames,
    OverlayPlotSettingsNames,
    Settings,
    TooltipTitleSettingsNames,
    XAxisBreakSettingsNames,
    YRangeSettingsNames,
    ZoomingSettingsNames,
} from './constants';
import { OverlayDataError, ParseAndTransformError, PlotLegendError, SVGSizeError } from './errors';
import { Heatmapmargins, MarginSettings } from './marginSettings';
import { getColorSettings, getValue } from './objectEnumerationUtility';
import { DataModel, getMetadataColumn } from './parseAndTransform';
import SelectableDataPoint = interactivitySelectionService.SelectableDataPoint;
import PrimitiveValue = powerbi.PrimitiveValue;
import ISelectionId = powerbi.visuals.ISelectionId;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
export class ViewModel {
    plotModels: PlotModel[];
    colorSettings: ColorSettings;
    overlayRectangles?: OverlayRectangle[];
    svgHeight: number;
    svgWidth: number;
    generalPlotSettings: GeneralPlotSettings;
    tooltipModels: TooltipModel[];
    zoomingSettings: ZoomingSettings;
    legends: Legends;
    heatmapSettings: HeatmapSettings;
    rolloutRectangles: RolloutRectangles;
    errors: ParseAndTransformError[];
    objects: powerbi.DataViewObjects;
    constructor(objects: powerbi.DataViewObjects) {
        this.errors = [];
        this.objects = objects;
        this.legends = new Legends();
        this.tooltipModels = [];
    }

    createLegends(dataModel: DataModel) {
        if (dataModel.defectLegendData != null) {
            this.createDefectLegend(dataModel);
        }
        if (dataModel.filterLegendData.length > 0) {
            this.createFilterLegends(dataModel);
        }
    }

    createFilterLegends(dataModel: DataModel) {
        for (let i = 0; i < dataModel.filterLegendData.length; i++) {
            const data = dataModel.filterLegendData[i];
            const legendSet = new Set(data.values.map((x) => (x !== null && x !== undefined ? x.toString() : x)));
            const defaultLegendName = data.metaDataColumn.displayName;

            if (legendSet.has(null)) {
                legendSet.delete(null);
            }
            if ((legendSet.size === 1 && legendSet.has('0')) || legendSet.has('1') || (legendSet.size === 2 && legendSet.has('0') && legendSet.has('1'))) {
                data.type = FilterType.booleanFilter;
            }
            const legendValues = Array.from(legendSet);

            this.legends.legends.push(<Legend>{
                legendDataPoints: data.values
                    .map(
                        (val, i) =>
                            <LegendDataPoint>{
                                yValue: val,
                                i: i,
                            }
                    )
                    .filter((x) => x.yValue !== null),
                legendValues: legendValues.map((val) => {
                    return <LegendValue>{
                        color: 'white',
                        value: val,
                    };
                }),
                legendTitle: <string>getValue(data.metaDataColumn.objects, Settings.legendSettings, LegendSettingsNames.legendTitle, defaultLegendName),
                legendXEndPosition: 0,
                legendXPosition: MarginSettings.margins.left,
                type: data.type,
                selectedValues: legendSet,
                metaDataColumn: data.metaDataColumn,
            });
        }
    }

    createDefectLegend(dataModel: DataModel) {
        const legendSet = new Set(dataModel.defectLegendData.values);
        if (legendSet.has(null)) {
            legendSet.delete(null);
        }
        const legendColors = ArrayConstants.legendColors;
        const legendValues = Array.from(legendSet);
        const defectLegend = <Legend>{
            legendDataPoints: dataModel.defectLegendData.values
                .map(
                    (val, i) =>
                        <LegendDataPoint>{
                            yValue: val,
                            i,
                        }
                )
                .filter((x) => x.yValue !== null),
            legendValues: [],
            legendTitle: <string>(
                getValue(
                    dataModel.defectLegendData.metaDataColumn.objects,
                    Settings.legendSettings,
                    LegendSettingsNames.legendTitle,
                    dataModel.defectLegendData.metaDataColumn.displayName
                )
            ),
            legendXEndPosition: 0,
            legendXPosition: MarginSettings.margins.left,
            type: FilterType.defectFilter,
            selectedValues: new Set(legendValues.concat(Object.keys(ArrayConstants.legendColors))),
            metaDataColumn: dataModel.defectLegendData.metaDataColumn,
        };
        for (let i = 0; i < legendValues.length; i++) {
            const val = legendValues[i] + '';
            const defaultColor = legendColors[val] ? legendColors[val] : 'FFFFFF';
            defectLegend.legendValues.push({
                color: defaultColor,
                value: val,
            });
        }
        this.legends.legends.push(defectLegend);
    }

    setSettings(dataModel: DataModel, options: VisualUpdateOptions) {
        const colorPalette = dataModel.host.colorPalette;
        this.zoomingSettings = <ZoomingSettings>{
            enableZoom: <boolean>getValue(this.objects, Settings.zoomingSettings, ZoomingSettingsNames.show, true),
            maximumZoom: <number>getValue(this.objects, Settings.zoomingSettings, ZoomingSettingsNames.maximum, 30),
        };
        this.colorSettings = {
            colorSettings: {
                verticalRulerColor: getColorSettings(this.objects, ColorSettingsNames.verticalRulerColor, colorPalette, '#000000'),
                overlayColor: getColorSettings(this.objects, ColorSettingsNames.overlayColor, colorPalette, '#000000'),
                yZeroLineColor: getColorSettings(this.objects, ColorSettingsNames.yZeroLineColor, colorPalette, '#CCCCCC'),
                heatmapColorScheme: <string>getValue(this.objects, Settings.colorSettings, ColorSettingsNames.heatmapColorScheme, 'interpolateBuGn'),
            },
        };
        this.heatmapSettings = { heatmapBins: getValue<number>(this.objects, Settings.heatmapSettings, HeatmapSettingsNames.heatmapBins, 100) };
        this.setGeneralPlotSettings(dataModel, options);
    }

    private setGeneralPlotSettings(dataModel: DataModel, options: VisualUpdateOptions) {
        this.svgHeight = options.viewport.height - MarginSettings.scrollbarSpace;
        this.svgWidth = options.viewport.width - MarginSettings.scrollbarSpace;
        const legendHeight = this.legends.legends.length > 0 ? MarginSettings.legendHeight : 0;
        if (this.svgHeight === undefined || this.svgWidth === undefined || !this.svgHeight || !this.svgWidth) {
            return err(new SVGSizeError());
        }

        const plotTitlesCount = dataModel.plotTitles.filter((x) => x.length > 0).length;
        const xLabelsCount = dataModel.formatSettings.filter((x) => x.axisSettings.xAxis.lables && x.axisSettings.xAxis.ticks).length;
        const heatmapCount = dataModel.plotSettingsArray.filter((x) => x.showHeatmap).length;
        let plotHeightSpace: number =
            (this.svgHeight -
                MarginSettings.svgTopPadding -
                MarginSettings.svgBottomPadding -
                legendHeight -
                MarginSettings.plotTitleHeight * plotTitlesCount -
                MarginSettings.xLabelSpace * xLabelsCount -
                Heatmapmargins.heatmapSpace * heatmapCount) /
            dataModel.yData.length;
        if (plotHeightSpace < MarginSettings.miniumumPlotHeight) {
            const plotSpaceDif = MarginSettings.miniumumPlotHeight - plotHeightSpace;
            plotHeightSpace = MarginSettings.miniumumPlotHeight;
            this.svgHeight = this.svgHeight + dataModel.yData.length * plotSpaceDif;
        }
        let plotWidth: number = this.svgWidth - MarginSettings.margins.left - MarginSettings.margins.right;
        if (plotWidth < MarginSettings.miniumumPlotWidth) {
            const widthDif = MarginSettings.miniumumPlotWidth - plotWidth;
            plotWidth = MarginSettings.miniumumPlotWidth;
            this.svgWidth = this.svgWidth + widthDif;
            // return err(new PlotSizeError('horizontal'));
        }

        const xAxisSettings = this.getXAxisSettings(dataModel, plotWidth);

        this.generalPlotSettings = {
            plotTitleHeight: MarginSettings.plotTitleHeight,
            dotMargin: MarginSettings.dotMargin,
            plotHeight: plotHeightSpace - MarginSettings.margins.top - MarginSettings.margins.bottom,
            plotWidth: plotWidth,
            legendHeight: legendHeight,
            xScalePadding: 0.1,
            solidOpacity: 1,
            transparentOpacity: 1,
            margins: MarginSettings.margins,
            legendYPostion: 0,
            fontSize: '10px',
            xAxisSettings: xAxisSettings,
        };
    }

    private padTo2Digits(num) {
        return num.toString().padStart(2, '0');
    }

    createPlotModels(dataModel: DataModel) {
        this.plotModels = new Array<PlotModel>(dataModel.yData.length);
        let plotTop = MarginSettings.svgTopPadding + MarginSettings.margins.top;
        //create Plotmodels
        for (let plotNr = 0; plotNr < dataModel.yData.length; plotNr++) {
            //get x- and y-data for plotnumber
            const yAxis: YAxisData = dataModel.yData[plotNr];
            const xDataPoints = dataModel.xData.values;
            const yDataPoints = yAxis.values;
            const maxLengthAttributes = Math.max(xDataPoints.length, yDataPoints.length);
            const dataPoints = [];
            const yColumnId = dataModel.yData[plotNr].columnId;
            const metaDataColumn = getMetadataColumn(dataModel.metadataColumns, yColumnId);
            const yColumnObjects = metaDataColumn.objects;
            const plotSettings = dataModel.plotSettingsArray[plotNr];
            //create datapoints
            for (let pointNr = 0; pointNr < maxLengthAttributes; pointNr++) {
                const selectionId: ISelectionId = dataModel.host.createSelectionIdBuilder().withMeasure(xDataPoints[pointNr].toString()).createSelectionId();
                let color = plotSettings.fill;
                const xVal = xDataPoints[pointNr];
                if (plotSettings.useLegendColor) {
                    const filtered = this.legends.legends.filter((x) => x.type === FilterType.defectFilter);
                    if (filtered.length === 1) {
                        const defectLegend = filtered[0];
                        const legendVal = defectLegend.legendDataPoints.find((x) => x.i === pointNr)?.yValue;
                        color = legendVal === undefined ? color : defectLegend.legendValues.find((x) => x.value === legendVal).color;
                    } else {
                        this.errors.push(new PlotLegendError(yAxis.name));
                    }
                }

                //const color = legend.legendValues.fin legend.legendDataPoints[pointNr].yValue
                const dataPoint: DataPoint = {
                    xValue: this.generalPlotSettings.xAxisSettings.axisBreak ? this.generalPlotSettings.xAxisSettings.indexMap.get(xVal) : xVal,
                    yValue: yDataPoints[pointNr],
                    identity: selectionId,
                    selected: false,
                    color: color,
                    pointNr: pointNr,
                    selectionId: dataModel.host.createSelectionIdBuilder().withCategory(dataModel.categorical.categories[0], pointNr).createSelectionId(),
                };

                dataPoints.push(dataPoint);
            }

            const plotTitle = dataModel.plotTitles[plotNr];
            plotTop = plotTitle.length > 0 ? plotTop + MarginSettings.plotTitleHeight : plotTop;

            const plotModel: PlotModel = {
                plotId: plotNr,
                formatSettings: dataModel.formatSettings[plotNr],

                yName: yAxis.name,
                labelNames: {
                    xLabel: getValue<string>(yColumnObjects, Settings.axisLabelSettings, AxisLabelSettingsNames.xLabel, dataModel.xData.name),
                    yLabel: getValue<string>(yColumnObjects, Settings.axisLabelSettings, AxisLabelSettingsNames.yLabel, yAxis.name),
                },
                plotTop: plotTop,
                plotSettings: plotSettings,
                plotTitleSettings: {
                    title: plotTitle, //getValue<string>(yColumnObjects, Settings.plotTitleSettings, PlotTitleSettingsNames.title, yAxis.name)
                },
                overlayPlotSettings: {
                    overlayPlotSettings: {
                        overlayType: OverlayType[getValue<string>(yColumnObjects, Settings.overlayPlotSettings, OverlayPlotSettingsNames.overlayType, OverlayType.None)],
                    },
                },
                yRange: {
                    min: getValue<number>(yColumnObjects, Settings.yRangeSettings, YRangeSettingsNames.min, 0),
                    max: getValue<number>(yColumnObjects, Settings.yRangeSettings, YRangeSettingsNames.max, Math.max(...yDataPoints)),
                    minFixed: <boolean>getValue(yColumnObjects, Settings.yRangeSettings, YRangeSettingsNames.minFixed, true),
                    maxFixed: <boolean>getValue(yColumnObjects, Settings.yRangeSettings, YRangeSettingsNames.maxFixed, false),
                },
                dataPoints: dataPoints,
                d3Plot: null,
                metaDataColumn: metaDataColumn,
            };
            plotModel.yRange.min = plotModel.yRange.minFixed ? plotModel.yRange.min : Math.min(...yDataPoints);
            plotModel.yRange.max = plotModel.yRange.maxFixed ? plotModel.yRange.max : Math.max(...yDataPoints);
            this.plotModels[plotNr] = plotModel;
            const formatXAxis = plotModel.formatSettings.axisSettings.xAxis;
            plotTop = formatXAxis.lables && formatXAxis.ticks ? plotTop + MarginSettings.xLabelSpace : plotTop;
            plotTop += this.generalPlotSettings.plotHeight + MarginSettings.margins.top + MarginSettings.margins.bottom;
            plotTop += plotModel.plotSettings.showHeatmap ? Heatmapmargins.heatmapSpace : 0;
        }
        if (dataModel.rolloutRectangles) {
            const rolloutY = this.plotModels[0].plotTop;
            const rolloutHeight = this.plotModels[this.plotModels.length - 1].plotTop + this.generalPlotSettings.plotHeight - rolloutY;
            this.rolloutRectangles = new RolloutRectangles(
                this.generalPlotSettings.xAxisSettings.axisBreak
                    ? dataModel.xData.values.map((x) => this.generalPlotSettings.xAxisSettings.indexMap.get(x))
                    : dataModel.xData.values,
                dataModel.rolloutRectangles,
                rolloutY,
                rolloutHeight,
                dataModel.rolloutName
            );
        }
        this.generalPlotSettings.legendYPostion = plotTop + MarginSettings.legendTopMargin;
    }

    createOverlayInformation(dataModel: DataModel): Result<void, OverlayDataError> {
        if (dataModel.overlayLength.length == dataModel.overlayWidth.length && dataModel.overlayWidth.length > 0) {
            const xValues = dataModel.xData.values;
            let overlayRectangles: OverlayRectangle[] = new Array<OverlayRectangle>(dataModel.overlayLength.length);
            const xAxisSettings = this.generalPlotSettings.xAxisSettings;
            let endX = null;
            for (let i = 0; i < dataModel.overlayLength.length; i++) {
                if (dataModel.overlayLength[i]) {
                    if (this.generalPlotSettings.xAxisSettings.isDate) {
                        const index = i + dataModel.overlayLength[i] < xValues.length ? i + dataModel.overlayLength[i] : xValues.length - 1;
                        endX = xAxisSettings.axisBreak ? xAxisSettings.indexMap.get(xValues[index]) : xValues[index];
                    } else {
                        endX = xAxisSettings.axisBreak ? xAxisSettings.indexMap.get(xValues[i]) + dataModel.overlayLength[i] : <number>xValues[i] + dataModel.overlayLength[i];
                    }
                } else {
                    endX = null;
                }
                overlayRectangles[i] = {
                    width: dataModel.overlayWidth[i],
                    endX: endX,
                    y: 0,
                    x: xAxisSettings.axisBreak ? xAxisSettings.indexMap.get(xValues[i]) : xValues[i],
                };
            }
            overlayRectangles = overlayRectangles.filter((x) => x.x != null && x.x >= 0 && x.width != null && x.width > 0);
            if (overlayRectangles.length == 0) {
                return err(new OverlayDataError());
            }
            this.overlayRectangles = overlayRectangles;
        }
        return ok(null);
    }
    createTooltipModels(dataModel: DataModel): void {
        for (const tooltip of dataModel.tooltipData) {
            const column: powerbi.DataViewMetadataColumn = getMetadataColumn(dataModel.metadataColumns, tooltip.columnId);
            const maxLengthAttributes: number = Math.min(dataModel.xData.values.length, tooltip.values.length);

            const tooltipPoints: TooltipDataPoint[] = <TooltipDataPoint[]>[];
            const type = tooltip.type;
            if (type.dateTime) {
                tooltip.values = tooltip.values.map((val) => {
                    const d = new Date(<string>val);
                    const formatedDate =
                        this.padTo2Digits(d.getDate()) +
                        '.' +
                        this.padTo2Digits(d.getMonth() + 1) +
                        '.' +
                        this.padTo2Digits(d.getFullYear()) +
                        ' ' +
                        this.padTo2Digits(d.getHours()) +
                        ':' +
                        this.padTo2Digits(d.getMinutes());
                    return formatedDate;
                });
            } else if (type.numeric && !type.integer) {
                tooltip.values = tooltip.values.map((val) => {
                    if (typeof val === 'number') {
                        return Number(val).toFixed(2);
                    }
                    return val;
                });
            }

            //create datapoints
            for (let pointNr = 0; pointNr < maxLengthAttributes; pointNr++) {
                const dataPoint: TooltipDataPoint = {
                    pointNr: pointNr,
                    yValue: tooltip.values[pointNr],
                };
                tooltipPoints.push(dataPoint);
            }
            const tooltipModel: TooltipModel = {
                tooltipName: getValue<string>(column.objects, Settings.tooltipTitleSettings, TooltipTitleSettingsNames.title, column.displayName),
                tooltipId: tooltip.columnId,
                tooltipData: tooltipPoints,
                metaDataColumn: tooltip.metaDataColumn,
            };
            this.tooltipModels.push(tooltipModel);
        }
    }

    private getXAxisSettings(dataModel: DataModel, plotWidth: number) {
        const axisBreak = dataModel.xData.isDate ? false : <boolean>getValue(this.objects, Settings.xAxisBreakSettings, XAxisBreakSettingsNames.enable, false);
        const uniqueXValues = Array.from(new Set<Date | number>(dataModel.xData.values));
        const indexMap = new Map(uniqueXValues.map((x, i) => [x, i]));
        const breakIndices = dataModel.xData.isDate
            ? []
            : uniqueXValues
                  .map((x: number, i, a: number[]) => {
                      return { i: i, gapSize: i < a.length ? a[i + 1] - x : 0 };
                  })
                  .filter((x) => x.gapSize > 1)
                  .map((x) => x.i + 0.5);

        const xRange = dataModel.xData.isDate
            ? {
                  min: Math.min(...(<number[]>dataModel.xData.values)),
                  max: Math.max(...(<number[]>dataModel.xData.values)),
              }
            : {
                  min: (<Date[]>dataModel.xData.values).reduce((a: Date, b: Date) => (a < b ? a : b)),
                  max: (<Date[]>dataModel.xData.values).reduce((a: Date, b: Date) => (a > b ? a : b)),
              };
        if (axisBreak) {
            xRange.min = indexMap.get(xRange.min);
            xRange.max = indexMap.get(xRange.max);
        }
        const xScale = dataModel.xData.isDate
            ? scaleTime().domain([xRange.min, xRange.max]).range([0, plotWidth])
            : scaleLinear().domain([xRange.min, xRange.max]).range([0, plotWidth]);
        const xAxisSettings = <XAxisSettings>{
            axisBreak,
            breakIndices,
            indexMap,
            showBreakLines: <boolean>getValue(this.objects, Settings.xAxisBreakSettings, XAxisBreakSettingsNames.showLines, true),
            xName: dataModel.xData.name,
            xRange: xRange,
            xScale,
            xScaleZoomed: xScale,
        };
        return xAxisSettings;
    }
}
// export class DefectIndices {

//     defectIndices: Map<string, number[]>;

//     constructor() {
//         this.defectIndices = new Map<string, number[]>()
//     }

//     getFilterArray(defects: string[]): number[] {
//         let arrays = [];
//         let filterArray = null;
//         for (const key of defects) {
//             if (this.defectIndices.has(key)) {
//                 arrays.push(this.defectIndices.get(key));
//             }
//         }
//         if (arrays.length === 0) return filterArray;
//         filterArray = arrays[0];
//         for (let i = 1; i < arrays.length; i++) {
//             const array = arrays[i];
//             filterArray = filterArray.map(function (n: number, idx: number) {
//                 return n + array[idx];
//             })
//         }
//         // let sortedList: SortedListItem[] = [];
//         // for (let i = 0; i < this.xValues.length; i++) {
//         //     sortedList.push({ x: this.xValues[i], defect: filterArray[i] });
//         // }
//         // sortedList = sortedList.sort((a, b) => {
//         //     return a.x - b.x;
//         // });
//         // return sortedList.map(x => x.defect);
//         return filterArray;
//     }
// }

// interface SortedListItem {
//     x: number;
//     defect: number;
// }

export class RolloutRectangles {
    rolloutRectangles: RolloutRectangle[];
    name: string;
    opacity: number;
    // uniqueValues: Primitive[];
    legendValues: LegendValue[];
    // colors: string[];

    constructor(xValues: number[] | Date[], rollout: Primitive[], y, width, rolloutName = 'Rollout', rolloutOpacity = 0.2) {
        this.name = rolloutName;
        this.rolloutRectangles = [];
        this.legendValues = [];
        this.opacity = rolloutOpacity;
        // const column = dataView.categorical.categories.filter((x) => x.source.roles.rollout)[0]
        //     ? dataView.categorical.categories.filter((x) => x.source.roles.rollout)[0]
        //     : dataView.categorical.values.filter((x) => x.source.roles.rollout)[0];
        const uniqueValues = Array.from(new Set(rollout)).sort().reverse();
        // let settings = null;
        // if (column && column.objects) {
        //     settings = column.objects
        //         .map((x, i) => {
        //             return { settings: x, i: i };
        //         })
        //         .filter((x) => x.settings)
        //         .map((x) => {
        //             return { val: column.values[x.i], settings: x.settings, i: x.i };
        //         });
        // }
        for (let i = 0; i < uniqueValues.length; i++) {
            const val = uniqueValues[i];
            // const settingsFiltered = settings && settings.filter((x) => x.val === val).length > 0 ? settings.filter((x) => x.val === val)[0] : null;
            // const selectionId = host
            //     .createSelectionIdBuilder()
            //     // .withMeasure('' + val)
            //     .withCategory(category, settingsFiltered ? settingsFiltered.i : rollout.findIndex((x) => x === val))
            //     .createSelectionId();
            //const color = settingsFiltered ? settingsFiltered.settings[Settings.rolloutSettings][RolloutSettingsNames.legendColor].solid.color : ArrayConstants.rolloutColors[i];
            const color = ArrayConstants.rolloutColors[<string>val] ? ArrayConstants.rolloutColors[<string>val] : ArrayConstants.colorArray[i];
            //getCategoricalObjectColor(column, i, Settings.rolloutSettings, RolloutSettingsNames.legendColor, ArrayConstants.rolloutColors[i]);

            this.legendValues.push({ value: val, color: color });
        }

        let rect = <RolloutRectangle>{
            y,
            width,
            x: xValues[0],
            color: this.getColor(rollout[0]),
        };

        // let lastX = xValues[0];
        let lastRollout = rollout[0];
        for (let i = 0; i < xValues.length; i++) {
            const x = xValues[i];
            const r = rollout[i];
            if (r != lastRollout) {
                lastRollout = r;
                rect.endX = x;
                //lastX = x;
                this.rolloutRectangles.push(rect);
                rect = <RolloutRectangle>{
                    y,
                    width,
                    x: xValues[i],
                    color: this.getColor(rollout[i]),
                };
            }
        }
        rect.endX = xValues[xValues.length - 1];
        this.rolloutRectangles.push(rect);
    }

    private getColor(rollout: Primitive): string {
        return this.legendValues.filter((x) => x.value === rollout)[0].color;
    }
}

export interface RolloutRectangle {
    width: number;
    endX: number | Date;
    x: number;
    y: number;
    color: string;
}

export interface GeneralPlotSettings {
    plotHeight: number;
    plotWidth: number;
    plotTitleHeight: number;
    fontSize: string;
    legendHeight: number;
    legendYPostion: number;
    dotMargin: number;
    xScalePadding: number;
    solidOpacity: number;
    transparentOpacity: number;
    margins: Margins;
    xAxisSettings: XAxisSettings;
}

export interface XAxisSettings {
    axisBreak: boolean;
    breakIndices: number[];
    indexMap: Map<number | Date, number>;
    showBreakLines: boolean;
    isDate: boolean;
    xName: string;
    xRange: {
        min: number;
        max: number;
    };
    xScale: d3.ScaleLinear<number, number, never> | d3.ScaleTime<number, number, never>;
    xScaleZoomed: d3.ScaleLinear<number, number, never> | d3.ScaleTime<number, number, never>;
}

export interface Margins {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface ZoomingSettings {
    enableZoom: boolean;
    maximumZoom: number;
}

export enum PlotType {
    //BarPlot = "BarPlot",
    ScatterPlot = 'ScatterPlot',
    LinePlot = 'LinePlot',
}

export enum OverlayType {
    Rectangle = 'Rectangle',
    Line = 'Line',
    None = 'None',
}

export enum AxisInformation {
    None = 'None',
    Labels = 'Labels',
    Ticks = 'Ticks',
    TicksLabels = 'TicksLabels',
}

export interface PlotModel {
    plotId: number;
    plotTop: number;
    yName: string;
    formatSettings: FormatSettings;
    labelNames: LabelNames;
    overlayPlotSettings: OverlayPlotSettings;
    plotSettings: PlotSettings;
    dataPoints: DataPoint[];
    plotTitleSettings: PlotTitleSettings;
    yRange: {
        min: number;
        max: number;
        maxFixed: boolean;
        minFixed: boolean;
    };
    d3Plot: D3Plot;
    metaDataColumn: powerbi.DataViewMetadataColumn;
}

export interface LabelNames {
    xLabel: string;
    yLabel: string;
}

export interface TooltipModel {
    tooltipId: number;
    tooltipName: string;
    tooltipData: TooltipDataPoint[];
    metaDataColumn: powerbi.DataViewMetadataColumn;
}

export interface PlotTitleSettings {
    title: string;
}

export interface OverlayRectangle {
    width: number;
    endX: number;
    x: number | Date;
    y: number;
}

export interface TooltipData {
    yValue: PrimitiveValue;
    title: string;
}

export interface TooltipDataPoint {
    pointNr: PrimitiveValue;
    yValue: PrimitiveValue;
}

export interface LegendDataPoint {
    yValue: PrimitiveValue;
    i: number;
}

export interface LegendValue {
    color?: string;
    value: PrimitiveValue;
    // selectionId: ISelectionId;
}

export interface Legend {
    legendDataPoints: LegendDataPoint[];
    legendValues: LegendValue[];
    legendTitle: string;
    legendXEndPosition: number;
    legendXPosition: number;
    type: FilterType;
    selectedValues: Set<Primitive>;
    metaDataColumn: powerbi.DataViewMetadataColumn;
}

export interface DataPoint extends SelectableDataPoint {
    xValue: PrimitiveValue;
    yValue: PrimitiveValue;
    color?: string;
    highlight?: boolean;
    opacity?: number;
    pointNr: number;
    selectionId: ISelectionId;
}

export interface FormatSettings {
    axisSettings: {
        xAxis: AxisInformationInterface;
        yAxis: AxisInformationInterface;
    };
}

export interface AxisInformationInterface {
    lables: boolean;
    ticks: boolean;
}

export interface ColorSettings {
    colorSettings: {
        verticalRulerColor: string;
        overlayColor: string;
        heatmapColorScheme: string;
        yZeroLineColor: string;
    };
}
export interface HeatmapSettings {
    heatmapBins: number;
}

export interface PlotSettings {
    fill: string;
    plotType: PlotType;
    useLegendColor: boolean;
    showHeatmap: boolean;
}

export interface OverlayPlotSettings {
    overlayPlotSettings: {
        overlayType: OverlayType;
    };
}

export class Legends {
    legends: Legend[];

    // type: FilterType;
    // values: Primitive[];
    // name: string;
    // uniqueValues: Primitive[];

    constructor() {
        this.legends = [];
        //type: FilterType, values: Primitive[], name: string
        // this.type = type;
        // this.values = values;
        // this.name = name;
        // this.uniqueValues = Array.from(new Set(values));
    }
    drawDataPoint(i: number): boolean {
        let draw = true;
        for (const l of this.legends) {
            const filtered = l.legendDataPoints.filter((x) => x.i === i);
            if (filtered.length === 0) {
                draw = false;
            } else {
                draw = draw && l.selectedValues.has(filtered[0].yValue.toString());
            }
        }
        return draw;
    }
    setDeselectedValues(deselected: Set<Primitive>) {
        if (deselected.size === 0) return;
        for (const l of this.legends) {
            for (const val of Array.from(l.selectedValues).filter((x) => deselected.has(x))) {
                l.selectedValues.delete(val);
            }
        }
    }
}

// export interface Legend {
//     text: string;
//     transform?: string;
//     dx?: string;
//     dy?: string;
// }

export interface XAxisData {
    values: number[] | Date[];
    name?: string;
    isDate: boolean;
}

export interface YAxisData {
    values: number[];
    name?: string;
    columnId: number;
}

export interface TooltipColumnData {
    type: powerbi.ValueTypeDescriptor;
    values: PrimitiveValue[];
    name?: string;
    columnId: number;
    metaDataColumn: powerbi.DataViewMetadataColumn;
}

export interface LegendData {
    values: Primitive[];
    name?: string;
    type: FilterType;
    metaDataColumn: powerbi.DataViewMetadataColumn;
}
export type D3Selection = d3.Selection<SVGGElement, unknown, BaseType, unknown>;

export interface D3Plot {
    yName: string;
    type: string;
    points: d3.Selection<SVGCircleElement, DataPoint, SVGGElement, unknown>;
    plotLine: d3.Selection<SVGPathElement, DataPoint[], BaseType, unknown>;
    root: D3Selection;
    y: D3PlotYAxis;
    x: D3PlotXAxis;
    heatmap: D3Heatmap;
    yZeroLine: D3Selection;
}

export interface D3PlotXAxis {
    xAxis: D3Selection;
    xAxisValue: d3.Axis<d3.NumberValue>;
    xLabel: D3Selection;
}

export interface D3Heatmap {
    scale: d3.ScaleLinear<number, number, never>;
    values: d3.Selection<SVGRectElement, number, SVGGElement, unknown>;
}

export interface D3PlotYAxis {
    yAxis: D3Selection;
    yAxisValue: d3.Axis<d3.NumberValue>;
    yScale: d3.ScaleLinear<number, number, never>;
    yScaleZoomed: d3.ScaleLinear<number, number, never>;
    yLabel: D3Selection;
}

export interface TooltipInterface {
    mouseover: () => void;
    mousemove: (event: PointerEvent, data: DataPoint) => void;
    mouseout: () => void;
}
