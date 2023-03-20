import {
    AxisLabelSettingsNames,
    AxisSettingsNames,
    ColorSettingsNames,
    Constants,
    GeneralSettingsNames,
    LegendSettingsNames,
    OverlayPlotSettingsNames,
    PlotSettingsNames,
    Settings,
    TooltipTitleSettingsNames,
    XAxisBreakSettingsNames,
    YRangeSettingsNames,
    ZoomingSettingsNames,
} from './constants';
import { AxisInformation, AxisInformationInterface, Legend, PlotModel, TooltipModel } from './plotInterface';
import { ViewModel } from './viewModel';

export function createFormattingModel(viewModel: ViewModel): powerbi.visuals.FormattingModel {
    const axisCard: powerbi.visuals.FormattingCard = createAxisCard();
    const axisLabelsCard: powerbi.visuals.FormattingCard = createAxisLabelCard();
    const heatmapCard: powerbi.visuals.FormattingCard = createHeatmapCard(viewModel);
    const colorCard: powerbi.visuals.FormattingCard = createColorSettingsCard(viewModel);
    const legendCard: powerbi.visuals.FormattingCard = createLegendCard();
    const overlayCard: powerbi.visuals.FormattingCard = createOverlayCard();
    const plotCard: powerbi.visuals.FormattingCard = createPlotSettingsCard();
    const tooltipTitleCard: powerbi.visuals.FormattingCard = createTooltipTitleCard();
    const xAxisBreakCard: powerbi.visuals.FormattingCard = createXAxisBreakCard(viewModel);
    const yAxisRangeCard: powerbi.visuals.FormattingCard = createYAxisRangeCard();
    const zoomingCard: powerbi.visuals.FormattingCard = createZoomingCard(viewModel);
    const formattingModel: powerbi.visuals.FormattingModel = {
        cards: [axisCard, axisLabelsCard, colorCard, heatmapCard, legendCard, overlayCard, plotCard, tooltipTitleCard, xAxisBreakCard, yAxisRangeCard, zoomingCard],
    };

    for (const plotModel of viewModel.plotModels) {
        addPlotSettingsGroup(plotModel, plotCard);
        addAxisSettingsGroup(plotModel, axisCard);
        addAxisLabelGrouup(plotModel, axisLabelsCard);
        addOverlayGroup(plotModel, overlayCard);
        addYRangeGroup(plotModel, yAxisRangeCard);
    }

    for (const legend of viewModel.legends.legends) {
        addLegendGroup(legend, legendCard);
    }
    if (viewModel.visualOverlayRectangles) {
        addLegendGroup(
            <Legend>{
                legendDataPoints: [],
                legendTitle: viewModel.visualOverlayRectangles.name,
                legendValues: [],
                legendXEndPosition: 0,
                legendXPosition: 0,
                metaDataColumn: viewModel.visualOverlayRectangles.metadetaColumn,
                selectedValues: null,
                type: null,
            },
            legendCard
        );
    }

    for (const tooltip of viewModel.tooltipModels) {
        addTooltipTitleGroup(tooltip, tooltipTitleCard);
    }

    return formattingModel;
}

function createZoomingCard(viewModel: ViewModel) {
    const zoomingCard: powerbi.visuals.FormattingCard = {
        description: 'Zooming Settings',
        displayName: 'Zooming Settings',
        uid: Settings.zoomingSettings + Constants.uid,
        groups: [
            {
                displayName: '',
                uid: 'zooming_' + Constants.uid,
                slices: [
                    {
                        displayName: 'Enable Zoom',
                        uid: 'zooming_show' + Constants.uid,
                        control: {
                            type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                            properties: {
                                descriptor: {
                                    objectName: Settings.zoomingSettings,
                                    propertyName: ZoomingSettingsNames.show,
                                },
                                value: viewModel.zoomingSettings.enableZoom,
                            },
                        },
                    },
                    {
                        displayName: 'Maximum Zoom Factor',
                        uid: 'zooming_maximum' + Constants.uid,
                        control: {
                            type: powerbi.visuals.FormattingComponent.NumUpDown,
                            properties: {
                                descriptor: {
                                    objectName: Settings.zoomingSettings,
                                    propertyName: ZoomingSettingsNames.maximum,
                                },
                                value: viewModel.zoomingSettings.maximumZoom,
                            },
                        },
                    },
                ],
            },
        ],
    };
    zoomingCard.revertToDefaultDescriptors = [
        {
            objectName: Settings.zoomingSettings,
            propertyName: ZoomingSettingsNames.maximum,
        },
        {
            objectName: Settings.zoomingSettings,
            propertyName: ZoomingSettingsNames.show,
        },
    ];
    return zoomingCard;
}

function createYAxisRangeCard() {
    const yAxisRangeCard: powerbi.visuals.FormattingCard = {
        description: 'Y-Axis Range Settings',
        displayName: 'Y-Axis Range Settings',
        uid: Settings.yRangeSettings + Constants.uid,
        groups: [],
    };
    yAxisRangeCard.revertToDefaultDescriptors = [
        {
            objectName: Settings.yRangeSettings,
            propertyName: YRangeSettingsNames.max,
        },
        {
            objectName: Settings.yRangeSettings,
            propertyName: YRangeSettingsNames.min,
        },
        {
            objectName: Settings.yRangeSettings,
            propertyName: YRangeSettingsNames.maxFixed,
        },
        {
            objectName: Settings.yRangeSettings,
            propertyName: YRangeSettingsNames.minFixed,
        },
    ];
    return yAxisRangeCard;
}

function createXAxisBreakCard(viewModel: ViewModel) {
    const xAxisBreakCard: powerbi.visuals.FormattingCard = {
        description: 'X-Axis Break Settings',
        displayName: 'X-Axis Break Settings',
        uid: Settings.xAxisBreakSettings + Constants.uid,
        groups: [
            {
                displayName: '',
                uid: 'x_axis_break_' + Constants.uid,
                slices: [
                    {
                        displayName: 'Enable X-Axis Break',
                        uid: 'x_axis_break_enable' + Constants.uid,
                        control: {
                            type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                            properties: {
                                descriptor: {
                                    objectName: Settings.xAxisBreakSettings,
                                    propertyName: XAxisBreakSettingsNames.enable,
                                },
                                value: viewModel.generalPlotSettings.xAxisSettings.axisBreak,
                            },
                        },
                    },
                    {
                        displayName: 'Show Break Lines',
                        uid: 'x_axis_break_show_lines' + Constants.uid,
                        control: {
                            type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                            properties: {
                                descriptor: {
                                    objectName: Settings.xAxisBreakSettings,
                                    propertyName: XAxisBreakSettingsNames.showLines,
                                },
                                value: viewModel.generalPlotSettings.xAxisSettings.showBreakLines,
                            },
                        },
                    },
                    {
                        displayName: 'Minimum Gap Size (s)',
                        description: 'Minimum gap size between two neighboring data points for displaying break line. Specified in seconds if X-axis is of type date.',
                        uid: 'x_axis_break_gap_size' + Constants.uid,
                        control: {
                            type: powerbi.visuals.FormattingComponent.NumUpDown,
                            properties: {
                                descriptor: {
                                    objectName: Settings.xAxisBreakSettings,
                                    propertyName: XAxisBreakSettingsNames.breakGapSize,
                                },
                                value: viewModel.generalPlotSettings.xAxisSettings.breakGapSize,
                            },
                        },
                    },
                ],
            },
        ],
    };
    xAxisBreakCard.revertToDefaultDescriptors = [
        {
            objectName: Settings.xAxisBreakSettings,
            propertyName: XAxisBreakSettingsNames.enable,
        },
        {
            objectName: Settings.xAxisBreakSettings,
            propertyName: XAxisBreakSettingsNames.showLines,
        },
    ];
    return xAxisBreakCard;
}

function createTooltipTitleCard() {
    const tooltipTitleCard: powerbi.visuals.FormattingCard = {
        description: 'Tooltip Title Settings',
        displayName: 'Tooltip Title Settings',
        uid: Settings.tooltipTitleSettings + Constants.uid,
        groups: [],
    };
    tooltipTitleCard.revertToDefaultDescriptors = [
        {
            objectName: Settings.tooltipTitleSettings,
            propertyName: TooltipTitleSettingsNames.title,
        },
    ];
    return tooltipTitleCard;
}

function addYRangeGroup(plotModel: PlotModel, yAxisRangeCard: powerbi.visuals.FormattingCard) {
    const groupName = 'yRangeSettingsGroup_' + plotModel.plotId;
    yAxisRangeCard.groups.push({
        displayName: plotModel.metaDataColumn.displayName,
        uid: groupName + Constants.uid,
        slices: [
            {
                displayName: 'Minimum Value',
                uid: groupName + YRangeSettingsNames.min + Constants.uid,
                control: {
                    type: powerbi.visuals.FormattingComponent.NumUpDown,
                    properties: {
                        descriptor: {
                            objectName: Settings.yRangeSettings,
                            propertyName: YRangeSettingsNames.min,
                            selector: { metadata: plotModel.metaDataColumn.queryName },
                        },
                        value: plotModel.yRange.min,
                    },
                },
            },
            {
                displayName: 'Maximum Value',
                uid: groupName + YRangeSettingsNames.max + Constants.uid,
                control: {
                    type: powerbi.visuals.FormattingComponent.NumUpDown,
                    properties: {
                        descriptor: {
                            objectName: Settings.yRangeSettings,
                            propertyName: YRangeSettingsNames.max,
                            selector: { metadata: plotModel.metaDataColumn.queryName },
                        },
                        value: plotModel.yRange.max,
                    },
                },
            },
            {
                displayName: 'Fixed Minimum',
                uid: groupName + YRangeSettingsNames.minFixed + Constants.uid,
                control: {
                    type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                    properties: {
                        descriptor: {
                            objectName: Settings.yRangeSettings,
                            propertyName: YRangeSettingsNames.minFixed,
                            selector: { metadata: plotModel.metaDataColumn.queryName },
                        },
                        value: plotModel.yRange.minFixed,
                    },
                },
            },
            {
                displayName: 'Fixed Maximum',
                uid: groupName + YRangeSettingsNames.maxFixed + Constants.uid,
                control: {
                    type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                    properties: {
                        descriptor: {
                            objectName: Settings.yRangeSettings,
                            propertyName: YRangeSettingsNames.maxFixed,
                            selector: { metadata: plotModel.metaDataColumn.queryName },
                        },
                        value: plotModel.yRange.maxFixed,
                    },
                },
            },
        ],
    });
}

function createOverlayCard() {
    const overlayCard: powerbi.visuals.FormattingCard = {
        description: 'Plot Overlay Settings',
        displayName: 'Plot Overlay Settings',
        uid: Settings.overlayPlotSettings + Constants.uid,
        groups: [],
    };
    overlayCard.revertToDefaultDescriptors = [
        {
            objectName: Settings.overlayPlotSettings,
            propertyName: OverlayPlotSettingsNames.overlayType,
        },
    ];
    return overlayCard;
}

function createLegendCard() {
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
    return legendCard;
}

function createHeatmapCard(viewModel: ViewModel) {
    const generalSettingsCard: powerbi.visuals.FormattingCard = {
        description: 'General Settings',
        displayName: 'General Settings',
        uid: Settings.generalSettings + Constants.uid,
        groups: [
            {
                displayName: '',
                uid: Settings.generalSettings + 'group' + Constants.uid,
                slices: [
                    {
                        displayName: 'Number of Heatmap Bins',
                        uid: Settings.generalSettings + GeneralSettingsNames.heatmapBins + Constants.uid,
                        control: {
                            type: powerbi.visuals.FormattingComponent.NumUpDown,
                            properties: {
                                descriptor: {
                                    objectName: Settings.generalSettings,
                                    propertyName: GeneralSettingsNames.heatmapBins,
                                },
                                value: viewModel.generalPlotSettings.heatmapBins,
                            },
                        },
                    },
                    {
                        displayName: 'Minimum plot height',
                        description: 'Sets the minimum height per plot in pixels. A scrollbar is added when this height cannot be fulfilled.',
                        uid: Settings.generalSettings + GeneralSettingsNames.minPlotHeight + Constants.uid,
                        control: {
                            type: powerbi.visuals.FormattingComponent.NumUpDown,
                            properties: {
                                descriptor: {
                                    objectName: Settings.generalSettings,
                                    propertyName: GeneralSettingsNames.minPlotHeight,
                                },
                                value: viewModel.generalPlotSettings.minPlotHeight,
                            },
                        },
                    },
                    {
                        displayName: 'Tooltip Precision',
                        description: 'Sets the precision for numeric tooltip values.',
                        uid: Settings.generalSettings + GeneralSettingsNames.tooltipPrecision + Constants.uid,
                        control: {
                            type: powerbi.visuals.FormattingComponent.NumUpDown,
                            properties: {
                                descriptor: {
                                    objectName: Settings.generalSettings,
                                    propertyName: GeneralSettingsNames.tooltipPrecision,
                                },
                                value: viewModel.generalPlotSettings.tooltipPrecision,
                            },
                        },
                    },
                    {
                        displayName: 'Show 0-Line for Y-Axis',
                        description: 'Displays a horizontal line at position 0 when set to true. Color can be adjusted in color settings.',
                        uid: Settings.generalSettings + GeneralSettingsNames.showYZeroLine + Constants.uid,
                        control: {
                            type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                            properties: {
                                descriptor: {
                                    objectName: Settings.generalSettings,
                                    propertyName: GeneralSettingsNames.showYZeroLine,
                                },
                                value: viewModel.generalPlotSettings.showYZeroLine,
                            },
                        },
                    },
                ],
            },
        ],
    };
    generalSettingsCard.revertToDefaultDescriptors = [
        {
            objectName: Settings.generalSettings,
            propertyName: GeneralSettingsNames.heatmapBins,
        },
        {
            objectName: Settings.generalSettings,
            propertyName: GeneralSettingsNames.minPlotHeight,
        },
        {
            objectName: Settings.generalSettings,
            propertyName: GeneralSettingsNames.showYZeroLine,
        },
    ];
    return generalSettingsCard;
}

function createAxisLabelCard() {
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
    return axisLabelsCard;
}

function addLegendGroup(legend: Legend, legendCard: powerbi.visuals.FormattingCard) {
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

function addTooltipTitleGroup(tooltip: TooltipModel, tooltipTitleCard: powerbi.visuals.FormattingCard) {
    const groupName = 'tooltipSettingsGroup_' + tooltip.metaDataColumn.index;
    tooltipTitleCard.groups.push({
        displayName: tooltip.metaDataColumn.displayName,
        uid: groupName + Constants.uid,
        slices: [
            {
                displayName: 'Tooltip Title',
                uid: groupName + TooltipTitleSettingsNames.title + Constants.uid,
                control: {
                    type: powerbi.visuals.FormattingComponent.TextInput,
                    properties: {
                        descriptor: {
                            objectName: Settings.tooltipTitleSettings,
                            propertyName: TooltipTitleSettingsNames.title,
                            selector: { metadata: tooltip.metaDataColumn.queryName },
                        },
                        placeholder: tooltip.tooltipName,
                        value: tooltip.tooltipName,
                    },
                },
            },
        ],
    });
}

function addAxisLabelGrouup(plotModel: PlotModel, axisLabelsCard: powerbi.visuals.FormattingCard) {
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

function addOverlayGroup(plotModel: PlotModel, overlayCard: powerbi.visuals.FormattingCard) {
    const groupName = 'plotOverlaySettingsGroup_' + plotModel.plotId;
    overlayCard.groups.push({
        displayName: plotModel.metaDataColumn.displayName,
        uid: groupName + Constants.uid,
        slices: [
            {
                displayName: 'Overlay Type',
                uid: groupName + OverlayPlotSettingsNames.overlayType + Constants.uid,
                control: {
                    type: powerbi.visuals.FormattingComponent.Dropdown,
                    properties: {
                        descriptor: {
                            objectName: Settings.overlayPlotSettings,
                            propertyName: OverlayPlotSettingsNames.overlayType,
                            selector: { metadata: plotModel.metaDataColumn.queryName },
                        },

                        value: plotModel.overlayPlotSettings.overlayPlotSettings.overlayType,
                    },
                },
            },
        ],
    });
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
                        displayName: 'Axis Break Line Color',
                        description: 'The stroke color of the X-Axis break lines.',
                        uid: groupName + ColorSettingsNames.breakLineColor + Constants.uid,
                        control: {
                            type: powerbi.visuals.FormattingComponent.ColorPicker,
                            properties: {
                                descriptor: {
                                    objectName: Settings.colorSettings,
                                    propertyName: ColorSettingsNames.breakLineColor,
                                },
                                value: { value: viewModel.colorSettings.colorSettings.breakLineColor },
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
    colorCardRevertDefault(colorCard);
    return colorCard;
}

function colorCardRevertDefault(colorCard: powerbi.visuals.FormattingCard) {
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
            propertyName: ColorSettingsNames.breakLineColor,
        },
        {
            objectName: Settings.colorSettings,
            propertyName: ColorSettingsNames.heatmapColorScheme,
        },
    ];
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
            propertyName: PlotSettingsNames.plotTitle,
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
                displayName: 'Plot Title',
                uid: groupName + PlotSettingsNames.plotTitle + Constants.uid,
                control: {
                    type: powerbi.visuals.FormattingComponent.TextInput,
                    properties: {
                        descriptor: {
                            objectName: Settings.plotSettings,
                            propertyName: PlotSettingsNames.plotTitle,
                            selector: { metadata: plotModel.metaDataColumn.queryName },
                        },
                        value: plotModel.plotSettings.plotTitle,
                        placeholder: plotModel.plotSettings.plotTitle,
                    },
                },
            },
            {
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
