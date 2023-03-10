import { Primitive } from 'd3-array';
import { err, ok, Result } from 'neverthrow';
import powerbi from 'powerbi-visuals-api';
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
import ISelectionId = powerbi.visuals.ISelectionId;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import { scaleLinear, scaleTime } from 'd3';
import {
    ColorSettings,
    DataPoint,
    GeneralPlotSettings,
    HeatmapSettings,
    Legend,
    LegendDataPoint,
    Legends,
    LegendValue,
    OverlayRectangle,
    OverlayType,
    PlotModel,
    RolloutRectangles,
    TooltipDataPoint,
    TooltipModel,
    XAxisSettings,
    YAxisData,
    ZoomingSettings,
} from './plotInterface';

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
            const legendSet = new Set<Primitive>(data.values.map((x) => (x !== null && x !== undefined ? x.toString() : x)));
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
                    title: plotTitle,
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
            overlayRectangles = overlayRectangles.filter((rect, i) => overlayRectangles.findIndex((r) => r.x === rect.x && r.endX === rect.endX) === i);
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
