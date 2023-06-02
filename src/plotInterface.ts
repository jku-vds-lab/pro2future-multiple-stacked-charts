import { Primitive } from 'd3-array';
import { BaseType } from 'd3-selection';
import powerbi from 'powerbi-visuals-api';
import { interactivitySelectionService } from 'powerbi-visuals-utils-interactivityutils';
import { ArrayConstants, FilterType, LegendSettingsNames, Settings } from './constants';
import { getValue } from './objectEnumerationUtility';
import SelectableDataPoint = interactivitySelectionService.SelectableDataPoint;
import PrimitiveValue = powerbi.PrimitiveValue;
import ISelectionId = powerbi.visuals.ISelectionId;

export class VisualOverlayRectangles {
    visualOverlayRectangles: VisualOverlayRectangle[];
    name: string;
    opacity: number;
    metadetaColumn: powerbi.DataViewMetadataColumn;
    legendValues: LegendValue[];

    constructor(xValues: number[] | Date[], visualOverlay: Primitive[], yPos, width, visualOverlayMetadataColumn: powerbi.DataViewMetadataColumn, visualOverlayOpacity = 0.2) {
        this.name = <string>getValue(visualOverlayMetadataColumn.objects, Settings.legendSettings, LegendSettingsNames.legendTitle, visualOverlayMetadataColumn.displayName);
        this.metadetaColumn = visualOverlayMetadataColumn;
        this.visualOverlayRectangles = [];
        this.legendValues = [];
        this.opacity = visualOverlayOpacity;
        const uniqueValues = Array.from(new Set(visualOverlay)).sort();
        for (let i = 0; i < uniqueValues.length; i++) {
            const val = uniqueValues[i];
            const color = ArrayConstants.visualOverlayColors[<string>val] ? ArrayConstants.visualOverlayColors[<string>val] : ArrayConstants.colorArray[i];
            this.legendValues.push({ value: val, color: color });
        }

        let rect = <VisualOverlayRectangle>{
            y: yPos,
            width,
            x: xValues[0],
            color: this.getColor(visualOverlay[0]),
        };

        let lastVisualOverlay = visualOverlay[0];
        for (let i = 0; i < xValues.length; i++) {
            const x = xValues[i];
            const r = visualOverlay[i];
            if (r != lastVisualOverlay) {
                lastVisualOverlay = r;
                rect.endX = x;
                this.visualOverlayRectangles.push(rect);
                rect = <VisualOverlayRectangle>{
                    y: yPos,
                    width,
                    x: xValues[i],
                    color: this.getColor(visualOverlay[i]),
                };
            }
        }
        rect.endX = xValues[xValues.length - 1];
        this.visualOverlayRectangles.push(rect);
    }

    private getColor(visualOverlay: Primitive): string {
        return this.legendValues.filter((x) => x.value === visualOverlay)[0].color;
    }
}

export interface VisualOverlayRectangle {
    width: number;
    endX: number | Date;
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
    xAxisSettings: XAxisSettings;
    heatmapBins: number;
    showYZeroLine: boolean;
    minPlotHeight: number;
    tooltipPrecision: number;
}

export interface XAxisSettings {
    axisBreak: boolean;
    breakGapSize: number;
    breakIndices: number[];
    indexMap: Map<number | Date, number>;
    showBreakLines: boolean;
    isDate: boolean;
    xName: string;
    xRange: {
        min: number;
        max: number;
    };
    xScale: d3.ScaleLinear<number, number, never> | d3.ScaleTime<number, number, never>;
    xScaleZoomed: d3.ScaleLinear<number, number, never> | d3.ScaleTime<number, number, never>;
}

export interface Margins {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface ZoomingSettings {
    enableZoom: boolean;
    saveZoomState: boolean;
    maximumZoom: number;
}

export enum PlotType {
    ScatterPlot = 'ScatterPlot',
    LinePlot = 'LinePlot',
}

export enum OverlayType {
    Rectangle = 'Rectangle',
    Line = 'Line',
    None = 'None',
}

export enum AxisInformation {
    None = 'None',
    Labels = 'Labels',
    Ticks = 'Ticks',
    TicksLabels = 'TicksLabels',
}

export interface PlotModel {
    plotId: number;
    plotTop: number;
    yName: string;
    plotHeight: number;
    plotSettings: PlotSettings;
    dataPoints: DataPoint[];

    d3Plot: D3Plot;
    metaDataColumn: powerbi.DataViewMetadataColumn;
}

export interface TooltipModel {
    tooltipId: number;
    tooltipName: string;
    tooltipData: TooltipDataPoint[];
    metaDataColumn: powerbi.DataViewMetadataColumn;
}

export interface OverlayRectangle {
    width: number;
    endX: number;
    x: number | Date;
    y: number;
}

export interface TooltipData {
    yValue: PrimitiveValue;
    title: string;
}

export interface TooltipDataPoint {
    pointNr: PrimitiveValue;
    yValue: PrimitiveValue;
}

export interface LegendDataPoint {
    yValue: PrimitiveValue;
    i: number;
}

export interface LegendValue {
    color?: string;
    value: PrimitiveValue;
}

export interface Legend {
    legendDataPoints: LegendDataPoint[];
    legendValues: LegendValue[];
    legendTitle: string;
    legendXEndPosition: number;
    legendXPosition: number;
    type: FilterType;
    selectedValues: Set<Primitive>;
    metaDataColumn: powerbi.DataViewMetadataColumn;
}

export interface DataPoint extends SelectableDataPoint {
    xValue: PrimitiveValue;
    yValue: PrimitiveValue;
    color?: string;
    highlight?: boolean;
    opacity?: number;
    pointNr: number;
    selectionId: ISelectionId;
}

export interface FormatSettings {
    axisSettings: {
        xAxis: AxisInformationInterface;
        yAxis: AxisInformationInterface;
    };
}

export interface AxisInformationInterface {
    labels: boolean;
    ticks: boolean;
}

export interface ColorSettings {
    colorSettings: {
        breakLineColor: string;
        verticalRulerColor: string;
        overlayColor: string;
        heatmapColorScheme: string;
        yZeroLineColor: string;
    };
}

export interface PlotSettings {
    fill: string;
    plotType: PlotType;
    useLegendColor: boolean;
    showHeatmap: boolean;
    plotHeightFactor: number;
    plotTitle: string;
    overlayType: OverlayType;
    centerOverlay:boolean;
    xAxis: AxisInformationInterface;
    yAxis: AxisInformationInterface;
    xLabel: string;
    yLabel: string;
    yRange: {
        min: number;
        max: number;
        maxFixed: boolean;
        minFixed: boolean;
    };
}

export class Legends {
    legends: Legend[];

    constructor() {
        this.legends = [];
    }
    drawDataPoint(i: number): boolean {
        let draw = true;
        for (const l of this.legends) {
            const filtered = l.legendDataPoints.filter((x) => x.i === i);
            if (filtered.length >= 1) {
                draw = draw && l.selectedValues.has(filtered[0].yValue.toString());
            }
        }
        return draw;
    }
    setDeselectedValues(deselected: Map<string, Set<Primitive>>) {
        for (const l of this.legends) {
            if (deselected.has(l.legendTitle)) {
                Array.from(deselected.get(l.legendTitle)).map((x) => l.selectedValues.delete(x));
            } else {
                deselected.set(l.legendTitle, new Set<Primitive>());
            }
        }
    }
}

export interface XAxisData {
    values: number[] | Date[];
    name?: string;
    isDate: boolean;
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
    metaDataColumn: powerbi.DataViewMetadataColumn;
}

export interface LegendData {
    values: Primitive[];
    name?: string;
    type: FilterType;
    metaDataColumn: powerbi.DataViewMetadataColumn;
}
export type D3Selection = d3.Selection<SVGGElement, unknown, BaseType, unknown>;

export interface D3Plot {
    plotId: number;
    yName: string;
    type: string;
    points: d3.Selection<SVGCircleElement, DataPoint, SVGGElement, unknown>;
    plotLine: d3.Selection<SVGPathElement, DataPoint[], BaseType, unknown>;
    root: D3Selection;
    y: D3PlotYAxis;
    x: D3PlotXAxis;
    heatmap: D3Heatmap;
    yZeroLine: D3Selection;
}

export interface D3PlotXAxis {
    xAxis: D3Selection;
    xAxisValue: d3.Axis<d3.NumberValue>;
    xLabel: D3Selection;
}

export interface D3Heatmap {
    scale: d3.ScaleLinear<number, number, never>;
    values: d3.Selection<SVGRectElement, number, SVGGElement, unknown>;
}

export interface D3PlotYAxis {
    yAxis: D3Selection;
    yAxisValue: d3.Axis<d3.NumberValue>;
    yScale: d3.ScaleLinear<number, number, never>;
    yScaleZoomed: d3.ScaleLinear<number, number, never>;
    yLabel: D3Selection;
}

export interface TooltipInterface {
    mouseover: () => void;
    mousemove: (event: PointerEvent, data: DataPoint) => void;
    mouseout: () => void;
}
