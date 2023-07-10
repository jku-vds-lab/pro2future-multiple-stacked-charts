export class ParseAndTransformError implements Error {
    name: string;
    message: string;
    stack?: string;

    constructor(message: string, name?: string) {
        this.message = message;
        if (name !== undefined && name) {
            this.name = name;
        } else {
            this.name = 'ParseAndTransformError';
        }
    }
}

export class AxisError extends ParseAndTransformError {
    /**
     *
     */
    constructor() {
        const name = 'Axis error';
        const message = 'There must be exactly one axis column';
        super(message, name);
    }
}

export class NoDataError extends ParseAndTransformError {
    /**
     *
     */
    constructor() {
        const name = 'No Data error';
        const message = 'No data provided. Maybe the filters are too restrictive.';
        super(message, name);
    }
}

export class JSONParsingError extends ParseAndTransformError {
    /**
     *
     */
    constructor(errorMessage: string) {
        const name = 'Parsing JSON Error';
        const message = 'Error in parsing JSON from colorsettings: ' + errorMessage + '. Please check the specifications.';
        super(message, name);
    }
}

export class NoDataColumnsError extends ParseAndTransformError {
    /**
     *
     */
    constructor() {
        const name = 'No Data Columns Error';
        const message = 'There were no data columns provided.';
        super(message, name);
    }
}
export class NoAxisError extends ParseAndTransformError {
    /**
     *
     */
    constructor() {
        const name = 'No Axis Error';
        const message = 'There is no data in Axis.';
        super(message, name);
    }
}

export class OverlayDataError extends ParseAndTransformError {
    /**
     *
     */
    constructor() {
        const name = 'Overlay Data Error';
        const message = 'There was an Error creating the overlay information with the provided Data. Please check the specifications.';
        super(message, name);
    }
}

export class XDataError extends ParseAndTransformError {
    /**
     *
     */
    constructor() {
        const name = 'X-Data Error';
        const message = 'There was no data column provided for X-Axis.';
        super(message, name);
    }
}

export class AxisNullValuesError extends ParseAndTransformError {
    /**
     *
     */
    constructor(columnName: string) {
        const name = 'Axis Null Values Error';
        const message = `Axis column ${columnName} must not contain null values.`;
        super(message, name);
    }
}

export class CreateViewModelError extends ParseAndTransformError {
    /**
     *
     */
    constructor() {
        const name = 'Create View Model Error. ';
        const message = `This should not have happened.`;
        super(message, name);
    }
}

export class SVGSizeError extends ParseAndTransformError {
    /**
     *
     */
    constructor() {
        const name = 'SVGSizeError';
        const message = 'The size of the root element could not be determined.';
        super(message, name);
    }
}

export class PlotSizeError extends ParseAndTransformError {
    /**
     *
     */
    constructor(direction = '') {
        const name = 'PlotSizeError';
        const message = 'There is not enough ' + direction + ' space to fit all plots. Please increase the visual size or remove some plots.';
        super(message, name);
    }
}
export class PlotLegendError extends ParseAndTransformError {
    /**
     *
     */
    constructor(plotName: string) {
        const name = 'Plot Legend Error';
        const message = `There is legend no data but legend colors are set to be used by ${plotName}. Please add legend data in the field pane.`;
        super(message, name);
    }
}

export class GetAxisInformationError extends ParseAndTransformError {
    /**
     *
     */
    constructor() {
        const name = 'Get Axis Information Error';
        const message = 'Error in getting axis information. This should never happen.';
        super(message, name);
    }
}

export class DataParsingError extends ParseAndTransformError {
    /**
     *
     */
    constructor() {
        const name = 'Data Parsing Error';
        const message = 'Error in parsing data from input columns.';
        super(message, name);
    }
}

export class PlotError implements Error {
    name: string;
    message: string;
    stack?: string;

    constructor(message: string, name?: string) {
        this.message = message + '\r\n If you are not sure why this error occurs, please contact the authors.';
        if (name !== undefined && name) {
            this.name = name;
        } else {
            this.name = 'Plot Error';
        }
    }
}

export class BuildBasicPlotError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = 'Build Basic Plot Error';
        const message = 'Error in building the basic plot. This should not have happended.';
        super(message, name);
        this.stack = stack;
    }
}
export class BuildXAxisError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = 'Build X-Axis Error';
        const message = 'Error in building x-axis. This should not have happended.';
        super(message, name);
        this.stack = stack;
    }
}

export class BuildYAxisError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = 'Build Y-Axis Error';
        const message = 'Error in building y-axis. This should not have happended.';
        super(message, name);
        this.stack = stack;
    }
}

export class OverlayInformationError extends PlotError {
    /**
     *
     */
    constructor() {
        const name = 'Overlay Information Error';
        const message = 'Error on drawing overlays: no overlay information is provided. <br/> Please drag correct data into the overlay length and overlay width field';
        super(message, name);
    }
}

export class DrawOverlayError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = 'Draw Overlay Error';
        const message = 'Error in drawing. This should not have happended.';
        super(message, name);
        this.stack = stack;
    }
}

export class AddClipPathError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = 'AddClipPathError';
        const message = 'Error in adding the path for clipping plots. This should not have happended.';
        super(message, name);
        this.stack = stack;
    }
}

export class AddPlotTitlesError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = 'AddPlotTitlesError';
        const message = 'Error in adding plot titles. This should not have happended.';
        super(message, name);
        this.stack = stack;
    }
}

export class AddVerticalRulerError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = 'AddVerticalRulerError';
        const message = 'Error on adding vertical ruler. This should not have happended.';
        super(message, name);
        this.stack = stack;
    }
}

export class DrawPlotError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = 'DrawPlotError';
        const message = 'Error on drawing plot. This should not have happended.';
        super(message, name);
        this.stack = stack;
    }
}
export class DrawScatterPlotError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = 'DrawScatterPlotError';
        const message = 'Error on drawing scatter plot. This should not have happended.';
        super(message, name);
        this.stack = stack;
    }
}
export class DrawBarPlotError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = 'DrawBarPlotError';
        const message = 'Error on drawing bar plot. This should not have happended.';
        super(message, name);
        this.stack = stack;
    }
}
export class AddZoomError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = 'AddZoomError';
        const message = 'Error on adding zoom to plots. This should not have happended.';
        super(message, name);
        this.stack = stack;
    }
}
export class CustomTooltipError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = 'CustomTooltipError';
        const message = 'Error on adding custom tooltip functions. This should not have happended.';
        super(message, name);
        this.stack = stack;
    }
}

export class HeatmapError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = 'HeatmapError';
        const message = 'Error on drawing heatmap. This should not have happended.';
        super(message, name);
        this.stack = stack;
    }
}
