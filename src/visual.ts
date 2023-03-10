/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */
'use strict';

// import 'core-js/stable';
import './../style/visual.less';
// import 'regenerator-runtime/runtime';

import powerbi from 'powerbi-visuals-api';
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ILocalVisualStorageService = powerbi.extensibility.ILocalVisualStorageService;
import DataView = powerbi.DataView;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import { axis as axisHelper } from 'powerbi-visuals-utils-chartutils';
import { createFormattingModel } from './settings';
import { scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import * as d3 from 'd3';
import {
    TooltipInterface,
    DataPoint,
    PlotModel,
    PlotType,
    OverlayType as OverlayType,
    D3Plot,
    D3PlotXAxis,
    D3PlotYAxis,
    OverlayRectangle as OverlayRectangle,
    TooltipModel,
    TooltipData,
    ZoomingSettings,
    GeneralPlotSettings,
    D3Heatmap,
    RolloutRectangle,
    LegendValue,
    Legend,
    D3Selection,
} from './plotInterface';
import { visualTransform } from './parseAndTransform';
import { Constants, FilterType, NumberConstants } from './constants';
import { err, ok, Result } from 'neverthrow';
import {
    AddClipPathError,
    AddPlotTitlesError,
    AddVerticalRulerError,
    AddZoomError,
    BuildBasicPlotError,
    BuildXAxisError,
    BuildYAxisError,
    CustomTooltipError,
    DrawPlotError,
    HeatmapError,
    PlotError,
    OverlayInformationError,
} from './errors';
import { Heatmapmargins, MarginSettings } from './marginSettings';
import { Primitive } from 'd3';
import { ViewModel } from './viewModel';

export class Visual implements IVisual {
    private host: IVisualHost;
    private element: HTMLElement;
    private dataview: DataView;
    private viewModel: ViewModel;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private legendDeselected = new Set<Primitive>();
    private storage: ILocalVisualStorageService;
    private zoom: d3.ZoomBehavior<Element, unknown>;
    private selectionManager: ISelectionManager;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        options.element.style.overflow = 'auto';
        options.element.style.scrollbarGutter = 'stable';
        this.element = options.element;
        this.selectionManager = this.host.createSelectionManager();
        this.svg = d3.select(this.element).append('svg').classed('visualContainer', true).attr('width', this.element.clientWidth).attr('height', this.element.clientHeight);
        this.storage = this.host.storageService;
    }

    public update(options: VisualUpdateOptions) {
        this.dataview = options.dataViews[0];
        this.removeDuplicateColumns();
        visualTransform(options, this.host)
            .map((model) => {
                this.viewModel = model;
                this.svg.selectAll('*').remove();
                this.svg.attr('width', this.viewModel.svgWidth).attr('height', this.viewModel.svgHeight);
                if (model.errors.length > 0) {
                    this.displayError(model.errors[0]);
                    return;
                }
                this.drawPlots();
                this.drawLegends();
                this.drawAxisBreakLines();
                this.addcontextMenu();
            })
            .mapErr((err) => this.displayError(err));

        this.restoreZoomState();
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return createFormattingModel(this.viewModel);
    }

    private removeDuplicateColumns() {
        const categoryIndices = new Set();
        if (this.dataview.categorical.categories) {
            this.dataview.categorical.categories = this.dataview.categorical.categories.filter((cat) => {
                const duplicate = categoryIndices.has(cat.source.index);
                categoryIndices.add(cat.source.index);
                return !duplicate;
            });
        }
        if (this.dataview.categorical.values) {
            const valueIndices = new Set();
            this.dataview.categorical.values = <powerbi.DataViewValueColumns>this.dataview.categorical.values.filter((val) => {
                const duplicate = valueIndices.has(val.source.index);
                valueIndices.add(val.source.index);
                return !duplicate;
            });
        }
    }

    private addcontextMenu() {
        this.svg.on('contextmenu', (event) => {
            if (event.shiftKey) return;
            const dataPoint = d3.select(event.target).datum();
            this.selectionManager.showContextMenu(dataPoint && (<DataPoint>dataPoint).selectionId ? (<DataPoint>dataPoint).selectionId : {}, {
                x: event.clientX,
                y: event.clientY,
            });
            event.preventDefault();
        });
    }

    private drawAxisBreakLines() {
        if (this.viewModel.generalPlotSettings.xAxisSettings.showBreakLines) {
            const xAxisSettings = this.viewModel.generalPlotSettings.xAxisSettings;
            const xScale = xAxisSettings.xScaleZoomed;
            const plotModels = this.viewModel.plotModels;
            const generalPlotSettings = this.viewModel.generalPlotSettings;
            const linesG = this.svg.append('g').attr('transform', 'translate(' + generalPlotSettings.margins.left + ',0)');
            const lines = linesG
                .selectAll('.' + Constants.axisBreakClass)
                .data(xAxisSettings.breakIndices)
                .join('line')
                .attr('class', Constants.axisBreakClass)
                .attr('stroke', '#cccccc')
                .attr('x1', (d) => xScale(d))
                .attr('x2', (d) => xScale(d))
                .attr('y1', plotModels[0].plotTop)
                .attr('y2', plotModels[plotModels.length - 1].plotTop + generalPlotSettings.plotHeight)
                .attr('stroke-dasharray', '5,5')
                .attr('clip-path', 'url(#rolloutClip)')
                .attr('pointer-events', 'none');
            lines.raise();
        }
    }

    private drawLegends() {
        const legends = this.viewModel.legends;
        if (legends && legends.legends.length > 0) {
            legends.setDeselectedValues(this.legendDeselected);
            for (let i = 0; i < legends.legends.length; i++) {
                const l = legends.legends[i];
                this.drawLegend(l);
                if (i < legends.legends.length - 1) legends.legends[i + 1].legendXPosition = l.legendXEndPosition + MarginSettings.legendSeparationMargin;
            }
        }
        if (this.viewModel.rolloutRectangles) {
            this.drawRolloutRectangles();
            this.drawRolloutLegend();
        }
    }

    private drawLegend(legend: Legend) {
        const yPosition = this.viewModel.generalPlotSettings.legendYPostion;
        const className = Constants.defectLegendClass + Math.trunc(legend.legendXPosition);
        const dotsXPositions = [];
        let xPos = legend.legendXPosition;
        xPos = this.drawLegendTitle(legend.legendTitle, className + legend.type, xPos, yPosition);
        if (legend.type === FilterType.booleanFilter) {
            this.addBooleanLegendClickHandler(legend);
        } else {
            xPos = this.drawLegendTexts(legend.legendValues, className, xPos, dotsXPositions, yPosition, legend.selectedValues);
            this.drawLegendDots(legend.legendValues, dotsXPositions, yPosition, className, legend.selectedValues);
            this.addLegendValuesClickHandler(className, legend);
        }
        legend.legendXEndPosition = xPos;
        this.checkOutOfSvg(xPos);
    }

    private addLegendValuesClickHandler(className: string, legend: Legend) {
        this.svg.selectAll('.' + className).on('click', (e: Event, d: LegendValue) => {
            e.stopPropagation();
            e.preventDefault();
            e.stopImmediatePropagation();
            const def = d.value.toString();
            const selection = this.svg.selectAll('.' + className + '.val' + def);
            if (legend.selectedValues.has(def)) {
                legend.selectedValues.delete(def);
                this.legendDeselected.add(def);
                selection.style('opacity', NumberConstants.legendDeselectionOpacity);
            } else {
                legend.selectedValues.add(def);
                this.legendDeselected.delete(def);
                selection.style('opacity', 1);
            }
            for (const plotModel of <PlotModel[]>this.viewModel.plotModels) {
                if (plotModel.plotSettings.useLegendColor) {
                    this.svg.selectAll('.' + plotModel.plotSettings.plotType + plotModel.plotId).remove();
                    this.drawPlot(plotModel);
                }
            }
        });
    }

    private drawLegendDots(legendValues: LegendValue[], dotsXPositions: number[], yPosition: number, className: string, selection?: Set<Primitive>, opacity?: number) {
        const s = this.svg
            .selectAll('legendDots')
            .data(legendValues)
            .enter()
            .append('circle')
            .attr('cx', function (d, i) {
                return dotsXPositions[i];
            })
            .attr('cy', yPosition)
            .attr('r', 7)
            .style('fill', function (d) {
                return d.color;
            })
            .style('stroke', 'grey')
            .attr('class', (d) => className + ' val' + d.value);
        if (selection) {
            s.style('opacity', (d) => (selection.has(d.value.toString()) ? 1 : NumberConstants.legendDeselectionOpacity));
        } else if (opacity) {
            s.style('opacity', opacity);
        }
    }

    private drawLegendTexts(legendValues: LegendValue[], className: string, xPos: number, dotsXPositions: number[], yPosition: number, selection: Set<Primitive>) {
        this.svg
            .selectAll('legendText')
            .data(legendValues)
            .enter()
            .append('text')
            .text(function (d) {
                return String(d.value);
            })
            .attr('text-anchor', 'left')
            .attr('class', (d) => className + ' val' + d.value)
            .style('alignment-baseline', 'middle')
            .style('font-size', this.viewModel.generalPlotSettings.fontSize)
            .attr('x', function () {
                const x = xPos;
                dotsXPositions.push(xPos);
                xPos = xPos + 25 + this.getComputedTextLength();
                return 10 + x;
            })
            .attr('y', yPosition)
            .style('opacity', (d) => (selection.has(d.value.toString()) ? 1 : NumberConstants.legendDeselectionOpacity));
        return xPos;
    }

    private addBooleanLegendClickHandler(legend: Legend) {
        const className = Constants.defectLegendClass + Math.trunc(legend.legendXPosition) + legend.type;
        const legendTitleSelection = this.svg.selectAll('.' + className);
        const legendSelection = legend.selectedValues;
        legendTitleSelection.on('click', (e: Event) => {
            e.stopPropagation();
            e.preventDefault();
            e.stopImmediatePropagation();
            const def = '1';
            if (legendSelection.has(def)) {
                legendSelection.delete(def);
                legendTitleSelection.style('opacity', NumberConstants.legendDeselectionOpacity);
                this.legendDeselected.add(def);
            } else {
                legendSelection.add(def);
                legendTitleSelection.style('opacity', 1);
                this.legendDeselected.delete(def);
            }
            for (const plotModel of <PlotModel[]>this.viewModel.plotModels) {
                if (plotModel.plotSettings.useLegendColor) {
                    this.svg.selectAll('.' + plotModel.plotSettings.plotType + plotModel.plotId).remove();
                    this.drawPlot(plotModel);
                }
            }
        });
    }

    private drawLegendTitle(legendTitle: string, className: string, xPosition: number, yPosition: number, selectionName: string = Constants.legendTitleSelection) {
        this.svg
            .selectAll(selectionName)
            .data([legendTitle])
            .enter()
            .append('text')
            .text((d) => d)
            .attr('text-anchor', 'left')
            .attr('class', className)
            .style('alignment-baseline', 'middle')
            .style('font-size', this.viewModel.generalPlotSettings.fontSize)
            .attr('x', function () {
                const x = xPosition;
                xPosition = xPosition + this.getComputedTextLength() + 15;
                return x;
            })
            .attr('y', yPosition);
        return xPosition;
    }

    private checkOutOfSvg(width: number) {
        if (width > this.viewModel.svgWidth) {
            this.viewModel.svgWidth = width;
            this.svg.attr('width', this.viewModel.svgWidth);
        }
    }

    private restoreZoomState() {
        //TODO: publish on AppSource to save zoom state https://learn.microsoft.com/en-us/power-bi/developer/visuals/local-storage
        const svg = this.svg;
        const zoom = this.zoom;
        this.storage
            .get(Constants.zoomState)
            .then((state) => {
                const zoomState = state.split(';');
                if (zoomState.length === 3) {
                    const transform = d3.zoomIdentity.translate(Number(zoomState[0]), Number(zoomState[1])).scale(Number(zoomState[2]));
                    svg.call(zoom.transform, transform);
                }
            })
            .catch(() => {
                console.log('restore error');
                this.storage.set(Constants.zoomState, '0;0;1');
            });
    }

    public displayError(error: Error) {
        this.svg.selectAll('*').remove();
        this.svg
            .append('text')
            .attr('width', this.element.clientWidth)
            .attr('x', 0)
            .attr('y', 20)
            .text('ERROR: ' + error.name);
        this.svg
            .append('text')
            .attr('width', this.element.clientWidth)
            .attr('height', this.element.clientHeight - 40)
            .attr('x', 0)
            .attr('y', 40)
            .text(error.message)
            .style('font-size', '12px');

        console.log('error: ', error.name);
        console.log(error.message);
        if (error.stack) {
            console.log(error.stack);
        }
    }

    private drawPlots() {
        let error = false;
        this.addClipPath().mapErr((err) => {
            this.displayError(err);
            error = true;
        });
        if (error) return;
        for (const plotModel of this.viewModel.plotModels) {
            this.drawPlot(plotModel).mapErr((err) => {
                this.displayError(err);
                error = true;
            });
            if (error) return;
        }
        const zoomingSettings = this.viewModel.zoomingSettings;
        if (zoomingSettings.enableZoom) {
            this.addZoom(zoomingSettings).mapErr((err) => this.displayError(err));
        }
    }

    private drawRolloutLegend() {
        const margins = this.viewModel.generalPlotSettings;
        const yPosition = margins.legendYPostion;
        const rolloutRectangles = this.viewModel.rolloutRectangles;
        const legendCount = this.viewModel.legends.legends.length;
        let xPos = legendCount > 0 ? this.viewModel.legends.legends[legendCount - 1].legendXEndPosition + MarginSettings.legendSeparationMargin : margins.margins.left;
        if (this.viewModel.legends.legends.length > 0) {
            xPos = this.viewModel.legends.legends[this.viewModel.legends.legends.length - 1].legendXEndPosition + MarginSettings.legendSeparationMargin;
        }
        const dotsXPosition = [];
        xPos = this.drawLegendTitle(rolloutRectangles.name, Constants.rolloutLegendTitleSelection, xPos, yPosition, Constants.rolloutLegendTitleSelection);
        xPos = this.drawLegendTexts(rolloutRectangles.legendValues, '', xPos, dotsXPosition, yPosition, new Set(rolloutRectangles.legendValues.map((x) => x.value)));
        this.drawLegendDots(rolloutRectangles.legendValues, dotsXPosition, yPosition, '', null, rolloutRectangles.opacity * 2);
        this.checkOutOfSvg(xPos);
    }

    private drawRolloutRectangles() {
        const xScale = this.viewModel.generalPlotSettings.xAxisSettings.xScale;
        const rolloutG = this.svg.append('g').attr('transform', 'translate(' + this.viewModel.generalPlotSettings.margins.left + ',' + 0 + ')');
        rolloutG
            .selectAll('.' + Constants.rolloutClass)
            .data(this.viewModel.rolloutRectangles.rolloutRectangles)
            .enter()
            .append('rect')
            .attr('class', Constants.rolloutClass)
            .attr('width', (d) => xScale(d.endX) - xScale(d.x))
            .attr('height', (d) => d.width)
            .attr('x', (d) => xScale(d.x))
            .attr('y', (d) => d.y)
            .attr('fill', (d) => d.color)
            .attr('clip-path', 'url(#rolloutClip)')
            .style('opacity', this.viewModel.rolloutRectangles.opacity);
        rolloutG.lower();
    }

    private constructBasicPlot(plotModel: PlotModel): Result<void, PlotError> {
        const plotType = plotModel.plotSettings.plotType;
        let root;
        let x: D3PlotXAxis;
        let y: D3PlotYAxis;
        let plotError: PlotError;
        let yZeroLine;
        const PlotResult = this.appendPlotG(plotModel)
            .map((plt) => {
                root = plt;
                root.append('g').attr('class', Constants.overlayClass).attr('clip-path', 'url(#overlayClip)');
                yZeroLine = root.append('g').attr('class', Constants.yZeroLine);
            })
            .mapErr((error) => this.displayError(error));
        if (PlotResult.isErr()) {
            return err(plotError);
        }

        this.buildXAxis(plotModel, root)
            .map((axis) => (x = axis))
            .mapErr((err) => (plotError = err));
        this.buildYAxis(plotModel, root)
            .map((axis) => (y = axis))
            .mapErr((err) => (plotError = err));
        plotModel.d3Plot = <D3Plot>{ yName: plotModel.yName, type: plotType, root, points: null, x, y, yZeroLine };
        this.addPlotTitle(plotModel, root).mapErr((err) => (plotError = err));
        this.addVerticalRuler(root).mapErr((err) => (plotError = err));
        this.drawOverlay(plotModel).mapErr((err) => (plotError = err));
        if (plotError) {
            return err(plotError);
        }

        return ok(null);
    }

    private addClipPath(): Result<void, PlotError> {
        try {
            const generalPlotSettings = this.viewModel.generalPlotSettings;
            const plotWidth = generalPlotSettings.plotWidth;
            const plotHeight = generalPlotSettings.plotHeight;
            const defs = this.svg.append('defs');
            defs.append('clipPath')
                .attr('id', 'clip')
                .append('rect')
                .attr('y', -generalPlotSettings.dotMargin)
                .attr('x', -generalPlotSettings.dotMargin)
                .attr('width', plotWidth + 2 * generalPlotSettings.dotMargin)
                .attr('height', plotHeight + 2 * generalPlotSettings.dotMargin);
            defs.append('clipPath').attr('id', 'overlayClip').append('rect').attr('y', 0).attr('x', 0).attr('width', plotWidth).attr('height', plotHeight);
            defs.append('clipPath').attr('id', 'hclip').append('rect').attr('y', 0).attr('x', 0).attr('width', plotWidth).attr('height', Heatmapmargins.heatmapHeight);
            if (this.viewModel.rolloutRectangles) {
                const rolloutRectangle = this.viewModel.rolloutRectangles.rolloutRectangles[0];
                const xScale = this.viewModel.generalPlotSettings.xAxisSettings.xScaleZoomed;
                defs.append('clipPath')
                    .attr('id', 'rolloutClip')
                    .append('rect')
                    .attr('y', rolloutRectangle.y)
                    .attr('x', xScale(rolloutRectangle.x))
                    .attr('width', plotWidth)
                    .attr('height', rolloutRectangle.width);
            }
            return ok(null);
        } catch (error) {
            return err(new AddClipPathError(error.stack));
        }
    }

    private addPlotTitle(plotModel: PlotModel, plot: D3Selection) {
        try {
            const generalPlotSettings = this.viewModel.generalPlotSettings;
            if (plotModel.plotTitleSettings.title.length > 0) {
                plot.append('text')
                    .attr('class', 'plotTitle')
                    .attr('text-anchor', 'left')
                    .attr('y', 0 - generalPlotSettings.plotTitleHeight - generalPlotSettings.margins.top / 2)
                    .attr('x', 0)
                    .attr('dy', '1em')
                    .style('font-size', generalPlotSettings.fontSize)
                    .text(plotModel.plotTitleSettings.title);
            }
            return ok(null);
        } catch (error) {
            return err(new AddPlotTitlesError(error.stack));
        }
    }

    private appendPlotG(plotModel: PlotModel): Result<D3Selection, PlotError> {
        try {
            const plotType = plotModel.plotSettings.plotType;
            const generalPlotSettings = this.viewModel.generalPlotSettings;
            const plot = this.svg
                .append('g')
                .classed(plotType + plotModel.plotId, true)
                .attr('width', generalPlotSettings.plotWidth)
                .attr('height', generalPlotSettings.plotHeight)
                .attr('transform', 'translate(' + generalPlotSettings.margins.left + ',' + plotModel.plotTop + ')');
            return ok(plot);
        } catch (error) {
            return err(new BuildBasicPlotError(error.stack));
        }
    }

    private buildXAxis(plotModel: PlotModel, plot: D3Selection): Result<D3PlotXAxis, PlotError> {
        try {
            const generalPlotSettings = this.viewModel.generalPlotSettings;
            const xAxis = plot.append('g').classed('xAxis', true);

            const xAxisValue = axisBottom(generalPlotSettings.xAxisSettings.xScaleZoomed).ticks(axisHelper.getRecommendedNumberOfTicksForXAxis(generalPlotSettings.plotWidth));
            if (generalPlotSettings.xAxisSettings.axisBreak) {
                xAxisValue.tickFormat((d) => {
                    const xAxisSettings = this.viewModel.generalPlotSettings.xAxisSettings;
                    let key = '';
                    for (const [k, v] of xAxisSettings.indexMap.entries()) {
                        if (v === d) key = '' + k;
                    }
                    return key;
                });
            }

            let xLabel = null;
            if (!plotModel.formatSettings.axisSettings.xAxis.ticks) {
                xAxisValue.tickValues([]);
            }

            if (plotModel.formatSettings.axisSettings.xAxis.lables) {
                xLabel = plot
                    .append('text')
                    .attr('class', 'xLabel')
                    .attr('text-anchor', 'end')
                    .attr('x', generalPlotSettings.plotWidth / 2)
                    .attr('y', generalPlotSettings.plotHeight + (plotModel.formatSettings.axisSettings.xAxis.ticks ? 25 : 15))
                    .style('font-size', generalPlotSettings.fontSize)
                    .text(plotModel.labelNames.xLabel);
            }

            xAxis.attr('transform', 'translate(0, ' + generalPlotSettings.plotHeight + ')').call(xAxisValue);
            return ok(<D3PlotXAxis>{ xAxis, xAxisValue, xLabel });
        } catch (error) {
            return err(new BuildXAxisError(error.stack));
        }
    }

    private buildYAxis(plotModel: PlotModel, plot: D3Selection): Result<D3PlotYAxis, PlotError> {
        try {
            const generalPlotSettings = this.viewModel.generalPlotSettings;
            const yAxis = plot.append('g').classed('yAxis', true);
            const yScale = scaleLinear().domain([plotModel.yRange.min, plotModel.yRange.max]).range([generalPlotSettings.plotHeight, 0]);
            const yAxisValue = axisLeft(yScale)
                .ticks(generalPlotSettings.plotHeight / 20)
                .tickFormat(d3.format('~s'));
            let yLabel = null;
            if (plotModel.formatSettings.axisSettings.yAxis.lables) {
                yLabel = plot
                    .append('text')
                    .attr('class', 'yLabel')
                    .attr('text-anchor', 'middle')
                    .attr('y', 0 - generalPlotSettings.margins.left)
                    .attr('x', 0 - generalPlotSettings.plotHeight / 2)
                    .attr('dy', '1em')
                    .attr('transform', 'rotate(-90)')
                    .text(plotModel.labelNames.yLabel)
                    .style('font-size', generalPlotSettings.fontSize)
                    .style('font-size', function () {
                        const usedSpace = this.getComputedTextLength();
                        const availableSpace = generalPlotSettings.plotHeight + generalPlotSettings.margins.top + generalPlotSettings.margins.bottom;
                        if (usedSpace > availableSpace) {
                            return (parseInt(generalPlotSettings.fontSize.split('p')[0]) / usedSpace) * availableSpace;
                        }
                        return generalPlotSettings.fontSize;
                    });
            }

            if (!plotModel.formatSettings.axisSettings.yAxis.ticks) {
                yAxisValue.tickValues([]);
            }

            yAxis.call(yAxisValue);

            return ok(<D3PlotYAxis>{ yAxis, yAxisValue, yLabel, yScale, yScaleZoomed: yScale });
        } catch (error) {
            return err(new BuildYAxisError(error.stack));
        }
    }

    private drawOverlay(plotModel: PlotModel): Result<void, PlotError> {
        try {
            const colorSettings = this.viewModel.colorSettings.colorSettings;
            const overlaytype = plotModel.overlayPlotSettings.overlayPlotSettings.overlayType;
            const overlayRectangles = this.viewModel.overlayRectangles;
            const plotHeight = this.viewModel.generalPlotSettings.plotHeight;
            const plot = plotModel.d3Plot.root;
            const xScale = this.viewModel.generalPlotSettings.xAxisSettings.xScaleZoomed;
            const yScale = plotModel.d3Plot.y.yScaleZoomed;
            if (overlaytype != OverlayType.None && overlayRectangles != null) {
                if (overlayRectangles.length == 0) {
                    return err(new OverlayInformationError());
                }
                if (overlaytype == OverlayType.Rectangle) {
                    plot.select(`.${Constants.overlayClass}`)
                        .selectAll('rect')
                        .data(overlayRectangles)
                        .enter()
                        .append('rect')
                        .attr('x', function (d) {
                            return xScale(d.x);
                        })
                        .attr('y', function (d) {
                            return yScale(d.width - d.y);
                        })
                        .attr('width', function (d) {
                            return xScale(d.endX) - xScale(d.x);
                        })
                        .attr('height', function (d) {
                            return yScale(d.y) - yScale(d.width);
                        })
                        .attr('fill', 'transparent')
                        .attr('stroke', colorSettings.overlayColor);
                } else if (overlaytype == OverlayType.Line) {
                    plot.select(`.${Constants.overlayClass}`)
                        .selectAll('line')
                        .data(overlayRectangles)
                        .enter()
                        .append('line')
                        .attr('stroke', colorSettings.overlayColor)
                        .attr('x1', function (d) {
                            return xScale(d.x);
                        })
                        .attr('x2', function (d) {
                            return xScale(d.x);
                        })
                        .attr('y1', 0)
                        .attr('y2', plotHeight)
                        .style('opacity', 1);
                }
            } else {
                plot.select(`.${Constants.overlayClass}`).remove();
            }
            return ok(null);
        } catch (error) {
            return err(new BuildYAxisError(error.stack));
        }
    }

    private addVerticalRuler(plot: D3Selection) {
        try {
            const verticalRulerSettings = this.viewModel.colorSettings.colorSettings.verticalRulerColor;
            const lineGroup = plot.append('g').attr('class', Constants.verticalRulerClass);
            const generalPlotSettings = this.viewModel.generalPlotSettings;

            lineGroup
                .append('line')
                .attr('stroke', verticalRulerSettings)
                .attr('x1', 10)
                .attr('x2', 10)
                .attr('y1', 0)
                .attr('y2', generalPlotSettings.plotHeight)
                .style('opacity', 0);
            return ok(null);
        } catch (error) {
            return err(new AddVerticalRulerError(error.stack));
        }
    }

    private drawPlot(plotModel: PlotModel): Result<void, PlotError> {
        try {
            let dotSize = 2;
            let plotError: PlotError;
            const xAxisSettings = this.viewModel.generalPlotSettings.xAxisSettings;
            const xScale = xAxisSettings.xScaleZoomed;

            this.constructBasicPlot(plotModel).mapErr((err) => (plotError = err));
            if (plotError) return err(plotError);
            const d3Plot = plotModel.d3Plot;
            const yScale = d3Plot.y.yScaleZoomed;
            let dataPoints = plotModel.dataPoints;
            dataPoints = filterNullValues(dataPoints);

            if (plotModel.plotSettings.useLegendColor) {
                dataPoints = dataPoints.filter((x) => this.viewModel.legends.drawDataPoint(x.pointNr));
                dotSize = 3;
            }
            d3Plot.yZeroLine
                .selectAll('*')
                .data([0])
                .enter()
                .append('line')
                .attr('x1', xScale(this.viewModel.generalPlotSettings.xAxisSettings.xRange.min))
                .attr('x2', xScale(this.viewModel.generalPlotSettings.xAxisSettings.xRange.max))
                .attr('y1', yScale(0))
                .attr('y2', yScale(0))
                .attr('stroke', this.viewModel.colorSettings.colorSettings.yZeroLineColor)
                .attr('class', Constants.yZeroLine);

            const plotType = plotModel.plotSettings.plotType;

            if (plotType == PlotType.LinePlot) {
                const line = d3
                    .line<DataPoint>()
                    .x((d) => xScale(<number>d.xValue))
                    .y((d) => yScale(<number>d.yValue));
                d3Plot.plotLine = d3Plot.root
                    .append('path')
                    .datum(dataPoints)
                    .attr('class', 'path')
                    .attr('d', line)
                    .attr('fill', 'none')
                    .attr('stroke', plotModel.plotSettings.fill)
                    .attr('stroke-width', 1.5)
                    .attr('clip-path', 'url(#clip)');
            }

            d3Plot.points = d3Plot.root
                .selectAll(Constants.dotClass)
                .data(dataPoints)
                .enter()
                .append('circle')
                .attr('fill', (d: DataPoint) => d.color)
                .attr('stroke', 'none')
                .attr('cx', (d) => xScale(<number>d.xValue))
                .attr('cy', (d) => yScale(<number>d.yValue))
                .attr('r', dotSize)
                .attr('clip-path', 'url(#clip)')
                .on('click', (event, d: DataPoint) => {
                    const multiSelect = (event as MouseEvent).ctrlKey;
                    this.selectionManager.select(d.selectionId, multiSelect);
                });

            let mouseEvents: TooltipInterface;
            this.addTooltips()
                .map((events) => (mouseEvents = events))
                .mapErr((err) => (plotError = err));
            if (plotError) return err(plotError);
            d3Plot.points.on('mouseover', mouseEvents.mouseover).on('mousemove', mouseEvents.mousemove).on('mouseout', mouseEvents.mouseout);
            if (plotModel.plotSettings.showHeatmap) {
                this.drawHeatmap(dataPoints, plotModel)
                    .map((x) => (plotModel.d3Plot.heatmap = x))
                    .mapErr((err) => (plotError = err));
                if (plotError) return err(plotError);
            }

            return ok(null);
        } catch (error) {
            return err(new DrawPlotError(error.stack));
        }
    }

    private drawHeatmap(dataPoints: DataPoint[], plotModel: PlotModel): Result<D3Heatmap, HeatmapError> {
        try {
            const generalPlotSettings = this.viewModel.generalPlotSettings;
            const heatmapSettings = this.viewModel.heatmapSettings;
            const xAxisSettings = plotModel.formatSettings.axisSettings.xAxis;
            const bins = d3
                .bin<DataPoint, number>()
                .value((d: DataPoint) => {
                    return <number>d.xValue;
                })
                .thresholds(heatmapSettings.heatmapBins);
            const binnedData = bins(dataPoints);

            const heatmapValues = binnedData.map((bin) => {
                const extent = d3.extent(bin.map((d) => <number>d.yValue));
                if (extent[0] === undefined) return 0;
                return extent[1] - extent[0];
            });
            const colorScale = d3.scaleSequential().interpolator(d3[this.viewModel.colorSettings.colorSettings.heatmapColorScheme]).domain(d3.extent(heatmapValues));
            const heatmapScale = d3.scaleLinear().domain([0, heatmapValues.length]).range([0, this.viewModel.generalPlotSettings.plotWidth]);

            let yTransition = generalPlotSettings.plotHeight + generalPlotSettings.margins.bottom;
            yTransition += xAxisSettings.lables || xAxisSettings.ticks ? Heatmapmargins.heatmapMargin : 0;
            yTransition += xAxisSettings.lables && xAxisSettings.ticks ? MarginSettings.xLabelSpace : 0;
            const heatmap = this.svg
                .append('g')
                .classed('Heatmap' + plotModel.plotId, true)
                .attr('width', generalPlotSettings.plotWidth)
                .attr('height', generalPlotSettings.plotHeight)
                .attr('transform', 'translate(' + generalPlotSettings.margins.left + ',' + (plotModel.plotTop + yTransition) + ')');
            heatmap.append('rect').attr('width', generalPlotSettings.plotWidth).attr('height', Heatmapmargins.heatmapHeight).attr('fill', 'transparent').attr('stroke', '#000000');
            const values = heatmap
                .selectAll()
                .data(heatmapValues)
                .enter()
                .append('rect')
                .attr('x', function (d, i) {
                    return heatmapScale(i);
                })
                .attr('y', 0)
                .attr('width', function (d, i) {
                    return heatmapScale(i) - heatmapScale(i - 1);
                })
                .attr('height', Heatmapmargins.heatmapHeight)
                .attr('fill', function (d) {
                    return colorScale(d);
                });

            this.drawHeatmapLegend(yTransition, colorScale, heatmap, generalPlotSettings);
            const d3heatmap: D3Heatmap = {
                scale: heatmapScale,
                values: values,
            };
            return ok(d3heatmap);
        } catch (error) {
            return err(new HeatmapError(error.stack));
        }
    }

    private drawHeatmapLegend(yTransition: number, colorScale: d3.ScaleSequential<number, never>, heatmap: D3Selection, generalPlotSettings: GeneralPlotSettings) {
        const legendHeight = yTransition + Heatmapmargins.heatmapHeight;
        const legendScale = Object.assign(colorScale.copy().interpolator(d3.interpolateRound(0, legendHeight)), {
            range() {
                return [0, legendHeight];
            },
        });

        const tickValues = d3.range(Heatmapmargins.legendTickCount).map((i) => d3.quantile(colorScale.domain(), i / (Heatmapmargins.legendTickCount - 1)));
        const legend = heatmap.append('g').attr('transform', `translate(${generalPlotSettings.plotWidth + Heatmapmargins.legendMargin},${-yTransition})`);
        legend
            .append('image')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', Heatmapmargins.legendWidth)
            .attr('height', legendHeight)
            .attr('preserveAspectRatio', 'none')
            .attr('xlink:href', createHeatmapLegendImage(colorScale.interpolator()).toDataURL());
        const tickAdjust = (g) =>
            g
                .selectAll('.tick line')
                .attr('x1', Heatmapmargins.legendWidth - Heatmapmargins.legendTicksTranslation)
                .attr('x2', -Heatmapmargins.legendTicksTranslation);
        legend
            .append('g')
            .attr('transform', `translate(${Heatmapmargins.legendTicksTranslation},0)`)
            .call(d3.axisRight(legendScale).tickSize(6).tickValues(tickValues))
            .call(tickAdjust)
            .call((g) => g.select('.domain').remove());

        function createHeatmapLegendImage(color, n = 256) {
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = n;
            const context = canvas.getContext('2d');
            for (let i = 0; i < n; ++i) {
                context.fillStyle = color(i / (n - 1));
                context.fillRect(0, i, 1, 1);
            }
            return canvas;
        }
    }

    private zoomRollout() {
        const xScale = this.viewModel.generalPlotSettings.xAxisSettings.xScaleZoomed;
        this.svg
            .selectAll('.' + Constants.rolloutClass)
            .attr('x', function (d: RolloutRectangle) {
                return xScale(d.x);
            })
            .attr('width', function (d: RolloutRectangle) {
                return xScale(d.endX) - xScale(d.x);
            });
    }

    private zoomOverlay(plot: D3Plot) {
        const xScaleZoomed = this.viewModel.generalPlotSettings.xAxisSettings.xScaleZoomed;
        const overlayBars = plot.root.select(`.${Constants.overlayClass}`);
        overlayBars
            .selectAll('rect')
            .attr('x', function (d: OverlayRectangle) {
                return xScaleZoomed(d.x);
            })
            .attr('width', function (d: OverlayRectangle) {
                return xScaleZoomed(d.endX) - xScaleZoomed(d.x);
            });
        overlayBars
            .selectAll('line')
            .attr('x1', function (d: OverlayRectangle) {
                return xScaleZoomed(d.x);
            })
            .attr('x2', function (d: OverlayRectangle) {
                return xScaleZoomed(d.x);
            });
    }
    private zoomAxisBreak() {
        const xScaleZoomed = this.viewModel.generalPlotSettings.xAxisSettings.xScaleZoomed;
        this.svg
            .selectAll('.' + Constants.axisBreakClass)
            .attr('x1', (d: number) => xScaleZoomed(d))
            .attr('x2', (d: number) => xScaleZoomed(d));
    }
    private addZoom(zoomingSettings: ZoomingSettings): Result<void, PlotError> {
        try {
            const generalPlotSettings = this.viewModel.generalPlotSettings;
            const plots = this.viewModel.plotModels;
            const errorFunction = this.displayError;
            const zoomed = (event) => {
                try {
                    const transform: d3.ZoomTransform = event.transform;
                    if ((transform.k == 1 && (transform.x !== 0 || transform.y !== 0)) || !this.viewModel.zoomingSettings.enableZoom) {
                        this.svg.call(this.zoom.transform, d3.zoomIdentity);
                        return;
                    }
                    this.storage.set(Constants.zoomState, transform.x + ';' + transform.y + ';' + transform.k).catch((reason) => console.log('set error: ' + reason));
                    const xScaleZoomed = transform.rescaleX(generalPlotSettings.xAxisSettings.xScale);
                    this.viewModel.generalPlotSettings.xAxisSettings.xScaleZoomed = xScaleZoomed;
                    this.zoomRollout();
                    this.zoomAxisBreak();
                    for (const plot of plots.map((x) => x.d3Plot)) {
                        this.zoomPlot(plot, transform);
                    }
                } catch (error) {
                    error.message = 'error in zoom function: ' + error.message;
                    errorFunction(error);
                }
            };
            this.zoom = d3.zoom().scaleExtent([1, zoomingSettings.maximumZoom]).on('zoom', zoomed);
            this.svg.call(this.zoom);
            return ok(null);
        } catch (error) {
            return err(new AddZoomError(error.stack));
        }
    }

    private zoomHeatmap(plot: D3Plot, transform: d3.ZoomTransform) {
        if (plot.heatmap) {
            const values = plot.heatmap.values;
            const scale = transform.rescaleX(plot.heatmap.scale);
            values
                .attr('x', function (d, i) {
                    return scale(i);
                })
                .attr('width', function (d, i) {
                    return scale(i) - scale(i - 1);
                })
                .attr('clip-path', 'url(#hclip)');
        }
    }

    private zoomPlot(plot: D3Plot, transform: d3.ZoomTransform) {
        this.zoomXAxis(plot);
        this.zoomYAxis(plot);
        this.zoomPlotContent(plot);
        this.zoomOverlay(plot);
        this.zoomHeatmap(plot, transform);
    }

    private zoomXAxis(plot: D3Plot) {
        const xScaleZoomed = this.viewModel.generalPlotSettings.xAxisSettings.xScaleZoomed;
        plot.x.xAxis.attr('clip-path', 'url(#clip)');
        const xAxisValue = plot.x.xAxisValue;
        xAxisValue.scale(xScaleZoomed);
        plot.x.xAxis.call(xAxisValue);
    }

    private zoomYAxis(plot: D3Plot) {
        const xScaleZoomed = this.viewModel.generalPlotSettings.xAxisSettings.xScaleZoomed;
        const xMin = xScaleZoomed.domain()[0];
        const xMax = xScaleZoomed.domain()[1];
        const plotModel = this.viewModel.plotModels.filter((x) => x.yName === plot.yName)[0];
        const yDataPoints = plotModel.dataPoints.filter((x) => x.xValue >= xMin && x.xValue <= xMax).map((x) => Number(x.yValue));
        const yMin = plotModel.yRange.minFixed ? plotModel.yRange.min : Math.min(...yDataPoints);
        const yMax = plotModel.yRange.maxFixed ? plotModel.yRange.max : Math.max(...yDataPoints);
        plot.y.yScaleZoomed = plot.y.yScaleZoomed.domain([yMin, yMax]);
    }

    private zoomPlotContent(plot: D3Plot) {
        const xScaleZoomed = this.viewModel.generalPlotSettings.xAxisSettings.xScaleZoomed;
        plot.points.attr('cx', (d) => {
            return xScaleZoomed(<number>d.xValue);
        });
        plot.points.attr('clip-path', 'url(#clip)');
        plot.points.attr('cy', (d) => {
            return plot.y.yScaleZoomed(<number>d.yValue);
        });
        const yAxisValue = plot.y.yAxisValue;
        yAxisValue.scale(plot.y.yScaleZoomed);
        plot.y.yAxis.call(yAxisValue);
        if (plot.type === 'LinePlot') {
            plot.plotLine.attr('clip-path', 'url(#clip)');

            const line = d3
                .line<DataPoint>()
                .x((d) => xScaleZoomed(<number>d.xValue))
                .y((d) => plot.y.yScaleZoomed(<number>d.yValue));

            plot.plotLine.attr('d', line);
        }
        const yZero = plot.y.yScaleZoomed(0);
        plot.yZeroLine.selectAll('line').attr('y1', yZero).attr('y2', yZero);
    }

    private addTooltips(): Result<TooltipInterface, PlotError> {
        try {
            const tooltipOffset = 10;
            const viewModel = this.viewModel;
            const visualContainer = this.svg.node();
            const margins = this.viewModel.generalPlotSettings.margins;
            const tooltipModels = this.viewModel.tooltipModels;
            const errorFunction = this.displayError;
            let lines = d3.selectAll(`.${Constants.verticalRulerClass} line`);
            const tooltipElement = d3.select('.' + Constants.tooltipClass);
            const tooltip =
                tooltipElement.nodes().length > 0
                    ? <d3.Selection<HTMLDivElement, unknown, null, undefined>>tooltipElement
                    : d3
                          .select(this.element)
                          .append('div')
                          .attr('class', Constants.tooltipClass)
                          .style('position', 'absolute')
                          .style('visibility', 'hidden')
                          .style('background-color', '#484848')
                          .style('border', 'solid')
                          .style('border-width', '1px')
                          .style('border-radius', '5px')
                          .style('padding', '10px');

            const mouseover = (event) => {
                try {
                    lines = d3.selectAll(`.${Constants.verticalRulerClass} line`);
                    tooltip.style('visibility', 'visible');
                    const element = d3.select(event.target);
                    element.attr('r', Number(element.attr('r')) * 2).style('stroke', 'black');
                    lines.style('opacity', 1);
                } catch (error) {
                    error.message = 'error in tooltip mouseover: ' + error.message;
                    errorFunction(error);
                }
            };

            const mousemove = (event, dataPoint: DataPoint) => {
                try {
                    const height = visualContainer.clientHeight;
                    const width = visualContainer.clientWidth;
                    const x = event.clientX - margins.left;
                    const tooltipX = event.clientX > width / 2 ? event.clientX - tooltip.node().offsetWidth - tooltipOffset : event.clientX + tooltipOffset;
                    let tooltipY = event.clientY > height / 2 ? event.clientY - tooltip.node().offsetHeight - tooltipOffset : event.clientY + tooltipOffset;
                    const tooltipData: TooltipData[] = [];

                    //add tooltips
                    tooltipModels.filter((model: TooltipModel) => {
                        model.tooltipData.filter((modelData) => {
                            if (modelData.pointNr == dataPoint.pointNr) {
                                tooltipData.push({
                                    yValue: modelData.yValue === null ? '-' : modelData.yValue,
                                    title: model.tooltipName,
                                });
                            }
                        });
                    });
                    tooltip.selectChildren().remove();
                    tooltipData.map((t) => {
                        tooltip.append('text').text(t.title).style('font-weight', '500');
                        tooltip
                            .append('tspan')
                            .text(':\t' + t.yValue)
                            .append('br');
                    });
                    const tooltipHeight = tooltip.node().getBoundingClientRect().height;
                    tooltipY = Math.max(tooltipY, 0);
                    tooltipY = Math.min(tooltipY, viewModel.svgHeight - tooltipHeight);
                    tooltip
                        .style('left', tooltipX + 'px')
                        .style('top', tooltipY + 'px')
                        .style('color', '#F0F0F0');

                    lines.attr('x1', x).attr('x2', x);
                } catch (error) {
                    error.message = 'error in tooltip mousemove: ' + error.message;
                    errorFunction(error);
                }
            };

            const mouseout = (e) => {
                try {
                    tooltip.style('visibility', 'hidden');
                    const element = d3.select(e.target);
                    element.attr('r', Number(element.attr('r')) / 2).style('stroke', 'none');
                    lines.style('opacity', 0);
                } catch (error) {
                    error.message = 'error in tooltip mouseout: ' + error.message;
                    errorFunction(error);
                }
            };
            return ok(<TooltipInterface>{ mouseover, mousemove, mouseout });
        } catch (error) {
            return err(new CustomTooltipError(error.stack));
        }
    }
}

function filterNullValues(dataPoints: DataPoint[]) {
    dataPoints = dataPoints.filter((d) => {
        return d.yValue != null;
    });
    return dataPoints;
}
