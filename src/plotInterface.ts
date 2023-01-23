import { Primitive } from 'd3-array';
import { BaseType } from 'd3-selection';
import powerbi from 'powerbi-visuals-api';
import { interactivitySelectionService } from 'powerbi-visuals-utils-interactivityutils';
import { ArrayConstants, FilterType } from './constants';
import { ParseAndTransformError } from './errors';
import SelectableDataPoint = interactivitySelectionService.SelectableDataPoint;
import PrimitiveValue = powerbi.PrimitiveValue;
import ISelectionId = powerbi.visuals.ISelectionId;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

export interface ViewModel {
    plotModels: PlotModel[];
    colorSettings: ColorSettings;
    overlayRectangles?: OverlayRectangle[];
    svgHeight: number;
    svgWidth: number;
    svgTopPadding: number;
    generalPlotSettings: GeneralPlotSettings;
    tooltipModels: TooltipModel[];
    zoomingSettings: ZoomingSettings;
    // defectLegend?: Legend;
    // defectGroupLegend?: Legend;
    legends: Legends;
    heatmapSettings: HeatmapSettings;
    // defectIndices: DefectIndices;
    rolloutRectangles: RolloutRectangles;
    errors: ParseAndTransformError[];
}
// export class DefectIndices {

//     defectIndices: Map<string, number[]>;

//     constructor() {
//         this.defectIndices = new Map<string, number[]>()
//     }

//     getFilterArray(defects: string[]): number[] {
//         let arrays = [];
//         let filterArray = null;
//         for (const key of defects) {
//             if (this.defectIndices.has(key)) {
//                 arrays.push(this.defectIndices.get(key));
//             }
//         }
//         if (arrays.length === 0) return filterArray;
//         filterArray = arrays[0];
//         for (let i = 1; i < arrays.length; i++) {
//             const array = arrays[i];
//             filterArray = filterArray.map(function (n: number, idx: number) {
//                 return n + array[idx];
//             })
//         }
//         // let sortedList: SortedListItem[] = [];
//         // for (let i = 0; i < this.xValues.length; i++) {
//         //     sortedList.push({ x: this.xValues[i], defect: filterArray[i] });
//         // }
//         // sortedList = sortedList.sort((a, b) => {
//         //     return a.x - b.x;
//         // });
//         // return sortedList.map(x => x.defect);
//         return filterArray;
//     }
// }

// interface SortedListItem {
//     x: number;
//     defect: number;
// }

export class RolloutRectangles {
    rolloutRectangles: RolloutRectangle[];
    name: string;
    opacity: number;
    // uniqueValues: Primitive[];
    legendValues: LegendValue[];
    // colors: string[];

    constructor(
        xValues: number[],
        rollout: Primitive[],
        y,
        width,
        host: IVisualHost,
        category: powerbi.DataViewCategoryColumn,
        dataView: powerbi.DataView,
        rolloutName = 'Rollout',
        rolloutOpacity = 0.2
    ) {
        this.name = rolloutName;
        this.rolloutRectangles = [];
        this.legendValues = [];
        this.opacity = rolloutOpacity;
        // const column = dataView.categorical.categories.filter((x) => x.source.roles.rollout)[0]
        //     ? dataView.categorical.categories.filter((x) => x.source.roles.rollout)[0]
        //     : dataView.categorical.values.filter((x) => x.source.roles.rollout)[0];
        const uniqueValues = Array.from(new Set(rollout)).sort().reverse();
        // let settings = null;
        // if (column && column.objects) {
        //     settings = column.objects
        //         .map((x, i) => {
        //             return { settings: x, i: i };
        //         })
        //         .filter((x) => x.settings)
        //         .map((x) => {
        //             return { val: column.values[x.i], settings: x.settings, i: x.i };
        //         });
        // }
        for (let i = 0; i < uniqueValues.length; i++) {
            const val = uniqueValues[i];
            // const settingsFiltered = settings && settings.filter((x) => x.val === val).length > 0 ? settings.filter((x) => x.val === val)[0] : null;
            // const selectionId = host
            //     .createSelectionIdBuilder()
            //     // .withMeasure('' + val)
            //     .withCategory(category, settingsFiltered ? settingsFiltered.i : rollout.findIndex((x) => x === val))
            //     .createSelectionId();
            //const color = settingsFiltered ? settingsFiltered.settings[Settings.rolloutSettings][RolloutSettingsNames.legendColor].solid.color : ArrayConstants.rolloutColors[i];
            const color = ArrayConstants.rolloutColors[<string>val] ? ArrayConstants.rolloutColors[<string>val] : ArrayConstants.colorArray[i];
            //getCategoricalObjectColor(column, i, Settings.rolloutSettings, RolloutSettingsNames.legendColor, ArrayConstants.rolloutColors[i]);

            this.legendValues.push({ value: val, color: color });
        }

        let rect = <RolloutRectangle>{
            y,
            width,
            x: xValues[0],
            color: this.getColor(rollout[0]),
        };

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
                    y,
                    width,
                    x: xValues[i],
                    color: this.getColor(rollout[i]),
                };
            }
        }
        rect.length = xValues[xValues.length - 1] - lastX;
        this.rolloutRectangles.push(rect);
    }

    private getColor(rollout: Primitive): string {
        return this.legendValues.filter((x) => x.value === rollout)[0].color;
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
    xAxisSettings: XAxisSettings;
}

export interface XAxisSettings {
    axisBreak: boolean;
    breakIndices: number[];
    indexMap: Map<number, number>;
    showBreakLines: boolean;
    xName: string;
    xRange: {
        min: number;
        max: number;
    };
    xScale: d3.ScaleLinear<number, number, never>;
    xScaleZoomed: d3.ScaleLinear<number, number, never>;
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
    formatSettings: FormatSettings;
    labelNames: LabelNames;
    overlayPlotSettings: OverlayPlotSettings;
    plotSettings: PlotSettings;
    dataPoints: DataPoint[];
    plotTitleSettings: PlotTitleSettings;
    yRange: {
        min: number;
        max: number;
        maxFixed: boolean;
        minFixed: boolean;
    };
    d3Plot: D3Plot;
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

export interface OverlayRectangle {
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
    // selectionId: ISelectionId;
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
    filterValues: number[];
    selectionId: ISelectionId;
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
        overlayColor: string;
        heatmapColorScheme: string;
        yZeroLineColor: string;
    };
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
        overlayType: OverlayType;
    };
}

export class Legends {
    legends: Legend[];

    // type: FilterType;
    // values: Primitive[];
    // name: string;
    // uniqueValues: Primitive[];

    constructor() {
        this.legends = [];
        //type: FilterType, values: Primitive[], name: string
        // this.type = type;
        // this.values = values;
        // this.name = name;
        // this.uniqueValues = Array.from(new Set(values));
    }
    drawDataPoint(i: number): boolean {
        let draw = true;
        for (const l of this.legends) {
            const point = l.legendDataPoints.filter((x) => x.i === i)[0];
            draw = draw && l.selectedValues.has(point.yValue.toString());
        }
        return draw;
    }
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
    values: Primitive[];
    name?: string;
    type: FilterType;
    metaDataColumn: powerbi.DataViewMetadataColumn;
}
export type D3Selection = d3.Selection<SVGGElement, unknown, BaseType, unknown>;

export interface D3Plot {
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
