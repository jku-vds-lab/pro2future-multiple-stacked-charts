import powerbi from 'powerbi-visuals-api';
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;
import { getValue, getPlotFillColor } from './objectEnumerationUtility';
import { PlotSettings, XAxisData, YAxisData, PlotType, AxisInformation, AxisInformationInterface, LegendData, TooltipColumnData, OverlayType } from './plotInterface';
import { Primitive } from 'd3';
import { PlotSettingsNames, Settings, FilterType } from './constants';
import { ok, err, Result } from 'neverthrow';
import { ViewModel } from './viewModel';
import {
    AxisError,
    AxisNullValuesError,
    GetAxisInformationError,
    NoDataColumnsError,
    ParseAndTransformError,
    NoDataError,
    XDataError,
    DataParsingError,
    CreateViewModelError,
} from './errors';

/**
 * Function that converts queried data into a viewmodel that will be used by the visual.
 *
 * @function
 * @param {VisualUpdateOptions} options - Contains references to the size of the container
 *                                        and the dataView which contains all the data
 *                                        the visual had queried.
 * @param {IVisualHost} host            - Contains references to the host which contains services
 */
export function visualTransform(options: VisualUpdateOptions, host: IVisualHost): Result<ViewModel, ParseAndTransformError> {
    let parseAndTransformError: ParseAndTransformError;
    const dataViews = options.dataViews;
    if (!dataViews || !dataViews[0] || !dataViews[0].categorical || !dataViews[0].metadata) {
        return err(new ParseAndTransformError('No categorical data in Axis or Values'));
    }
    const objects = dataViews[0].metadata.objects;
    const categorical = dataViews[0].categorical;
    const metadataColumns = dataViews[0].metadata.columns;
    const colorPalette: ISandboxExtendedColorPalette = host.colorPalette;
    let yCount;
    checkPlotData(categorical)
        .map((count) => (yCount = count))
        .mapErr((e) => (parseAndTransformError = e));
    if (parseAndTransformError) return err(parseAndTransformError);
    const tooltipCount = getTooltipCount(categorical);
    const dataModel = new DataModel(yCount, tooltipCount, metadataColumns, host, categorical);
    try {
        getCategoricalData(categorical, dataModel);
        getMeasureData(categorical, dataModel, metadataColumns);
    } catch (e) {
        console.log(e);
        return err(new DataParsingError());
    }
    const nullValues = dataModel.xData.isDate
        ? (<Date[]>dataModel.xData.values).filter((x) => x === null || x === undefined)
        : (<number[]>dataModel.xData.values).filter((x) => x === null || x === undefined);
    if (nullValues.length > 0) {
        return err(new AxisNullValuesError(dataModel.xData.name));
    }
    dataModel.setPlotSettings(colorPalette);

    try {
        const viewModel = new ViewModel(objects);
        viewModel.createLegends(dataModel);
        viewModel.setSettings(dataModel, options);
        viewModel.createTooltipModels(dataModel);
        viewModel.createPlotModels(dataModel);
        viewModel.createPlotOverlayInformation(dataModel).mapErr((err) => (parseAndTransformError = err));
        viewModel.createVisualOverlayRectangles(dataModel);
        return ok(viewModel);
    } catch (e) {
        return err(new CreateViewModelError());
    }
}

function getCategoricalData(categorical: powerbi.DataViewCategorical, dataModel: DataModel) {
    if (categorical.categories !== undefined) {
        for (const category of categorical.categories) {
            const roles = category.source.roles;
            if (roles.x_axis) {
                if (category.source.type.dateTime) {
                    dataModel.xData = {
                        name: category.source.displayName,
                        values: <Date[]>category.values,
                        isDate: true,
                    };
                } else if (category.source.type.numeric) {
                    dataModel.xData = {
                        name: category.source.displayName,
                        values: <number[]>category.values,
                        isDate: false,
                    };
                }
            }
            if (roles.y_axis) {
                const yId = category.source['rolesIndex']['y_axis'][0];
                const yAxis: YAxisData = {
                    name: category.source.displayName,
                    values: <number[]>category.values,
                    columnId: category.source.index,
                };
                dataModel.yData[yId] = yAxis;
            }
            if (roles.overlayLength) {
                dataModel.overlayLength = <number[]>category.values;
            }
            if (roles.overlayWidth) {
                dataModel.overlayWidth = <number[]>category.values;
            }
            if (roles.overlayY) {
                dataModel.overlayY = <number[]>category.values;
            }
            if (roles.tooltip) {
                const columnId = category.source.index;
                for (const tooltipId of category.source['rolesIndex']['tooltip']) {
                    const data: TooltipColumnData = {
                        type: category.source.type,
                        name: category.source.displayName,
                        values: <number[]>category.values,
                        columnId,
                        metaDataColumn: category.source,
                    };
                    dataModel.tooltipData[tooltipId] = data;
                }
            }
            if (roles.legend) {
                dataModel.categoricalLegendData = {
                    name: category.source.displayName,
                    values: category.values,
                    metaDataColumn: category.source,
                    type: FilterType.stringFilter,
                };
            }

            if (roles.filterLegend) {
                if (category.source.type.text || category.source.type.numeric) {
                    const type = category.source.type.text ? FilterType.stringFilter : FilterType.numberFilter;
                    dataModel.filterLegendData[category.source['rolesIndex']['filterLegend'][0]] = {
                        name: category.source.displayName,
                        values: category.values,
                        metaDataColumn: category.source,
                        type,
                    };
                }
            }
            if (roles.visualOverlay) {
                dataModel.visualOverlayRectangles = category.values;
                dataModel.visualOverlayMetadataColumn = category.source;
            }
        }
    }
}

function getMeasureData(categorical: powerbi.DataViewCategorical, dataModel: DataModel, metadataColumns: powerbi.DataViewMetadataColumn[]) {
    if (categorical.values !== undefined) {
        for (const value of categorical.values) {
            const roles = value.source.roles;
            if (roles.x_axis) {
                if (value.source.type.dateTime) {
                    dataModel.xData = {
                        name: value.source.displayName,
                        values: <Date[]>value.values,
                        isDate: true,
                    };
                } else if (value.source.type.numeric) {
                    dataModel.xData = {
                        name: value.source.displayName,
                        values: <number[]>value.values,
                        isDate: false,
                    };
                }
            }
            if (roles.y_axis) {
                const yId = value.source['rolesIndex']['y_axis'][0];
                const yColumnObjects = getMetadataColumn(metadataColumns, value.source.index).objects;
                const useHighlights = getValue<boolean>(yColumnObjects, Settings.plotSettings, PlotSettingsNames.useLegendColor, false);
                const yAxis: YAxisData = {
                    name: value.source.displayName,
                    values: <number[]>(useHighlights && value.highlights ? value.highlights : value.values),
                    columnId: value.source.index,
                };
                dataModel.yData[yId] = yAxis;
            }
            if (roles.overlayLength) {
                dataModel.overlayLength = <number[]>(value.highlights ? value.highlights : value.values);
            }
            if (roles.overlayWidth) {
                dataModel.overlayWidth = <number[]>(value.highlights ? value.highlights : value.values);
            }
            if (roles.overlayY) {
                dataModel.overlayY = <number[]>(value.highlights ? value.highlights : value.values);
            }
            if (roles.tooltip) {
                const columnId = value.source.index;
                for (const tooltipId of value.source['rolesIndex']['tooltip']) {
                    const data: TooltipColumnData = {
                        type: value.source.type,
                        name: value.source.displayName,
                        values: <number[]>value.values,
                        columnId,
                        metaDataColumn: value.source,
                    };
                    dataModel.tooltipData[tooltipId] = data;
                }
            }
            if (roles.legend) {
                dataModel.categoricalLegendData = {
                    name: value.source.displayName,
                    values: <string[]>value.values,
                    metaDataColumn: value.source,
                    type: FilterType.stringFilter,
                };
            }
            if (roles.filterLegend) {
                if (value.source.type.text || value.source.type.numeric) {
                    const type = value.source.type.text ? FilterType.stringFilter : FilterType.numberFilter;
                    dataModel.filterLegendData[value.source['rolesIndex']['filterLegend'][0]] = {
                        name: value.source.displayName,
                        values: value.values,
                        metaDataColumn: value.source,
                        type,
                    };
                }
            }

            if (roles.visualOverlay) {
                dataModel.visualOverlayRectangles = <number[]>value.values;
                dataModel.visualOverlayMetadataColumn = value.source;
            }
        }
    }
}

function getTooltipCount(categorical: powerbi.DataViewCategorical) {
    const tooltipCategoriesCount =
        categorical.categories === undefined
            ? 0
            : categorical.categories
                  .filter((cat) => {
                      return cat.source.roles.tooltip;
                  })
                  .map((x) => x.source['rolesIndex'].tooltip.length)
                  .reduce((a, b) => a + b, 0);
    const tooltipValuesCount =
        categorical.values === undefined
            ? 0
            : categorical.values
                  .filter((val) => {
                      return val.source.roles.tooltip;
                  })
                  .map((x) => x.source['rolesIndex'].tooltip.length)
                  .reduce((a, b) => a + b, 0);
    const tooltipCount = tooltipCategoriesCount + tooltipValuesCount;
    return tooltipCount;
}

function checkPlotData(categorical: powerbi.DataViewCategorical): Result<number, ParseAndTransformError> {
    //count numbers of x-axis and y-axis
    const yCategoriesCount =
        categorical.categories === undefined
            ? 0
            : categorical.categories.filter((cat) => {
                  return cat.source.roles.y_axis;
              }).length;
    const yValuesCount =
        categorical.values === undefined
            ? 0
            : categorical.values.filter((val) => {
                  return val.source.roles.y_axis;
              }).length;
    const yCount = yCategoriesCount + yValuesCount;
    const xCategoriesCount =
        categorical.categories === undefined
            ? 0
            : categorical.categories.filter((cat) => {
                  return cat.source.roles.x_axis;
              }).length;
    const xValuesCount =
        categorical.values === undefined
            ? 0
            : categorical.values.filter((val) => {
                  return val.source.roles.x_axis;
              }).length;
    const xCount = xCategoriesCount + xValuesCount;

    //check if input data count is ok
    if (yCount === 0) {
        return err(new NoDataColumnsError());
    }
    if (xCount === 0) {
        return err(new XDataError());
    }
    if (xCount !== 1) {
        return err(new AxisError());
    }
    if ((yCategoriesCount > 0 && categorical.categories[0].values.length === 0) || (yValuesCount > 0 && categorical.values[0].values.length === 0)) {
        return err(new NoDataError());
    }
    return ok(yCount);
}

export function getMetadataColumn(metadataColumns: powerbi.DataViewMetadataColumn[], yColumnId: number) {
    return metadataColumns.filter((x) => x.index === yColumnId)[0];
}

export class DataModel {
    xData: XAxisData;
    yData: YAxisData[];
    tooltipData: TooltipColumnData[];
    categoricalLegendData: LegendData;
    filterLegendData: LegendData[];
    overlayWidth: number[];
    overlayLength: number[];
    overlayY: number[];
    visualOverlayRectangles: Primitive[];
    visualOverlayMetadataColumn: powerbi.DataViewMetadataColumn;
    categorical: powerbi.DataViewCategorical;

    metadataColumns: powerbi.DataViewMetadataColumn[];
    host: IVisualHost;

    plotSettingsArray: PlotSettings[];

    constructor(yCount: number, tooltipCount: number, metadataColumns: powerbi.DataViewMetadataColumn[], host: IVisualHost, categorical: powerbi.DataViewCategorical) {
        this.yData = new Array<YAxisData>(yCount);
        this.tooltipData = new Array<TooltipColumnData>(tooltipCount);
        this.metadataColumns = metadataColumns;
        this.host = host;
        this.categorical = categorical;
        this.filterLegendData = [];
        this.overlayLength = [];
        this.overlayWidth = [];
        this.overlayY = [];
        this.visualOverlayRectangles = [];
        this.plotSettingsArray = [];
    }

    setPlotSettings(colorPalette: ISandboxExtendedColorPalette) {
        for (let plotNr = 0; plotNr < this.yData.length; plotNr++) {
            const yAxis: YAxisData = this.yData[plotNr];
            const yColumnId = this.yData[plotNr].columnId;
            const yColumnObjects = getMetadataColumn(this.metadataColumns, yColumnId).objects;
            const plotTitle = getValue<string>(yColumnObjects, Settings.plotSettings, PlotSettingsNames.plotTitle, yAxis.name);
            const xInformation: AxisInformation = AxisInformation[getValue<string>(yColumnObjects, Settings.plotSettings, PlotSettingsNames.xAxisDisplay, AxisInformation.None)];
            const yInformation: AxisInformation = AxisInformation[getValue<string>(yColumnObjects, Settings.plotSettings, PlotSettingsNames.yAxisDisplay, AxisInformation.Ticks)];
            let xAxisInformation: AxisInformationInterface, yAxisInformation: AxisInformationInterface;
            let axisInformationError: ParseAndTransformError;
            this.getAxisInformation(xInformation)
                .map((inf) => (xAxisInformation = inf))
                .mapErr((err) => (axisInformationError = err));
            this.getAxisInformation(yInformation)
                .map((inf) => (yAxisInformation = inf))
                .mapErr((err) => (axisInformationError = err));
            if (axisInformationError) {
                return err(axisInformationError);
            }

            this.plotSettingsArray.push({
                fill: getPlotFillColor(yColumnObjects, colorPalette, '#4292c6'),
                plotType: PlotType[getValue<string>(yColumnObjects, Settings.plotSettings, PlotSettingsNames.plotType, PlotType.LinePlot)],
                useLegendColor: getValue<boolean>(yColumnObjects, Settings.plotSettings, PlotSettingsNames.useLegendColor, false),
                showHeatmap: <boolean>getValue(yColumnObjects, Settings.plotSettings, PlotSettingsNames.showHeatmap, false),
                plotTitle: plotTitle,
                overlayType: OverlayType[getValue<string>(yColumnObjects, Settings.plotSettings, PlotSettingsNames.overlayType, OverlayType.None)],
                centerOverlay: <boolean>getValue(yColumnObjects, Settings.plotSettings, PlotSettingsNames.centerOverlay, false),
                plotHeightFactor: getValue<number>(yColumnObjects, Settings.plotSettings, PlotSettingsNames.plotHeightFactor, 1),
                xAxis: xAxisInformation,
                yAxis: yAxisInformation,
                xLabel: getValue<string>(yColumnObjects, Settings.plotSettings, PlotSettingsNames.xLabel, this.xData.name),
                yLabel: getValue<string>(yColumnObjects, Settings.plotSettings, PlotSettingsNames.yLabel, yAxis.name),
                yRange: {
                    min: getValue<number>(yColumnObjects, Settings.plotSettings, PlotSettingsNames.yMin, 0),
                    max: getValue<number>(yColumnObjects, Settings.plotSettings, PlotSettingsNames.yMax, Math.max(...yAxis.values)),
                    minFixed: <boolean>getValue(yColumnObjects, Settings.plotSettings, PlotSettingsNames.yMinFixed, true),
                    maxFixed: <boolean>getValue(yColumnObjects, Settings.plotSettings, PlotSettingsNames.yMaxFixed, false),
                },
            });
        }
    }
    private getAxisInformation(axisInformation: AxisInformation): Result<AxisInformationInterface, ParseAndTransformError> {
        switch (axisInformation) {
            case AxisInformation.None:
                return ok(<AxisInformationInterface>{
                    labels: false,
                    ticks: false,
                });
            case AxisInformation.Ticks:
                return ok(<AxisInformationInterface>{
                    labels: false,
                    ticks: true,
                });
            case AxisInformation.Labels:
                return ok(<AxisInformationInterface>{
                    labels: true,
                    ticks: false,
                });
            case AxisInformation.TicksLabels:
                return ok(<AxisInformationInterface>{
                    labels: true,
                    ticks: true,
                });
            default:
                return err(new GetAxisInformationError());
        }
    }
}
