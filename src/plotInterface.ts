import powerbi from 'powerbi-visuals-api';
import { interactivitySelectionService } from 'powerbi-visuals-utils-interactivityutils';
import SelectableDataPoint = interactivitySelectionService.SelectableDataPoint;
import PrimitiveValue = powerbi.PrimitiveValue;

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
}

export interface GeneralPlotSettings {
    plotHeight: number;
    plotWidth: number;
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

export interface ColorSettings {
    colorSettings: {
        verticalRulerColor: string;
        slabColor: string;
    }
}

export enum PlotType {
    BarPlot = "BarPlot",
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
    overlayPlotSettings: OverlayPlotSettings;
    plotSettings: PlotSettings;
    dataPoints: DataPoint[];

    xRange: {
        min: number;
        max: number;
    };
    yRange: {
        min: number;
        max: number;
    };
}

export interface SlabRectangle {
    width: number;
    length: number;
    x: number;
    y: number;
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

export interface AxisInformationInterface{
    lables: boolean;
    ticks: boolean;
}


export interface ColorSettings {
    colorSettings: {
        verticalRulerColor: string;
        slabColor: string;
    }
}

export interface PlotSettings {
    plotSettings: {
        fill: string;
        plotType: PlotType;
    };
}

export interface OverlayPlotSettings {
    overlayPlotSettings: {
        slabType: SlabType;
    };
}

export interface Legend {
    text: string;
    transform?: string;
    dx?: string;
    dy?: string;
}

export interface XAxisData {
    values: number[];
    name?: string;
}

export interface YAxisData {
    values: number[];
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
}

export interface D3PlotXAxis {
    xAxis: any;
    xAxisValue: any;
    xScale: any;
    xLabel: any;
}


export interface D3PlotYAxis {
    yAxis: any;
    yAxisValue: any;
    yScale: any;
    yLabel: any;
}
