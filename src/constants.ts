export enum Settings {
    plotSettings = 'plotSettings',
    colorSelector = 'colorSelector',
    colorSettings = 'colorSettings',
    generalSettings = 'generalSettings',
    legendSettings = 'legendSettings',
    tooltipTitleSettings = 'tooltipTitleSettings',
    zoomingSettings = 'zoomingSettings',
    xAxisBreakSettings = 'xAxisBreakSettings',
}

export enum GeneralSettingsNames {
    heatmapBins = 'heatmapBins',
    minPlotHeight = 'minPlotHeight',
    tooltipPrecision = 'tooltipPrecision',
    showYZeroLine = 'showYZeroLine',
}

export enum XAxisBreakSettingsNames {
    enable = 'enable',
    showLines = 'showLines',
    breakGapSize = 'breakGapSize',
}
export enum LegendSettingsNames {
    legendTitle = 'legendTitle',
}

export enum PlotSettingsNames {
    plotType = 'plotType',
    fill = 'fill',
    useLegendColor = 'useLegendColor',
    showHeatmap = 'showHeatmap',
    plotTitle = 'plotTitle',
    overlayType = 'overlayType',
    centerOverlay = 'centerOverlay',
    plotHeightFactor = 'plotHeightFactor',
    xAxisDisplay = 'xAxisDisplay',
    yAxisDisplay = 'yAxisDisplay',
    xLabel = 'xLabel',
    yLabel = 'yLabel',
    yMinFixed = 'yMinFixed',
    yMin = 'yMin',
    yMaxFixed = 'yMaxFixed',
    yMax = 'yMax',
}
export enum TooltipTitleSettingsNames {
    title = 'title',
}

export enum ColorSettingsNames {
    verticalRulerColor = 'verticalRulerColor',
    breakLineColor = 'breakLineColor',
    overlayColor = 'overlayColor',
    heatmapColorScheme = 'heatmapColorScheme',
    yZeroLineColor = 'yZeroLineColor',
}

export enum ZoomingSettingsNames {
    saveZoomState = 'saveZoomState',
    show = 'show',
    maximum = 'maximum',
    zoomState = 'zoomState',
}

export enum ColorSelectorNames {
    fill = 'fill',
}

export enum Constants {
    verticalRulerClass = 'hover-line',
    yZeroLine = 'yZeroLine',
    overlayClass = 'overlayBars',
    barClass = 'bar',
    dotClass = 'dot',
    visualOverlayClass = 'visualOverlay',
    categoricalLegendClass = 'categoricalLegend',
    zoomState = 'zoomState',
    axisBreakClass = 'axisBreakLines',
    legendTitleSelection = 'legendTitle',
    VisualOverlayLegendTitleSelection = 'visualOverlayLegendTitle',
    uid = '_uid',
    tooltipClass = 'tooltipDiv',
}

export enum FilterType {
    booleanFilter = 'booleanFilter',
    stringFilter = 'stringFilter',
    numberFilter = 'numberFilter',
    colorFilter = 'colorFilter',
}

export class ArrayConstants {
    static readonly colorSchemes = {
        sequential: ['BuGn', 'BuPu', 'GnBu', 'OrRd', 'PuBu', 'PuBuGn', 'PuRd', 'RdPu', 'YlGn', 'YlGnBu', 'YlOrBr', 'YlOrRd'],
        singlehue: ['Blues', 'Greens', 'Greys', 'Oranges', 'Purples', 'Reds'],
        diverging: ['BrBG', 'PiYG', 'PRGn', 'PuOr', 'RdBu', 'RdGy', 'RdYlBu', 'RdYlGn', 'Spectral'],
    };

    static readonly legendColors = {
        OZE: '#e41a1c',
        GZE: '#377eb8',
        RAS: '#4daf4a',
        EOZ: '#a42ee8',
    };
    static readonly groupValues = {
        Kontrolleur: 'Kontrolleur',
        OIG: 'OIG',
    };
    static readonly visualOverlayColors = {
        'nicht gewalzt': '#ffffff',
        'gewalzt ohne Fehler': '#2ca25f',
        'gewalzt mit Fehler': '#de2d26',
    };

    static readonly colorArray = [
        '#e41a1c',
        '#377eb8',
        '#4daf4a',
        '#984ea3',
        '#ff7f00',
        '#ffff33',
        '#a65628',
        '#f781bf',
        '#999999',
        '#66c2a5',
        '#fc8d62',
        '#8da0cb',
        '#e78ac3',
        '#a6d854',
        '#ffd92f',
        '#e5c494',
        '#b3b3b3',
    ];
}

export class NumberConstants {
    static readonly legendDeselectionOpacity = 0.3;
}
