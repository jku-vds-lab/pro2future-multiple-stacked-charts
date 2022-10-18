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
    max = "max",
    minFixed = "minFixed",
    maxFixed = "maxFixed"
}
export enum LegendSettingsNames {
    errorLegendTitle = "errorLegendTitle",
    controlLegendTitle = "controlLegendTitle",
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
    dotClass = "dot",
    rolloutClass = "rollout",
    defectLegendClass = "defectLegend"
}

export class ArrayConstants {
    static readonly colorSchemes = {
        sequential: ["BuGn", "BuPu", "GnBu", "OrRd", "PuBu", "PuBuGn", "PuRd", "RdPu", "YlGn", "YlGnBu", "YlOrBr", "YlOrRd"],
        singlehue: ["Blues", "Greens", "Greys", "Oranges", "Purples", "Reds"],
        diverging: ["BrBG", "PiYG", "PRGn", "PuOr", "RdBu", "RdGy", "RdYlBu", "RdYlGn", "Spectral"]
    };
    static readonly rolloutColors = ["#ffffff", "#a8a8a8", "#222222", "#4daf4a", "#ff0000"];
    static readonly legendColors = {
        OZE: "#e41a1c",
        GZE: "#377eb8",
        RAS: "#4daf4a",
        EOZ: "#a42ee8"
    }
    static readonly groupValues = {
        Kontrolleur: "Kontrolleur",
        OIG: "OIG"
    }

    static readonly rolloutNames = ["nicht gewalzt", "BBS gewalzt", "Beize gewalzt", "KB gewalzt ohne Fehler", "KB gewalzt mit Fehler"];
}