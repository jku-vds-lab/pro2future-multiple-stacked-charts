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

import 'core-js/stable';
import './../style/visual.less';
import 'regenerator-runtime/runtime';

import powerbi from 'powerbi-visuals-api';
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import VisualEnumerationInstanceKinds = powerbi.VisualEnumerationInstanceKinds;
import ISelectionId = powerbi.visuals.ISelectionId;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import DataView = powerbi.DataView;
import { select as d3Select } from 'd3-selection';
import { scaleBand, scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft, axisRight } from 'd3-axis';
import * as d3 from 'd3';
import { dataViewWildcard } from 'powerbi-visuals-utils-dataviewutils';
import { getAxisTextFillColor, getPlotFillColor, getValue, getColorSettings } from './objectEnumerationUtility';
import { createTooltipServiceWrapper, ITooltipServiceWrapper } from 'powerbi-visuals-utils-tooltiputils';
import { ViewModel, DataPoint, PlotModel, PlotType, SlabType, D3Plot, D3PlotXAxis, D3PlotYAxis, ColorSettings, SlabRectangle, AxisInformation, AxisInformationInterface, TooltipModel, TooltipDataPoint, TooltipData } from './plotInterface';
import { visualTransform } from './parseAndTransform';
import { OverlayPlotSettingsNames, ColorSettingsNames, Constants, AxisSettingsNames, PlotSettingsNames, Settings, PlotTitleSettingsNames, TooltipTitleSettingsNames, YRangeSettingsNames } from './constants';
import { data } from 'jquery';

type Selection<T1, T2 = T1> = d3.Selection<any, T1, any, T2>;
export class Visual implements IVisual {
    private host: IVisualHost;
    private element: HTMLElement;
    private dataview: DataView;
    private viewModel: ViewModel;
    private svg: Selection<any>;


    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.element = options.element;
        this.svg = d3.select(this.element).append('svg').classed('visualContainer', true);
    }


    public update(options: VisualUpdateOptions) {

        try {
            this.dataview = options.dataViews[0];
            this.viewModel = visualTransform(options, this.host);
            this.svg.selectAll('*').remove();
            this.svg.attr("width", this.viewModel.svgWidth)
                .attr("height", this.viewModel.svgHeight);


            let bars: d3.Selection<SVGRectElement, DataPoint, any, any>;
            this.drawPlots(options);

        } catch (error) {
            console.log(error());
        }
    }

    private drawPlots(options: VisualUpdateOptions) {
        let plots: D3Plot[] = [];
        for (let plotModel of this.viewModel.plotModels) {
            const plotType = plotModel.plotSettings.plotSettings.plotType;
            //TODO: don't draw datapoints that are out of y-range?
            if (plotType == PlotType.LinePlot) {
                const linePlot = this.drawLinePlot(options, plotModel);
                plots.push(linePlot);
            }
            else if (plotType == PlotType.ScatterPlot) {
                const scatterPlot = this.drawScatterPlot(options, plotModel);
                plots.push(scatterPlot);
            }

            else if (plotType == PlotType.BarPlot) {
                this.drawBarPlot(options, plotModel);
            }
        }

        this.zoomCharts(plots, options);
    }

    private constructBasicPlot(options: VisualUpdateOptions, plotModel: PlotModel) {
        const plotNr = plotModel.plotId;
        const plotType = plotModel.plotSettings.plotSettings.plotType
        const plot = this.buildBasicPlot(plotModel);
        const slabGroup = plot.append("g").attr("class", Constants.slabClass);
        const x = this.buildXAxis(plotModel, plot);
        const y = this.buildYAxis(plotModel, plot);
        this.addClipPath();
        this.addPlotTitles(plotModel, plot);
        this.addVerticalRuler(plot);
        this.drawSlabs(plotModel, plot, x.xScale, y.yScale);

        return <D3Plot>{ type: plotType, plot, points: null, x, y };

    }

    private addClipPath() {
        const generalPlotSettings = this.viewModel.generalPlotSettings;
        const plotWidth = generalPlotSettings.plotWidth;
        const plotHeight = generalPlotSettings.plotHeight;
        let defs = this.svg.append('defs').append('clipPath')
            .attr('id', 'clip')
            .append('rect')
            .attr('y', -generalPlotSettings.dotMargin)
            .attr('x', -generalPlotSettings.dotMargin)
            .attr('width', plotWidth - generalPlotSettings.margins.right + 2 * generalPlotSettings.dotMargin)
            .attr('height', plotHeight + 2 * generalPlotSettings.dotMargin);
    }

    private addPlotTitles(plotModel: PlotModel, plot: d3.Selection<SVGGElement, any, any, any>) {
        const generalPlotSettings = this.viewModel.generalPlotSettings;
        if (plotModel.plotTitleSettings.title.length > 0) {
            let title = plot
                .append('text')
                .attr('class', 'plotTitle')
                .attr('text-anchor', 'left')
                .attr('y', 0 - generalPlotSettings.plotTitleHeight - generalPlotSettings.margins.top)
                .attr('x', 0)
                .attr('dy', '1em')
                .text(plotModel.plotTitleSettings.title);
        }
    }

    private buildBasicPlot(plotModel: PlotModel) {
        const plotType = plotModel.plotSettings.plotSettings.plotType;
        const generalPlotSettings = this.viewModel.generalPlotSettings;
        const plot = this.svg.append('g')
            .classed(plotType + plotModel.plotId, true)
            .attr('width', generalPlotSettings.plotWidth)
            .attr('height', generalPlotSettings.plotHeight)
            .attr('transform', 'translate(' + generalPlotSettings.margins.left + ',' + plotModel.plotTop + ')');
        return plot;
    }

    private buildXAxis(plotModel: PlotModel, plot: any): D3PlotXAxis {

        const generalPlotSettings = this.viewModel.generalPlotSettings
        const xAxis = plot.append('g').classed('xAxis', true);
        const xScale = scaleLinear().domain([0, plotModel.xRange.max]).range([0, generalPlotSettings.plotWidth]);
        const xAxisValue = axisBottom(xScale);

        if (!plotModel.formatSettings.axisSettings.xAxis.ticks) {
            xAxisValue.tickValues([]);
        }

        // can be uncommented later

        if (plotModel.formatSettings.axisSettings.xAxis.lables) {
            const xLabel = plot
                .append('text')
                .attr('class', 'xLabel')
                .attr('text-anchor', 'end')
                .attr('x', generalPlotSettings.plotWidth / 2)
                .attr('y', generalPlotSettings.plotHeight + 20)
                .text(plotModel.xName);
        }

        xAxis
            .attr('transform', 'translate(0, ' + generalPlotSettings.plotHeight + ')')
            .call(xAxisValue);

        return <D3PlotXAxis>{ xAxis, xAxisValue, xScale, xLabel: null };
    }

    private buildYAxis(plotModel: PlotModel, plot: any): D3PlotYAxis {

        const generalPlotSettings = this.viewModel.generalPlotSettings;
        const yAxis = plot.append('g').classed('yAxis', true);
        const yScale = scaleLinear().domain([plotModel.yRange.min, plotModel.yRange.max]).range([generalPlotSettings.plotHeight, 0]);
        const yAxisValue = axisLeft(yScale).ticks(generalPlotSettings.plotHeight / 20);
        var yLabel = null;
        if (plotModel.formatSettings.axisSettings.yAxis.lables) {
            yLabel = plot
                .append('text')
                .attr('class', 'yLabel')
                .attr('text-anchor', 'middle')
                .attr('y', 0 - generalPlotSettings.margins.left)
                .attr('x', 0 - generalPlotSettings.plotHeight / 2)
                .attr('dy', '1em')
                .attr('transform', 'rotate(-90)')
                .text(plotModel.yName);
        }

        if (!plotModel.formatSettings.axisSettings.yAxis.ticks) {
            yAxisValue.tickValues([]);
        }

        yAxis.call(yAxisValue);

        return <D3PlotYAxis>{ yAxis, yAxisValue, yLabel, yScale };



    }


    private drawSlabs(plotModel: PlotModel, plot: Selection<any, any>, xScale: d3.ScaleLinear<number, number, never>, yScale: d3.ScaleLinear<number, number, never>) {

        const colorSettings = this.viewModel.colorSettings.colorSettings;
        const slabtype = plotModel.overlayPlotSettings.overlayPlotSettings.slabType;
        const slabRectangles = this.viewModel.slabRectangles;
        const plotHeight = this.viewModel.generalPlotSettings.plotHeight;
        if (slabtype != SlabType.None && slabRectangles != null && slabRectangles.length > 0) {
            if (slabtype == SlabType.Rectangle) {
                plot.select(`.${Constants.slabClass}`).selectAll('rect').data(slabRectangles).enter()
                    .append("rect")
                    .attr("x", function (d) { return xScale(d.x); })
                    .attr("y", function (d) { return yScale(d.width - d.y); })
                    .attr("width", function (d) { return xScale(d.length + d.x) - xScale(d.x); })
                    .attr("height", function (d) { return yScale(d.y) - yScale(d.width); })
                    .attr("fill", "transparent")
                    .attr("stroke", colorSettings.slabColor);
            } else if (slabtype == SlabType.Line) {
                plot.select(`.${Constants.slabClass}`).selectAll('line').data(slabRectangles).enter()
                    .append("line")
                    .attr("stroke", colorSettings.slabColor)
                    .attr("x1", function (d) { return xScale(d.x); })
                    .attr("x2", function (d) { return xScale(d.x); })
                    .attr("y1", 0)
                    .attr("y2", plotHeight)
                    .attr("opacity", 1);
            }
        } else {
            plot.select(`.${Constants.slabClass}`).remove()
        }
    }

    private addVerticalRuler(plot: any) {
        const verticalRulerSettings = this.viewModel.colorSettings.colorSettings.verticalRulerColor;
        const lineGroup = plot.append("g").attr("class", Constants.verticalRulerClass);
        let generalPlotSettings = this.viewModel.generalPlotSettings;

        lineGroup.append("line")
            .attr("stroke", verticalRulerSettings)
            .attr("x1", 10).attr("x2", 10)
            .attr("y1", 0).attr("y2", generalPlotSettings.plotHeight)
            .style("opacity", 0);
    }

    private drawScatterPlot(options: VisualUpdateOptions, plotModel: PlotModel): D3Plot {
        try {

            const basicPlot = this.constructBasicPlot(options, plotModel);
            const type = plotModel.plotSettings.plotSettings.plotType;
            const plot = basicPlot.plot;
            const x = basicPlot.x;
            const y = basicPlot.y;
            const dataPoints = filterNullValues(plotModel.dataPoints);
            const points = plot
                .selectAll(Constants.dotClass)
                .data(dataPoints)
                .enter()
                .append('circle')
                .attr('fill', plotModel.plotSettings.plotSettings.fill)
                .attr('stroke', 'none')
                .attr('cx', (d) => x.xScale(<number>d.xValue))
                .attr('cy', (d) => y.yScale(<number>d.yValue))
                .attr('r', 2)
                .attr('clip-path', 'url(#clip)')
                .attr("transform", d3.zoomIdentity.translate(0, 0).scale(1));

            let mouseEvents = this.customTooltip();
            points.on('mouseover', mouseEvents.mouseover).on('mousemove', mouseEvents.mousemove).on('mouseout', mouseEvents.mouseout);

            return <D3Plot>{ type, plot, root: plot, points, x, y };

        } catch (error) {
            console.log('Error in ScatterPlot: ', error);
        }
    }


    private drawLinePlot(options: VisualUpdateOptions, plotModel: PlotModel): D3Plot {

        try {
            const basicPlot = this.constructBasicPlot(options, plotModel);
            const type = plotModel.plotSettings.plotSettings.plotType;
            const plot = basicPlot.plot;
            const x = basicPlot.x;
            const y = basicPlot.y;

            const dataPoints = filterNullValues(plotModel.dataPoints);

            const line = d3
                .line<DataPoint>()
                .x((d) => x.xScale(<number>d.xValue))
                .y((d) => y.yScale(<number>d.yValue));

            const linePath = plot
                .append('path')
                .datum(dataPoints)
                .attr("class", "path")
                .attr('d', line)
                .attr('fill', 'none')
                .attr('stroke', plotModel.plotSettings.plotSettings.fill)
                .attr('stroke-width', 1.5)
                .attr('clip-path', 'url(#clip)')
                .attr("transform", d3.zoomIdentity.translate(0, 0).scale(1));


            const points = plot
                .selectAll(Constants.dotClass)
                .data(dataPoints)
                .enter()
                .append('circle')
                .attr('fill', plotModel.plotSettings.plotSettings.fill)
                .attr('stroke', 'none')
                .attr('cx', (d) => x.xScale(<number>d.xValue))
                .attr('cy', (d) => y.yScale(<number>d.yValue))
                .attr('r', 2)
                .attr('clip-path', 'url(#clip)')
                .attr("transform", d3.zoomIdentity.translate(0, 0).scale(1));

            let mouseEvents = this.customTooltip();
            points.on('mouseover', mouseEvents.mouseover).on('mousemove', mouseEvents.mousemove).on('mouseout', mouseEvents.mouseout);
            return <D3Plot>{
                type: type,
                plot: linePath,
                root: plot,
                points: points,
                x: x,
                y: y
            };
        } catch (error) {
            console.log('Error in Draw Line Chart: ', error);
        }
    }

    private zoomCharts(plots: D3Plot[], options: VisualUpdateOptions) {


        let zoomed = function (event) {

            let transform = event.transform;
            if (transform.k == 1) {
                transform.x = 0
            }
            for (let plot of plots) {

                plot.x.xAxis.attr('clip-path', 'url(#clip)')

                let xAxisValue = plot.x.xAxisValue;

                let xScaleNew = transform.rescaleX(plot.x.xScale);
                xAxisValue.scale(xScaleNew);
                plot.x.xAxis.call(xAxisValue);

                plot.points.attr('cx', (d) => { return xScaleNew(<number>d.xValue) })
                    .attr('r', 2);

                plot.points.attr('clip-path', 'url(#clip)');
                var slabBars = plot.root.select(`.${Constants.slabClass}`).attr('clip-path', 'url(#clip)');
                slabBars.selectAll('rect')
                    .attr("x", function (d: SlabRectangle) { return xScaleNew(d.x); })
                    .attr("width", function (d: SlabRectangle) { return xScaleNew(d.length + d.x) - xScaleNew(d.x); });
                slabBars.selectAll('line')
                    .attr("x1", function (d: SlabRectangle) { return xScaleNew(d.x); })
                    .attr("x2", function (d: SlabRectangle) { return xScaleNew(d.x); })

                if (plot.type === 'LinePlot') {
                    plot.plot.attr('clip-path', 'url(#clip)');

                    let line = d3
                        .line<DataPoint>()
                        .x((d) => xScaleNew(<number>d.xValue))
                        .y((d) => plot.y.yScale(<number>d.yValue));

                    plot.plot.attr('d', line);
                }
            }
        }

        let zoom = d3.zoom().scaleExtent([1, 10]).on('zoom', zoomed); // with scale extent you can control how much you scale

        this.svg.call(zoom);

    }

    private customTooltip() { // needs to be adjusted with vertical ruler method

        const tooltipOffset = 10;
        const plotModels = this.viewModel.plotModels;
        const visualContainer = this.svg.node();
        const margins = this.viewModel.generalPlotSettings.margins;
        const tooltipModels = this.viewModel.tooltipModels;
        var lines = d3.selectAll(`.${Constants.verticalRulerClass} line`);
        var Tooltip = d3.select(this.element)
            .append('div')
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background-color", "#484848")
            .style("border", "solid")
            .style("border-width", "1px")
            .style("border-radius", "5px")
            .style("padding", "10px")
            .html("No tooltip info available");

        let mouseover = function () {
            lines = d3.selectAll(`.${Constants.verticalRulerClass} line`);
            Tooltip.style("visibility", "visible");
            d3.select(this)
                .attr('r', 4)
                .style("stroke", "black")
                .style("opacity", 1);
            lines.style("opacity", 1);
        };

        let mousemove = function (event, data) {

            const height = visualContainer.clientHeight;
            const width = visualContainer.clientWidth;
            const x = event.clientX - margins.left;
            const tooltipX = event.clientX > width / 2 ? event.clientX - Tooltip.node().offsetWidth - tooltipOffset : event.clientX + tooltipOffset;
            const tooltipY = event.clientY > height / 2 ? event.clientY - Tooltip.node().offsetHeight - tooltipOffset : event.clientY + tooltipOffset;
            let tooltipText = "<b> x value </b> : " + data.xValue + " <br> ";
            let tooltipData: TooltipData[] = [];
            plotModels.filter((model: PlotModel) => {
                model.dataPoints.filter(modelData => {
                    if (modelData.xValue == data.xValue) {
                        tooltipData.push({
                            yValue: modelData.yValue,
                            title: model.plotTitleSettings.title
                        });
                    }
                });
            });
            tooltipModels.filter((model: TooltipModel) => {
                model.tooltipData.filter(modelData => {
                    if (modelData.xValue == data.xValue) {
                        tooltipData.push({
                            yValue: modelData.yValue,
                            title: model.tooltipName
                        });
                    }
                })
            });
            for (const tooltip of tooltipData) {
                tooltipText += "<b> " + tooltip.title + "</b> : " + tooltip.yValue + " <br> ";
            }
            //TODO: check if there is a performance difference
            // for (let plotModel of plotModels) {
            //     for (let point of plotModel.dataPoints) {
            //         if (point.xValue == data.xValue) {
            //             tooltipText += "<b> " + plotModel.yName + "</b> : " + point.yValue + " <br> ";
            //             break;
            //         }
            //     }
            // }
            Tooltip
                .html(tooltipText)
                .style("left", (tooltipX) + "px")
                .style("top", (tooltipY) + "px")
                .style("color", "#F0F0F0");

            lines.attr("x1", x).attr("x2", x);

        };

        let mouseout = function () {
            Tooltip.style("visibility", "hidden");
            d3.select(this)
                .attr('r', 2)
                .style("stroke", "none")
                .style("opacity", 0.8);
            lines.style("opacity", 0);
        }
        return { mouseover, mousemove, mouseout };
    }

    //TODO: improve bar plot or remove it
    private drawBarPlot(options: VisualUpdateOptions, plotModel: PlotModel): d3.Selection<SVGRectElement, DataPoint, any, any> {
        const generalPlotSettings = this.viewModel.generalPlotSettings;
        let plotWidth = generalPlotSettings.plotWidth
        let plotHeight = generalPlotSettings.plotHeight
        const basicPlot = this.constructBasicPlot(options, plotModel);
        const plot = basicPlot.plot;
        const x = basicPlot.x;
        const y = basicPlot.y;
        const dataPoints = filterNullValues(plotModel.dataPoints);
        const bar = plot.selectAll(`.${Constants.barClass}`).data(dataPoints);

        const mergedBars = bar
            .enter()
            .append('rect')
            .merge(<any>bar);
        mergedBars.classed(Constants.barClass, true)
            .attr('width', plotWidth / dataPoints.length - 1)
            .attr('height', (d) => plotHeight - y.yScale(<number>d.yValue))
            .attr('y', (d) => y.yScale(<number>d.yValue))
            .attr('x', (d) => x.xScale(<number>d.xValue))
            .style('fill', (dataPoint: DataPoint) => dataPoint.color);
        return mergedBars;
    }

    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        const objectName = options.objectName;
        const colorPalette = this.host.colorPalette;
        let objectEnumeration: VisualObjectInstance[] = [];
        const plotmodles: PlotModel[] = this.viewModel.plotModels;
        try {
            let yCount: number = this.dataview.metadata.columns.filter(x => { return x.roles.y_axis }).length;
            let metadataColumns: DataViewMetadataColumn[] = this.dataview.metadata.columns;
            switch (objectName) {
                case Settings.plotSettings:
                case Settings.axisSettings:
                case Settings.yRangeSettings:
                    setObjectEnumerationColumnSettings(yCount, metadataColumns, 2);
                    break;
                case Settings.overlayPlotSettings:
                case Settings.plotTitleSettings:
                    setObjectEnumerationColumnSettings(yCount, metadataColumns);
                    break;
                case Settings.colorSelector:
                    break;
                case Settings.tooltipTitleSettings:
                    const tooltipModels = this.viewModel.tooltipModels;
                    const tooltipCount = tooltipModels.length;
                    objectEnumeration = new Array<VisualObjectInstance>(tooltipCount);
                    for (const column of metadataColumns) {
                        if (column.roles.tooltip) {
                            const yIndex: number = column['rolesIndex']['tooltip'][0];
                            objectEnumeration[yIndex] = {
                                objectName: objectName,
                                displayName: column.displayName,
                                properties: { title: getValue<string>(column.objects, Settings.tooltipTitleSettings, TooltipTitleSettingsNames.title, column.displayName) },
                                selector: { metadata: column.queryName }
                            };
                        }
                    }
                    break;
                case Settings.colorSettings:
                    let objects = this.dataview.metadata.objects;
                    objectEnumeration.push({
                        objectName: objectName,
                        properties: {
                            verticalRulerColor: getColorSettings(objects, ColorSettingsNames.verticalRulerColor, colorPalette, '#000000'),
                            slabColor: getColorSettings(objects, ColorSettingsNames.slabColor, colorPalette, '#0000FF')
                        },
                        selector: null
                    });
                    break;
            }
        } catch (error) {
            console.log('Error in Object Enumeration: ', error);
        }
        return objectEnumeration;

        function setObjectEnumerationColumnSettings(yCount: number, metadataColumns: powerbi.DataViewMetadataColumn[], settingsCount: number = 1) {
            objectEnumeration = new Array<VisualObjectInstance>(yCount * settingsCount);

            for (let column of metadataColumns) {
                if (column.roles.y_axis) {
                    const columnObjects = column.objects;
                    var displayNames = {}
                    var properties = {}
                    //index that the column has in the plot (differs from index in metadata) and is used to have the same order in settings
                    const yIndex: number = column['rolesIndex']['y_axis'][0];
                    switch (objectName) {
                        case Settings.plotSettings:
                            displayNames = {
                                plotType: column.displayName + " Plot Type",
                                fill: column.displayName + " Plot Color"
                            };
                            properties = {
                                plotType: PlotType[getValue<string>(columnObjects, Settings.plotSettings, PlotSettingsNames.plotType, PlotType.LinePlot)],
                                fill: getPlotFillColor(columnObjects, colorPalette, '#000000')
                            };

                            break;

                        case Settings.axisSettings:
                            const xInformation = AxisInformation[getValue<string>(columnObjects, Settings.axisSettings, AxisSettingsNames.xAxis, AxisInformation.None)]
                            const yInformation = AxisInformation[getValue<string>(columnObjects, Settings.axisSettings, AxisSettingsNames.yAxis, AxisInformation.Ticks)]

                            displayNames = {
                                xInformation: column.displayName + " X-Axis",
                                yInformation: column.displayName + " Y-Axis",
                            };
                            properties = {
                                xAxis: xInformation,
                                yAxis: yInformation
                            };
                            break;
                        case Settings.yRangeSettings:
                            const yRange = plotmodles.filter(x => { return x.plotId == yIndex })[0].yRange
                            displayNames = {
                                min: column.displayName + " Minimum Value",
                                yInformation: column.displayName + " Maximum Value",
                            };
                            properties = {
                                min: getValue<number>(columnObjects, Settings.yRangeSettings, YRangeSettingsNames.min, 0),//TODO: change to yRange.min?
                                max: getValue<number>(columnObjects, Settings.yRangeSettings, YRangeSettingsNames.max, yRange.max)
                            };

                            break;
                        case Settings.overlayPlotSettings:
                            displayNames = {
                                overlayType: column.displayName + " Slab Overlay Type"
                            };
                            properties = {
                                slabType: SlabType[getValue<string>(columnObjects, Settings.overlayPlotSettings, OverlayPlotSettingsNames.slabType, SlabType.None)]
                            };
                            break;
                        case Settings.plotTitleSettings:
                            displayNames = {
                                overlayType: column.displayName + " Plot Title"
                            };
                            properties = {
                                title: getValue<string>(columnObjects, Settings.plotTitleSettings, PlotTitleSettingsNames.title, column.displayName)
                            };
                            break;
                    }
                    const propertyEntries = Object.entries(properties);
                    const displayNamesEntries = Object.entries(displayNames);
                    for (let i = 0; i < propertyEntries.length; i++) {
                        const [key, value] = propertyEntries[i];
                        var props = {};
                        props[key] = value;
                        objectEnumeration[yIndex * settingsCount + i] = {
                            objectName: objectName,
                            displayName: <string>displayNamesEntries[i][1],
                            properties: props,
                            selector: { metadata: column.queryName },
                        };

                    }

                }
            }
        }
    }
}


function filterNullValues(dataPoints: DataPoint[]) {
    dataPoints = dataPoints.filter(d => { return d.yValue != null; });
    return dataPoints;
}

