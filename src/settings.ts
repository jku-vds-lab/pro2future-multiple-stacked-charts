import {
    ColorSettingsNames,
    Constants,
    GeneralSettingsNames,
    LegendSettingsNames,
    PlotSettingsNames,
    Settings,
    TooltipTitleSettingsNames,
    XAxisBreakSettingsNames,
    ZoomingSettingsNames,
} from './constants';
import { AxisInformation, AxisInformationInterface, Legend, PlotModel, TooltipModel } from './plotInterface';
import { ViewModel } from './viewModel';

export function createFormattingModel(viewModel: ViewModel): powerbi.visuals.FormattingModel {
    const colorCard: powerbi.visuals.FormattingCard = createColorSettingsCard(viewModel);
    const generalSettingsCard: powerbi.visuals.FormattingCard = createGeneralSettingsCard(viewModel);
    const legendCard: powerbi.visuals.FormattingCard = createLegendCard();
    const plotCard: powerbi.visuals.FormattingCard = createPlotSettingsCard();
    const tooltipTitleCard: powerbi.visuals.FormattingCard = createTooltipTitleCard();
    const xAxisBreakCard: powerbi.visuals.FormattingCard = createXAxisBreakCard(viewModel);
    const zoomingCard: powerbi.visuals.FormattingCard = createZoomingCard(viewModel);
    const formattingModel: powerbi.visuals.FormattingModel = {
        cards: [colorCard, generalSettingsCard, legendCard, plotCard, tooltipTitleCard, xAxisBreakCard, zoomingCard],
    };

    for (const plotModel of viewModel.plotModels) {
        addPlotSettingsGroup(plotModel, plotCard);
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
                    {
                        displayName: 'Save Zoom State',
                        uid: 'zooming_save' + Constants.uid,
                        control: {
                            type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                            properties: {
                                descriptor: {
                                    objectName: Settings.zoomingSettings,
                                    propertyName: ZoomingSettingsNames.saveZoomState,
                                },
                                value: viewModel.zoomingSettings.saveZoomState,
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
        {
            objectName: Settings.zoomingSettings,
            propertyName: ZoomingSettingsNames.saveZoomState,
        },
    ];
    return zoomingCard;
}

function createXAxisBreakCard(viewModel: ViewModel) {
    let minGapName = 'Minimum X-Distance';
    if (viewModel.generalPlotSettings.xAxisSettings.isDate) minGapName += ' (s)';
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
                        displayName: minGapName,
                        description: 'Minimum X-distance between two neighboring data points for displaying break line. Specified in seconds if X-axis is of type date.',
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
        {
            objectName: Settings.xAxisBreakSettings,
            propertyName: XAxisBreakSettingsNames.breakGapSize,
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

function createLegendCard() {
    const legendCard: powerbi.visuals.FormattingCard = {
        description: 'Legend Title Settings',
        displayName: 'Legend Title Settings',
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

function createGeneralSettingsCard(viewModel: ViewModel) {
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
                        displayName: 'Minimum plot height (px)',
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
                        displayName: 'Tooltip Decimal Places',
                        description: 'Sets the precision of numeric tooltip values.',
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
            propertyName: GeneralSettingsNames.tooltipPrecision,
        },
        {
            objectName: Settings.generalSettings,
            propertyName: GeneralSettingsNames.showYZeroLine,
        },
    ];
    return generalSettingsCard;
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
            propertyName: PlotSettingsNames.plotTitle,
        },
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
        {
            objectName: Settings.plotSettings,
            propertyName: PlotSettingsNames.overlayType,
        },
        {
            objectName: Settings.plotSettings,
            propertyName: PlotSettingsNames.centerOverlay,
        },
        {
            objectName: Settings.plotSettings,
            propertyName: PlotSettingsNames.plotHeightFactor,
        },
        {
            objectName: Settings.plotSettings,
            propertyName: PlotSettingsNames.xAxisDisplay,
        },
        {
            objectName: Settings.plotSettings,
            propertyName: PlotSettingsNames.xLabel,
        },
        {
            objectName: Settings.plotSettings,
            propertyName: PlotSettingsNames.yAxisDisplay,
        },
        {
            objectName: Settings.plotSettings,
            propertyName: PlotSettingsNames.yLabel,
        },
        {
            objectName: Settings.plotSettings,
            propertyName: PlotSettingsNames.yMinFixed,
        },
        {
            objectName: Settings.plotSettings,
            propertyName: PlotSettingsNames.yMin,
        },
        {
            objectName: Settings.plotSettings,
            propertyName: PlotSettingsNames.yMaxFixed,
        },
        {
            objectName: Settings.plotSettings,
            propertyName: PlotSettingsNames.yMax,
        },
    ];
    return plotCard;
}

function getAxisInformationEnumValue(axisInfo: AxisInformationInterface): AxisInformation {
    let axisEnumValue = AxisInformation.None;
    if (axisInfo.labels && axisInfo.ticks) {
        axisEnumValue = AxisInformation.TicksLabels;
    } else if (!axisInfo.labels && axisInfo.ticks) {
        axisEnumValue = AxisInformation.Ticks;
    } else if (axisInfo.labels && !axisInfo.ticks) {
        axisEnumValue = AxisInformation.Labels;
    }
    return axisEnumValue;
}

// eslint-disable-next-line max-lines-per-function
function addPlotSettingsGroup(plotModel: PlotModel, plotCard: powerbi.visuals.FormattingCard) {
    const groupName = 'plotSettingsGroup_' + plotModel.plotId;
    plotCard.groups.push({
        displayName: plotModel.metaDataColumn.displayName,
        uid: groupName + Constants.uid,
        slices: [
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
                displayName: 'Use Categorical Legend Color',
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
            {
                displayName: 'Overlay Type',
                uid: groupName + PlotSettingsNames.overlayType + Constants.uid,
                control: {
                    type: powerbi.visuals.FormattingComponent.Dropdown,
                    properties: {
                        descriptor: {
                            objectName: Settings.plotSettings,
                            propertyName: PlotSettingsNames.overlayType,
                            selector: { metadata: plotModel.metaDataColumn.queryName },
                        },

                        value: plotModel.plotSettings.overlayType,
                    },
                },
            },
            {
                displayName: 'Center Overlay',
                uid: groupName + PlotSettingsNames.centerOverlay + Constants.uid,
                description:'Centers overlay vertically if enabled.',
                control: {
                    type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                    properties: {
                        descriptor: {
                            objectName: Settings.plotSettings,
                            propertyName: PlotSettingsNames.centerOverlay,
                            selector: { metadata: plotModel.metaDataColumn.queryName },
                        },
                        value: plotModel.plotSettings.centerOverlay,
                    },
                },
            },
            {
                displayName: 'Plot Height Factor',
                uid: groupName + PlotSettingsNames.plotHeightFactor + Constants.uid,
                control: {
                    type: powerbi.visuals.FormattingComponent.NumUpDown,
                    properties: {
                        descriptor: {
                            objectName: Settings.plotSettings,
                            propertyName: PlotSettingsNames.plotHeightFactor,
                            selector: { metadata: plotModel.metaDataColumn.queryName },
                        },
                        value: plotModel.plotSettings.plotHeightFactor,
                    },
                },
            },
            {
                displayName: 'X-Axis',
                uid: groupName + PlotSettingsNames.xAxisDisplay + Constants.uid,
                control: {
                    type: powerbi.visuals.FormattingComponent.Dropdown,
                    properties: {
                        descriptor: {
                            objectName: Settings.plotSettings,
                            propertyName: PlotSettingsNames.xAxisDisplay,
                            selector: { metadata: plotModel.metaDataColumn.queryName },
                        },
                        value: getAxisInformationEnumValue(plotModel.plotSettings.xAxis),
                    },
                },
            },
            {
                displayName: 'X-Label',
                uid: groupName + PlotSettingsNames.xLabel + Constants.uid,
                control: {
                    type: powerbi.visuals.FormattingComponent.TextInput,
                    properties: {
                        descriptor: {
                            objectName: Settings.plotSettings,
                            propertyName: PlotSettingsNames.xLabel,
                            selector: { metadata: plotModel.metaDataColumn.queryName },
                        },
                        placeholder: plotModel.plotSettings.xLabel,
                        value: plotModel.plotSettings.xLabel,
                    },
                },
            },
            {
                displayName: 'Y-Axis',
                uid: groupName + PlotSettingsNames.yAxisDisplay + Constants.uid,
                control: {
                    type: powerbi.visuals.FormattingComponent.Dropdown,
                    properties: {
                        descriptor: {
                            objectName: Settings.plotSettings,
                            propertyName: PlotSettingsNames.yAxisDisplay,
                            selector: { metadata: plotModel.metaDataColumn.queryName },
                        },
                        value: getAxisInformationEnumValue(plotModel.plotSettings.yAxis),
                    },
                },
            },
            {
                displayName: 'Y-Label',
                uid: groupName + PlotSettingsNames.yLabel + Constants.uid,
                control: {
                    type: powerbi.visuals.FormattingComponent.TextInput,
                    properties: {
                        descriptor: {
                            objectName: Settings.plotSettings,
                            propertyName: PlotSettingsNames.yLabel,
                            selector: { metadata: plotModel.metaDataColumn.queryName },
                        },
                        placeholder: plotModel.plotSettings.yLabel,
                        value: plotModel.plotSettings.yLabel,
                    },
                },
            },
            {
                displayName: 'Fixed Y-Minimum',
                uid: groupName + PlotSettingsNames.yMinFixed + Constants.uid,
                control: {
                    type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                    properties: {
                        descriptor: {
                            objectName: Settings.plotSettings,
                            propertyName: PlotSettingsNames.yMinFixed,
                            selector: { metadata: plotModel.metaDataColumn.queryName },
                        },
                        value: plotModel.plotSettings.yRange.minFixed,
                    },
                },
            },
            {
                displayName: 'Minimum Y-Value',
                uid: groupName + PlotSettingsNames.yMin + Constants.uid,
                control: {
                    type: powerbi.visuals.FormattingComponent.NumUpDown,
                    properties: {
                        descriptor: {
                            objectName: Settings.plotSettings,
                            propertyName: PlotSettingsNames.yMin,
                            selector: { metadata: plotModel.metaDataColumn.queryName },
                        },
                        value: plotModel.plotSettings.yRange.min,
                    },
                },
            },
            {
                displayName: 'Fixed Y-Maximum',
                uid: groupName + PlotSettingsNames.yMaxFixed + Constants.uid,
                control: {
                    type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                    properties: {
                        descriptor: {
                            objectName: Settings.plotSettings,
                            propertyName: PlotSettingsNames.yMaxFixed,
                            selector: { metadata: plotModel.metaDataColumn.queryName },
                        },
                        value: plotModel.plotSettings.yRange.maxFixed,
                    },
                },
            },
            {
                displayName: 'Maximum Y-Value',
                uid: groupName + PlotSettingsNames.yMax + Constants.uid,
                control: {
                    type: powerbi.visuals.FormattingComponent.NumUpDown,
                    properties: {
                        descriptor: {
                            objectName: Settings.plotSettings,
                            propertyName: PlotSettingsNames.yMax,
                            selector: { metadata: plotModel.metaDataColumn.queryName },
                        },
                        value: plotModel.plotSettings.yRange.max,
                    },
                },
            },
        ],
    });
}
