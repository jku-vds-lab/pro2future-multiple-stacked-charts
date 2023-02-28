import { AxisLabelSettingsNames, AxisSettingsNames, ColorSettingsNames, Constants, HeatmapSettingsNames, LegendSettingsNames, PlotSettingsNames, Settings } from './constants';
import { AxisInformation, AxisInformationInterface, PlotModel, ViewModel } from './plotInterface';

// eslint-disable-next-line max-lines-per-function
export function createFormattingModel(viewModel: ViewModel): powerbi.visuals.FormattingModel {
    const axisCard: powerbi.visuals.FormattingCard = createAxisCard();

    const axisLabelsCard: powerbi.visuals.FormattingCard = {
        description: 'Axis Label Settings',
        displayName: 'Axis Label Settings',
        uid: Settings.axisLabelSettings + Constants.uid,
        groups: [],
    };
    axisLabelsCard.revertToDefaultDescriptors = [
        {
            objectName: Settings.axisLabelSettings,
            propertyName: AxisLabelSettingsNames.xLabel,
        },
        {
            objectName: Settings.axisLabelSettings,
            propertyName: AxisLabelSettingsNames.yLabel,
        },
    ];
    const heatmapCard: powerbi.visuals.FormattingCard = {
        description: 'Heatmap Settings',
        displayName: 'Heatmap Settings',
        uid: Settings.heatmapSettings + Constants.uid,
        groups: [
            {
                displayName: '',
                uid: Settings.heatmapSettings + 'group' + Constants.uid,
                slices: [
                    {
                        displayName: 'Number of Bins',
                        uid: Settings.heatmapSettings + HeatmapSettingsNames.heatmapBins + Constants.uid,
                        control: {
                            type: powerbi.visuals.FormattingComponent.NumUpDown,
                            properties: {
                                descriptor: {
                                    objectName: Settings.heatmapSettings,
                                    propertyName: HeatmapSettingsNames.heatmapBins,
                                },
                                value: viewModel.heatmapSettings.heatmapBins,
                            },
                        },
                    },
                ],
            },
        ],
    };
    heatmapCard.revertToDefaultDescriptors = [
        {
            objectName: Settings.heatmapSettings,
            propertyName: HeatmapSettingsNames.heatmapBins,
        },
    ];

    const colorCard: powerbi.visuals.FormattingCard = createColorSettingsCard(viewModel);

    const legendCard: powerbi.visuals.FormattingCard = {
        description: 'Legend Settings',
        displayName: 'Legend Settings',
        uid: Settings.legendSettings + Constants.uid,
        groups: [],
    };
    legendCard.revertToDefaultDescriptors = [
        {
            objectName: Settings.legendSettings,
            propertyName: LegendSettingsNames.legendTitle,
        },
    ];

    const plotCard: powerbi.visuals.FormattingCard = createPlotSettingsCard();
    const formattingModel: powerbi.visuals.FormattingModel = { cards: [axisCard, axisLabelsCard, colorCard, heatmapCard, legendCard, plotCard] };

    for (const plotModel of viewModel.plotModels) {
        addPlotSettingsGroup(plotModel, plotCard);
        addAxisSettingsGroup(plotModel, axisCard);
        const groupName = 'axisLabelSettingsGroup_' + plotModel.plotId;
        axisLabelsCard.groups.push({
            displayName: plotModel.metaDataColumn.displayName,
            uid: groupName + Constants.uid,
            slices: [
                {
                    displayName: 'X-Label',
                    uid: groupName + AxisLabelSettingsNames.xLabel + Constants.uid,
                    control: {
                        type: powerbi.visuals.FormattingComponent.TextInput,
                        properties: {
                            descriptor: {
                                objectName: Settings.axisLabelSettings,
                                propertyName: AxisLabelSettingsNames.xLabel,
                                selector: { metadata: plotModel.metaDataColumn.queryName },
                            },
                            placeholder: plotModel.labelNames.xLabel,
                            value: plotModel.labelNames.xLabel,
                        },
                    },
                },
                {
                    displayName: 'Y-Label',
                    uid: groupName + AxisLabelSettingsNames.yLabel + Constants.uid,
                    control: {
                        type: powerbi.visuals.FormattingComponent.TextInput,
                        properties: {
                            descriptor: {
                                objectName: Settings.axisLabelSettings,
                                propertyName: AxisLabelSettingsNames.yLabel,
                                selector: { metadata: plotModel.metaDataColumn.queryName },
                            },
                            placeholder: plotModel.labelNames.yLabel,
                            value: plotModel.labelNames.yLabel,
                        },
                    },
                },
            ],
        });
    }

    for (const legend of viewModel.legends.legends) {
        const groupName = 'legendSettingsGroup_' + legend.metaDataColumn.index;
        legendCard.groups.push({
            displayName: legend.metaDataColumn.displayName,
            uid: groupName + Constants.uid,
            slices: [
                {
                    displayName: 'Legend Title',
                    uid: groupName + LegendSettingsNames.legendTitle + Constants.uid,
                    control: {
                        type: powerbi.visuals.FormattingComponent.TextInput,
                        properties: {
                            descriptor: {
                                objectName: Settings.legendSettings,
                                propertyName: LegendSettingsNames.legendTitle,
                                selector: { metadata: legend.metaDataColumn.queryName },
                            },
                            placeholder: legend.legendTitle,
                            value: legend.legendTitle,
                        },
                    },
                },
            ],
        });
    }

    return formattingModel;
}

function createColorSettingsCard(viewModel: ViewModel) {
    const groupName = 'colorSettings';
    const colorCard: powerbi.visuals.FormattingCard = {
        description: 'Color Settings',
        displayName: 'Color Settings',
        uid: Settings.colorSettings + Constants.uid,
        groups: [
            {
                displayName: '',
                uid: groupName + Constants.uid,
                slices: [
                    {
                        displayName: 'Vertical Ruler Color',
                        uid: groupName + ColorSettingsNames.verticalRulerColor + Constants.uid,
                        control: {
                            type: powerbi.visuals.FormattingComponent.ColorPicker,
                            properties: {
                                descriptor: {
                                    objectName: Settings.colorSettings,
                                    propertyName: ColorSettingsNames.verticalRulerColor,
                                },
                                value: { value: viewModel.colorSettings.colorSettings.verticalRulerColor },
                            },
                        },
                    },
                    {
                        displayName: 'Plot Overlay Color',
                        uid: groupName + ColorSettingsNames.overlayColor + Constants.uid,
                        control: {
                            type: powerbi.visuals.FormattingComponent.ColorPicker,
                            properties: {
                                descriptor: {
                                    objectName: Settings.colorSettings,
                                    propertyName: ColorSettingsNames.overlayColor,
                                },
                                value: { value: viewModel.colorSettings.colorSettings.overlayColor },
                            },
                        },
                    },
                    {
                        displayName: 'Horizontal Zero Line Color',
                        uid: groupName + ColorSettingsNames.yZeroLineColor + Constants.uid,
                        control: {
                            type: powerbi.visuals.FormattingComponent.ColorPicker,
                            properties: {
                                descriptor: {
                                    objectName: Settings.colorSettings,
                                    propertyName: ColorSettingsNames.yZeroLineColor,
                                },
                                value: { value: viewModel.colorSettings.colorSettings.yZeroLineColor },
                            },
                        },
                    },
                    {
                        displayName: 'Heatmap Color Scheme',
                        uid: groupName + ColorSettingsNames.heatmapColorScheme + Constants.uid,
                        control: {
                            type: powerbi.visuals.FormattingComponent.Dropdown,
                            properties: {
                                descriptor: {
                                    objectName: Settings.colorSettings,
                                    propertyName: ColorSettingsNames.heatmapColorScheme,
                                },
                                value: viewModel.colorSettings.colorSettings.heatmapColorScheme,
                            },
                        },
                    },
                ],
            },
        ],
    };
    colorCard.revertToDefaultDescriptors = [
        {
            objectName: Settings.colorSettings,
            propertyName: ColorSettingsNames.verticalRulerColor,
        },
        {
            objectName: Settings.colorSettings,
            propertyName: ColorSettingsNames.overlayColor,
        },
        {
            objectName: Settings.colorSettings,
            propertyName: ColorSettingsNames.yZeroLineColor,
        },
        {
            objectName: Settings.colorSettings,
            propertyName: ColorSettingsNames.heatmapColorScheme,
        },
    ];
    return colorCard;
}

function createPlotSettingsCard() {
    const plotCard: powerbi.visuals.FormattingCard = {
        description: 'Plot Settings',
        displayName: 'Plot Settings',
        uid: Settings.plotSettings + Constants.uid,
        groups: [],
    };
    plotCard.revertToDefaultDescriptors = [
        {
            objectName: Settings.plotSettings,
            propertyName: PlotSettingsNames.plotType,
        },
        {
            objectName: Settings.plotSettings,
            propertyName: PlotSettingsNames.fill,
        },

        {
            objectName: Settings.plotSettings,
            propertyName: PlotSettingsNames.useLegendColor,
        },
        {
            objectName: Settings.plotSettings,
            propertyName: PlotSettingsNames.showHeatmap,
        },
    ];
    return plotCard;
}

function addAxisSettingsGroup(plotModel: PlotModel, axisCard: powerbi.visuals.FormattingCard) {
    const groupName = 'axisSettingsGroup_' + plotModel.plotId;
    axisCard.groups.push({
        displayName: plotModel.metaDataColumn.displayName,
        uid: groupName + Constants.uid,
        slices: [
            {
                displayName: 'X-Axis',
                uid: groupName + AxisSettingsNames.xAxis + Constants.uid,
                control: {
                    type: powerbi.visuals.FormattingComponent.Dropdown,
                    properties: {
                        descriptor: {
                            objectName: Settings.axisSettings,
                            propertyName: AxisSettingsNames.xAxis,
                            selector: { metadata: plotModel.metaDataColumn.queryName },
                        },
                        value: getAxisInformationEnumValue(plotModel.formatSettings.axisSettings.xAxis),
                    },
                },
            },
            {
                displayName: 'Y-Axis',
                uid: groupName + AxisSettingsNames.yAxis + Constants.uid,
                control: {
                    type: powerbi.visuals.FormattingComponent.Dropdown,
                    properties: {
                        descriptor: {
                            objectName: Settings.axisSettings,
                            propertyName: AxisSettingsNames.yAxis,
                            selector: { metadata: plotModel.metaDataColumn.queryName },
                        },
                        value: getAxisInformationEnumValue(plotModel.formatSettings.axisSettings.yAxis),
                    },
                },
            },
        ],
    });
}

function createAxisCard() {
    const axisCard: powerbi.visuals.FormattingCard = {
        description: 'Axis Settings',
        displayName: 'Axis Settings',
        uid: Settings.axisSettings + Constants.uid,
        groups: [],
    };
    axisCard.revertToDefaultDescriptors = [
        {
            objectName: Settings.axisSettings,
            propertyName: AxisSettingsNames.xAxis,
        },
        {
            objectName: Settings.axisSettings,
            propertyName: AxisSettingsNames.yAxis,
        },
    ];
    return axisCard;
}

function getAxisInformationEnumValue(axisInfo: AxisInformationInterface): AxisInformation {
    let axisEnumValue = AxisInformation.None;
    if (axisInfo.lables && axisInfo.ticks) {
        axisEnumValue = AxisInformation.TicksLabels;
    } else if (!axisInfo.lables && axisInfo.ticks) {
        axisEnumValue = AxisInformation.Ticks;
    } else if (axisInfo.lables && !axisInfo.ticks) {
        axisEnumValue = AxisInformation.Labels;
    }
    return axisEnumValue;
}

function addPlotSettingsGroup(plotModel: PlotModel, plotCard: powerbi.visuals.FormattingCard) {
    const groupName = 'plotSettingsGroup_' + plotModel.plotId;
    plotCard.groups.push({
        displayName: plotModel.metaDataColumn.displayName,
        uid: groupName + Constants.uid,
        slices: [
            {
                displayName: 'Plot Type',
                uid: groupName + PlotSettingsNames.plotType + Constants.uid,
                control: {
                    type: powerbi.visuals.FormattingComponent.Dropdown,
                    properties: {
                        descriptor: {
                            objectName: Settings.plotSettings,
                            propertyName: PlotSettingsNames.plotType,
                            selector: { metadata: plotModel.metaDataColumn.queryName },
                        },
                        value: plotModel.plotSettings.plotType,
                    },
                },
            },
            {
                displayName: 'Plot Color',
                uid: groupName + PlotSettingsNames.fill + Constants.uid,
                control: {
                    type: powerbi.visuals.FormattingComponent.ColorPicker,
                    properties: {
                        descriptor: {
                            objectName: Settings.plotSettings,
                            propertyName: PlotSettingsNames.fill,
                            selector: { metadata: plotModel.metaDataColumn.queryName },
                        },
                        value: { value: plotModel.plotSettings.fill },
                    },
                },
            },
            {
                //TODO: fix error when setting to true on some plots
                displayName: 'Use Legend Color',
                uid: groupName + PlotSettingsNames.useLegendColor + Constants.uid,
                control: {
                    type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                    properties: {
                        descriptor: {
                            objectName: Settings.plotSettings,
                            propertyName: PlotSettingsNames.useLegendColor,
                            selector: { metadata: plotModel.metaDataColumn.queryName },
                        },
                        value: plotModel.plotSettings.useLegendColor,
                    },
                },
            },
            {
                displayName: 'Show Heatmap',
                uid: groupName + PlotSettingsNames.showHeatmap + Constants.uid,
                control: {
                    type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                    properties: {
                        descriptor: {
                            objectName: Settings.plotSettings,
                            propertyName: PlotSettingsNames.showHeatmap,
                            selector: { metadata: plotModel.metaDataColumn.queryName },
                        },
                        value: plotModel.plotSettings.showHeatmap,
                    },
                },
            },
        ],
    });
}
