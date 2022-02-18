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
import { getAxisTextFillColor, getPlotFillColor, getValue, getVerticalRulerColor } from './objectEnumerationUtility';
import { createTooltipServiceWrapper, ITooltipServiceWrapper } from 'powerbi-visuals-utils-tooltiputils';
import { ViewModel, DataPoint, PlotModel, PlotType, D3Plot, D3PlotXAxis, D3PlotYAxis } from './plotInterface';
import { visualTransform } from './parseAndTransform';
import { Constants, EnableAxisNames, PlotSettingsNames, Settings } from './constants';


type Selection<T1, T2 = T1> = d3.Selection<any, T1, any, T2>;
export class Visual implements IVisual {
    private host: IVisualHost;
    private element: HTMLElement;
    private dataview: DataView;
    private viewModel: ViewModel;
    private svg: Selection<any>;

    static Config = {
        xScalePadding: 0.1,
        solidOpacity: 1,
        transparentOpacity: 1,
        margins: {
            top: 10,
            right: 30,
            bottom: 30,
            left: 50,
        },
    };

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.element = options.element;
        this.svg = d3.select(this.element).append('svg').classed('visualContainer', true);
    }


    public update(options: VisualUpdateOptions) {

        try {
            this.dataview = options.dataViews[0];
            this.svg.selectAll('*').remove();
            this.viewModel = visualTransform(options, this.host);

            let plots: D3Plot[] = [];
            let bars: d3.Selection<SVGRectElement, DataPoint, any, any>;


            for (let plotModel of this.viewModel.plotModels) {
                const plotType = plotModel.plotSettings.plotSettings.plotType;
                if (plotType == PlotType.LinePlot) {
                    const linePlot = this.drawLinePlot(options, plotModel, plotModel.plotId, plotModel.xName, plotModel.yName);
                    plots.push(linePlot);
                }
                else if (plotType == PlotType.ScatterPlot) {
                    const scatterPlot = this.drawScatterPlot(options, plotModel, plotModel.plotId, plotModel.xName, plotModel.yName);
                   plots.push(scatterPlot);
                }

                else if (plotType == PlotType.BarPlot) {
                    bars = this.drawBarPlot(options, plotModel, plotModel.plotId, plotModel.xName, plotModel.yName);
                }
            }

        this.zoomCharts(plots);

        } catch (error) {
            console.log(error());
        }
    }

    private constructBasicPlot (options: VisualUpdateOptions, plotModel: PlotModel, xLabelDesc: string, yLabelDesc: string) {

        let width = options.viewport.width - Visual.Config.margins.left - Visual.Config.margins.right;
        let height = 50;
        let top = height + 30 ;
        const plotType = plotModel.plotSettings.plotSettings.plotType;
        const plotNr = plotModel.plotId;
        const plotTop = top * plotNr ;

        this.svg
            .attr("width", width)
            .attr("height", 1000); // svg container height

        const plot = this.buildBasicPlot(width, height, plotType, plotNr, plotTop);
        const x  = this.buildXAxis(plotModel, plot, width, height, xLabelDesc);
        const y = this.buildYAxis(plotModel, plot, width, height, yLabelDesc);
        this.addVerticalRuler(plot, top);

        return<D3Plot>{type: plotType, plot, points: null, x, y};

    }

    private buildBasicPlot(width: number, height: number, plotType: any, plotNr: any, plotTop: any) {

        const plot = this.svg.append('g')
                    .classed(plotType + plotNr, true)
                    .attr('width', width)
                    .attr('height', height)
                    .attr('transform', 'translate(' + Visual.Config.margins.left  + ',' + plotTop + ')');
        return plot;
    }

    private buildXAxis(plotModel: PlotModel, plot: any, width: number, height: number, xLabelDesc: string): D3PlotXAxis{

        const xAxis = plot.append('g').classed('xAxis', true);

        const xScale = scaleLinear().domain([0, plotModel.xRange.max]).range([0, width]);

        const xAxisValue = axisBottom(xScale);

        if (!plotModel.formatSettings.enableAxis.enabled) {
            xAxisValue.tickValues([]);
        }

        // can be uncommented later

        // const xLabel = plot
        //     .append('text')
        //     .attr('class', 'xLabel')
        //     .attr('text-anchor', 'end')
        //     .attr('x', width / 2)
        //     .attr('y', height + 20)
        //     .text(xLabelDesc);

        xAxis
            .attr('transform', 'translate(0, ' + height + ')')
            .call(xAxisValue);

        return<D3PlotXAxis>{xAxis, xAxisValue, xScale, xLabel: null};
    }

    private buildYAxis(plotModel: PlotModel, plot: any, width: number, height: number, yLabelDesc: string): D3PlotYAxis {

        const yAxis = plot.append('g').classed('yAxis', true);

        const yScale = scaleLinear().domain([0, plotModel.yRange.max]).range([height, 0]);

        const yAxisValue = axisLeft(yScale).ticks(height / 20);

        const yLabel = plot
            .append('text')
            .attr('class', 'yLabel')
            .attr('text-anchor', 'middle')
            .attr('y', 0 - Visual.Config.margins.left)
            .attr('x', 0 - height / 2)
            .attr('dy', '1em')
            .attr('transform', 'rotate(-90)')
            .text(yLabelDesc);

        yAxis.call(yAxisValue);

        return <D3PlotYAxis>{yAxis, yAxisValue, yLabel, yScale};

    }

    private addVerticalRuler(plot: any, height: number) {
        const verticalRulerSettings = this.viewModel.verticalRulerSettings.verticalRulerSettings;
        const lineGroup = plot.append("g").attr("class", Constants.verticalRulerClass);
        let margins = Visual.Config.margins;
        height -= margins.bottom;


        lineGroup.append("line")
            .attr("stroke", verticalRulerSettings.fill)
            .attr("x1", 10).attr("x2", 10)
            .attr("y1", 0).attr("y2", height);
    }

    private drawScatterPlot(options: VisualUpdateOptions, plotModel: PlotModel, visualNumber: number, xLabel?: string, yLabel?: string): D3Plot {
        try {

            const basicPlot = this.constructBasicPlot(options, plotModel, xLabel, yLabel);
            const type = plotModel.plotSettings.plotSettings.plotType;
            const plot = basicPlot.plot;
            const x = basicPlot.x;
            const y = basicPlot.y;

            const dataPoints = filterNullValues(plotModel.dataPoints);

            const points = plot
                .selectAll('dots')
                .data(dataPoints)
                .enter()
                .append('circle')
                .attr('fill', plotModel.plotSettings.plotSettings.fill)
                .attr('stroke', 'none')
                .attr('cx', (d) => x.xScale(<number>d.xValue))
                .attr('cy', (d) => y.yScale(<number>d.yValue))
                .attr('r', 2)
                .attr("transform", d3.zoomIdentity.translate(0, 0).scale(1));

                let mouseEvents = this.customTooltip();
                points.on('mouseover', mouseEvents.mouseover).on('mousemove', mouseEvents.mousemove).on('mouseout', mouseEvents.mouseout);

               return<D3Plot>{type, plot, points, x, y};

        } catch (error) {
            console.log('Error in ScatterPlot: ', error);
        }
    }


    private drawLinePlot(options: VisualUpdateOptions, plotModel: PlotModel, visualNumber: number, xLabel?: string, yLabel?: string): D3Plot {

        try {

            const basicPlot = this.constructBasicPlot(options, plotModel, xLabel, yLabel);
            const type = plotModel.plotSettings.plotSettings.plotType;
            const plot = basicPlot.plot;
            const x = basicPlot.x;
            const y = basicPlot.y;

            const dataPoints = filterNullValues(plotModel.dataPoints);

            plot
                .append('path')
                .datum(dataPoints)
                .attr("class", "line")
                .attr(
                    'd',
                    d3
                        .line<DataPoint>()
                        .x((d) => x.xScale(<number>d.xValue))
                        .y((d) => y.yScale(<number>d.yValue))
                )
                .attr('fill', 'none')
                .attr('stroke', plotModel.plotSettings.plotSettings.fill)
                .attr('stroke-width', 1.5)
                .attr("transform", d3.zoomIdentity.translate(0, 0).scale(1));

            const points = plot
                .selectAll('dots')
                .data(dataPoints)
                .enter()
                .append('circle')
                .attr('fill', plotModel.plotSettings.plotSettings.fill)
                .attr('stroke', 'none')
                .attr('cx', (d) => x.xScale(<number>d.xValue))
                .attr('cy', (d) => y.yScale(<number>d.yValue))
                .attr('r', 2)
                .attr("transform", d3.zoomIdentity.translate(0, 0).scale(1));

            let mouseEvents = this.customTooltip();
            points.on('mouseover', mouseEvents.mouseover).on('mousemove', mouseEvents.mousemove).on('mouseout', mouseEvents.mouseout);

            return <D3Plot>{type, plot, points, x, y};
        } catch (error) {
            console.log('Error in Draw Line Chart: ', error);
        }
    }

    private zoomCharts(plots: D3Plot[]) {

         let zoomed = function(event) {

            let transform = event.transform;

            for (let plot of plots) {

                let xAxisValue = plot.x.xAxisValue;

                let xScaleNew = transform.rescaleX(plot.x.xScale);
                xAxisValue.scale(xScaleNew);
                plot.x.xAxis.call(xAxisValue);

                plot.points.attr('cx', (d) => xScaleNew(<number>d.xValue))
                    .attr('r', 2);

                if(plot.type === 'LinePlot') {

                    plot.plot.select('line')
                    .attr(
                        'd',
                        d3
                            .line<DataPoint>()
                            .x((d) => xScaleNew(<number>d.xValue))
                            .y((d) => plot.y.yScale(<number>d.yValue)))
                    .attr('stroke-width', 3);
                }
            }
        }

        let zoom = d3.zoom().scaleExtent([1, 10]).on('zoom', zoomed); // with scale extent you can control how much you scale

       this.svg.call(zoom);

    }

    private customTooltip() { // needs to be adjusted with vertical ruler method

        const tooltipOffset = 10;
        let visualContainer = this.svg.node();
        var lines = d3.selectAll(`.${Constants.verticalRulerClass} line`);
        const margins = Visual.Config.margins;
        var Tooltip = d3.select(this.element)
            .append('div')
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background-color", "white")
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


        let plotModels = this.viewModel.plotModels;

        let mousemove = function (event, data) {

            const height = visualContainer.offsetHeight;
            const width = visualContainer.offsetWidth;
            let tooltipText = "";
            tooltipText = "<b> x value </b> : " + data.xValue + " <br> ";
            for (let plotModel of plotModels) {
                for (let point of plotModel.dataPoints) {
                    if (point.xValue == data.xValue) {
                        tooltipText += "<b> " + plotModel.yName + "</b> : " + point.yValue + " <br> ";
                        break;
                    }
                }
            }
            const x = event.clientX - margins.left;
            const tooltipX = event.clientX > width / 2 ? event.clientX - Tooltip.node().offsetWidth - tooltipOffset : event.clientX+tooltipOffset;
            const tooltipY = event.clientY > height / 2 ? event.clientY - Tooltip.node().offsetHeight - tooltipOffset : event.clientY+tooltipOffset;
            Tooltip
                .html(tooltipText)
                .style("left", (tooltipX) + "px")
                .style("top", (tooltipY) + "px");

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

    private drawBarPlot(
        options: VisualUpdateOptions,
        plotModel: PlotModel,
        visualNumber: number,
        xLabel?: string,
        yLabel?: string
    ): d3.Selection<SVGRectElement, DataPoint, any, any> {
        let width = options.viewport.width - Visual.Config.margins.left - Visual.Config.margins.right;
        let height = 100;
        const basicPlot = this.constructBasicPlot(options, plotModel, xLabel, yLabel);
        const plot = basicPlot.plot;
        const x = basicPlot.x;
        const y = basicPlot.y;
        const dataPoints = filterNullValues(plotModel.dataPoints);
        const bar = plot.selectAll('.bar').data(dataPoints);

        const mergedBars = bar
            .enter()
            .append('rect')
            .merge(<any>bar);
        mergedBars.classed('bar', true);
        mergedBars
            .attr('width', width / dataPoints.length - 1)
            .attr('height', (d) => height - y.yScale(<number>d.yValue))
            .attr('y', (d) => y.yScale(<number>d.yValue))
            .attr('x', (d) => x.xScale(<number>d.xValue))
            .style('fill', (dataPoint: DataPoint) => dataPoint.color);
        return mergedBars;
    }

    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        const objectName = options.objectName;
        const colorPalette = this.host.colorPalette;
        let objectEnumeration: VisualObjectInstance[] = [];
        try {
            let yCount: number = this.dataview.metadata.columns.filter(x => { return x.roles.y_axis }).length;
            let metadataColumns: DataViewMetadataColumn[] = this.dataview.metadata.columns;
            switch (objectName) {
                case Settings.plotSettings:
                case Settings.enableAxis:
                    setObjectEnumerationColumnSettings(yCount, metadataColumns);
                    break;
                case Settings.colorSelector:
                    break;
                case Settings.verticalRulerSettings:
                    let objects = this.dataview.metadata.objects;
                    objectEnumeration.push({
                        objectName: objectName,
                        properties: {
                            fill: getVerticalRulerColor(objects,colorPalette,'#000000'),
                        },
                        selector: null
                    });
                    break;
            }
        } catch (error) {
            console.log('Error in Object Enumeration: ', error);
        }
        return objectEnumeration;

        function setObjectEnumerationColumnSettings(yCount: number, metadataColumns: powerbi.DataViewMetadataColumn[]) {

            objectEnumeration = new Array<VisualObjectInstance>(yCount);
            for (let column of metadataColumns) {
                if (column.roles.y_axis) {
                    const columnObjects = column.objects;
                    //index that the column has in the plot (differs from index in metadata) and is used to have the same order in settings
                    const yIndex: number = column['rolesIndex']['y_axis'][0];
                    let properties;
                    if (objectName === Settings.plotSettings) {
                        properties = {
                            plotType: PlotType[getValue<string>(columnObjects, Settings.plotSettings, PlotSettingsNames.plotType, PlotType.LinePlot)],
                            fill: getPlotFillColor(columnObjects, colorPalette, '#000000')
                        }
                    } else if (objectName === Settings.enableAxis) {
                        properties = {
                            enabled: getValue<boolean>(columnObjects, Settings.enableAxis, EnableAxisNames.enabled, true)
                        };
                    }
                    objectEnumeration[yIndex] = {
                        objectName: objectName,
                        displayName: column.displayName,
                        properties: properties,
                        selector: { metadata: column.queryName },
                    };
                }
            }
        }
    }
}
function filterNullValues(dataPoints: DataPoint[]) {
    dataPoints = dataPoints.filter(d => { return d.yValue != null; });
    return dataPoints;
}

