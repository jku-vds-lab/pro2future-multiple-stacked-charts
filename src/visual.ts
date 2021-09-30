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
import {BarDataPoint, BarSettings, BarViewModel, visualTransform as barVisualTransform} from './barChartInterface';
import {LineDataPoint, LineSettings, LineViewModel, lineVisualTransform} from './lineChartInterface';
import { dataViewWildcard } from "powerbi-visuals-utils-dataviewutils";
import { getAxisTextFillColor } from "./objectEnumerationUtility";
import {createTooltipServiceWrapper, ITooltipServiceWrapper} from "powerbi-visuals-utils-tooltiputils";
import { fontConfig } from "vega-lite/build/src/config";
type Selection<T1, T2 = T1> = d3.Selection<any, T1, any, T2>;
export class Visual implements IVisual {
    private host: IVisualHost;
    private element: HTMLElement;
    private visualContainer: d3.Selection<HTMLDivElement, any, HTMLDivElement, any>;
    private settings: any;
    private tooltipServiceWrapper: ITooltipServiceWrapper;

    private barViewModel: BarViewModel;
    private barSettings: BarSettings; // required for object enumeration
    private barDataPoints: BarDataPoint[]; // required for object enumeration

    private lineViewModel: LineViewModel;
    private lineSettings: LineSettings; // required for object enumeration
    private lineDataPoints: LineDataPoint[]; // required for object enumeration

    static Config = {
        xScalePadding: 0.1,
        solidOpacity: 1,
        transparentOpacity: 1,
        margins: {
            top: 10,
            right: 30,
            bottom: 30,
            left: 30,
        }
    }

    constructor(options: VisualConstructorOptions) {

        this.host = options.host;
        this.element = options.element;

        this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, this.element);

        this.visualContainer = d3.select(this.element).append('div').attr('class', 'visualContainer');
    }

    public update(options: VisualUpdateOptions) {

        try {

            this.lineViewModel = lineVisualTransform(options, this.host);
            this.lineDataPoints = this.lineViewModel.dataPoints;
            this.barViewModel = barVisualTransform(options, this.host);
            this.barDataPoints = this.barViewModel.dataPoints;

            this.settings = this.lineSettings = this.barSettings = this.lineViewModel.settings = this.barViewModel.settings;

            this.visualContainer.selectAll('*').remove();

            const dots_1 = this.drawLineChart(options, 1, 'Param 1', 'y1');
            const dots_2 = this.drawLineChart(options, 2, 'Param 2', 'y2');
            const mergedBars = this.drawBarChart(options);

            this.tooltipServiceWrapper.addTooltip(dots_1, (datapoint: LineDataPoint) => this.getTooltipData(datapoint),(datapoint: LineDataPoint) => datapoint.identity);
            this.tooltipServiceWrapper.addTooltip(dots_2, (datapoint: LineDataPoint) => this.getTooltipData(datapoint),(datapoint: LineDataPoint) => datapoint.identity);
            this.tooltipServiceWrapper.addTooltip(mergedBars, (datapoint: BarDataPoint) => this.getTooltipData(datapoint), (datapoint: BarDataPoint) => datapoint.identity);

    } catch(error) {
        console.log(error());
        }
    }

    private drawLineChart(options: VisualUpdateOptions, visualNumber: number = 1, xLabel?: string, yLabel?: string): any {

        let width = options.viewport.width - Visual.Config.margins.left - Visual.Config.margins.right;
        let height = 100;

        const colorObjects = options.dataViews[0] ? options.dataViews[0].metadata.objects : null;
        const lineDataPoints = this.lineViewModel.dataPoints;
        const lineChart: Selection<any> = this.visualContainer.append('svg').classed('lineChart-' + visualNumber, true);
        const xAxis = lineChart.append('g').classed('xAxisLine', true);
        const yAxis = lineChart.append('g').classed('yAxisLine', true);

        lineChart.attr("width", width).attr("height", height).append("g").attr("transform", "translate(" + Visual.Config.margins.left + "," + Visual.Config.margins.top + ")");

        if (this.settings.enableAxis.show) {
            let margins = Visual.Config.margins;
            height -= margins.bottom;
        }

        const xScale = scaleBand()
                    .domain(lineDataPoints.map(d => d.category))
                    .rangeRound([0, width])
                    .padding(0.2);

        const xAxisValue = axisBottom(xScale);

        xAxis.attr('transform', 'translate(0, ' + height + ')')
            .call(xAxisValue)
            .attr("color", getAxisTextFillColor(
                colorObjects,
                this.host.colorPalette,
                "#000000" // can be defaultSettings.enableAxis.fill
        ));

        const xAxisLabel = lineChart.append('text')
                                    .attr('class', 'xLabel')
                                    .attr('text-anchor', 'end')
                                    .attr('x', width/2)
                                    .attr('y', height + 20)
                                    .text(xLabel)

        const yScale = scaleLinear().domain([0, this.lineViewModel.dataMax]).range([height, 0]);
        const yAxisValue = axisLeft(yScale);

        yAxis.call(yAxisValue)
            .attr("color", getAxisTextFillColor(
                colorObjects,
                this.host.colorPalette,
                "#000000" // can be defaultSettings.enableAxis.fill
        ));

        const yAxisLabel = lineChart.append('text')
                                    .attr('class', 'yLabel')
                                    .attr('text-anchor', 'middle')
                                    .attr('y',  0 - Visual.Config.margins.left + 30)
                                    .attr("x", 0 - height / 2)
                                    .attr('dy', '1em')
                                    .attr('transform', 'rotate(-90)')
                                    .text(yLabel)

        lineChart.append('path')
            .datum(lineDataPoints)
            .attr("d", d3.line<LineDataPoint>()
            .x(d => xScale(d.category))
            .y(d => yScale(<number>d.value)))
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5);

        const dots = lineChart.selectAll('dots').data(lineDataPoints)
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

        let width = options.viewport.width - Visual.Config.margins.left - Visual.Config.margins.right;
        let height = 100;

        const colorObjects = options.dataViews[0] ? options.dataViews[0].metadata.objects : null;
        const barDataPoints = this.barViewModel.dataPoints;
        const barChart = this.visualContainer.append('svg').classed('barChart', true);
        const xAxis = barChart.append('g').classed('xAxisBar', true);
        const yAxis = barChart.append('g').classed('yAxisBar', true);

        barChart.attr("width", width).attr("height", height).append("g").attr("transform", "translate(" + Visual.Config.margins.left + "," + Visual.Config.margins.top + ")");;

        if (this.settings.enableAxis.show) {
            let margins = Visual.Config.margins;
            height -= margins.bottom;
            }

        let xScale = scaleBand()
        .domain(barDataPoints.map(d => d.category))
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

        let yScale = scaleLinear().domain([0, this.barViewModel.dataMax]).range([height, 0]);
        let yAxisValue = axisLeft(yScale);

        yAxis.call(yAxisValue)
             .attr("color", getAxisTextFillColor(
                colorObjects,
                this.host.colorPalette,
                "#000000" // can be defaultSettings.enableAxis.fill
        ));

        const bar = barChart.selectAll('.bar').data(barDataPoints);
        const mergedBars = bar.enter().append('rect').merge(<any>bar);

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

        // if(!this.settings || !this.settings.enableAxis || !this.lineDataPoints) {
        //     return objectEnumeration;
        // }

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