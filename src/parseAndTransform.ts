import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.visuals.ISelectionId;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;
import { getValue, getColumnnColorByIndex, getAxisTextFillColor, getPlotFillColor, getColorSettings } from './objectEnumerationUtility';
import { ViewModel, DataPoint, FormatSettings, PlotSettings, PlotModel, XAxisData, YAxisData, PlotType, SlabRectangle, SlabType } from './plotInterface';
import { Color } from 'd3';
import { EnableAxisNames, PlotSettingsNames, Settings, ColorSettingsNames,AdditionalPlotSettingsNames } from './constants';

// TODO #12: Add the param length from the metadata objects
// TODO #13: Add advanced interface for adding plot type and number
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

        //count numbers of x-axis and y-axis
        const yCategoriesCount = categorical.categories === undefined ? 0 : categorical.categories.filter(cat => { return cat.source.roles.y_axis }).length;
        const yValuesCount = categorical.values === undefined ? 0 : categorical.values.filter(val => { return val.source.roles.y_axis }).length;
        const yCount = yCategoriesCount + yValuesCount;
        const xCategoriesCount = categorical.categories === undefined ? 0 : categorical.categories.filter(cat => { return cat.source.roles.x_axis }).length;
        const xValuesCount = categorical.values === undefined ? 0 : categorical.values.filter(val => { return val.source.roles.x_axis }).length;
        const xCount = xCategoriesCount + xValuesCount;
        const sharedXAxis = xCount == 1
        if (!sharedXAxis && xCount != yCount) {
            return null;
        }

        let xData = new Array<XAxisData>(xCount);
        let yData = new Array<YAxisData>(yCount);
        let viewModel: ViewModel = <ViewModel>{
            plotModels: new Array<PlotModel>(yCount),
            colorSettings: {
                colorSettings: {
                    verticalRulerColor: getColorSettings(objects,ColorSettingsNames.verticalRulerColor, colorPalette, '#000000'),
                    slabColor: getColorSettings(objects,ColorSettingsNames.slabColor, colorPalette, '#000000')
                }
            }
        };
        let xDataPoints: number[] = [];
        let yDataPoints: number[] = [];
        let dataPoints: DataPoint[] = [];
        let slabWidth: number[] = [];
        let slabLength: number[] = [];


        //aquire all categorical values
        if (categorical.categories !== undefined) {
            for (let category of categorical.categories) {
                if (category.source.roles.x_axis) {
                    let xId = category.source['rolesIndex']['x_axis'][0]
                    let xAxis: XAxisData = {
                        name: category.source.displayName,
                        values: <number[]>category.values
                    }
                    xData[xId] = xAxis;
                } else if (category.source.roles.y_axis) {
                    let yId = category.source['rolesIndex']['y_axis'][0]
                    let yAxis: YAxisData = {
                        name: category.source.displayName,
                        values: <number[]>category.values,
                        columnId: category.source.index
                    }
                    yData[yId] = yAxis;
                }
                else if (category.source.roles.slabX) {
                    slabLength = <number[]>category.values;
                }
                else if (category.source.roles.slabY) {
                    slabWidth = <number[]>category.values;
                }
            }
        }
        //aquire all measure values
        if (categorical.values !== undefined) {
            for (let value of categorical.values) {
                if (value.source.roles.x_axis) {
                    const xId = value.source['rolesIndex']['x_axis'][0]
                    let xAxis: XAxisData = {
                        name: value.source.displayName,
                        values: <number[]>value.values
                    }
                    xData[xId] = xAxis;

                } else if (value.source.roles.y_axis) {
                    const yId = value.source['rolesIndex']['y_axis'][0]
                    let yAxis: YAxisData = {
                        name: value.source.displayName,
                        values: <number[]>value.values,
                        columnId: value.source.index
                    }
                    yData[yId] = yAxis;
                }
                else if (value.source.roles.slabX) {
                    slabLength = <number[]>value.values;
                }
                else if (value.source.roles.slabY) {
                    slabWidth = <number[]>value.values;
                }
            }
        }
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
                .sort((a, b) => { return a.x - b.x });
            let lastX = slabRectangles[0].x;
            slabRectangles[0].length = lastX;
            slabRectangles[0].x = 0;
            for (let i = 1; i < slabRectangles.length; i++) {
                slabRectangles[i].length = slabRectangles[i].x - lastX;
                lastX = slabRectangles[i].x;
                slabRectangles[i].x = lastX - slabRectangles[i].length
            }

            viewModel.slabRectangles = slabRectangles;
        }

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
                return <number>a.xValue-<number>b.xValue;
            });

            let formatSettings: FormatSettings = {
                enableAxis: {
                    enabled: getValue<boolean>(yColumnObjects, Settings.enableAxis, EnableAxisNames.enabled, true)
                },
            };

            let plotModel: PlotModel = {
                plotId: plotNr,
                formatSettings: formatSettings,
                xName: xAxis.name,
                yName: yAxis.name,
                plotSettings: {
                    plotSettings: {
                        fill: getPlotFillColor(yColumnObjects, colorPalette, '#000000'),
                        plotType: PlotType[getValue<string>(yColumnObjects, Settings.plotSettings, PlotSettingsNames.plotType, PlotType.LinePlot)]
                    },
                }, 
                additionalPlotSettings:{
                    additionalPlotSettings:{
                        slabType: SlabType[getValue<string>(yColumnObjects, Settings.additionalPlotSettings, AdditionalPlotSettingsNames.slabType, SlabType.None)]
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
        }

        return viewModel;
    } catch (error) {
        console.log('Error in lineVisualTransform: ', error());
    }
}
