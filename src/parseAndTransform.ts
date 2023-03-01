import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.visuals.ISelectionId;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;
import { getValue, getPlotFillColor, getColorSettings } from './objectEnumerationUtility';
import {
    ViewModel,
    DataPoint,
    FormatSettings,
    PlotSettings,
    PlotModel,
    TooltipDataPoint,
    XAxisData,
    YAxisData,
    PlotType,
    OverlayRectangle,
    OverlayType,
    GeneralPlotSettings,
    AxisInformation,
    AxisInformationInterface,
    TooltipModel,
    ZoomingSettings,
    LegendData,
    Legend,
    TooltipColumnData,
    RolloutRectangles,
    XAxisSettings,
    LegendDataPoint,
    Legends,
    LegendValue,
} from './plotInterface';
import { Primitive, scaleLinear, scaleTime } from 'd3';
import {
    AxisSettingsNames,
    PlotSettingsNames,
    Settings,
    ColorSettingsNames,
    OverlayPlotSettingsNames,
    PlotTitleSettingsNames,
    TooltipTitleSettingsNames,
    YRangeSettingsNames,
    ZoomingSettingsNames,
    LegendSettingsNames,
    AxisLabelSettingsNames,
    HeatmapSettingsNames,
    ArrayConstants,
    XAxisBreakSettingsNames,
    FilterType,
} from './constants';
import { Heatmapmargins, MarginSettings } from './marginSettings';
import { ok, err, Result } from 'neverthrow';
import {
    AxisError,
    AxisNullValuesError,
    GetAxisInformationError,
    OverlayDataError,
    NoDataColumnsError,
    ParseAndTransformError,
    PlotLegendError,
    SVGSizeError,
    NoDataError,
    XDataError,
} from './errors';

export class DataModel {
    xData: XAxisData;
    yData: YAxisData[];
    tooltipData: TooltipColumnData[];
    defectLegendData: LegendData;
    filterLegendData: LegendData[];
    overlayWidth: number[];
    overlayLength: number[];
    rolloutRectangles: Primitive[];
    rolloutName: string;
    legends: Legends;

    constructor(yCount: number, tooltipCount: number) {
        this.yData = new Array<YAxisData>(yCount);
        this.tooltipData = new Array<TooltipColumnData>(tooltipCount);
        this.filterLegendData = [];
        this.overlayLength = [];
        this.overlayWidth = [];
        this.rolloutRectangles = [];
        this.legends = new Legends();
    }
}

/**
 * Function that converts queried data into a viewmodel that will be used by the visual.
 *
 * @function
 * @param {VisualUpdateOptions} options - Contains references to the size of the container
 *                                        and the dataView which contains all the data
 *                                        the visual had queried.
 * @param {IVisualHost} host            - Contains references to the host which contains services
 */

function checkForData(categorical: powerbi.DataViewCategorical): Result<number, ParseAndTransformError> {
    //count numbers of x-axis and y-axis
    const yCategoriesCount =
        categorical.categories === undefined
            ? 0
            : categorical.categories.filter((cat) => {
                  return cat.source.roles.y_axis;
              }).length;
    const yValuesCount =
        categorical.values === undefined
            ? 0
            : categorical.values.filter((val) => {
                  return val.source.roles.y_axis;
              }).length;
    const yCount = yCategoriesCount + yValuesCount;
    const xCategoriesCount =
        categorical.categories === undefined
            ? 0
            : categorical.categories.filter((cat) => {
                  return cat.source.roles.x_axis;
              }).length;
    const xValuesCount =
        categorical.values === undefined
            ? 0
            : categorical.values.filter((val) => {
                  return val.source.roles.x_axis;
              }).length;
    const xCount = xCategoriesCount + xValuesCount;

    //check if input data count is ok
    if (yCount === 0) {
        return err(new NoDataColumnsError());
    }
    if (xCount === 0) {
        return err(new XDataError());
    }
    if (xCount !== 1) {
        return err(new AxisError());
    }
    if ((yCategoriesCount > 0 && categorical.categories[0].values.length === 0) || (yValuesCount > 0 && categorical.values[0].values.length === 0)) {
        return err(new NoDataError());
    }
    return ok(yCount);
}

// eslint-disable-next-line max-lines-per-function
export function visualTransform(options: VisualUpdateOptions, host: IVisualHost): Result<ViewModel, ParseAndTransformError> {
    let parseAndTransformError: ParseAndTransformError;
    const dataViews = options.dataViews;
    if (!dataViews || !dataViews[0] || !dataViews[0].categorical || !dataViews[0].metadata) {
        return err(new ParseAndTransformError('No categorical data in Axis or Values'));
    }
    const objects = dataViews[0].metadata.objects;
    const categorical = dataViews[0].categorical;
    const metadataColumns = dataViews[0].metadata.columns;
    const colorPalette: ISandboxExtendedColorPalette = host.colorPalette;
    let yCount;
    checkForData(categorical)
        .map((count) => (yCount = count))
        .mapErr((e) => (parseAndTransformError = e));
    if (parseAndTransformError) return err(parseAndTransformError);
    const tooltipCount = getTooltipCount(categorical);
    const dataModel = new DataModel(yCount, tooltipCount);

    getCategoricalData(categorical, dataModel);
    getMeasureData(categorical, dataModel, metadataColumns);
    let viewModel = new ViewModel();
    let xDataPoints: number[] | Date[] = [];
    let yDataPoints: number[] = [];
    let dataPoints: DataPoint[] = [];

    const nullValues = dataModel.xData.isDate
        ? (<Date[]>dataModel.xData.values).filter((x) => x === null || x === undefined)
        : (<number[]>dataModel.xData.values).filter((x) => x === null || x === undefined);
    if (nullValues.length > 0) {
        return err(new AxisNullValuesError(dataModel.xData.name));
    }
    const axisBreak = dataModel.xData.isDate ? false : <boolean>getValue(objects, Settings.xAxisBreakSettings, XAxisBreakSettingsNames.enable, false);
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

    if (dataModel.defectLegendData != null) {
        createDefectLegend(dataModel);
    }
    if (dataModel.filterLegendData.length > 0) {
        createFilterLegends(dataModel);
    }

    const formatSettings: FormatSettings[] = [];
    const plotTitles: string[] = [];
    const plotSettingsArray: PlotSettings[] = [];

    for (let plotNr = 0; plotNr < yCount; plotNr++) {
        const yAxis: YAxisData = dataModel.yData[plotNr];
        const yColumnId = dataModel.yData[plotNr].columnId;
        const yColumnObjects = getMetadataColumn(metadataColumns, yColumnId).objects;
        plotTitles.push(getValue<string>(yColumnObjects, Settings.plotTitleSettings, PlotTitleSettingsNames.title, yAxis.name));

        const xInformation: AxisInformation = AxisInformation[getValue<string>(yColumnObjects, Settings.axisSettings, AxisSettingsNames.xAxis, AxisInformation.None)];
        const yInformation: AxisInformation = AxisInformation[getValue<string>(yColumnObjects, Settings.axisSettings, AxisSettingsNames.yAxis, AxisInformation.Ticks)];
        let xAxisInformation: AxisInformationInterface, yAxisInformation: AxisInformationInterface;
        let axisInformationError: ParseAndTransformError;
        getAxisInformation(xInformation)
            .map((inf) => (xAxisInformation = inf))
            .mapErr((err) => (axisInformationError = err));
        getAxisInformation(yInformation)
            .map((inf) => (yAxisInformation = inf))
            .mapErr((err) => (axisInformationError = err));
        if (axisInformationError) {
            return err(axisInformationError);
        }
        formatSettings.push({
            axisSettings: {
                xAxis: xAxisInformation,
                yAxis: yAxisInformation,
            },
        });
        plotSettingsArray.push({
            fill: getPlotFillColor(yColumnObjects, colorPalette, ArrayConstants.colorArray[plotNr]),
            plotType: PlotType[getValue<string>(yColumnObjects, Settings.plotSettings, PlotSettingsNames.plotType, PlotType.LinePlot)],
            useLegendColor: getValue<boolean>(yColumnObjects, Settings.plotSettings, PlotSettingsNames.useLegendColor, false),
            showHeatmap: <boolean>getValue(yColumnObjects, Settings.plotSettings, PlotSettingsNames.showHeatmap, false),
        });
    }
    const plotTitlesCount = plotTitles.filter((x) => x.length > 0).length;
    const xLabelsCount = formatSettings.filter((x) => x.axisSettings.xAxis.lables && x.axisSettings.xAxis.ticks).length;
    const heatmapCount = plotSettingsArray.filter((x) => x.showHeatmap).length;

    const viewModelResult = createViewModel(options, dataModel, objects, colorPalette, plotTitlesCount, xLabelsCount, heatmapCount, indexMap, axisBreak, breakIndices).map(
        (vm) => (viewModel = vm)
    );
    if (viewModelResult.isErr()) {
        return viewModelResult.mapErr((err) => {
            return err;
        });
    }

    createTooltipModels(dataModel, viewModel, metadataColumns);
    createOverlayInformation(dataModel, viewModel).mapErr((err) => (parseAndTransformError = err));
    if (parseAndTransformError) {
        return err(parseAndTransformError);
    }

    let plotTop = MarginSettings.svgTopPadding + MarginSettings.margins.top;
    //create Plotmodels
    for (let plotNr = 0; plotNr < yCount; plotNr++) {
        //get x- and y-data for plotnumber
        const yAxis: YAxisData = dataModel.yData[plotNr];
        xDataPoints = dataModel.xData.values;
        yDataPoints = yAxis.values;
        const maxLengthAttributes = Math.max(xDataPoints.length, yDataPoints.length);
        dataPoints = [];
        const yColumnId = dataModel.yData[plotNr].columnId;
        const metaDataColumn = getMetadataColumn(metadataColumns, yColumnId);
        const yColumnObjects = metaDataColumn.objects;
        const plotSettings = plotSettingsArray[plotNr];
        //create datapoints
        for (let pointNr = 0; pointNr < maxLengthAttributes; pointNr++) {
            const selectionId: ISelectionId = host.createSelectionIdBuilder().withMeasure(xDataPoints[pointNr].toString()).createSelectionId();
            let color = plotSettings.fill;
            const xVal = xDataPoints[pointNr];
            if (plotSettings.useLegendColor) {
                const filtered = dataModel.legends.legends.filter((x) => x.type === FilterType.defectFilter);
                if (filtered.length === 1) {
                    const defectLegend = filtered[0];
                    const legendVal = defectLegend.legendDataPoints.find((x) => x.i === pointNr)?.yValue;
                    color = legendVal === undefined ? color : defectLegend.legendValues.find((x) => x.value === legendVal).color;
                } else {
                    viewModel.errors.push(new PlotLegendError(yAxis.name));
                }
            }

            //const color = legend.legendValues.fin legend.legendDataPoints[pointNr].yValue
            const dataPoint: DataPoint = {
                xValue: axisBreak ? indexMap.get(xVal) : xVal,
                yValue: yDataPoints[pointNr],
                identity: selectionId,
                selected: false,
                color: color,
                pointNr: pointNr,
                selectionId: host.createSelectionIdBuilder().withCategory(categorical.categories[0], pointNr).createSelectionId(),
            };

            dataPoints.push(dataPoint);
        }

        // dataPoints = dataPoints.sort((a: DataPoint, b: DataPoint) => {
        //     return <number>a.xValue - <number>b.xValue;
        // });

        const plotTitle = plotTitles[plotNr];
        plotTop = plotTitle.length > 0 ? plotTop + MarginSettings.plotTitleHeight : plotTop;

        const plotModel: PlotModel = {
            plotId: plotNr,
            formatSettings: formatSettings[plotNr],

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
        viewModel.plotModels[plotNr] = plotModel;
        const formatXAxis = plotModel.formatSettings.axisSettings.xAxis;
        plotTop = formatXAxis.lables && formatXAxis.ticks ? plotTop + MarginSettings.xLabelSpace : plotTop;
        plotTop += viewModel.generalPlotSettings.plotHeight + MarginSettings.margins.top + MarginSettings.margins.bottom;
        plotTop += plotModel.plotSettings.showHeatmap ? Heatmapmargins.heatmapSpace : 0;
    }
    if (dataModel.rolloutRectangles) {
        const rolloutY = viewModel.plotModels[0].plotTop;
        const rolloutHeight = viewModel.plotModels[viewModel.plotModels.length - 1].plotTop + viewModel.generalPlotSettings.plotHeight - rolloutY;
        viewModel.rolloutRectangles = new RolloutRectangles(
            axisBreak ? dataModel.xData.values.map((x) => indexMap.get(x)) : dataModel.xData.values,
            dataModel.rolloutRectangles,
            rolloutY,
            rolloutHeight,
            dataModel.rolloutName
        );
    }

    viewModel.generalPlotSettings.legendYPostion = plotTop + MarginSettings.legendTopMargin;
    return ok(viewModel);
}

function createFilterLegends(dataModel: DataModel) {
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

        dataModel.legends.legends.push(<Legend>{
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

function createDefectLegend(dataModel: DataModel) {
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
    dataModel.legends.legends.push(defectLegend);
}

function getCategoricalData(categorical: powerbi.DataViewCategorical, dataModel: DataModel) {
    if (categorical.categories !== undefined) {
        for (const category of categorical.categories) {
            const roles = category.source.roles;
            if (roles.x_axis) {
                if (category.source.type.dateTime) {
                    dataModel.xData = {
                        name: category.source.displayName,
                        values: <Date[]>category.values,
                        isDate: true,
                    };
                } else if (category.source.type.numeric) {
                    dataModel.xData = {
                        name: category.source.displayName,
                        values: <number[]>category.values,
                        isDate: false,
                    };
                }
            }
            if (roles.y_axis) {
                const yId = category.source['rolesIndex']['y_axis'][0];
                const yAxis: YAxisData = {
                    name: category.source.displayName,
                    values: <number[]>category.values,
                    columnId: category.source.index,
                };
                dataModel.yData[yId] = yAxis;
            }
            if (roles.overlayX) {
                dataModel.overlayLength = <number[]>category.values;
            }
            if (roles.overlayY) {
                dataModel.overlayWidth = <number[]>category.values;
            }
            if (roles.tooltip) {
                const columnId = category.source.index;
                const tooltipId = category.source['rolesIndex']['tooltip'][0];
                const data: TooltipColumnData = {
                    type: category.source.type,
                    name: category.source.displayName,
                    values: <number[]>category.values,
                    columnId,
                    metaDataColumn: category.source,
                };
                dataModel.tooltipData[tooltipId] = data;
            }
            if (roles.legend) {
                dataModel.defectLegendData = {
                    name: category.source.displayName,
                    values: category.values,
                    metaDataColumn: category.source,
                    type: FilterType.stringFilter,
                };
            }

            if (roles.filterLegend) {
                if (category.source.type.text || category.source.type.numeric) {
                    const type = category.source.type.text ? FilterType.stringFilter : FilterType.numberFilter;
                    dataModel.filterLegendData.push({
                        name: category.source.displayName,
                        values: category.values,
                        metaDataColumn: category.source,
                        type,
                    });
                }
            }
            if (roles.rollout) {
                dataModel.rolloutRectangles = category.values;
                dataModel.rolloutName = category.source.displayName;
            }
        }
    }
}

function getMeasureData(categorical: powerbi.DataViewCategorical, dataModel: DataModel, metadataColumns: powerbi.DataViewMetadataColumn[]) {
    if (categorical.values !== undefined) {
        for (const value of categorical.values) {
            const roles = value.source.roles;
            if (roles.x_axis) {
                if (value.source.type.dateTime) {
                    dataModel.xData = {
                        name: value.source.displayName,
                        values: <Date[]>value.values,
                        isDate: true,
                    };
                } else if (value.source.type.numeric) {
                    dataModel.xData = {
                        name: value.source.displayName,
                        values: <number[]>value.values,
                        isDate: false,
                    };
                }
            }
            if (roles.y_axis) {
                const yId = value.source['rolesIndex']['y_axis'][0];
                const yColumnObjects = getMetadataColumn(metadataColumns, value.source.index).objects;
                const useHighlights = getValue<boolean>(yColumnObjects, Settings.plotSettings, PlotSettingsNames.useLegendColor, false);
                const yAxis: YAxisData = {
                    name: value.source.displayName,
                    values: <number[]>(useHighlights && value.highlights ? value.highlights : value.values),
                    columnId: value.source.index,
                };
                dataModel.yData[yId] = yAxis;
            }
            if (roles.overlayX) {
                dataModel.overlayLength = <number[]>(value.highlights ? value.highlights : value.values);
            }
            if (roles.overlayY) {
                dataModel.overlayWidth = <number[]>(value.highlights ? value.highlights : value.values);
            }
            if (roles.tooltip) {
                const columnId = value.source.index;
                const tooltipId = value.source['rolesIndex']['tooltip'][0];
                const data: TooltipColumnData = {
                    type: value.source.type,
                    name: value.source.displayName,
                    values: <number[]>value.values,
                    columnId,
                    metaDataColumn: value.source,
                };
                dataModel.tooltipData[tooltipId] = data;
            }
            if (roles.legend) {
                dataModel.defectLegendData = {
                    name: value.source.displayName,
                    values: <string[]>value.values,
                    metaDataColumn: value.source,
                    type: FilterType.stringFilter,
                };
            }
            if (roles.filterLegend) {
                if (value.source.type.text || value.source.type.numeric) {
                    const type = value.source.type.text ? FilterType.stringFilter : FilterType.numberFilter;
                    dataModel.filterLegendData.push({
                        name: value.source.displayName,
                        values: value.values,
                        metaDataColumn: value.source,
                        type,
                    });
                }
            }

            if (roles.rollout) {
                dataModel.rolloutRectangles = <number[]>value.values;
                dataModel.rolloutName = value.source.displayName;
            }
        }
    }
}

function getTooltipCount(categorical: powerbi.DataViewCategorical) {
    const tooltipCategoriesCount =
        categorical.categories === undefined
            ? 0
            : categorical.categories.filter((cat) => {
                  return cat.source.roles.tooltip;
              }).length;
    const tooltipValuesCount =
        categorical.values === undefined
            ? 0
            : categorical.values.filter((val) => {
                  return val.source.roles.tooltip;
              }).length;
    const tooltipCount = tooltipCategoriesCount + tooltipValuesCount;
    return tooltipCount;
}

function getMetadataColumn(metadataColumns: powerbi.DataViewMetadataColumn[], yColumnId: number) {
    return metadataColumns.filter((x) => x.index === yColumnId)[0];
}

function createTooltipModels(dataModel: DataModel, viewModel: ViewModel, metadataColumns: powerbi.DataViewMetadataColumn[]): void {
    for (const tooltip of dataModel.tooltipData) {
        const column: powerbi.DataViewMetadataColumn = getMetadataColumn(metadataColumns, tooltip.columnId);
        const maxLengthAttributes: number = Math.min(dataModel.xData.values.length, tooltip.values.length);

        const tooltipPoints: TooltipDataPoint[] = <TooltipDataPoint[]>[];
        const type = tooltip.type;
        if (type.dateTime) {
            tooltip.values = tooltip.values.map((val) => {
                const d = new Date(<string>val);
                const formatedDate =
                    padTo2Digits(d.getDate()) +
                    '.' +
                    padTo2Digits(d.getMonth() + 1) +
                    '.' +
                    padTo2Digits(d.getFullYear()) +
                    ' ' +
                    padTo2Digits(d.getHours()) +
                    ':' +
                    padTo2Digits(d.getMinutes());
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
        viewModel.tooltipModels.push(tooltipModel);
    }
}

function createOverlayInformation(dataModel: DataModel, viewModel: ViewModel): Result<void, OverlayDataError> {
    if (dataModel.overlayLength.length == dataModel.overlayWidth.length && dataModel.overlayWidth.length > 0) {
        const xValues = dataModel.xData.values;
        let overlayRectangles: OverlayRectangle[] = new Array<OverlayRectangle>(dataModel.overlayLength.length);
        const xAxisSettings = viewModel.generalPlotSettings.xAxisSettings;
        let endX = null;
        for (let i = 0; i < dataModel.overlayLength.length; i++) {
            if (dataModel.overlayLength[i]) {
                if (viewModel.generalPlotSettings.xAxisSettings.isDate) {
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
        viewModel.overlayRectangles = overlayRectangles;
    }
    return ok(null);
}

// eslint-disable-next-line max-lines-per-function
function createViewModel(
    options: VisualUpdateOptions,
    dataModel: DataModel,
    objects: powerbi.DataViewObjects,
    colorPalette: ISandboxExtendedColorPalette,
    plotTitlesCount: number,
    xLabelsCount: number,
    heatmapCount: number,
    indexMap: Map<number | Date, number>,
    axisBreak: boolean,
    breakIndices: number[]
): Result<ViewModel, ParseAndTransformError> {
    const margins = MarginSettings;
    let svgHeight: number = options.viewport.height - margins.scrollbarSpace;
    let svgWidth: number = options.viewport.width - margins.scrollbarSpace;
    const legendHeight = dataModel.legends.legends.length > 0 ? margins.legendHeight : 0;
    if (svgHeight === undefined || svgWidth === undefined || !svgHeight || !svgWidth) {
        return err(new SVGSizeError());
    }
    let plotHeightSpace: number =
        (svgHeight -
            margins.svgTopPadding -
            margins.svgBottomPadding -
            legendHeight -
            margins.plotTitleHeight * plotTitlesCount -
            margins.xLabelSpace * xLabelsCount -
            Heatmapmargins.heatmapSpace * heatmapCount) /
        dataModel.yData.length;
    if (plotHeightSpace < margins.miniumumPlotHeight) {
        const plotSpaceDif = margins.miniumumPlotHeight - plotHeightSpace;
        plotHeightSpace = margins.miniumumPlotHeight;
        svgHeight = svgHeight + dataModel.yData.length * plotSpaceDif;
    }
    let plotWidth: number = svgWidth - margins.margins.left - margins.margins.right;
    if (plotWidth < margins.miniumumPlotWidth) {
        const widthDif = margins.miniumumPlotWidth - plotWidth;
        plotWidth = margins.miniumumPlotWidth;
        svgWidth = svgWidth + widthDif;
        // return err(new PlotSizeError('horizontal'));
    }
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
        showBreakLines: <boolean>getValue(objects, Settings.xAxisBreakSettings, XAxisBreakSettingsNames.showLines, true),
        xName: dataModel.xData.name,
        xRange: xRange,
        xScale,
        xScaleZoomed: xScale,
    };
    const generalPlotSettings: GeneralPlotSettings = {
        plotTitleHeight: margins.plotTitleHeight,
        dotMargin: margins.dotMargin,
        plotHeight: plotHeightSpace - margins.margins.top - margins.margins.bottom,
        plotWidth: plotWidth,
        legendHeight: legendHeight,
        xScalePadding: 0.1,
        solidOpacity: 1,
        transparentOpacity: 1,
        margins: margins.margins,
        legendYPostion: 0,
        fontSize: '10px',
        xAxisSettings: xAxisSettings,
    };

    const zoomingSettings: ZoomingSettings = SettingsGetter.getZoomingSettings(objects);

    const viewModel: ViewModel = <ViewModel>{
        plotModels: new Array<PlotModel>(dataModel.yData.length),
        colorSettings: {
            colorSettings: {
                verticalRulerColor: getColorSettings(objects, ColorSettingsNames.verticalRulerColor, colorPalette, '#000000'),
                overlayColor: getColorSettings(objects, ColorSettingsNames.overlayColor, colorPalette, '#000000'),
                yZeroLineColor: getColorSettings(objects, ColorSettingsNames.yZeroLineColor, colorPalette, '#CCCCCC'),
                heatmapColorScheme: <string>getValue(objects, Settings.colorSettings, ColorSettingsNames.heatmapColorScheme, 'interpolateBuGn'),
            },
        },
        heatmapSettings: { heatmapBins: getValue<number>(objects, Settings.heatmapSettings, HeatmapSettingsNames.heatmapBins, 100) },
        tooltipModels: [],
        generalPlotSettings: generalPlotSettings,
        overlayRectangles: [],
        svgHeight,
        svgTopPadding: margins.svgTopPadding,
        svgWidth: svgWidth,
        zoomingSettings: zoomingSettings,
        legends: dataModel.legends,
        errors: [],
    };
    return ok(viewModel);
}

function padTo2Digits(num) {
    return num.toString().padStart(2, '0');
}

function getAxisInformation(axisInformation: AxisInformation): Result<AxisInformationInterface, ParseAndTransformError> {
    switch (axisInformation) {
        case AxisInformation.None:
            return ok(<AxisInformationInterface>{
                lables: false,
                ticks: false,
            });
        case AxisInformation.Ticks:
            return ok(<AxisInformationInterface>{
                lables: false,
                ticks: true,
            });
        case AxisInformation.Labels:
            return ok(<AxisInformationInterface>{
                lables: true,
                ticks: false,
            });
        case AxisInformation.TicksLabels:
            return ok(<AxisInformationInterface>{
                lables: true,
                ticks: true,
            });
        default:
            return err(new GetAxisInformationError());
    }
    return err(new GetAxisInformationError());
}

export class SettingsGetter {
    public static getZoomingSettings(objects: powerbi.DataViewObjects) {
        return <ZoomingSettings>{
            enableZoom: <boolean>getValue(objects, Settings.zoomingSettings, ZoomingSettingsNames.show, true),
            maximumZoom: <number>getValue(objects, Settings.zoomingSettings, ZoomingSettingsNames.maximum, 30),
        };
    }
}
