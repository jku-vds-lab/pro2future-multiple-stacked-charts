export enum Settings {
    plotSettings = "plotSettings",
    axisSettings = "axisSettings",
    colorSelector = "colorSelector",
    colorSettings = "colorSettings",
    heatmapSettings = "heatmapSettings",
    legendSettings = "legendSettings",
    overlayPlotSettings = "overlayPlotSettings",
    plotTitleSettings = "plotTitleSettings",
    tooltipTitleSettings = "tooltipTitleSettings",
    yRangeSettings = "yRangeSettings",
    zoomingSettings = "zoomingSettings",
    axisLabelSettings = "axisLabelSettings"
}
export enum AxisLabelSettingsNames {
    xLabel = "xLabel",
    yLabel = "yLabel"

}
export enum HeatmapSettingsNames {
    heatmapBins = "heatmapBins"
}

export enum YRangeSettingsNames {
    min = "min",
    max = "max"
}
export enum LegendSettingsNames {
    legendTitle = "legendTitle",
    legendColor = "legendColor"
}

export enum PlotSettingsNames {
    plotType = "plotType",
    fill = "fill",
    useLegendColor = "useLegendColor",
    showHeatmap = "showHeatmap"
}
export enum TooltipTitleSettingsNames {
    title = "title"
}
export enum OverlayPlotSettingsNames {
    slabType = "slabType"
}
export enum ColorSettingsNames {
    verticalRulerColor = "verticalRulerColor",
    slabColor = "slabColor",
    heatmapColorScheme = "heatmapColorScheme"
}
export enum AxisSettingsNames {
    xAxis = "xAxis",
    yAxis = "yAxis"
}
export enum ZoomingSettingsNames {
    show = "show",
    maximum = "maximum"
}

export enum PlotTitleSettingsNames {
    title = "title"
}

export enum ColorSelectorNames {
    fill = "fill"
}

export enum Constants {
    verticalRulerClass = "hover-line",
    slabClass = "slabBars",
    barClass = "bar",
    dotClass = "dot"
}

export class ColorSchemes {
    static readonly schemes = {
        sequential: ["BuGn", "BuPu", "GnBu", "OrRd", "PuBu", "PuBuGn", "PuRd", "RdPu", "YlGn", "YlGnBu", "YlOrBr", "YlOrRd"],
        singlehue: ["Blues", "Greens", "Greys", "Oranges", "Purples", "Reds"],
        diverging: ["BrBG", "PiYG", "PRGn", "PuOr", "RdBu", "RdGy", "RdYlBu", "RdYlGn", "Spectral"]
    };
}