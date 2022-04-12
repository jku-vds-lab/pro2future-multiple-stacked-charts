import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.visuals.ISelectionId;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;
import { getValue, getColumnnColorByIndex, getAxisTextFillColor, getPlotFillColor, getColorSettings, getCategoricalObjectColor } from './objectEnumerationUtility';
import { ViewModel, DataPoint, FormatSettings, PlotSettings, PlotModel, TooltipDataPoint, XAxisData, YAxisData, PlotType, SlabRectangle, SlabType, GeneralPlotSettings, Margins, AxisInformation, AxisInformationInterface, TooltipModel, ZoomingSettings, LegendData, Legend, LegendValue, TooltipData, TooltipColumnData } from './plotInterface';
import { Color, stratify } from 'd3';
import { AxisSettingsNames, PlotSettingsNames, Settings, ColorSettingsNames, OverlayPlotSettingsNames, PlotTitleSettingsNames, TooltipTitleSettingsNames, YRangeSettingsNames, ZoomingSettingsNames, LegendSettingsNames, AxisLabelSettingsNames, HeatmapSettingsNames } from './constants';
import { Heatmapmargins, MarginSettings } from './marginSettings'
import { ok, err, Result } from 'neverthrow'
import { AxisError, AxisNullValuesError, GetAxisInformationError, NoAxisError, NoValuesError, ParseAndTransformError, PlotLegendError, PlotSizeError, SVGSizeError } from './errors'
import { isString } from 'vega';

// TODO #n: Allow user to change bars colors

/**
 * Function that converts queried data into a viewmodel that will be used by the visual.
 *
 * @function
 * @param {VisualUpdateOptions} options - Contains references to the size of the container
 *                                        and the dataView which contains all the data
 *                                        the visual had queried.
 * @param {IVisualHost} host            - Contains references to the host which contains services
 */

function f(): number {
    return 2;
}

export function visualTransform(options: VisualUpdateOptions, host: IVisualHost): Result<ViewModel, ParseAndTransformError> {

    // try {
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
    const sharedXAxis = xCount == 1
    // const yCategoriesCount = categorical.categories === undefined ? 0 : new Set(categorical.categories.filter(cat => { return cat.source.roles.y_axis }).map(x => x.source.index)).size;
    // const yValuesCount = categorical.values === undefined ? 0 : new Set(categorical.values.filter(val => { return val.source.roles.y_axis }).map(x => x.source.index)).size;
    // const yCount = yCategoriesCount + yValuesCount;
    // const xCategoriesCount = categorical.categories === undefined ? 0 : new Set(categorical.categories.filter(cat => { return cat.source.roles.x_axis }).map(x => x.source.index)).size;
    // const xValuesCount = categorical.values === undefined ? 0 : new Set(categorical.values.filter(val => { return val.source.roles.x_axis }).map(x => x.source.index)).size;
    // const xCount = xCategoriesCount + xValuesCount;
    // const tooltipCategoriesCount = categorical.categories === undefined ? 0 : new Set(categorical.categories.filter(cat => { return cat.source.roles.tooltip }).map(x => x.source.index)).size;
    // const tooltipValuesCount = categorical.values === undefined ? 0 : new Set(categorical.values.filter(val => { return val.source.roles.tooltip }).map(x => x.source.index)).size;
    // const tooltipCount = tooltipCategoriesCount + tooltipValuesCount;
    // console.log(tooltipCount);
    // debugger;
    // const sharedXAxis = xCount == 1

    //check if input data count is ok
    if (yCount == 0) {
        return err(new NoValuesError());
    }
    if (xCount == 0) {
        return err(new NoAxisError());
    }
    if (xCount != yCount && !sharedXAxis) {
        return err(new AxisError());
    }

    let xData = new Array<XAxisData>(xCount);
    let yData = new Array<YAxisData>(yCount);
    let tooltipData = new Array<TooltipColumnData>(tooltipCount);
    let legendData: LegendData = null;


    let xDataPoints: number[] = [];
    let yDataPoints: number[] = [];
    let dataPoints: DataPoint[] = [];
    let slabWidth: number[] = [];
    let slabLength: number[] = [];
    let legend: Legend = null;

    //aquire all categorical values
    if (categorical.categories !== undefined) {
        for (let category of categorical.categories) {
            const roles = category.source.roles;
            if (roles.x_axis) {
                let xId = category.source['rolesIndex']['x_axis'][0];
                let xAxis: XAxisData = {
                    name: category.source.displayName,
                    values: <number[]>category.values
                };
                xData[xId] = xAxis;
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
            if (roles.slabX) {
                slabLength = <number[]>category.values;
            }
            if (category.source.roles.slabY) {
                slabWidth = <number[]>category.values;
            }
            if (roles.tooltip) {

                const tooltipId = category.source['rolesIndex']['tooltip'][0];
                let data: TooltipColumnData = {
                    type: category.source.type,
                    name: category.source.displayName,
                    values: <number[]>category.values,
                    columnId: category.source.index
                };
                tooltipData[tooltipId] = data;
            }
            else if (roles.legend) {
                legendData = {
                    name: category.source.displayName,
                    values: <string[]>category.values,
                    columnId: category.source.index
                };
            }
        }
    }
    //aquire all measure values
    if (categorical.values !== undefined) {
        for (let value of categorical.values) {
            const roles = value.source.roles
            if (roles.x_axis) {
                const xId = value.source['rolesIndex']['x_axis'][0]
                let xAxis: XAxisData = {
                    name: value.source.displayName,
                    values: <number[]>value.values
                }
                xData[xId] = xAxis;

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
            if (roles.slabX) {
                slabLength = <number[]>value.values;
            }
            if (roles.slabY) {
                slabWidth = <number[]>value.values;
            }
            if (roles.tooltip) {
                const tooltipId = value.source['rolesIndex']['tooltip'][0];
                let data: TooltipColumnData = {
                    type: value.source.type,
                    name: value.source.displayName,
                    values: <number[]>value.values,
                    columnId: value.source.index
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
        }
    }



    const possibleNullValues: XAxisData[] = xData.filter(x => x.values.filter(y => y === null || y === undefined).length > 0)
    if (possibleNullValues.length > 0) {
        return err(new AxisNullValuesError(possibleNullValues[0].name));
    }

    const legendColors = {
        OZE: "#e41a1c",
        GZE: "#377eb8",
        RAS: "#4daf4a"
    }

    if (legendData != null) {
        let categories = categorical.categories.filter(x => x.source.roles.legend)
        let category = categories.length > 0 ? categories[0] : null;
        let legendSet = new Set(legendData.values);
        const defaultLegendName = category ? category.source.displayName : "Legend";

        if (legendSet.has(null)) {
            legendSet.delete(null);
        }
        let legendValues = Array.from(legendSet);
        legend = {
            legendDataPoints: [],
            legendValues: [],
            legendTitle: <string>getValue(objects, Settings.legendSettings, LegendSettingsNames.legendTitle, defaultLegendName)
        }
        for (let i = 0; i < legendValues.length; i++) {
            const val = legendValues[i]
            const defaultColor = legendColors[val] ? legendColors[val] : "FFFFFF"
            const selectionId = category ? host.createSelectionIdBuilder().withCategory(category, i).createSelectionId() : host.createSelectionIdBuilder().createSelectionId();

            legend.legendValues.push({
                color: getCategoricalObjectColor(category, i, Settings.legendSettings, LegendSettingsNames.legendColor, defaultColor),
                selectionId: selectionId,
                value: val
            });
        }
        let legendXValues = xData[0].values;
        for (let i = 0; i < Math.min(legendData.values.length, legendXValues.length); i++) {
            legend.legendDataPoints.push({
                xValue: legendXValues[i],
                yValue: legendData.values[i]
            });

        }


    }
    let formatSettings: FormatSettings[] = [];
    let plotTitles: string[] = [];
    let plotSettings: PlotSettings[] = [];

    for (let plotNr = 0; plotNr < yCount; plotNr++) {
        let yAxis: YAxisData = yData[plotNr]
        let yColumnId = yData[plotNr].columnId;
        let yColumnObjects = metadataColumns[yColumnId].objects;
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
    let viewModelResult = createViewModel(options, yCount, objects, colorPalette, plotTitlesCount, xLabelsCount, heatmapCount, legend)
        .map(vm => viewModel = vm)
    if (viewModelResult.isErr()) {
        return viewModelResult.mapErr(err => { return err; });
    }

    createTooltipModels(sharedXAxis, xData, tooltipData, viewModel, metadataColumns);
    createSlabInformation(slabLength, slabWidth, viewModel);

    let plotTop = MarginSettings.svgTopPadding + MarginSettings.margins.top;
    //create Plotmodels
    for (let plotNr = 0; plotNr < yCount; plotNr++) {
        //get x- and y-data for plotnumber
        let xAxis: XAxisData = sharedXAxis ? xData[0] : xData[plotNr];
        let yAxis: YAxisData = yData[plotNr]
        xDataPoints = xAxis.values
        yDataPoints = yAxis.values;
        const maxLengthAttributes = Math.max(xDataPoints.length, yDataPoints.length);
        dataPoints = [];
        const yColumnId = yData[plotNr].columnId;
        const yColumnObjects = metadataColumns[yColumnId].objects;
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
                if (legend != null) {
                    const legendVal = legend.legendDataPoints.find(x => x.xValue == xVal).yValue;
                    color = legendVal == null ? color : legend.legendValues.find(x => x.value == legendVal).color;
                } else {
                    return err(new PlotLegendError(yAxis.name));
                }
            }

            //const color = legend.legendValues.fin legend.legendDataPoints[pointNr].yValue
            let dataPoint: DataPoint = {
                xValue: xVal,
                yValue: yDataPoints[pointNr],
                identity: selectionId,
                selected: false,
                color: color
            };
            dataPoints.push(dataPoint);
        }



        dataPoints = dataPoints.sort((a: DataPoint, b: DataPoint) => {
            return <number>a.xValue - <number>b.xValue;
        });


        let plotTitle = plotTitles[plotNr]
        plotTop = plotTitle.length > 0 ? plotTop + MarginSettings.plotTitleHeight : plotTop;



        let plotModel: PlotModel = {
            plotId: plotNr,
            formatSettings: formatSettings[plotNr],
            xName: xAxis.name,
            yName: yAxis.name,
            labelNames: {
                xLabel: getValue<string>(yColumnObjects, Settings.axisLabelSettings, AxisLabelSettingsNames.xLabel, xAxis.name),
                yLabel: getValue<string>(yColumnObjects, Settings.axisLabelSettings, AxisLabelSettingsNames.yLabel, yAxis.name),
            },
            plotTop: plotTop,
            plotSettings: plotSettings,
            plotTitleSettings: {
                title: plotTitle//getValue<string>(yColumnObjects, Settings.plotTitleSettings, PlotTitleSettingsNames.title, yAxis.name)
            },
            overlayPlotSettings: {
                overlayPlotSettings: {
                    slabType: SlabType[getValue<string>(yColumnObjects, Settings.overlayPlotSettings, OverlayPlotSettingsNames.slabType, SlabType.None)]
                }
            },
            xRange: {
                min: Math.min(...xDataPoints),
                max: Math.max(...xDataPoints),
            },
            yRange: {
                min: getValue<number>(yColumnObjects, Settings.yRangeSettings, YRangeSettingsNames.min, 0),//TODO: default Math.min(...yDataPoints)?
                max: getValue<number>(yColumnObjects, Settings.yRangeSettings, YRangeSettingsNames.max, Math.max(...yDataPoints)),
            },
            dataPoints: dataPoints
        };
        viewModel.plotModels[plotNr] = plotModel;
        const formatXAxis = plotModel.formatSettings.axisSettings.xAxis
        plotTop = formatXAxis.lables && formatXAxis.ticks ? plotTop + MarginSettings.xLabelSpace : plotTop;
        plotTop += viewModel.generalPlotSettings.plotHeight + MarginSettings.margins.top + MarginSettings.margins.bottom;
        plotTop += plotModel.plotSettings.plotSettings.showHeatmap ? Heatmapmargins.heatmapSpace : 0;
    }
    viewModel.generalPlotSettings.legendYPostion = plotTop;

    return ok(viewModel);

}

function createTooltipModels(sharedXAxis: boolean, xData: XAxisData[], tooltipData: TooltipColumnData[], viewModel: ViewModel, metadataColumns: powerbi.DataViewMetadataColumn[]): void {
    if (sharedXAxis) {
        const xAxis: XAxisData = xData[0];
        for (const tooltip of tooltipData) {
            const column: powerbi.DataViewMetadataColumn = metadataColumns[tooltip.columnId];
            const maxLengthAttributes: number = Math.min(xAxis.values.length, tooltip.values.length);

            let tooltipPoints: TooltipDataPoint[] = <TooltipDataPoint[]>[];
            const type = tooltip.type;
            if (type.dateTime) {
                tooltip.values = tooltip.values.map(val => {
                    if (!isString(val)) {
                        console.log("Type is no date, this should not have happened: " + column.displayName);
                        return val;
                    }
                    let d = new Date(Date.parse(<string>val));
                    let formatedDate = padTo2Digits(d.getDay()) + "." + padTo2Digits(d.getMonth()) + "." + padTo2Digits(d.getFullYear()) + " " + padTo2Digits(d.getHours()) + ":" + padTo2Digits(d.getMinutes())
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
                    xValue: xAxis.values[pointNr],
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

function createSlabInformation(slabLength: number[], slabWidth: number[], viewModel: ViewModel): void {

    if (slabLength.length == slabWidth.length && slabWidth.length > 0) {
        let slabRectangles: SlabRectangle[] = new Array<SlabRectangle>(slabLength.length);
        for (let i = 0; i < slabLength.length; i++) {
            slabRectangles[i] = {
                width: slabWidth[i],
                length: 0,
                y: 0,
                x: slabLength[i]
            };
        }
        slabRectangles = slabRectangles.filter(x => x.x != null && x.x > 0 && x.width != null && x.width > 0)
            .sort((a, b) => { return a.x - b.x; });
        if (slabRectangles.length == 0) {
            //TODO: create error on wrong data?
            return;
        }
        let lastX = slabRectangles[0].x;
        slabRectangles[0].length = lastX;
        slabRectangles[0].x = 0;
        for (let i = 1; i < slabRectangles.length; i++) {
            slabRectangles[i].length = slabRectangles[i].x - lastX;
            lastX = slabRectangles[i].x;
            slabRectangles[i].x = lastX - slabRectangles[i].length;
        }
        viewModel.slabRectangles = slabRectangles;
    }
}

function createViewModel(options: VisualUpdateOptions, yCount: number, objects: powerbi.DataViewObjects, colorPalette: ISandboxExtendedColorPalette, plotTitlesCount: number, xLabelsCount: number, heatmapCount: number, legend: Legend): Result<ViewModel, ParseAndTransformError> {
    const margins = MarginSettings
    const svgHeight: number = options.viewport.height;
    const svgWidth: number = options.viewport.width;
    const legendHeight = legend ? margins.legendHeight : 0;
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
        fontSize: "10px"
    };

    const zoomingSettings: ZoomingSettings = {
        enableZoom: <boolean>getValue(objects, Settings.zoomingSettings, ZoomingSettingsNames.show, true),
        maximumZoom: <number>getValue(objects, Settings.zoomingSettings, ZoomingSettingsNames.maximum, 10)
    }

    let viewModel: ViewModel = <ViewModel>{
        plotModels: new Array<PlotModel>(yCount),
        colorSettings: {
            colorSettings: {
                verticalRulerColor: getColorSettings(objects, ColorSettingsNames.verticalRulerColor, colorPalette, '#000000'),
                slabColor: getColorSettings(objects, ColorSettingsNames.slabColor, colorPalette, '#000000'),
                heatmapColorScheme: <string>getValue(objects, Settings.colorSettings, ColorSettingsNames.heatmapColorScheme, 'interpolateBlues')

            }
        },
        heatmapSettings: { heatmapBins: getValue<number>(objects, Settings.heatmapSettings, HeatmapSettingsNames.heatmapBins, 100) },
        tooltipModels: [],
        generalPlotSettings: generalPlotSettings,
        slabRectangles: [],
        svgHeight: svgHeight,
        svgTopPadding: margins.svgTopPadding,
        svgWidth: svgWidth,
        zoomingSettings: zoomingSettings,
        legend: legend,
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
