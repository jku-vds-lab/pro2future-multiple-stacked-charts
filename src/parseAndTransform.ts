import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.visuals.ISelectionId;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;
import { getValue, getColumnnColorByIndex, getAxisTextFillColor, getPlotFillColor, getColorSettings, getCategoricalObjectColor } from './objectEnumerationUtility';
import { ViewModel, DataPoint, FormatSettings, PlotSettings, PlotModel, TooltipDataPoint, XAxisData, YAxisData, PlotType, OverlayRectangle, OverlayType, GeneralPlotSettings, Margins, AxisInformation, AxisInformationInterface, TooltipModel, ZoomingSettings, LegendData, Legend, LegendValue, TooltipData, TooltipColumnData, RolloutRectangles, XAxisSettings, LegendDataPoint } from './plotInterface';
import { Color, scaleLinear, stratify } from 'd3';
import { AxisSettingsNames, PlotSettingsNames, Settings, ColorSettingsNames, OverlayPlotSettingsNames, PlotTitleSettingsNames, TooltipTitleSettingsNames, YRangeSettingsNames, ZoomingSettingsNames, LegendSettingsNames, AxisLabelSettingsNames, HeatmapSettingsNames, ArrayConstants } from './constants';
import { Heatmapmargins, MarginSettings } from './marginSettings'
import { ok, err, Result } from 'neverthrow'
import { AxisError, AxisNullValuesError, GetAxisInformationError, OverlayDataError, NoDataColumnsError, ParseAndTransformError, PlotLegendError, PlotSizeError, SVGSizeError, NoDataError, XDataError } from './errors'
import { isString } from 'vega';



/**
 * Function that converts queried data into a viewmodel that will be used by the visual.
 *
 * @function
 * @param {VisualUpdateOptions} options - Contains references to the size of the container
 *                                        and the dataView which contains all the data
 *                                        the visual had queried.
 * @param {IVisualHost} host            - Contains references to the host which contains services
 */

export function visualTransform(options: VisualUpdateOptions, host: IVisualHost): Result<ViewModel, ParseAndTransformError> {

    // try {
    let parseAndTransformError: ParseAndTransformError;
    const dataViews = options.dataViews;
    if (!dataViews || !dataViews[0] || !dataViews[0].categorical || !dataViews[0].metadata) {
        return err(new ParseAndTransformError("No categorical data in Axis or Values"));
    };
    const objects = dataViews[0].metadata.objects;
    const categorical = dataViews[0].categorical;
    const metadataColumns = dataViews[0].metadata.columns;
    const colorPalette: ISandboxExtendedColorPalette = host.colorPalette;

    //count numbers of x-axis, y-axis and tooltipdata
    const yCategoriesCount = categorical.categories === undefined ? 0 : categorical.categories.filter(cat => { return cat.source.roles.y_axis }).length;
    const yValuesCount = categorical.values === undefined ? 0 : categorical.values.filter(val => { return val.source.roles.y_axis }).length;
    const yCount = yCategoriesCount + yValuesCount;
    const xCategoriesCount = categorical.categories === undefined ? 0 : categorical.categories.filter(cat => { return cat.source.roles.x_axis }).length;
    const xValuesCount = categorical.values === undefined ? 0 : categorical.values.filter(val => { return val.source.roles.x_axis }).length;
    const xCount = xCategoriesCount + xValuesCount;
    const tooltipCategoriesCount = categorical.categories === undefined ? 0 : categorical.categories.filter(cat => { return cat.source.roles.tooltip }).length;
    const tooltipValuesCount = categorical.values === undefined ? 0 : categorical.values.filter(val => { return val.source.roles.tooltip }).length;
    const tooltipCount = tooltipCategoriesCount + tooltipValuesCount;
    const sharedXAxis = xCount == 1;


    //check if input data count is ok
    if (yCount === 0) {
        return err(new NoDataColumnsError());
    }
    if (xCount === 0) {
        return err(new XDataError());
    }
    if (xCount !== yCount && !sharedXAxis) {
        return err(new AxisError());
    }
    if (yCategoriesCount > 0 && categorical.categories[0].values.length === 0 || yValuesCount > 0 && categorical.values[0].values.length === 0) {
        return err(new NoDataError());
    }

    let xData: XAxisData;
    let yData = new Array<YAxisData>(yCount);
    let tooltipData = new Array<TooltipColumnData>(tooltipCount);
    let legendData: LegendData = null;
    let defectGroupLegendData: LegendData = null;
    // let defectIndices: DefectIndices = new DefectIndices();


    let xDataPoints: number[] = [];
    let yDataPoints: number[] = [];
    let dataPoints: DataPoint[] = [];
    let overlayWidth: number[] = [];
    let overlayLength: number[] = [];
    let defectLegend: Legend = null;
    let defectGroupLegend: Legend = null;
    let rolloutRectangles: number[];
    let rolloutName: string;


    //aquire all categorical values
    if (categorical.categories !== undefined) {
        for (let category of categorical.categories) {
            const roles = category.source.roles;
            if (roles.x_axis) {
                xData = {
                    name: category.source.displayName,
                    values: <number[]>category.values
                };
            }
            if (roles.y_axis) {
                let yId = category.source['rolesIndex']['y_axis'][0];
                let yAxis: YAxisData = {
                    name: category.source.displayName,
                    values: <number[]>category.values,
                    columnId: category.source.index
                };
                yData[yId] = yAxis;
            }
            if (roles.overlayX) {
                overlayLength = <number[]>category.values;
            }
            if (category.source.roles.overlayY) {
                overlayWidth = <number[]>category.values;
            }
            if (roles.tooltip) {

                let columnId = category.source.index;
                const tooltipId = category.source['rolesIndex']['tooltip'][0];
                let data: TooltipColumnData = {
                    type: category.source.type,
                    name: category.source.displayName,
                    values: <number[]>category.values,
                    columnId
                };
                tooltipData[tooltipId] = data;
            }
            if (roles.legend) {
                legendData = {
                    name: category.source.displayName,
                    values: <string[]>category.values,
                    columnId: category.source.index
                };
            }

            if (roles.defectGroup) {
                defectGroupLegendData = {
                    name: category.source.displayName,
                    values: <string[]>category.values,
                    columnId: category.source.index
                };
            }
            // if (roles.defectIndices) {
            //     defectIndices.defectIndices.set(category.source.displayName, <number[]>category.values)
            // }
            if (roles.rollout) {
                rolloutRectangles = <number[]>category.values;
                rolloutName = category.source.displayName;
            }
        }
    }
    //aquire all measure values
    if (categorical.values !== undefined) {
        for (let value of categorical.values) {
            const roles = value.source.roles
            if (roles.x_axis) {
                xData = {
                    name: value.source.displayName,
                    values: <number[]>value.values
                };

            }
            if (roles.y_axis) {
                const yId = value.source['rolesIndex']['y_axis'][0]
                let yAxis: YAxisData = {
                    name: value.source.displayName,
                    values: <number[]>value.values,
                    columnId: value.source.index
                }
                yData[yId] = yAxis;
            }
            if (roles.overlayX) {
                overlayLength = <number[]>value.values;
            }
            if (roles.overlayY) {
                overlayWidth = <number[]>value.values;
            }
            if (roles.tooltip) {
                let columnId = value.source.index;
                const tooltipId = value.source['rolesIndex']['tooltip'][0];
                let data: TooltipColumnData = {
                    type: value.source.type,
                    name: value.source.displayName,
                    values: <number[]>value.values,
                    columnId
                };
                tooltipData[tooltipId] = data;
            }
            if (roles.legend) {
                legendData = {
                    name: value.source.displayName,
                    values: <string[]>value.values,
                    columnId: value.source.index
                };
            }
            if (roles.defectGroup) {
                defectGroupLegendData = {
                    name: value.source.displayName,
                    values: <string[]>value.values,
                    columnId: value.source.index
                };
            }
            // if (roles.defectIndices) {
            //     defectIndices.defectIndices.set(value.source.displayName, <number[]>value.values);
            // }
            if (roles.rollout) {
                rolloutRectangles = <number[]>value.values;
                rolloutName = value.source.displayName;
            }

        }
    }



    const possibleNullValues = xData.values.filter(y => y === null || y === undefined)
    if (possibleNullValues.length > 0) {
        return err(new AxisNullValuesError(xData.name));
    }

    const legendColors = ArrayConstants.legendColors;
    if (legendData != null) {
        let categories = categorical.categories.filter(x => x.source.roles.legend)
        let category = categories.length > 0 ? categories[0] : null;
        let legendSet = new Set(legendData.values);
        const defaultLegendName = category ? category.source.displayName : "Error Legend";

        if (legendSet.has(null)) {
            legendSet.delete(null);
        }
        let legendValues = Array.from(legendSet);
        defectLegend = {
            legendDataPoints: [],
            legendValues: [],
            legendTitle: <string>getValue(objects, Settings.legendSettings, LegendSettingsNames.defectLegendTitle, defaultLegendName),
            legendXEndPosition: 0,
            legendXPosition: MarginSettings.margins.left
        }
        for (let i = 0; i < legendValues.length; i++) {
            const val = legendValues[i]
            const defaultColor = legendColors[val] ? legendColors[val] : "FFFFFF"
            const selectionId = category ? host.createSelectionIdBuilder().withCategory(category, i).createSelectionId() : host.createSelectionIdBuilder().createSelectionId();

            defectLegend.legendValues.push({
                color: getCategoricalObjectColor(category, i, Settings.legendSettings, LegendSettingsNames.legendColor, defaultColor),
                selectionId: selectionId,
                value: val
            });
        }
        defectLegend.legendDataPoints = legendData.values.map((val, i) =>
            <LegendDataPoint>{
                xValue: xData.values[i],
                yValue: val,
                i: i
            }).filter(x => x.yValue !== null);

        // for (let i = 0; i < Math.min(legendData.values.length, xData.values.length); i++) {
        //     legend.legendDataPoints.push({
        //         xValue: xData.values[i],
        //         yValue: legendData.values[i]
        //     });

        // }
    }
    if (defectGroupLegendData != null) {
        let categories = categorical.categories.filter(x => x.source.roles.defectGroup)
        let category = categories.length > 0 ? categories[0] : null;
        let legendSet = new Set(defectGroupLegendData.values);
        const defaultLegendName = category ? category.source.displayName : "Control Legend";

        if (legendSet.has(null)) {
            legendSet.delete(null);
        }
        let legendValues = Array.from(legendSet);
        defectGroupLegend = {
            legendDataPoints: [],
            legendValues: [],
            legendTitle: <string>getValue(objects, Settings.legendSettings, LegendSettingsNames.defectGroupLegendTitle, defaultLegendName),
            legendXEndPosition: 0,
            legendXPosition: MarginSettings.margins.left
        }
        for (let i = 0; i < legendValues.length; i++) {
            const val = legendValues[i]
            const defaultColor = legendColors[val] ? legendColors[val] : "FFFFFF"
            const selectionId = category ? host.createSelectionIdBuilder().withCategory(category, i).createSelectionId() : host.createSelectionIdBuilder().createSelectionId();

            defectGroupLegend.legendValues.push({
                color: "white",//getCategoricalObjectColor(category, i, Settings.legendSettings, LegendSettingsNames.legendColor, defaultColor),
                selectionId: selectionId,
                value: val
            });
        }

        defectGroupLegend.legendDataPoints = defectGroupLegendData.values.map((val, i) =>
            <LegendDataPoint>{
                xValue: xData.values[i],
                yValue: val,
                i: i
            }).filter(x => x.yValue !== null);

        // for (let i = 0; i < Math.min(legendData.values.length, xData.values.length); i++) {
        //     legend.legendDataPoints.push({
        //         xValue: xData.values[i],
        //         yValue: legendData.values[i]
        //     });

        // }
    }


    let formatSettings: FormatSettings[] = [];
    let plotTitles: string[] = [];
    let plotSettings: PlotSettings[] = [];

    for (let plotNr = 0; plotNr < yCount; plotNr++) {
        let yAxis: YAxisData = yData[plotNr]
        let yColumnId = yData[plotNr].columnId;
        let yColumnObjects = getMetadataColumn(metadataColumns, yColumnId).objects;
        plotTitles.push(getValue<string>(yColumnObjects, Settings.plotTitleSettings, PlotTitleSettingsNames.title, yAxis.name))

        const xInformation: AxisInformation = AxisInformation[getValue<string>(yColumnObjects, Settings.axisSettings, AxisSettingsNames.xAxis, AxisInformation.None)]
        const yInformation: AxisInformation = AxisInformation[getValue<string>(yColumnObjects, Settings.axisSettings, AxisSettingsNames.yAxis, AxisInformation.Ticks)]
        let xAxisInformation: AxisInformationInterface, yAxisInformation: AxisInformationInterface;
        let axisInformationError: ParseAndTransformError;
        getAxisInformation(xInformation)
            .map(inf => xAxisInformation = inf)
            .mapErr(err => axisInformationError = err);
        getAxisInformation(yInformation)
            .map(inf => yAxisInformation = inf)
            .mapErr(err => axisInformationError = err);
        if (axisInformationError) {
            return err(axisInformationError);
        }
        formatSettings.push({
            axisSettings: {
                xAxis: xAxisInformation,
                yAxis: yAxisInformation
            },
        });


        plotSettings.push({
            plotSettings: {
                fill: getPlotFillColor(yColumnObjects, colorPalette, '#000000'),
                plotType: PlotType[getValue<string>(yColumnObjects, Settings.plotSettings, PlotSettingsNames.plotType, PlotType.LinePlot)],
                useLegendColor: getValue<boolean>(yColumnObjects, Settings.plotSettings, PlotSettingsNames.useLegendColor, false),
                showHeatmap: <boolean>getValue(yColumnObjects, Settings.plotSettings, PlotSettingsNames.showHeatmap, false)
            }
        });
    }
    const plotTitlesCount = plotTitles.filter(x => x.length > 0).length;
    const xLabelsCount = formatSettings.filter(x => x.axisSettings.xAxis.lables && x.axisSettings.xAxis.ticks).length;
    const heatmapCount = plotSettings.filter(x => x.plotSettings.showHeatmap).length;
    let viewModel: ViewModel;
    let viewModelResult = createViewModel(options, yCount, objects, colorPalette, plotTitlesCount, xLabelsCount, heatmapCount, defectLegend, defectGroupLegend, xData)
        .map(vm => viewModel = vm)
    if (viewModelResult.isErr()) {
        return viewModelResult.mapErr(err => { return err; });
    }

    createTooltipModels(sharedXAxis, xData, tooltipData, viewModel, metadataColumns);
    createOverlayInformation(overlayLength, overlayWidth, xData.values, viewModel).mapErr(err => parseAndTransformError = err);
    if (parseAndTransformError) { return err(parseAndTransformError); }


    let plotTop = MarginSettings.svgTopPadding + MarginSettings.margins.top;
    //create Plotmodels
    for (let plotNr = 0; plotNr < yCount; plotNr++) {
        //get x- and y-data for plotnumber
        let yAxis: YAxisData = yData[plotNr]
        xDataPoints = xData.values
        yDataPoints = yAxis.values;
        const maxLengthAttributes = Math.max(xDataPoints.length, yDataPoints.length);
        dataPoints = [];
        const yColumnId = yData[plotNr].columnId;
        const yColumnObjects = getMetadataColumn(metadataColumns, yColumnId).objects;
        const plotSettings: PlotSettings = {
            plotSettings: {
                fill: getPlotFillColor(yColumnObjects, colorPalette, '#000000'),
                plotType: PlotType[getValue<string>(yColumnObjects, Settings.plotSettings, PlotSettingsNames.plotType, PlotType.LinePlot)],
                useLegendColor: getValue<boolean>(yColumnObjects, Settings.plotSettings, PlotSettingsNames.useLegendColor, false),
                showHeatmap: <boolean>getValue(yColumnObjects, Settings.plotSettings, PlotSettingsNames.showHeatmap, false)
            }
        }
        //create datapoints
        for (let pointNr = 0; pointNr < maxLengthAttributes; pointNr++) {
            const selectionId: ISelectionId = host.createSelectionIdBuilder().withMeasure(xDataPoints[pointNr].toString()).createSelectionId();
            let color = plotSettings.plotSettings.fill;
            const xVal = xDataPoints[pointNr];
            if (plotSettings.plotSettings.useLegendColor) {
                if (defectLegend != null) {
                    const legendVal = defectLegend.legendDataPoints.find(x => x.i === pointNr)?.yValue;
                    color = legendVal === undefined ? color : defectLegend.legendValues.find(x => x.value === legendVal).color;
                } else {
                    viewModel.errors.push(new PlotLegendError(yAxis.name));
                }
            }

            //const color = legend.legendValues.fin legend.legendDataPoints[pointNr].yValue
            let dataPoint: DataPoint = {
                xValue: xVal,
                yValue: yDataPoints[pointNr],
                identity: selectionId,
                selected: false,
                color: color,
                pointNr: pointNr
            };
            dataPoints.push(dataPoint);
        }



        // dataPoints = dataPoints.sort((a: DataPoint, b: DataPoint) => {
        //     return <number>a.xValue - <number>b.xValue;
        // });


        let plotTitle = plotTitles[plotNr]
        plotTop = plotTitle.length > 0 ? plotTop + MarginSettings.plotTitleHeight : plotTop;



        let plotModel: PlotModel = {
            plotId: plotNr,
            formatSettings: formatSettings[plotNr],

            yName: yAxis.name,
            labelNames: {
                xLabel: getValue<string>(yColumnObjects, Settings.axisLabelSettings, AxisLabelSettingsNames.xLabel, xData.name),
                yLabel: getValue<string>(yColumnObjects, Settings.axisLabelSettings, AxisLabelSettingsNames.yLabel, yAxis.name),
            },
            plotTop: plotTop,
            plotSettings: plotSettings,
            plotTitleSettings: {
                title: plotTitle//getValue<string>(yColumnObjects, Settings.plotTitleSettings, PlotTitleSettingsNames.title, yAxis.name)
            },
            overlayPlotSettings: {
                overlayPlotSettings: {
                    overlayType: OverlayType[getValue<string>(yColumnObjects, Settings.overlayPlotSettings, OverlayPlotSettingsNames.overlayType, OverlayType.None)]
                }
            },
            yRange: {
                min: getValue<number>(yColumnObjects, Settings.yRangeSettings, YRangeSettingsNames.min, 0),
                max: getValue<number>(yColumnObjects, Settings.yRangeSettings, YRangeSettingsNames.max, Math.max(...yDataPoints)),
                minFixed: <boolean>getValue(yColumnObjects, Settings.yRangeSettings, YRangeSettingsNames.minFixed, true),
                maxFixed: <boolean>getValue(yColumnObjects, Settings.yRangeSettings, YRangeSettingsNames.maxFixed, false)
            },
            dataPoints: dataPoints,
            d3Plot: null
        };
        plotModel.yRange.min = plotModel.yRange.minFixed ? plotModel.yRange.min : Math.min(...yDataPoints);
        plotModel.yRange.max = plotModel.yRange.maxFixed ? plotModel.yRange.max : Math.max(...yDataPoints);
        viewModel.plotModels[plotNr] = plotModel;
        const formatXAxis = plotModel.formatSettings.axisSettings.xAxis
        plotTop = formatXAxis.lables && formatXAxis.ticks ? plotTop + MarginSettings.xLabelSpace : plotTop;
        plotTop += viewModel.generalPlotSettings.plotHeight + MarginSettings.margins.top + MarginSettings.margins.bottom;
        plotTop += plotModel.plotSettings.plotSettings.showHeatmap ? Heatmapmargins.heatmapSpace : 0;
    }
    if (rolloutRectangles) {
        const rolloutY = viewModel.plotModels[0].plotTop;
        const rolloutHeight = viewModel.plotModels[viewModel.plotModels.length - 1].plotTop + viewModel.generalPlotSettings.plotHeight - rolloutY;
        viewModel.rolloutRectangles = new RolloutRectangles(xData.values, rolloutRectangles, rolloutY, rolloutHeight, rolloutName);
    }

    viewModel.generalPlotSettings.legendYPostion = plotTop;

    return ok(viewModel);



}

function getMetadataColumn(metadataColumns: powerbi.DataViewMetadataColumn[], yColumnId: number) {
    return metadataColumns.filter(x => x.index === yColumnId)[0];
}

function createTooltipModels(sharedXAxis: boolean, xData: XAxisData, tooltipData: TooltipColumnData[], viewModel: ViewModel, metadataColumns: powerbi.DataViewMetadataColumn[]): void {
    if (sharedXAxis) {
        for (const tooltip of tooltipData) {
            const column: powerbi.DataViewMetadataColumn = getMetadataColumn(metadataColumns, tooltip.columnId);
            const maxLengthAttributes: number = Math.min(xData.values.length, tooltip.values.length);

            let tooltipPoints: TooltipDataPoint[] = <TooltipDataPoint[]>[];
            const type = tooltip.type;
            if (type.dateTime) {
                tooltip.values = tooltip.values.map(val => {
                    if (!isString(val)) {
                        console.log("Type is no date, this should not have happened: " + column.displayName);
                        return val;
                    }
                    let d = new Date(<string>val);
                    let formatedDate = padTo2Digits(d.getDate()) + "." + padTo2Digits(d.getMonth() + 1) + "." + padTo2Digits(d.getFullYear()) + " " + padTo2Digits(d.getHours()) + ":" + padTo2Digits(d.getMinutes())
                    return formatedDate;
                });
            } else if (type.numeric && !type.integer) {
                tooltip.values = tooltip.values.map(val => {
                    if (typeof val === 'number') {
                        return Number(val).toFixed(2);
                    }
                    return val
                });
            }

            //create datapoints
            for (let pointNr = 0; pointNr < maxLengthAttributes; pointNr++) {
                let dataPoint: TooltipDataPoint = {
                    pointNr: pointNr,
                    yValue: tooltip.values[pointNr]
                };
                tooltipPoints.push(dataPoint);
            }
            let tooltipModel: TooltipModel = {
                tooltipName: getValue<string>(column.objects, Settings.tooltipTitleSettings, TooltipTitleSettingsNames.title, column.displayName),
                tooltipId: tooltip.columnId,
                tooltipData: tooltipPoints
            };
            viewModel.tooltipModels.push(tooltipModel);
        }
    }
}

function createOverlayInformation(overlayLength: number[], overlayWidth: number[], xValues: number[], viewModel: ViewModel): Result<void, OverlayDataError> {
    if (overlayLength.length == overlayWidth.length && overlayWidth.length > 0) {
        let overlayRectangles: OverlayRectangle[] = new Array<OverlayRectangle>(overlayLength.length);
        for (let i = 0; i < overlayLength.length; i++) {
            overlayRectangles[i] = {
                width: overlayWidth[i],
                length: overlayLength[i],
                y: 0,
                x: xValues[i]
            };
        }
        overlayRectangles = overlayRectangles.filter(x => x.x != null && x.x > 0 && x.width != null && x.width > 0);
        if (overlayRectangles.length == 0) {
            return err(new OverlayDataError());
        }
        viewModel.overlayRectangles = overlayRectangles;
    }
    return ok(null);
}

function createViewModel(options: VisualUpdateOptions, yCount: number, objects: powerbi.DataViewObjects, colorPalette: ISandboxExtendedColorPalette, plotTitlesCount: number, xLabelsCount: number, heatmapCount: number, defectLegend: Legend, defectGroupLegend: Legend, xData: XAxisData): Result<ViewModel, ParseAndTransformError> {
    const margins = MarginSettings
    const svgHeight: number = options.viewport.height;
    const svgWidth: number = options.viewport.width;
    const legendHeight = defectLegend ? margins.legendHeight : 0;
    if (svgHeight === undefined || svgWidth === undefined || !svgHeight || !svgWidth) {
        return err(new SVGSizeError());
    }
    const plotHeightSpace: number = (svgHeight - margins.svgTopPadding - margins.svgBottomPadding - legendHeight - margins.plotTitleHeight * plotTitlesCount - margins.xLabelSpace * xLabelsCount - Heatmapmargins.heatmapSpace * heatmapCount) / yCount;
    if (plotHeightSpace < margins.miniumumPlotHeight) {
        return err(new PlotSizeError("vertical"));
    }
    const plotWidth: number = svgWidth - margins.margins.left - margins.margins.right;
    if (plotWidth < margins.miniumumPlotWidth) {
        return err(new PlotSizeError("horizontal"));
    }
    const xRange = {
        min: Math.min(...xData.values),
        max: Math.max(...xData.values),
    }
    const xScale = scaleLinear().domain([xRange.min, xRange.max]).range([0, plotWidth]);
    const xAxisSettings = <XAxisSettings>{
        xName: xData.name,
        xRange: xRange,
        xScale,
        xScaleZoomed: xScale
    }
    let generalPlotSettings: GeneralPlotSettings = {
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
        fontSize: "10px",
        xAxisSettings: xAxisSettings
    };

    const zoomingSettings: ZoomingSettings = SettingsGetter.getZoomingSettings(objects)

    let viewModel: ViewModel = <ViewModel>{
        plotModels: new Array<PlotModel>(yCount),
        colorSettings: {
            colorSettings: {
                verticalRulerColor: getColorSettings(objects, ColorSettingsNames.verticalRulerColor, colorPalette, '#000000'),
                overlayColor: getColorSettings(objects, ColorSettingsNames.overlayColor, colorPalette, '#000000'),
                yZeroLineColor: getColorSettings(objects, ColorSettingsNames.yZeroLineColor, colorPalette, '#CCCCCC'),
                heatmapColorScheme: <string>getValue(objects, Settings.colorSettings, ColorSettingsNames.heatmapColorScheme, 'interpolateBlues')

            }
        },
        heatmapSettings: { heatmapBins: getValue<number>(objects, Settings.heatmapSettings, HeatmapSettingsNames.heatmapBins, 100) },
        tooltipModels: [],
        generalPlotSettings: generalPlotSettings,
        overlayRectangles: [],
        svgHeight: svgHeight,
        svgTopPadding: margins.svgTopPadding,
        svgWidth: svgWidth,
        zoomingSettings: zoomingSettings,
        defectLegend: defectLegend,
        defectGroupLegend: defectGroupLegend,
        errors: []
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
                ticks: false
            });
        case AxisInformation.Ticks:
            return ok(<AxisInformationInterface>{
                lables: false,
                ticks: true
            });
        case AxisInformation.Labels:
            return ok(<AxisInformationInterface>{
                lables: true,
                ticks: false
            });
        case AxisInformation.TicksLabels:
            return ok(<AxisInformationInterface>{
                lables: true,
                ticks: true
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
            maximumZoom: <number>getValue(objects, Settings.zoomingSettings, ZoomingSettingsNames.maximum, 30)
        }
    }

}