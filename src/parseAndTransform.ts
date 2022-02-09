import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.visuals.ISelectionId;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;
import { getValue, getColumnnColorByIndex, getAxisTextFillColor, getPlotFillColor } from './objectEnumerationUtility';
import { ViewModel, DataPoint, FormatSettings, PlotSettings, PlotModel, XAxisData, YAxisData } from './chartInterface';
import { Color } from 'd3';

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
        let dataViews = options.dataViews;

        if (!dataViews || !dataViews[0] || !dataViews[0].categorical || !dataViews[0].metadata) {
            return null;
        }



        let objects = dataViews[0].metadata.objects;
        let categorical = dataViews[0].categorical;

        //count numbers of x-axis and y-axis
        let y_categories = categorical.categories === undefined ? 0 : categorical.categories.filter(cat => { return cat.source.roles.y_axis }).length;
        let y_values = categorical.values === undefined ? 0 : categorical.values.filter(val => { return val.source.roles.y_axis }).length;
        let y_length = y_categories + y_values;
        let x_categories = categorical.categories === undefined ? 0 : categorical.categories.filter(cat => { return cat.source.roles.x_axis }).length;
        let x_values = categorical.values === undefined ? 0 : categorical.values.filter(val => { return val.source.roles.x_axis }).length;
        let x_length = x_categories + x_values;
        let shared_x_axis = x_length == 1
        if (!shared_x_axis && x_length != y_length) {
            return null;
        }

        let xData = new Array<XAxisData>(x_length);
        let yData = new Array<YAxisData>(y_length);

        let viewModel: ViewModel = <ViewModel>{
            plotModels: new Array<PlotModel>(y_length)
        };

        let xDataPoints: number[] = [];
        let yDataPoints: number[] = [];
        let dataPoints: DataPoint[] = [];

        let colorPalette: ISandboxExtendedColorPalette = host.colorPalette;

        //aquire all categorical values
        if (categorical.categories !== undefined) {
            for (let category of categorical.categories) {
                if (category.source.roles.x_axis) {
                    let x_id = category.source['rolesIndex']['x_axis'][0]
                    let xAxis: XAxisData = {
                        name: category.source.displayName,
                        values: <number[]>category.values
                    }
                    xData[x_id] = xAxis;
                } else if (category.source.roles.y_axis) {
                    let y_id = category.source['rolesIndex']['y_axis'][0]
                    let yAxis: YAxisData = {
                        name: category.source.displayName,
                        values: <number[]>category.values,
                        columnId: category.source.index
                    }
                    yData[y_id] = yAxis;
                }
            }
        }
        //aquire all measure values
        if (categorical.values !== undefined) {
            for (let value of categorical.values) {
                if (value.source.roles.x_axis) {
                    let x_id = value.source['rolesIndex']['x_axis'][0]
                    let xAxis: XAxisData = {
                        name: value.source.displayName,
                        values: <number[]>value.values
                    }
                    xData[x_id] = xAxis;

                } else if (value.source.roles.y_axis) {
                    let y_id = value.source['rolesIndex']['y_axis'][0]
                    let yAxis: YAxisData = {
                        name: value.source.displayName,
                        values: <number[]>value.values,
                        columnId: value.source.index
                    }
                    yData[y_id] = yAxis;
                }
            }
        }

        //create Plotmodels 
        for (let pltNr = 0; pltNr < y_length; pltNr++) {
            //get x- and y-data for plotnumber
            let xAxis: XAxisData = shared_x_axis ? xData[0] : xData[pltNr];
            let yAxis: YAxisData = yData[pltNr]
            xDataPoints = xAxis.values
            yDataPoints = yAxis.values;
            const maxLengthAttributes = Math.max(xDataPoints.length, yDataPoints.length);
            dataPoints = [];

            //create datapoints
            for (let ptNr = 0; ptNr < maxLengthAttributes; ptNr++) {
                const color: string = '#0f0f0f'; //getColumnnColorByIndex(xDataPoints, i, colorPalette); // TODO Add colors only if required

                const selectionId: ISelectionId = host.createSelectionIdBuilder().withMeasure(xDataPoints[ptNr].toString()).createSelectionId();

                let dataPoint: DataPoint = {
                    xValue: xDataPoints[ptNr],
                    yValue: yDataPoints[ptNr],
                    identity: selectionId,
                    selected: false,
                    color: color,
                };
                dataPoints.push(dataPoint);
            }
            let yColumnId = yData[pltNr].columnId;
            let columnObjects = dataViews[0].metadata.columns[yColumnId].objects;

            dataPoints = dataPoints.sort((a: DataPoint, b: DataPoint) => {
                if (a.xValue > b.xValue) {
                    return 1;
                } else if (a.xValue < b.xValue) {
                    return -1;
                } else {
                    return 0;
                }
            });
            let formatSettings: FormatSettings = {
                enableAxis: {
                    enabled: getValue<boolean>(columnObjects, 'enableAxis', 'enabled', true)
                },
            };

            let plotModel: PlotModel = {
                plotId: pltNr,
                formatSettings: formatSettings,
                xName: xAxis.name,
                yName: yAxis.name,
                // testSettings: {
                //     test: {
                //         testType: getValue<string>(columnObjects, 'test', 'testType', 'dashed')
                //     }
                // },
                plotSettings: {
                    plotSettings: {
                        fill: getPlotFillColor(columnObjects, host.colorPalette, '#000000'),
                        plotType: getValue<string>(columnObjects, 'plotSettings', 'plotType', 'line')
                    },
                }, xRange: {
                    min: Math.min(...xDataPoints),
                    max: Math.max(...xDataPoints),
                },
                yRange: {
                    min: Math.min(...yDataPoints),
                    max: Math.max(...yDataPoints),
                },
                dataPoints: dataPoints


            };



            viewModel.plotModels[pltNr] = plotModel;
        }

        return viewModel;
    } catch (error) {
        console.log('Error in lineVisualTransform: ', error());
    }
}
