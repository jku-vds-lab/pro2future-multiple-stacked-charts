import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.visuals.ISelectionId;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;
import { getValue, getColumnnColorByIndex } from './objectEnumerationUtility';
import { ViewModel, DataPoint, FormatSettings, PlotSettings } from './chartInterface';

// TODO #12: Add the param length from the metadata objects
// TODO #13: Add advanced interface for adding plot type and number

/**
 * Function that converts queried data into a viewmodel that will be used by the visual.
 *
 * @function
 * @param {VisualUpdateOptions} options - Contains references to the size of the container
 *                                        and the dataView which contains all the data
 *                                        the visual had queried.
 * @param {IVisualHost} host            - Contains references to the host which contains services
 */

export function visualTransform(options: VisualUpdateOptions, host: IVisualHost): ViewModel[] {
    try {
        let dataViews = options.dataViews;

        if (!dataViews || !dataViews[0] || !dataViews[0].categorical || !dataViews[0].metadata) {
            return null;
        }

        let viewModels: ViewModel[] = [];
        let viewModel: ViewModel = {
            formatSettings: {
                enableAxis: {
                    show: false,
                    fill: '#000000',
                },
            },
            plotSettings: {
                plotType: {
                    plot: 0,
                    type: 'line',
                },
            },
            dataPoints: [],
            xRange: {
                min: 0,
                max: 0,
            },
            yRange: {
                min: 0,
                max: 0,
            },
        };

        let objects = dataViews[0].metadata.objects;
        let categorical = dataViews[0].categorical;
        let xDataPoints: number[] = [];
        let yDataPoints: number[] = [];
        let dataPoints: DataPoint[] = [];

        let colorPalette: ISandboxExtendedColorPalette = host.colorPalette;

        let formatSettings: FormatSettings = {
            enableAxis: {
                show: false,
                fill: '#000000',
            },
        };

        let plotSettings: PlotSettings = {
            plotType: {
                plot: getValue<number>(objects, 'plotType', 'plot', viewModel.plotSettings.plotType.plot),
                type: getValue<string>(objects, 'plotType', 'type', viewModel.plotSettings.plotType.type),
            },
        };

        let allPlotSettings: PlotSettings[] = [];

        let paramLength = 3;
        let i = 1;

        let type = 'line';
        while (i < paramLength) {
            if (i == 2) {
                type = 'bar';
            }
            plotSettings = {
                plotType: {
                    plot: i,
                    type: type,
                },
            };
            allPlotSettings.push(plotSettings);
            i = i + 1;
        }

        i = 1;
        while (i < paramLength) {
            if (categorical.categories) {
                for (let category of categorical.categories) {
                    if (Object.keys(category.source.roles)[0] == 'x_plot_' + i) {
                        xDataPoints = <number[]>category.values;
                    }
                    if (Object.keys(category.source.roles)[0] == 'y_plot_' + i) {
                        yDataPoints = <number[]>category.values;
                    }
                }
            }

            if (categorical.values) {
                for (let value of categorical.values) {
                    if (Object.keys(value.source.roles)[0] == 'x_plot_' + i) {
                        xDataPoints = <number[]>value.values;
                    }
                    if (Object.keys(value.source.roles)[0] == 'y_plot_' + i) {
                        yDataPoints = <number[]>value.values;
                    }
                }
            }

            if (xDataPoints.length && yDataPoints.length) {
                const maxLengthAttributes = Math.max(xDataPoints.length, yDataPoints.length);
                let ptNr = 0;
                dataPoints = [];

                while (ptNr < maxLengthAttributes) {
                    const color: string = '#0f0f0f'; //getColumnnColorByIndex(xDataPoints, i, colorPalette); // TODO Add colors only if required

                    const selectionId: ISelectionId = host
                        .createSelectionIdBuilder()
                        .withMeasure(xDataPoints[ptNr].toString())
                        .createSelectionId();

                    let dataPoint: DataPoint = {
                        xValue: xDataPoints[ptNr],
                        yValue: yDataPoints[ptNr],
                        identity: selectionId,
                        selected: false,
                        color: color,
                    };
                    dataPoints.push(dataPoint);
                    ptNr = ptNr + 1;
                }

                dataPoints = dataPoints.sort((a: DataPoint, b: DataPoint) => {
                    if (a.xValue < b.xValue) {
                        return 1;
                    } else if (a.xValue > b.xValue) {
                        return -1;
                    } else {
                        return 0;
                    }
                });

                plotSettings = allPlotSettings.find((setting) => setting.plotType.plot == i);

                viewModel = {
                    formatSettings,
                    plotSettings,
                    dataPoints,
                    xRange: {
                        min: Math.min(...xDataPoints),
                        max: Math.max(...xDataPoints),
                    },
                    yRange: {
                        min: Math.min(...yDataPoints),
                        max: Math.max(...yDataPoints),
                    },
                };
                viewModels.push(viewModel);
            }

            xDataPoints = [];
            yDataPoints = [];
            i = i + 1;
        }

        return viewModels;
    } catch (error) {
        console.log('Error in lineVisualTransform: ', error());
    }
}
