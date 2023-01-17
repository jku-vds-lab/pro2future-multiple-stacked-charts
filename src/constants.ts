export enum Settings {
    plotSettings = 'plotSettings',
    axisSettings = 'axisSettings',
    colorSelector = 'colorSelector',
    colorSettings = 'colorSettings',
    heatmapSettings = 'heatmapSettings',
    legendSettings = 'legendSettings',
    overlayPlotSettings = 'overlayPlotSettings',
    plotTitleSettings = 'plotTitleSettings',
    tooltipTitleSettings = 'tooltipTitleSettings',
    yRangeSettings = 'yRangeSettings',
    zoomingSettings = 'zoomingSettings',
    axisLabelSettings = 'axisLabelSettings',
    xAxisBreakSettings = 'xAxisBreakSettings',
    rolloutSettings = 'rolloutSettings',
}
export enum AxisLabelSettingsNames {
    xLabel = 'xLabel',
    yLabel = 'yLabel',
}
export enum RolloutSettingsNames {
    legendTitle = 'legendTitle',
    legendColor = 'legendColor',
}

export enum HeatmapSettingsNames {
    heatmapBins = 'heatmapBins',
}

export enum YRangeSettingsNames {
    min = 'min',
    max = 'max',
    minFixed = 'minFixed',
    maxFixed = 'maxFixed',
}

export enum XAxisBreakSettingsNames {
    enable = 'enable',
    showLines = 'showLines',
}
export enum LegendSettingsNames {
    defectLegendTitle = 'errorLegendTitle',
    defectGroupLegendTitle = 'controlLegendTitle',
    legendColor = 'legendColor',
}

export enum PlotSettingsNames {
    plotType = 'plotType',
    fill = 'fill',
    useLegendColor = 'useLegendColor',
    showHeatmap = 'showHeatmap',
}
export enum TooltipTitleSettingsNames {
    title = 'title',
}
export enum OverlayPlotSettingsNames {
    overlayType = 'overlayType',
}
export enum ColorSettingsNames {
    verticalRulerColor = 'verticalRulerColor',
    overlayColor = 'overlayColor',
    heatmapColorScheme = 'heatmapColorScheme',
    yZeroLineColor = 'yZeroLineColor',
}
export enum AxisSettingsNames {
    xAxis = 'xAxis',
    yAxis = 'yAxis',
}
export enum ZoomingSettingsNames {
    show = 'show',
    maximum = 'maximum',
}

export enum PlotTitleSettingsNames {
    title = 'title',
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
    rolloutClass = 'rollout',
    defectLegendClass = 'defectLegend',
    zoomState = 'zoomState',
    axisBreakClass = 'axisBreakLines',
}

export enum FilterType {
    booleanFilter = 'booleanFilter',
    stringFilter = 'stringFilter',
    numberFilter = 'numberFilter',
    defectFilter = 'defectFilter',
}

export class ArrayConstants {
    static readonly colorSchemes = {
        sequential: ['BuGn', 'BuPu', 'GnBu', 'OrRd', 'PuBu', 'PuBuGn', 'PuRd', 'RdPu', 'YlGn', 'YlGnBu', 'YlOrBr', 'YlOrRd'],
        singlehue: ['Blues', 'Greens', 'Greys', 'Oranges', 'Purples', 'Reds'],
        diverging: ['BrBG', 'PiYG', 'PRGn', 'PuOr', 'RdBu', 'RdGy', 'RdYlBu', 'RdYlGn', 'Spectral'],
    };
    // static readonly rolloutColors = ['#ffffff', '#a8a8a8', '#222222', '#4daf4a', '#ff0000'];
    // static readonly rolloutColors = ['#ffffff', '#2ca25f', '#de2d26'];
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
    static readonly rolloutColors = {
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

    //static readonly rolloutNames = ['nicht gewalzt', 'BBS gewalzt', 'Beize gewalzt', 'KB gewalzt ohne Fehler', 'KB gewalzt mit Fehler'];
}
