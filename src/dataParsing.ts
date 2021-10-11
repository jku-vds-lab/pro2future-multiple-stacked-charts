import powerbi from 'powerbi-visuals-api';
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import { getValue } from './objectEnumerationUtility';

export interface GeneralSettings {
    plotType: {
        plot: number;
        type: string;
    };
}

export interface DataPoints {
    xValues: number[];
    yValues: number[];
    xMinLocal: number;
    xMaxLocal: number;
    yMinLocal: number;
    yMaxLocal: number;
    settings: GeneralSettings;
}

// return data points of plots asked on demand

export function visualTransform(options: VisualUpdateOptions, type: string = 'line'): DataPoints[] {
    let dataViews = options.dataViews;

    try {
        let datapoints: DataPoints[] = [];
        let xDataPoints: number[] = [];
        let yDataPoints: number[] = [];

        if (!dataViews || !dataViews[0] || !dataViews[0].categorical || !dataViews[0].metadata) {
            return null;
        }

        let objects = dataViews[0].metadata.objects;

        let defaultSettings: GeneralSettings = {
            plotType: {
                plot: 1,
                type: 'line',
            },
        };

        let settings: GeneralSettings = {
            plotType: {
                plot: getValue<number>(objects, 'plotType', 'plot', defaultSettings.plotType.plot),
                type: getValue<string>(objects, 'plotType', 'type', defaultSettings.plotType.type),
            },
        };

        let categorical = dataViews[0].categorical;
        let plotNr: number = settings.plotType.plot;

        if (categorical.categories) {
            for (let category of categorical.categories) {
                xDataPoints = [];
                yDataPoints = [];
                if (Object.keys(category.source.roles)[0] == 'x_plot_' + plotNr) {
                    xDataPoints = <number[]>category.values;
                    Math.min(...xDataPoints);
                }
                if (Object.keys(category.source.roles)[0] == 'y_plot_' + plotNr) {
                    yDataPoints = <number[]>category.values;
                }

                if (xDataPoints.length && yDataPoints.length) {
                    datapoints.push({
                        xValues: xDataPoints,
                        yValues: yDataPoints,
                        xMinLocal: Math.min(...xDataPoints),
                        xMaxLocal: Math.max(...xDataPoints),
                        yMinLocal: Math.min(...yDataPoints),
                        yMaxLocal: Math.max(...yDataPoints),
                        settings: {
                            plotType: {
                                plot: plotNr,
                                type: settings.plotType.type,
                            },
                        },
                    });
                }
            }
        }

        if (categorical.values) {
            for (let value of categorical.values) {
                xDataPoints = [];
                yDataPoints = [];
                if (Object.keys(value.source.roles)[0] == 'x_plot_' + plotNr) {
                    xDataPoints = <number[]>value.values;
                    Math.min(...xDataPoints);
                }
                if (Object.keys(value.source.roles)[0] == 'y_plot_' + plotNr) {
                    yDataPoints = <number[]>value.values;
                }

                if (xDataPoints.length && yDataPoints.length) {
                    datapoints.push({
                        xValues: xDataPoints,
                        yValues: yDataPoints,
                        xMinLocal: Math.min(...xDataPoints),
                        xMaxLocal: Math.max(...xDataPoints),
                        yMinLocal: Math.min(...yDataPoints),
                        yMaxLocal: Math.max(...yDataPoints),
                        settings: {
                            plotType: {
                                plot: plotNr,
                                type: settings.plotType.type,
                            },
                        },
                    });
                }
            }
        }

        return datapoints;
    } catch (error) {
        console.log('Error in main visual transform: ', error());
    }
}
