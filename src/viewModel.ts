import { Primitive } from 'd3-array';
import { err, ok, Result } from 'neverthrow';
import powerbi from 'powerbi-visuals-api';
import {
    ArrayConstants,
    ColorSettingsNames,
    FilterType,
    GeneralSettingsNames,
    LegendSettingsNames,
    Settings,
    TooltipTitleSettingsNames,
    XAxisBreakSettingsNames,
    ZoomingSettingsNames,
} from './constants';
import { JSONParsingError, OverlayDataError, ParseAndTransformError, PlotLegendError, SVGSizeError } from './errors';
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
    Legend,
    LegendDataPoint,
    Legends,
    LegendValue,
    OverlayRectangle,
    PlotModel,
    VisualOverlayRectangles,
    TooltipDataPoint,
    TooltipModel,
    XAxisSettings,
    YAxisData,
    ZoomingSettings,
} from './plotInterface';

export class ViewModel {
    plotModels: PlotModel[];
    colorSettings: ColorSettings;
    plotOverlayRectangles?: OverlayRectangle[];
    svgHeight: number;
    svgWidth: number;
    generalPlotSettings: GeneralPlotSettings;
    tooltipModels: TooltipModel[];
    zoomingSettings: ZoomingSettings;
    legends: Legends;
    visualOverlayRectangles: VisualOverlayRectangles;
    errors: ParseAndTransformError[];
    objects: powerbi.DataViewObjects;
    constructor(objects: powerbi.DataViewObjects) {
        this.errors = [];
        this.objects = objects;
        this.legends = new Legends();
        this.tooltipModels = [];
    }

    createLegends(dataModel: DataModel) {
        if (dataModel.categoricalLegendData != null) {
            this.createCategoricalLegend(dataModel);
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
            if ((legendSet.size === 1 && (legendSet.has('0') || legendSet.has('1'))) || (legendSet.size === 2 && legendSet.has('0') && legendSet.has('1'))) {
                data.type = FilterType.booleanFilter;
            }
            const legendValues = Array.from(legendSet).sort();

            this.legends.legends.push(<Legend>{
                legendDataPoints: data.values
                    .map(
                        (val, i) =>
                            <LegendDataPoint>{
                                yValue: val,
                                i: i,
                            }
                    )
                    .filter((x) => x.yValue !== null && x.yValue !== ''),
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

    createCategoricalLegend(dataModel: DataModel) {
        const legendSet = new Set(dataModel.categoricalLegendData.values.map((x) => (x ? x.toString() : null)));
        legendSet.delete(null);
        legendSet.delete('');
        let legendColors = {};
        try {
            legendColors = JSON.parse(this.colorSettings.colorSettings.categoricalLegendColors);
        } catch (error) {
            this.errors.push(new JSONParsingError(error.message));
        }
        //ArrayConstants.legendColors;
        const randomColors = ArrayConstants.colorArray;
        const legendValues = Array.from(legendSet).sort();
        const categoricalLegend = <Legend>{
            legendDataPoints: dataModel.categoricalLegendData.values
                .map(
                    (val, i) =>
                        <LegendDataPoint>{
                            yValue: val,
                            i,
                        }
                )
                .filter((x) => x.yValue !== null && x.yValue !== ''),
            legendValues: [],
            legendTitle: <string>(
                getValue(
                    dataModel.categoricalLegendData.metaDataColumn.objects,
                    Settings.legendSettings,
                    LegendSettingsNames.legendTitle,
                    dataModel.categoricalLegendData.metaDataColumn.displayName
                )
            ),
            legendXEndPosition: 0,
            legendXPosition: MarginSettings.margins.left,
            type: FilterType.colorFilter,
            selectedValues: new Set(legendValues.concat(Object.keys(ArrayConstants.legendColors))),
            metaDataColumn: dataModel.categoricalLegendData.metaDataColumn,
        };
        for (let i = 0; i < legendValues.length; i++) {
            const val = legendValues[i] + '';
            const defaultColor = legendColors[val] ? legendColors[val] : randomColors[i];
            categoricalLegend.legendValues.push({
                color: defaultColor,
                value: val,
            });
        }
        this.legends.legends.push(categoricalLegend);
    }

    setSettings(dataModel: DataModel) {
        const colorPalette = dataModel.host.colorPalette;
        this.zoomingSettings = <ZoomingSettings>{
            enableZoom: <boolean>getValue(this.objects, Settings.zoomingSettings, ZoomingSettingsNames.show, true),
            maximumZoom: <number>getValue(this.objects, Settings.zoomingSettings, ZoomingSettingsNames.maximum, 30),
            saveZoomState: <boolean>getValue(this.objects, Settings.zoomingSettings, ZoomingSettingsNames.saveZoomState, false),
        };
        this.colorSettings = {
            colorSettings: {
                breakLineColor: getColorSettings(this.objects, ColorSettingsNames.breakLineColor, colorPalette, '#cccccc'),
                verticalRulerColor: getColorSettings(this.objects, ColorSettingsNames.verticalRulerColor, colorPalette, '#000000'),
                overlayColor: getColorSettings(this.objects, ColorSettingsNames.overlayColor, colorPalette, '#000000'),
                yZeroLineColor: getColorSettings(this.objects, ColorSettingsNames.yZeroLineColor, colorPalette, '#CCCCCC'),
                categoricalLegendColors: <string>getValue(this.objects, Settings.colorSettings, ColorSettingsNames.categoricalLegendColors, '{ "color": "#000000" }'),
                visualBackgroundColors: <string>getValue(this.objects, Settings.colorSettings, ColorSettingsNames.visualBackgroundColors, '{ "color": "#000000" }'),
                heatmapColorScheme: <string>getValue(this.objects, Settings.colorSettings, ColorSettingsNames.heatmapColorScheme, 'interpolateBuGn'),
            },
        };
    }

    setGeneralPlotSettings(dataModel: DataModel, options: VisualUpdateOptions) {
        this.svgHeight = options.viewport.height - MarginSettings.scrollbarSpace;
        this.svgWidth = options.viewport.width - MarginSettings.scrollbarSpace;
        const legendHeight = this.legends.legends.length > 0 ? MarginSettings.legendHeight : 0;
        const minPlotHeight = getValue<number>(this.objects, Settings.generalSettings, GeneralSettingsNames.minPlotHeight, 40);
        if (this.svgHeight === undefined || this.svgWidth === undefined || !this.svgHeight || !this.svgWidth) {
            return err(new SVGSizeError());
        }

        const plotTitlesCount = dataModel.plotSettingsArray.filter((x) => x.plotTitle.length > 0).length;
        const xLabelsCount = dataModel.plotSettingsArray.filter((x) => x.xAxis.labels && x.xAxis.ticks).length;
        const heatmapCount = dataModel.plotSettingsArray.filter((x) => x.showHeatmap).length;
        const plotHeightFactorSum = dataModel.plotSettingsArray.map((x) => x.plotHeightFactor).reduce((a, b) => a + b);
        const plotCount = dataModel.plotSettingsArray.length;
        let plotHeightSpace: number =
            (this.svgHeight -
                MarginSettings.svgTopPadding -
                MarginSettings.svgBottomPadding -
                legendHeight -
                MarginSettings.plotTitleHeight * plotTitlesCount -
                MarginSettings.xLabelSpace * xLabelsCount -
                Heatmapmargins.heatmapSpace * heatmapCount -
                (MarginSettings.margins.top + MarginSettings.margins.bottom) * plotCount) /
            plotHeightFactorSum;
        if (plotHeightSpace < minPlotHeight) {
            const plotSpaceDif = minPlotHeight - plotHeightSpace;
            plotHeightSpace = minPlotHeight;
            this.svgHeight = this.svgHeight + plotHeightFactorSum * plotSpaceDif;
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
            plotHeight: plotHeightSpace,
            plotWidth: plotWidth,
            legendHeight: legendHeight,
            xScalePadding: 0.1,
            solidOpacity: 1,
            transparentOpacity: 1,
            margins: MarginSettings.margins,
            legendYPostion: 0,
            fontSize: '10px',
            xAxisSettings: xAxisSettings,
            tooltipPrecision: getValue<number>(this.objects, Settings.generalSettings, GeneralSettingsNames.tooltipPrecision, 2),
            heatmapBins: getValue<number>(this.objects, Settings.generalSettings, GeneralSettingsNames.heatmapBins, 100),
            minPlotHeight: minPlotHeight,
            showYZeroLine: getValue<boolean>(this.objects, Settings.generalSettings, GeneralSettingsNames.showYZeroLine, true),
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
            const plotSettings = dataModel.plotSettingsArray[plotNr];
            //create datapoints
            for (let pointNr = 0; pointNr < maxLengthAttributes; pointNr++) {
                const selectionId: ISelectionId =
                    dataModel.categorical.categories && dataModel.categorical.categories.length > 0
                        ? dataModel.host.createSelectionIdBuilder().withCategory(dataModel.categorical.categories[0], pointNr).createSelectionId()
                        : dataModel.host
                              .createSelectionIdBuilder()
                              .withMeasure(dataModel.categorical.values.filter((x) => x.source.roles['x_axis'])[0].source.queryName)
                              .createSelectionId();
                if (!yDataPoints[pointNr]) continue;
                let color = plotSettings.fill;
                const xVal = xDataPoints[pointNr];
                if (plotSettings.useLegendColor) {
                    const filtered = this.legends.legends.filter((x) => x.type === FilterType.colorFilter);
                    if (filtered.length === 1) {
                        const categoricalLegend = filtered[0];
                        const dataPointLegendValue = categoricalLegend.legendDataPoints.find((x) => x.i === pointNr)?.yValue;
                        const legendValue = categoricalLegend.legendValues.find((x) => dataPointLegendValue && x.value === dataPointLegendValue.toString());
                        if (dataPointLegendValue && legendValue) color = legendValue.color;
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
                    selectionId: selectionId,
                };

                dataPoints.push(dataPoint);
            }

            plotTop = plotSettings.plotTitle.length > 0 ? plotTop + MarginSettings.plotTitleHeight : plotTop;
            const plotModel: PlotModel = {
                plotId: plotNr,
                yName: yAxis.name,
                plotTop: plotTop,
                plotSettings: plotSettings,
                dataPoints: dataPoints,
                d3Plot: null,
                metaDataColumn: metaDataColumn,
                plotHeight: plotSettings.plotHeightFactor * this.generalPlotSettings.plotHeight,
            };
            plotModel.plotSettings.yRange.min = plotModel.plotSettings.yRange.minFixed ? plotModel.plotSettings.yRange.min : Math.min(...yDataPoints);
            plotModel.plotSettings.yRange.max = plotModel.plotSettings.yRange.maxFixed ? plotModel.plotSettings.yRange.max : Math.max(...yDataPoints);
            this.plotModels[plotNr] = plotModel;
            const formatXAxis = plotModel.plotSettings.xAxis;
            plotTop = formatXAxis.labels && formatXAxis.ticks ? plotTop + MarginSettings.xLabelSpace : plotTop;
            plotTop += plotModel.plotHeight + MarginSettings.margins.top + MarginSettings.margins.bottom;
            plotTop += plotModel.plotSettings.showHeatmap ? Heatmapmargins.heatmapSpace : 0;
        }

        this.generalPlotSettings.legendYPostion = plotTop + MarginSettings.legendTopMargin;
    }

    createVisualOverlayRectangles(dataModel: DataModel) {
        if (dataModel.visualOverlayRectangles.length > 0) {
            const visualOverlayYPos = this.plotModels[0].plotTop;
            const visualOverlayHeight = this.plotModels[this.plotModels.length - 1].plotTop + this.generalPlotSettings.plotHeight - visualOverlayYPos;
            this.visualOverlayRectangles = new VisualOverlayRectangles(
                this.generalPlotSettings.xAxisSettings.axisBreak
                    ? dataModel.xData.values.map((x) => this.generalPlotSettings.xAxisSettings.indexMap.get(x))
                    : dataModel.xData.values,
                dataModel.visualOverlayRectangles,
                visualOverlayYPos,
                visualOverlayHeight,
                dataModel.visualOverlayMetadataColumn
            );
        }
    }

    createPlotOverlayInformation(dataModel: DataModel): Result<void, OverlayDataError> {
        if (dataModel.overlayLength.length == dataModel.overlayWidth.length && dataModel.overlayWidth.length > 0) {
            const xValues = dataModel.xData.values;
            let overlayRectangles: OverlayRectangle[] = new Array<OverlayRectangle>(dataModel.overlayLength.length);
            const xAxisSettings = this.generalPlotSettings.xAxisSettings;
            let endX = null;
            let y = 0;
            for (let i = 0; i < dataModel.overlayLength.length; i++) {
                if (dataModel.overlayLength[i]) {
                    if (this.generalPlotSettings.xAxisSettings.isDate) {
                        const index = i + dataModel.overlayLength[i] < xValues.length ? i + dataModel.overlayLength[i] : xValues.length - 1;
                        endX = xAxisSettings.axisBreak ? xAxisSettings.indexMap.get(xValues[index]) : xValues[index];
                    } else {
                        endX = xAxisSettings.axisBreak ? xAxisSettings.indexMap.get(xValues[i]) + dataModel.overlayLength[i] : <number>xValues[i] + dataModel.overlayLength[i];
                    }
                    y = dataModel.overlayY && dataModel.overlayY[i] ? dataModel.overlayY[i] : 0;
                } else {
                    endX = null;
                }
                overlayRectangles[i] = {
                    width: dataModel.overlayWidth[i],
                    endX: endX,
                    y: y,
                    x: xAxisSettings.axisBreak ? xAxisSettings.indexMap.get(xValues[i]) : xValues[i],
                };
            }
            overlayRectangles = overlayRectangles.filter((x) =>
                x.x != null && dataModel.xData.isDate ? (<Date>x.x).getMilliseconds() >= 0 : <number>x.x >= 0 && x.width != null && x.width > 0
            );
            if (overlayRectangles.length == 0) {
                return err(new OverlayDataError());
            }
            overlayRectangles = overlayRectangles.filter((rect, i) => overlayRectangles.findIndex((r) => r.x === rect.x && r.endX === rect.endX) === i);
            this.plotOverlayRectangles = overlayRectangles;
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
                        return Number(val).toFixed(this.generalPlotSettings.tooltipPrecision);
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
        const axisBreak = <boolean>getValue(this.objects, Settings.xAxisBreakSettings, XAxisBreakSettingsNames.enable, false);
        const breakGapSize = <number>getValue(this.objects, Settings.xAxisBreakSettings, XAxisBreakSettingsNames.breakGapSize, 1);
        const uniqueXValues = Array.from(new Set<Date | number>(dataModel.xData.values));
        const indexMap = new Map(uniqueXValues.map((x, i) => [x, i]));
        const breakIndices = dataModel.xData.isDate
            ? uniqueXValues
                  .map((x: Date, i, a: Date[]) => {
                      return { i: i, gapSize: i < a.length - 1 ? a[i + 1].getTime() - x.getTime() : 0, x };
                  })
                  .filter((x) => x.gapSize > breakGapSize * 1000)
                  .map((x) => (axisBreak ? x.i + 0.5 : new Date(x.x.getTime() + x.gapSize / 2)))
            : uniqueXValues
                  .map((x: number, i, a: number[]) => {
                      return { i: i, gapSize: i < a.length - 1 ? a[i + 1] - x : 0, x };
                  })
                  .filter((x) => x.gapSize > breakGapSize)
                  .map((x) => (axisBreak ? x.i + 0.5 : x.x + x.gapSize / 2));

        const xRange = dataModel.xData.isDate
            ? {
                  min: (<Date[]>dataModel.xData.values).reduce((a: Date, b: Date) => (a < b ? a : b)),
                  max: (<Date[]>dataModel.xData.values).reduce((a: Date, b: Date) => (a > b ? a : b)),
              }
            : {
                  min: Math.min(...(<number[]>dataModel.xData.values)),
                  max: Math.max(...(<number[]>dataModel.xData.values)),
              };
        if (axisBreak) {
            xRange.min = indexMap.get(xRange.min);
            xRange.max = indexMap.get(xRange.max);
        }
        const xScale =
            dataModel.xData.isDate && !axisBreak
                ? scaleTime().domain([xRange.min, xRange.max]).range([0, plotWidth])
                : scaleLinear().domain([xRange.min, xRange.max]).range([0, plotWidth]);

        const xAxisSettings = <XAxisSettings>{
            axisBreak,
            breakIndices,
            breakGapSize,
            indexMap,
            isDate: dataModel.xData.isDate,
            showBreakLines: <boolean>getValue(this.objects, Settings.xAxisBreakSettings, XAxisBreakSettingsNames.showLines, false),
            xName: dataModel.xData.name,
            xRange: xRange,
            xScale,
            xScaleZoomed: xScale,
        };
        return xAxisSettings;
    }
}
