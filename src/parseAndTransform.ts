import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.visuals.ISelectionId;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;
import { getValue, getColumnnColorByIndex, getAxisTextFillColor, getPlotFillColor, getColorSettings } from './objectEnumerationUtility';
import { ViewModel, DataPoint, FormatSettings, PlotSettings, PlotModel, TooltipDataPoint, XAxisData, YAxisData, PlotType, SlabRectangle, SlabType, GeneralPlotSettings, Margins, AxisInformation, AxisInformationInterface, TooltipModel } from './plotInterface';
import { Color } from 'd3';
import { AxisSettingsNames, PlotSettingsNames, Settings, ColorSettingsNames, OverlayPlotSettingsNames, PlotTitleSettingsNames } from './constants';
import { MarginSettings } from './marginSettings'


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



export function visualTransform(options: VisualUpdateOptions, host: IVisualHost): ViewModel {
    try {
        const dataViews = options.dataViews;

        if (!dataViews || !dataViews[0] || !dataViews[0].categorical || !dataViews[0].metadata) {
            return null;
        }

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
        if (!sharedXAxis && xCount != yCount) {
            return null;
        }

        let xData = new Array<XAxisData>(xCount);
        let yData = new Array<YAxisData>(yCount);
        let tooltipData = new Array<YAxisData>(tooltipCount);



        let xDataPoints: number[] = [];
        let yDataPoints: number[] = [];
        let dataPoints: DataPoint[] = [];
        let slabWidth: number[] = [];
        let slabLength: number[] = [];

        
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
                } else if (roles.y_axis) {
                    let yId = category.source['rolesIndex']['y_axis'][0];
                    let yAxis: YAxisData = {
                        name: category.source.displayName,
                        values: <number[]>category.values,
                        columnId: category.source.index
                    };
                    yData[yId] = yAxis;
                }
                else if (roles.slabX) {
                    slabLength = <number[]>category.values;
                }
                else if (category.source.roles.slabY) {
                    slabWidth = <number[]>category.values;
                } else if (roles.tooltip) {
                    const tooltipId = category.source['rolesIndex']['tooltip'][0];
                    let data: YAxisData = {
                        name: category.source.displayName,
                        values: <number[]>category.values,
                        columnId: category.source.index
                    };
                    tooltipData[tooltipId] = data;
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

                } else if (roles.y_axis) {
                    const yId = value.source['rolesIndex']['y_axis'][0]
                    let yAxis: YAxisData = {
                        name: value.source.displayName,
                        values: <number[]>value.values,
                        columnId: value.source.index
                    }
                    yData[yId] = yAxis;
                }
                else if (roles.slabX) {
                    slabLength = <number[]>value.values;
                }
                else if (roles.slabY) {
                    slabWidth = <number[]>value.values;
                } else if (roles.tooltip) {
                    const tooltipId = value.source['rolesIndex']['tooltip'][0];
                    let data: YAxisData = {
                        name: value.source.displayName,
                        values: <number[]>value.values,
                        columnId: value.source.index
                    };
                    tooltipData[tooltipId] = data;
                }
            }
        }

        let plotTitles: string[] = [];
        for (let plotNr = 0; plotNr < yCount; plotNr++) {
            let yAxis: YAxisData = yData[plotNr]
            let yColumnId = yData[plotNr].columnId;
            let yColumnObjects = metadataColumns[yColumnId].objects;
            plotTitles.push(getValue<string>(yColumnObjects, Settings.plotTitleSettings, PlotTitleSettingsNames.title, yAxis.name))
        }
        let plotTitlesCount = plotTitles.filter(x => x.length > 0).length;
        let viewModel: ViewModel = createViewModel(options, yCount, objects, colorPalette, plotTitlesCount);
        createTooltipModels(sharedXAxis, xData, tooltipData, viewModel);
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

            //create datapoints
            for (let pointNr = 0; pointNr < maxLengthAttributes; pointNr++) {
                const color: string = '#0f0f0f'; //getColumnnColorByIndex(xDataPoints, i, colorPalette); // TODO Add colors only if required

                const selectionId: ISelectionId = host.createSelectionIdBuilder().withMeasure(xDataPoints[pointNr].toString()).createSelectionId();

                let dataPoint: DataPoint = {
                    xValue: xDataPoints[pointNr],
                    yValue: yDataPoints[pointNr],
                    identity: selectionId,
                    selected: false,
                    color: color,
                };
                dataPoints.push(dataPoint);
            }
            //get index of y-column in metadata
            let yColumnId = yData[plotNr].columnId;
            let yColumnObjects = metadataColumns[yColumnId].objects;

            dataPoints = dataPoints.sort((a: DataPoint, b: DataPoint) => {
                return <number>a.xValue - <number>b.xValue;
            });
            const xInformation = AxisInformation[getValue<string>(yColumnObjects, Settings.axisSettings, AxisSettingsNames.xAxis, AxisInformation.None)]
            const yInformation = AxisInformation[getValue<string>(yColumnObjects, Settings.axisSettings, AxisSettingsNames.yAxis, AxisInformation.Ticks)]

            let formatSettings: FormatSettings = {
                axisSettings: {
                    xAxis: getAxisInformation(xInformation),
                    yAxis: getAxisInformation(yInformation)
                },
            };

            let plotTitle = plotTitles[plotNr]
            plotTop = plotTitle.length > 0 ? plotTop + MarginSettings.plotTitleHeight : plotTop;

            const plotHeightIncludingMargins = viewModel.generalPlotSettings.plotHeight + MarginSettings.margins.top + MarginSettings.margins.bottom;
            let plotModel: PlotModel = {
                plotId: plotNr,
                formatSettings: formatSettings,
                xName: xAxis.name,
                yName: yAxis.name,
                plotTop: plotTop,
                plotSettings: {
                    plotSettings: {
                        fill: getPlotFillColor(yColumnObjects, colorPalette, '#000000'),
                        plotType: PlotType[getValue<string>(yColumnObjects, Settings.plotSettings, PlotSettingsNames.plotType, PlotType.LinePlot)]
                    },
                },
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
                    min: Math.min(...yDataPoints),
                    max: Math.max(...yDataPoints),
                },
                dataPoints: dataPoints
            };
            viewModel.plotModels[plotNr] = plotModel;
            plotTop += viewModel.generalPlotSettings.plotHeight + MarginSettings.margins.top + MarginSettings.margins.bottom;
        }

        return viewModel;
    } catch (error) {
        console.log('Error in lineVisualTransform: ', error());
    }
}

function createTooltipModels(sharedXAxis: boolean, xData: XAxisData[], tooltipData: YAxisData[], viewModel: ViewModel) {
    if (sharedXAxis) {
        const xAxis: XAxisData = xData[0];
        for (const tooltip of tooltipData) {
            const maxLengthAttributes = Math.max(xAxis.values.length, tooltip.values.length);

            let tooltipPoints: TooltipDataPoint[] = <TooltipDataPoint[]>[];

            //create datapoints
            for (let pointNr = 0; pointNr < maxLengthAttributes; pointNr++) {

                let dataPoint: TooltipDataPoint = {
                    xValue: xAxis.values[pointNr],
                    yValue: tooltip.values[pointNr]
                };
                tooltipPoints.push(dataPoint);
            }
            let tooltipModel: TooltipModel = {
                tooltipName: tooltip.name,
                tooltipId: tooltip.columnId,
                tooltipData: tooltipPoints
            };
            viewModel.tooltipModels.push(tooltipModel);
        }
    }
}

function createSlabInformation(slabLength: number[], slabWidth: number[], viewModel: ViewModel) {
    if (slabLength.length == slabWidth.length && slabWidth.length > 0) {
        let slabRectangles = new Array<SlabRectangle>(slabLength.length);
        for (let i = 0; i < slabLength.length; i++) {
            slabRectangles[i] = {
                width: slabWidth[i],
                length: 0,
                y: 0,
                x: slabLength[i]
            };
        }
        slabRectangles = slabRectangles.filter(x => x.x != null && x.x != 0)
            .sort((a, b) => { return a.x - b.x; });
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

function createViewModel(options: VisualUpdateOptions, yCount: number, objects: powerbi.DataViewObjects, colorPalette: ISandboxExtendedColorPalette, plotTitlesCount: number) {
    const margins = MarginSettings
    const svgHeight = options.viewport.height;
    const svgWidth = options.viewport.width;
    const plotHeightSpace = (svgHeight - margins.svgTopPadding - margins.svgBottomPadding - margins.plotTitleHeight * plotTitlesCount) / yCount;
    const plotWidth = svgWidth - margins.margins.left - margins.margins.right;
    let generalPlotSettings: GeneralPlotSettings = {
        plotTitleHeight: margins.plotTitleHeight,
        dotMargin: margins.dotMargin,
        plotHeight: plotHeightSpace - margins.margins.top - margins.margins.bottom,
        plotWidth: plotWidth,
        xScalePadding: 0.1,
        solidOpacity: 1,
        transparentOpacity: 1,
        margins: margins.margins
    };

    let viewModel: ViewModel = <ViewModel>{
        plotModels: new Array<PlotModel>(yCount),
        colorSettings: {
            colorSettings: {
                verticalRulerColor: getColorSettings(objects, ColorSettingsNames.verticalRulerColor, colorPalette, '#000000'),
                slabColor: getColorSettings(objects, ColorSettingsNames.slabColor, colorPalette, '#000000')
            }
        },
        tooltipModels: [],
        generalPlotSettings: generalPlotSettings,
        svgHeight: svgHeight,
        svgTopPadding: margins.svgTopPadding,
        svgWidth: svgWidth
    };
    return viewModel;
}

function getAxisInformation(axisInformation: AxisInformation) {
    switch (axisInformation) {
        case AxisInformation.None:
            return <AxisInformationInterface>{
                lables: false,
                ticks: false
            };
        case AxisInformation.Ticks:
            return <AxisInformationInterface>{
                lables: false,
                ticks: true
            };
        case AxisInformation.Labels:
            return <AxisInformationInterface>{
                lables: true,
                ticks: false
            };
        case AxisInformation.TicksLabels:
            return <AxisInformationInterface>{
                lables: true,
                ticks: true
            };
    }
}
