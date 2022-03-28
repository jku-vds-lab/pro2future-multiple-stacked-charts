import powerbi from 'powerbi-visuals-api';
import { interactivitySelectionService } from 'powerbi-visuals-utils-interactivityutils';
import SelectableDataPoint = interactivitySelectionService.SelectableDataPoint;
import PrimitiveValue = powerbi.PrimitiveValue;
import ISelectionId = powerbi.visuals.ISelectionId;

// TODO #11: Make the bar chart transparent
// TODO #n: Add point selection (for future)

export interface ViewModel {
    plotModels: PlotModel[];
    colorSettings: ColorSettings;
    slabRectangles?: SlabRectangle[];
    svgHeight: number;
    svgWidth: number;
    svgTopPadding: number;
    generalPlotSettings: GeneralPlotSettings;
    tooltipModels: TooltipModel[];
    zoomingSettings: ZoomingSettings;
    legend?: Legend;
    heatmapSettings: HeatmapSettings;

}

export interface GeneralPlotSettings {
    plotHeight: number;
    plotWidth: number;
    plotTitleHeight: number;
    legendHeight: number;
    legendYPostion: number;
    dotMargin: number;
    xScalePadding: number;
    solidOpacity: number;
    transparentOpacity: number;
    margins: Margins;
}

export interface Margins {
    top: number;
    right: number;
    bottom: number;
    left: number;
}


export interface ZoomingSettings {
    enableZoom: boolean;
    maximumZoom: number;
}

export enum PlotType {
    //BarPlot = "BarPlot",
    ScatterPlot = "ScatterPlot",
    LinePlot = "LinePlot"
}

export enum SlabType {
    Rectangle = "Rectangle",
    Line = "Line",
    None = "None"
}

export enum AxisInformation {
    None = "None",
    Labels = "Labels",
    Ticks = "Ticks",
    TicksLabels = "TicksLabels"
}



export interface PlotModel {
    plotId: number;
    plotTop: number;
    xName: string;
    yName: string;
    formatSettings: FormatSettings;
    labelNames: LabelNames;
    overlayPlotSettings: OverlayPlotSettings;
    plotSettings: PlotSettings;
    dataPoints: DataPoint[];
    plotTitleSettings: PlotTitleSettings;
    xRange: {
        min: number;
        max: number;
    };
    yRange: {
        min: number;
        max: number;
    };
}

export interface LabelNames {
    xLabel: string;
    yLabel: string;
}

export interface TooltipModel {
    tooltipId: number;
    tooltipName: string;
    tooltipData: TooltipDataPoint[];
}

export interface PlotTitleSettings {
    title: string;
}

export interface SlabRectangle {
    width: number;
    length: number;
    x: number;
    y: number;
}

export interface TooltipData {
    yValue: PrimitiveValue;
    title: string;
}

export interface TooltipDataPoint {
    xValue: PrimitiveValue;
    yValue: PrimitiveValue;
}


export interface LegendDataPoint {
    xValue: PrimitiveValue;
    yValue: PrimitiveValue;
}

export interface LegendValue {
    color?: string;
    value: PrimitiveValue;
    selectionId: ISelectionId;
}

export interface Legend {
    legendDataPoints: LegendDataPoint[];
    legendValues: LegendValue[];
    legendTitle: string;
}

export interface DataPoint extends SelectableDataPoint {
    xValue: PrimitiveValue;
    yValue: PrimitiveValue;
    color?: string;
    highlight?: boolean;
    opacity?: number;
}

export interface FormatSettings {
    axisSettings: {
        xAxis: AxisInformationInterface;
        yAxis: AxisInformationInterface;
    };
}

export interface AxisInformationInterface {
    lables: boolean;
    ticks: boolean;
}


export interface ColorSettings {
    colorSettings: {
        verticalRulerColor: string;
        slabColor: string;
        heatmapColorScheme: string;
    }
}
export interface HeatmapSettings {
    heatmapBins: number;
}

export interface PlotSettings {
    plotSettings: {
        fill: string;
        plotType: PlotType;
        useLegendColor: boolean;
        showHeatmap: boolean;
    };
}

export interface OverlayPlotSettings {
    overlayPlotSettings: {
        slabType: SlabType;
    };
}

// export interface Legend {
//     text: string;
//     transform?: string;
//     dx?: string;
//     dy?: string;
// }

export interface XAxisData {
    values: number[];
    name?: string;
}

export interface YAxisData {
    values: number[];
    name?: string;
    columnId: number;
}

export interface LegendData {
    values: string[];
    name?: string;
    columnId: number;
}

export interface D3Plot {
    type: string;
    plot: any;
    points: any;
    root: any;
    x: D3PlotXAxis;
    y: D3PlotYAxis;
    heatmap: D3Heatmap;
}

export interface D3PlotXAxis {
    xAxis: any;
    xAxisValue: any;
    xScale: any;
    xLabel: any;
}

export interface D3Heatmap {
    axis: any;
    scale: any;
    values: any;
}


export interface D3PlotYAxis {
    yAxis: any;
    yAxisValue: any;
    yScale: any;
    yLabel: any;
}

export interface TooltipInterface {
    mouseover: () => void;
    mousemove: (event: any, data: any) => void;
    mouseout: () => void;
}
