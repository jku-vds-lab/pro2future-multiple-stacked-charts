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
import { GeneralSettings, visualTransform } from './dataParsing';
export interface LineViewModel {
    plotNr?: number; // this should contain the plot number to know which order the line chart should be at
    dataPoints: LineDataPoint[];
    xDataMin: number;
    xDataMax: number;
    yDataMin: number;
    yDataMax: number;
    settings: LineSettings;
}

export interface LineDataPoint extends SelectableDataPoint {
    //selection can be added here on demand
    xValue: number;
    yValue: number;
}

export interface LineSettings extends GeneralSettings {
    enableAxis: {
        show: boolean;
        fill: string;
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

export function lineVisualTransform(options: VisualUpdateOptions, host: IVisualHost): LineViewModel[] {
    let dataViews = options.dataViews;
    let lineViewModel: LineViewModel = {
        dataPoints: [],
        xDataMin: 0,
        xDataMax: 0,
        yDataMin: 0,
        yDataMax: 0,
        settings: <LineSettings>{},
    };

    try {
        const generalViewModels = visualTransform(options, 'line'); // assuming all plots are line plots

        let lineViewModels: LineViewModel[] = [];

        let lineDataPoints: LineDataPoint[] = [];

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

        for (let model of generalViewModels) {
            let lineSettings: LineSettings = {
                enableAxis: {
                    show: getValue<boolean>(objects, 'enableAxis', 'show', defaultSettings.enableAxis.show),
                    fill: getAxisTextFillColor(objects, colorPalette, defaultSettings.enableAxis.fill),
                },
                plotType: {
                    plot: model.settings.plotType.plot,
                    type: model.settings.plotType.type,
                },
            };

            const maxLengthAttributes = Math.max(model.xValues.length, model.yValues.length);
            let i = 0;

            while (i < maxLengthAttributes) {
                const selectionId: ISelectionId = host
                    .createSelectionIdBuilder()
                    .withMeasure(model.xValues[i].toString())
                    .createSelectionId();

                let dataPoint: LineDataPoint = {
                    xValue: model.xValues[i],
                    yValue: model.yValues[i],
                    identity: selectionId,
                    selected: false,
                };

                lineDataPoints.push(dataPoint);

                i = i + 1;
            }

            lineViewModels.push({
                dataPoints: lineDataPoints,
                xDataMin: model.xMin,
                xDataMax: model.xMax,
                yDataMin: model.yMin,
                yDataMax: model.yMax,
                settings: lineSettings,
            });
        }

        return lineViewModels;
    } catch (error) {
        console.log('Error in lineVisualTransform: ', error());
    }
}
