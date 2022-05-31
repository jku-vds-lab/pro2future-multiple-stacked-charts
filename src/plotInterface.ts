import powerbi from 'powerbi-visuals-api';
import { interactivitySelectionService } from 'powerbi-visuals-utils-interactivityutils';
import { ColorSchemes } from './constants';
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
    defectIndices: DefectIndices;
    rolloutRectangles:RolloutRectangles;
}
export class DefectIndices {

    xValues: number[];
    defectIndices: Map<string, number[]>;

    constructor() {
        this.defectIndices = new Map<string, number[]>()
    }

    getFilterArray(defects: string[]): number[] {
        let arrays = [];
        let filterArray = null;
        for (const key of defects) {
            if (this.defectIndices.has(key)) {
                arrays.push(this.defectIndices.get(key));
            }
        }
        if (arrays.length === 0) return filterArray;
        filterArray = arrays[0];
        for (let i = 1; i < arrays.length; i++) {
            const array = arrays[i];
            filterArray = filterArray.map(function (n: number, idx: number) {
                return n + array[idx];
            })
        }
        // let sortedList: SortedListItem[] = [];
        // for (let i = 0; i < this.xValues.length; i++) {
        //     sortedList.push({ x: this.xValues[i], defect: filterArray[i] });
        // }
        // sortedList = sortedList.sort((a, b) => {
        //     return a.x - b.x;
        // });
        // return sortedList.map(x => x.defect);
        return filterArray;
    }
}

// interface SortedListItem {
//     x: number;
//     defect: number;
// }

export class RolloutRectangles {
    rolloutRectangles: RolloutRectangle[];

    constructor(xValues: number[], rollout: number[], y, width) {
        this.rolloutRectangles = []
        let rect = <RolloutRectangle>{
            y, width, x: xValues[0], color: ColorSchemes.rolloutColors[rollout[0]]
        }
        let lastX = xValues[0];
        let lastRollout = rollout[0];
        for (let i = 0; i < xValues.length; i++) {
            const x = xValues[i];
            const r = rollout[i];
            if (r != lastRollout) {
                lastRollout = r;
                rect.length = x - lastX;
                lastX = x;
                this.rolloutRectangles.push(rect);
                rect = <RolloutRectangle>{
                    y, width, x: xValues[i], color: ColorSchemes.rolloutColors[rollout[i]]
                }
            }
        }
        rect.length = xValues[xValues.length - 1] - lastX;
        this.rolloutRectangles.push(rect);


    }
}

export interface RolloutRectangle {
    width: number;
    length: number;
    x: number;
    y: number;
    color: string;
}


export interface GeneralPlotSettings {
    plotHeight: number;
    plotWidth: number;
    plotTitleHeight: number;
    fontSize: string;
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

export interface TooltipColumnData {
    type: powerbi.ValueTypeDescriptor;
    values: PrimitiveValue[];
    name?: string;
    columnId: number;
}

export interface LegendData {
    values: string[];
    name?: string;
    columnId: number;
}

export interface D3Plot {
    yName: string;
    type: string;
    points: any;
    plotLine: any;
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
