import powerbi from 'powerbi-visuals-api';
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import { interactivitySelectionService } from 'powerbi-visuals-utils-interactivityutils';
import SelectableDataPoint = interactivitySelectionService.SelectableDataPoint;
import ISelectionId = powerbi.visuals.ISelectionId;
import PrimitiveValue = powerbi.PrimitiveValue;
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import { getValue, getAxisTextFillColor, getColumnnColorByIndex } from './objectEnumerationUtility';
export interface LineViewModel {
    plotNr?: number; // this should contain the plot number to know which order the line chart should be at
    dataPoints: LineDataPoint[];
    xDataMax: number;
    yDataMax: number;
    settings: LineSettings;
}

export interface LineDataPoint extends SelectableDataPoint {
    //selection can be added here on demand
    xValue: PrimitiveValue;
    yValue: PrimitiveValue;
}

export interface LineSettings {
    enableAxis: {
        show: boolean;
        fill: string;
    };

    plotType: {
        plot: number;
        type: string;
    };
}

export interface Legend {
    text: string;
    transform?: string;
    dx?: string;
    dy?: string;
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

export function lineVisualTransform(options: VisualUpdateOptions, host: IVisualHost): LineViewModel {
    let dataViews = options.dataViews;
    let viewModel: LineViewModel = {
        dataPoints: [],
        xDataMax: 0,
        yDataMax: 0,
        settings: <LineSettings>{},
    };

    try {
        let xAxisValue: any;
        let yAxisValue: any;

        // Data parsing step
        if (!dataViews || !dataViews[0] || !dataViews[0].categorical) {
            return viewModel;
        }

        let categorical = dataViews[0].categorical;

        if (categorical.categories) {
            for (let category of categorical.categories) {
                if (Object.keys(category.source.roles)[0] == 'x_plot_1') {
                    xAxisValue = category;
                }
                if (Object.keys(category.source.roles)[0] == 'y_plot_1') {
                    yAxisValue = category;
                }
            }
        }

        if (categorical.values) {
            for (let value of categorical.values) {
                if (Object.keys(value.source.roles)[0] == 'x_plot_1') {
                    xAxisValue = value;
                }
                if (Object.keys(value.source.roles)[0] == 'y_plot_1') {
                    yAxisValue = value;
                }
            }
        }

        let lineDataPoints: LineDataPoint[] = [];
        let xDataMax: number;
        let yDataMax: number;

        let colorPalette: ISandboxExtendedColorPalette = host.colorPalette;
        let objects = dataViews[0].metadata.objects;

        let defaultSettings: LineSettings = {
            enableAxis: {
                show: true,
                fill: '#000000',
            },
            plotType: {
                plot: 1,
                type: 'line',
            },
        };

        debugger;

        // works, able to get 2 and bar for plot type
        let lineSettings: LineSettings = {
            enableAxis: {
                show: getValue<boolean>(objects, 'enableAxis', 'show', defaultSettings.enableAxis.show),
                fill: getAxisTextFillColor(objects, colorPalette, defaultSettings.enableAxis.fill),
            },
            plotType: {
                plot: getValue<number>(objects, 'plotType', 'plot', defaultSettings.plotType.plot),
                type: getValue<string>(objects, 'plotType', 'type', defaultSettings.plotType.type),
            },
        };

        const maxLengthAttributes = Math.max(xAxisValue.values.length, yAxisValue.values.length);

        let i = 0;

        while (i < maxLengthAttributes) {
            const selectionId: ISelectionId = host
                .createSelectionIdBuilder()
                .withMeasure(xAxisValue.values[i].toString())
                .createSelectionId();

            let dataPoint: LineDataPoint = {
                yValue: yAxisValue.values[i],
                xValue: xAxisValue.values[i],
                identity: selectionId,
                selected: false,
            };

            lineDataPoints.push(dataPoint);

            i = i + 1;
        }

        xDataMax = 500; //<number>xAxisValue.maxLocal; // To be fixed
        yDataMax = 12; //<number>yAxisValue.maxLocal; // To be fixed

        return {
            dataPoints: lineDataPoints,
            xDataMax: xDataMax,
            yDataMax: yDataMax,
            settings: lineSettings,
        };
    } catch (error) {
        console.log('Error in lineVisualTransform: ', error());
    }
}
