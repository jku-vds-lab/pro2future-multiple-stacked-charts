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
import VisualEnumerationInstanceKinds = powerbi.VisualEnumerationInstanceKinds;
import ISelectionId = powerbi.visuals.ISelectionId;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import { select as d3Select } from 'd3-selection';
import { scaleBand, scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft, axisRight } from 'd3-axis';
import * as d3 from 'd3';
import { dataViewWildcard } from 'powerbi-visuals-utils-dataviewutils';
import { getAxisTextFillColor } from './objectEnumerationUtility';
import { createTooltipServiceWrapper, ITooltipServiceWrapper } from 'powerbi-visuals-utils-tooltiputils';
import { ViewModel, DataPoint, FormatSettings, PlotSettings } from './chartInterface';
import { visualTransform } from './parseAndTransform';

type Selection<T1, T2 = T1> = d3.Selection<any, T1, any, T2>;
export class Visual implements IVisual {
    private host: IVisualHost;
    private element: HTMLElement;
    private visualContainer: d3.Selection<HTMLDivElement, any, HTMLDivElement, any>;
    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private formatSettings: FormatSettings;
    private plotSettings: PlotSettings;

    private viewModels: ViewModel[];

    static Config = {
        xScalePadding: 0.1,
        solidOpacity: 1,
        transparentOpacity: 1,
        margins: {
            top: 10,
            right: 30,
            bottom: 30,
            left: 30,
        },
    };

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.element = options.element;

        this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, this.element);

        this.visualContainer = d3.select(this.element).append('div').attr('class', 'visualContainer');
    }

    // TODO #1: Specify bars data type
    // TODO #2: Change viewmodels loop
    // TODO #3: Add x and y labels
    // TODO #4: Refactor code for line and bar chart
    // TODO #5: Add code for scatterplot
    // TODO #6: Use same axis for displaying values
    // TODO #7: Align the values
    // TODO #8: Add vertical ruler
    // TODO #9: Add zooming option with a specified bin

    public update(options: VisualUpdateOptions) {
        try {
            this.visualContainer.selectAll('*').remove();

            this.viewModels = visualTransform(options, this.host);

            debugger;

            let linesDots: d3.Selection<SVGCircleElement, DataPoint, any, any>[] = [];
            let bars;

            this.viewModels.forEach((viewModel: ViewModel, index: number) => {
                this.formatSettings = viewModel.formatSettings;
                this.plotSettings = viewModel.plotSettings;
                if (viewModel.plotSettings.plotType.type == 'line') {
                    linesDots.push(
                        this.drawLineChart(options, viewModel, viewModel.plotSettings.plotType.plot, 'Param 1', 'y1')
                    );
                }

                if (viewModel.plotSettings.plotType.type == 'bar') {
                    bars = this.drawBarChart(options, viewModel, viewModel.plotSettings.plotType.plot, 'Param 1', 'y1');
                }
            });

            // Add Tooltips
            for (let lineDots of linesDots) {
                this.tooltipServiceWrapper.addTooltip(
                    lineDots,
                    (datapoint: DataPoint) => this.getTooltipData(datapoint),
                    (datapoint: DataPoint) => datapoint.identity
                );
            }

            this.tooltipServiceWrapper.addTooltip(
                bars,
                (datapoint: DataPoint) => this.getTooltipData(datapoint),
                (datapoint: DataPoint) => datapoint.identity
            );
        } catch (error) {
            console.log(error());
        }
    }

    private drawLineChart(
        options: VisualUpdateOptions,
        viewModel: ViewModel,
        visualNumber: number,
        xLabel?: string,
        yLabel?: string
    ): d3.Selection<SVGCircleElement, DataPoint, any, any> {
        try {
            let width = options.viewport.width - Visual.Config.margins.left - Visual.Config.margins.right;
            let height = 100;

            const colorObjects = options.dataViews[0] ? options.dataViews[0].metadata.objects : null;
            const dataPoints = viewModel.dataPoints;
            const lineChart: Selection<any> = this.visualContainer
                .append('svg')
                .classed('lineChart-' + visualNumber, true)
                .attr('width', width)
                .attr('height', height)
                .append('g')
                .attr('transform', 'translate(' + Visual.Config.margins.left + ',' + Visual.Config.margins.top + ')');

            const xAxis = lineChart.append('g').classed('xAxisLine', true);
            const yAxis = lineChart.append('g').classed('yAxisLine', true);

            if (viewModel.formatSettings.enableAxis.show) {
                let margins = Visual.Config.margins;
                height -= margins.bottom;
            }

            let margins = Visual.Config.margins;
            height -= margins.bottom;

            const xScale = scaleLinear().domain([0, viewModel.xRange.max]).range([0, width]);

            const xAxisValue = axisBottom(xScale);

            xAxis
                .attr('transform', 'translate(0, ' + height + ')')
                .call(xAxisValue)
                .attr(
                    'color',
                    getAxisTextFillColor(
                        colorObjects,
                        this.host.colorPalette,
                        '#000000' // can be defaultSettings.enableAxis.fill
                    )
                );

            const xAxisLabel = lineChart
                .append('text')
                .attr('class', 'xLabel')
                .attr('text-anchor', 'end')
                .attr('x', width / 2)
                .attr('y', height + 20)
                .text(xLabel);

            const yScale = scaleLinear().domain([0, viewModel.yRange.max]).range([height, 0]);
            const yAxisValue = axisLeft(yScale);

            yAxis.call(yAxisValue).attr(
                'color',
                getAxisTextFillColor(
                    colorObjects,
                    this.host.colorPalette,
                    '#000000' // can be defaultSettings.enableAxis.fill
                )
            );

            const yAxisLabel = lineChart
                .append('text')
                .attr('class', 'yLabel')
                .attr('text-anchor', 'middle')
                .attr('y', 0 - Visual.Config.margins.left + 30)
                .attr('x', 0 - height / 2)
                .attr('dy', '1em')
                .attr('transform', 'rotate(-90)')
                .text(yLabel);

            lineChart
                .append('path')
                .datum(dataPoints)
                .attr(
                    'd',
                    d3
                        .line<DataPoint>()
                        .x((d) => xScale(<number>d.xValue))
                        .y((d) => yScale(<number>d.yValue))
                )
                .attr('fill', 'none')
                .attr('stroke', 'steelblue')
                .attr('stroke-width', 1.5);

            const dots = lineChart
                .selectAll('dots')
                .data(dataPoints)
                .enter()
                .append('circle')
                .attr('fill', 'red')
                .attr('stroke', 'none')
                .attr('cx', (d) => xScale(<number>d.xValue))
                .attr('cy', (d) => yScale(<number>d.yValue))
                .attr('r', 3);

            return dots;
        } catch (error) {
            console.log('Error in Draw Line Chart: ', error);
        }
    }

    private drawBarChart(
        options: VisualUpdateOptions,
        viewModel: ViewModel,
        visualNumber: number,
        xLabel?: string,
        yLabel?: string
    ): any {
        let width = options.viewport.width - Visual.Config.margins.left - Visual.Config.margins.right;
        let height = 100;
        const colorObjects = options.dataViews[0] ? options.dataViews[0].metadata.objects : null;
        const dataPoints = viewModel.dataPoints;
        const barChart = this.visualContainer
            .append('svg')
            .classed('barChart', true)
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', 'translate(' + Visual.Config.margins.left + ',' + Visual.Config.margins.top + ')');
        const xAxis = barChart.append('g').classed('xAxisBar', true);
        const yAxis = barChart.append('g').classed('yAxisBar', true);
        if (viewModel.formatSettings.enableAxis.show) {
            let margins = Visual.Config.margins;
            height -= margins.bottom;
        }
        const xScale = scaleLinear().domain([0, viewModel.xRange.max]).range([0, width]);
        let xAxisValue = axisBottom(xScale);
        xAxis
            .attr('transform', 'translate(0, ' + height + ')')
            .call(xAxisValue)
            .attr(
                'color',
                getAxisTextFillColor(
                    colorObjects,
                    this.host.colorPalette,
                    '#000000' // can be defaultSettings.enableAxis.fill
                )
            );
        let yScale = scaleLinear().domain([0, viewModel.yRange.max]).range([height, 0]);
        let yAxisValue = axisLeft(yScale);
        yAxis.call(yAxisValue).attr(
            'color',
            getAxisTextFillColor(
                colorObjects,
                this.host.colorPalette,
                '#000000' // can be defaultSettings.enableAxis.fill
            )
        );
        const bar = barChart.selectAll('.bar').data(dataPoints);
        const mergedBars = bar
            .enter()
            .append('rect')
            .merge(<any>bar);
        mergedBars.classed('bar', true);
        mergedBars
            .attr('width', width / dataPoints.length - 1)
            .attr('height', (d) => height - yScale(<number>d.yValue))
            .attr('y', (d) => yScale(<number>d.yValue))
            .attr('x', (d) => xScale(<number>d.xValue))
            .style('fill', (dataPoint: DataPoint) => dataPoint.color);
        return mergedBars;
    }

    private drawVerticalRuler() {}

    //TODO only shows the categories and values nothing from the tooltip field
    private getTooltipData(value: any): VisualTooltipDataItem[] {
        return [
            {
                displayName: value.xValue.toString(),
                value: value.yValue.toString(),
                color: value.color ?? '#000000',
            },
        ];
    }

    // TODO: this should be able to handle the object enumeration for all the plots
    public enumerateObjectInstances(
        options: EnumerateVisualObjectInstancesOptions
    ): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        let objectName = options.objectName;
        let objectEnumeration: VisualObjectInstance[] = [];

        try {
            // if(!this.barSettings || !this.barSettings.enableAxis || !this.barDataPoints) {
            //     return objectEnumeration;
            // }

            // if(!this.settings || !this.settings.enableAxis || !this.lineDataPoints) {
            //     return objectEnumeration;
            // }

            switch (objectName) {
                case 'plotType':
                    objectEnumeration.push({
                        objectName: objectName,
                        properties: {
                            plot: this.plotSettings.plotType.plot,
                            type: this.plotSettings.plotType.type,
                        },
                        selector: null,
                    });

                    break;
                case 'enableAxis':
                    objectEnumeration.push({
                        objectName: objectName,
                        properties: {
                            show: this.formatSettings.enableAxis.show,
                            fill: this.formatSettings.enableAxis.fill,
                        },
                        selector: null,
                    });
                    break;

                case 'colorSelector':
                    // for (let barDataPoint of this.barDataPoints) {
                    //     objectEnumeration.push({
                    //         objectName: objectName,
                    //         displayName: barDataPoint.category,
                    //         properties: {
                    //             fill: {
                    //                 solid: {
                    //                     color: barDataPoint.color,
                    //                 },
                    //             },
                    //         },
                    //         propertyInstanceKind: {
                    //             fill: VisualEnumerationInstanceKinds.ConstantOrRule,
                    //         },
                    //         altConstantValueSelector: (<ISelectionId>barDataPoint.identity).getSelector(),
                    //         selector: dataViewWildcard.createDataViewWildcardSelector(
                    //             dataViewWildcard.DataViewWildcardMatchingOption.InstancesAndTotals
                    //         ),
                    //     });
                    // }
                    break;
            }
        } catch (error) {
            console.log('Error in Object Enumeration: ', error);
        }
        return objectEnumeration;
    }
}
