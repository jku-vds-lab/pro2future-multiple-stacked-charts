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
"use strict";

import "core-js/stable";
import "./../style/visual.less";
import "regenerator-runtime/runtime";

import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualEnumerationInstanceKinds = powerbi.VisualEnumerationInstanceKinds;
import ISelectionId = powerbi.visuals.ISelectionId;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import { select as d3Select } from "d3-selection";
import { scaleBand, scaleLinear } from "d3-scale";
import { axisBottom, axisLeft, axisRight } from "d3-axis";
import * as d3 from 'd3';
import {BarDataPoint, BarSettings, BarViewModel, visualTransform} from './barInterface';
import {LineDataPoint, LineSettings, LineViewModel, lineVisualTransform} from './lineChartInterface';
import { dataViewWildcard } from "powerbi-visuals-utils-dataviewutils";
import { getAxisTextFillColor } from "./objectEnumerationUtility";
import {createTooltipServiceWrapper, ITooltipServiceWrapper} from "powerbi-visuals-utils-tooltiputils";
import { X } from "vega-lite/build/src/channel";
type Selection<T1, T2 = T1> = d3.Selection<any, T1, any, T2>;
export class Visual implements IVisual {
    private host: IVisualHost;
    private element: HTMLElement;
    private svg: Selection<any>;
    private settings: any;
    private tooltipServiceWrapper: ITooltipServiceWrapper;

    private xAxisBar: Selection<SVGElement>;
    private yAxisBar: Selection<SVGElement>;

    private barContainer: Selection<SVGElement>;
    private barDataPoints: BarDataPoint[];
    private barSettings: BarSettings;
    private barViewModel: BarViewModel;
    private bar: any;
    private barChart: Selection<any>;


    private lineChart: Selection<any>;
    private lineContainer: Selection<SVGElement>;
    private lineDataPoints: LineDataPoint[];
    private lineSettings: LineSettings;
    private lineViewModel: LineViewModel;
    private line: any;



    static Config = {
        xScalePadding: 0.1,
        solidOpacity: 1,
        transparentOpacity: 1,
        margins: {
            top: 0,
            right: 0,
            bottom: 25,
            left: 30,
        }
    }

    constructor(options: VisualConstructorOptions) {

        this.host = options.host;
        this.element = options.element;

        this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, this.element);

        this.svg = d3Select(this.element).append('svg');



        this.barChart = this.svg.classed('barChart', true);
        this.barContainer = this.svg.append('g').classed('barContainer', true);
        this.xAxisBar = this.svg.append('g').classed('xAxisBar', true);
        this.yAxisBar = this.svg.append('g').classed('yAxisBar', true);
    }

    public update(options: VisualUpdateOptions) {

        try {

            this.lineViewModel = lineVisualTransform(options, this.host);
            this.barViewModel = visualTransform(options, this.host);

            this.settings = this.lineSettings = this.barSettings = this.lineViewModel.settings = this.barViewModel.settings;
            this.lineDataPoints = this.lineViewModel.dataPoints;

            const dots = this.drawLineChart(options);

            this.tooltipServiceWrapper.addTooltip(dots, (datapoint: LineDataPoint) => this.getTooltipData(datapoint),(datapoint: LineDataPoint) => datapoint.identity);


            this.barDataPoints = this.barViewModel.dataPoints;
            const mergedBars = this.drawBarChart(options);
            this.tooltipServiceWrapper.addTooltip(mergedBars, (datapoint: BarDataPoint) => this.getTooltipData(datapoint), (datapoint: BarDataPoint) => datapoint.identity);

    } catch(error) {
        console.log(error());
        }
    }

    // TODO This function should return the lines or the datapoints to hover over the line

    private drawLineChart(options: VisualUpdateOptions): any {

        let width = options.viewport.width - 200;
        let height = options.viewport.height - 300;

        const colorObjects = options.dataViews[0] ? options.dataViews[0].metadata.objects : null;

        this.lineChart = this.svg.classed('lineChart', true);
        this.lineChart.attr("width", width).attr("height", height);

        let xAxis = this.lineChart.append('g').classed('xAxisLine', true);
        let yAxis = this.lineChart.append('g').classed('yAxisLine', true);

        if (this.settings.enableAxis.show) {
            let margins = Visual.Config.margins;
            height -= margins.bottom;
        }

        let xScale = scaleBand()
                    .domain(this.lineViewModel.dataPoints.map(d => d.category))
                    .rangeRound([0, width])
                    .padding(0.2);

        let xAxisValue = axisBottom(xScale);

        xAxis.attr('transform', 'translate(0, ' + height + ')')
            .call(xAxisValue)
            .attr("color", getAxisTextFillColor(
                colorObjects,
                this.host.colorPalette,
                "#000000" // can be defaultSettings.enableAxis.fill
        ));

        let yScale = scaleLinear().domain([0, this.lineViewModel.dataMax]).range([height, 0]);
        let yAxisValue = axisRight(yScale);

        yAxis.call(yAxisValue)
            .attr("color", getAxisTextFillColor(
                colorObjects,
                this.host.colorPalette,
                "#000000" // can be defaultSettings.enableAxis.fill
        ));

        this.lineChart.append('path')
            .datum(this.lineDataPoints)
            .attr("d", d3.line<LineDataPoint>()
            .x(d => xScale(d.category))
            .y(d => yScale(<number>d.value)))
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5);

        const dots = this.lineChart.selectAll('dots').data(this.lineDataPoints)
                    .enter()
                    .append("circle")
                    .attr("fill", "red")
                    .attr("stroke", "none")
                    .attr("cx", (d => xScale(d.category)))
                    .attr("cy", (d => yScale(<number>d.value)))
                    .attr("r", 3);

       return dots;
    }

    private drawBarChart(options: VisualUpdateOptions): any {

        let width = options.viewport.width - 200;
        let height = options.viewport.height - 300;

        this.barChart.attr("width", width).attr("height", height);

        if (this.settings.enableAxis.show) {
            let margins = Visual.Config.margins;
            height -= margins.bottom;
            }

        let xScale = scaleBand()
        .domain(this.barViewModel.dataPoints.map(d => d.category))
        .rangeRound([0, width])
        .padding(0.2);

        const colorObjects = options.dataViews[0] ? options.dataViews[0].metadata.objects : null;

        let xAxis = axisBottom(xScale);

        this.xAxisBar.attr('transform', 'translate(0, ' + height + ')')
            .call(xAxis)
            .attr("color", getAxisTextFillColor(
                colorObjects,
                this.host.colorPalette,
                "#000000" // can be defaultSettings.enableAxis.fill
            ));

        let yScale = scaleLinear().domain([0, this.barViewModel.dataMax]).range([height, 0]);
        let yAxis = axisLeft(yScale);

        this.yAxisBar
            .call(yAxis).attr("color", getAxisTextFillColor(
                colorObjects,
                this.host.colorPalette,
                "#000000" // can be defaultSettings.enableAxis.fill
        ));


        this.bar = this.barContainer.selectAll('.bar').data(this.barDataPoints);

        const mergedBars = this.bar.enter().append('rect').merge(<any>this.bar);

        mergedBars.classed('bar', true);

        mergedBars
            .attr('width', xScale.bandwidth())
            .attr('height', d => height - yScale(<number>d.value))
            .attr('y', d => yScale(<number>d.value))
            .attr('x', d => xScale(d.category))
            .style('fill', (dataPoint: BarDataPoint) => dataPoint.color);

        return mergedBars;
    }

    //TODO only shows the categories and values nothing from the tooltip field
    private getTooltipData(value: any): VisualTooltipDataItem[] {
        console.log('Tooltip value: ', value);
        return [{
            displayName: value.category,
            value: value.value.toString(),
            color: value.color ?? "#000000"
        }];
    }

    /**
     * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
     * objects and properties you want to expose to the users in the property pane.
     *
     */
    // TODO: this should be able to handle the object enumeration for all the plots
    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {

        let objectName = options.objectName;
        let objectEnumeration: VisualObjectInstance[] = [];



        // if(!this.barSettings || !this.barSettings.enableAxis || !this.barDataPoints) {
        //     return objectEnumeration;
        // }

        if(!this.settings || !this.settings.enableAxis || !this.lineDataPoints) {
            return objectEnumeration;
        }

        switch (objectName) {
            case 'enableAxis':
                objectEnumeration.push({
                    objectName: objectName,
                    properties: {
                        show: this.settings.enableAxis.show,
                        fill: this.settings.enableAxis.fill,
                    },
                    selector: null
                });
                break;

            case 'colorSelector':
                for (let barDataPoint of this.barDataPoints) {
                    objectEnumeration.push({
                        objectName: objectName,
                        displayName: barDataPoint.category,
                        properties: {
                            fill: {
                                solid: {
                                    color: barDataPoint.color
                                }
                            }
                        },
                        propertyInstanceKind: {
                            fill: VisualEnumerationInstanceKinds.ConstantOrRule
                        },
                        altConstantValueSelector: (<ISelectionId>barDataPoint.identity).getSelector(),
                        selector: dataViewWildcard.createDataViewWildcardSelector(dataViewWildcard.DataViewWildcardMatchingOption.InstancesAndTotals)
                    })
                }
                break;
           };

        return objectEnumeration;
    }

}