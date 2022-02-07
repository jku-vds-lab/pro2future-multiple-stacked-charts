import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.visuals.ISelectionId;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;
import { getValue, getColumnnColorByIndex } from './objectEnumerationUtility';
import { ViewModel, DataPoint, FormatSettings, PlotSettings, PlotModel, XAxisData, YAxisData } from './chartInterface';

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



        // let viewModel: ViewModel = {
        //     formatSettings: {
        //         enableAxis: {
        //             show: false,
        //             fill: '#000000',
        //         },
        //     },
        //     plotSettings: {
        //         plotType: {
        //             plot: 0,
        //             type: 'line',
        //         },
        //     },
        //     dataPoints: [],
        //     xRange: {
        //         min: 0,
        //         max: 0,
        //     },
        //     yRange: {
        //         min: 0,
        //         max: 0,
        //     },
        // };

        let objects = dataViews[0].metadata.objects;
        let categorical = dataViews[0].categorical;

        debugger;
        let y_categories = categorical.categories.filter(cat => { return cat.source.roles.y_axis }).length;
        let y_values = categorical.values.filter(val => { return val.source.roles.y_axis }).length;
        let y_lenght = y_categories + y_values;
        let x_categories = categorical.categories.filter(cat => { return cat.source.roles.x_axis }).length;
        let x_values = categorical.values.filter(val => { return val.source.roles.x_axis }).length;
        let x_lenght = x_categories + x_values;
        let shared_x_axis = x_lenght == 1
        if (!shared_x_axis && x_lenght != y_lenght) {
            return null;
        }

        let xData = new Array<XAxisData>(x_lenght);
        let yData = new Array<YAxisData>(y_lenght);

        let viewModel: ViewModel = <ViewModel>{
            plotModels: new Array<PlotModel>(y_lenght)
        };

        let xDataPoints: number[] = [];
        let yDataPoints: number[] = [];
        let dataPoints: DataPoint[] = [];

        let colorPalette: ISandboxExtendedColorPalette = host.colorPalette;


        // let allPlotSettings: PlotSettings[] = [];


        // let i = 1;




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
                    values: <number[]>category.values
                }
                yData[y_id] = yAxis;
            }
        }

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
                    values: <number[]>value.values
                }
                yData[y_id] = yAxis;
            }
        }


        // while (i < paramLength) {
        //     // if (i == 2) {
        //     //     type = 'bar';
        //     // }
        //     plotSettings = {
        //         plotType: {
        //             plot: i,
        //             type: type,
        //         },
        //     };
        //     allPlotSettings.push(plotSettings);
        //     i = i + 1;
        // }
        for (let pltNr = 0; pltNr < y_lenght; pltNr++) {
            xDataPoints = shared_x_axis ? xData[0].values : xData[pltNr].values;
            yDataPoints = yData[pltNr].values;
            const maxLengthAttributes = Math.max(xDataPoints.length, yDataPoints.length);
            dataPoints = [];

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
                    show: false,
                    fill: '#000000',
                },
            };
            let type = 'line';
            let plotModel: PlotModel = {
                plotId: pltNr,
                formatSettings: formatSettings,
                plotSettings: {
                    plotType: {
                        plot: pltNr,
                        type: type,
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
            let plotSettings: PlotSettings = {
                plotType: {
                    plot: getValue<number>(objects, 'plotType', 'plot', plotModel.plotSettings.plotType.plot),
                    type: getValue<string>(objects, 'plotType', 'type', plotModel.plotSettings.plotType.type),
                },
            };

            viewModel.plotModels[pltNr] = plotModel;
        }
        // i = 1;

        // while (i < paramLength) {
        //     if (categorical.categories) {
        //         for (let category of categorical.categories) {
        //             if (Object.keys(category.source.roles).includes('x_plot_' + i)) {
        //                 xDataPoints = <number[]>category.values;
        //             }
        //             if (Object.keys(category.source.roles).includes('y_plot_' + i)) {
        //                 yDataPoints = <number[]>category.values;
        //             }
        //         }
        //     }

        //     if (categorical.values) {
        //         for (let value of categorical.values) {
        //             if (Object.keys(value.source.roles).includes('x_plot_' + i)) {
        //                 xDataPoints = <number[]>value.values;
        //             }
        //             if (Object.keys(value.source.roles).includes('y_plot_' + i)) {
        //                 yDataPoints = <number[]>value.values;
        //             }
        //         }
        //     }

        //     if (xDataPoints.length && yDataPoints.length) {
        //         const maxLengthAttributes = Math.max(xDataPoints.length, yDataPoints.length);
        //         let ptNr = 0;
        //         dataPoints = [];

        //         while (ptNr < maxLengthAttributes) {
        //             const color: string = '#0f0f0f'; //getColumnnColorByIndex(xDataPoints, i, colorPalette); // TODO Add colors only if required

        //             const selectionId: ISelectionId = host.createSelectionIdBuilder().withMeasure(xDataPoints[ptNr].toString()).createSelectionId();

        //             let dataPoint: DataPoint = {
        //                 xValue: xDataPoints[ptNr],
        //                 yValue: yDataPoints[ptNr],
        //                 identity: selectionId,
        //                 selected: false,
        //                 color: color,
        //             };
        //             dataPoints.push(dataPoint);
        //             ptNr = ptNr + 1;
        //         }

        //         dataPoints = dataPoints.sort((a: DataPoint, b: DataPoint) => {
        //             if (a.xValue > b.xValue) {
        //                 return 1;
        //             } else if (a.xValue < b.xValue) {
        //                 return -1;
        //             } else {
        //                 return 0;
        //             }
        //         });

        //         plotSettings = allPlotSettings.find((setting) => setting.plotType.plot == i);

        //         viewModel = {
        //             formatSettings,
        //             plotSettings,
        //             dataPoints,
        //             xRange: {
        //                 min: Math.min(...xDataPoints),
        //                 max: Math.max(...xDataPoints),
        //             },
        //             yRange: {
        //                 min: Math.min(...yDataPoints),
        //                 max: Math.max(...yDataPoints),
        //             },
        //         };
        //         viewModels.push(viewModel);
        //     }

        //     xDataPoints = [];
        //     yDataPoints = [];
        //     i = i + 1;
        // }

        return viewModel;
    } catch (error) {
        console.log('Error in lineVisualTransform: ', error());
    }
}
