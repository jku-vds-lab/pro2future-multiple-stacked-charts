export class ParseAndTransformError implements Error {
    name: string;
    message: string;
    stack?: string;

    constructor(message: string, name?: string) {
        this.message = message;
        if (name !== undefined && name) {
            this.name = name;
        } else {
            this.name = "ParseAndTransformError";
        }

    }
}

export class AxisError extends ParseAndTransformError {
    /**
     *
     */
    constructor() {
        const name = "Axis error";
        const message = "Axis count must be either one or match the Values count.";
        super(message, name);

    }
}

export class NoValuesError extends ParseAndTransformError {
    /**
     *
     */
    constructor() {
        const name = "No Values Error";
        const message = "There is no data in Values.";
        super(message, name);

    }
}
export class NoAxisError extends ParseAndTransformError {
    /**
     *
     */
    constructor() {
        const name = "No Axis Error";
        const message = "There is no data in Axis.";
        super(message, name);

    }
}
export class AxisNullValuesError extends ParseAndTransformError {
    /**
     *
     */
    constructor(columnName: string) {
        const name = "Axis Null Values Error";
        const message = `Axis column ${columnName} must not contain null values.`;
        super(message, name);

    }
}

export class SVGSizeError extends ParseAndTransformError {
    /**
     *
     */
    constructor() {
        const name = "SVGSizeError";
        const message = "The size of the root element could not be determined.";
        super(message, name);

    }
}

export class PlotSizeError extends ParseAndTransformError {
    /**
     *
     */
    constructor(direction: string = "") {
        const name = "PlotSizeError";
        const message = "There is not enough " + direction + " space to fit all plots. Please increase the chart size or remove some plots.";
        super(message, name);

    }
}

export class GetAxisInformationError extends ParseAndTransformError {
    /**
     *
     */
    constructor() {
        const name = "Get Axis Information Error";
        const message = "Error in getting axis information. This should never happen.";
        super(message, name);

    }
}


export class PlotError implements Error {
    name: string;
    message: string;
    stack?: string;

    constructor(message: string, name?: string) {
        this.message = message;
        if (name !== undefined && name) {
            this.name = name;
        } else {
            this.name = "Plot Error";
        }

    }
}


export class BuildBasicPlotError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = "Build Basic Plot Error";
        const message = "Error in building the basic plot. This should not have happended.";
        super(message, name);
        this.stack = stack;

    }
}
export class BuildXAxisError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = "Build X-Axis Error";
        const message = "Error in building x-axis. This should not have happended.";
        super(message, name);
        this.stack = stack;

    }
}

export class BuildYAxisError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = "Build Y-Axis Error";
        const message = "Error in building y-axis. This should not have happended.";
        super(message, name);
        this.stack = stack;

    }
}

export class SlabInformationError extends PlotError {
    /**
     *
     */
    constructor() {
        const name = "Slab Information Error";
        const message = "Error on drawing slab overlays: there is no slab information provided. Please drag correct data into the slab length and slab width field";
        super(message, name);
    }
}

export class DrawSlabsError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = "Draw Slabs Error";
        const message = "Error in drawing. This should not have happended.";
        super(message, name);
        this.stack = stack;

    }
}

export class AddClipPathError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = "AddClipPathError";
        const message = "Error in adding the path for clipping plots. This should not have happended.";
        super(message, name);
        this.stack = stack;

    }
}

export class AddPlotTitlesError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = "AddPlotTitlesError";
        const message = "Error in adding plot titles. This should not have happended.";
        super(message, name);
        this.stack = stack;

    }
}

export class AddVerticalRulerError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = "AddVerticalRulerError";
        const message = "Error on adding vertical ruler. This should not have happended.";
        super(message, name);
        this.stack = stack;

    }
}

export class DrawLinePlotError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = "DrawLinePlotError";
        const message = "Error on drawing line plot. This should not have happended.";
        super(message, name);
        this.stack = stack;

    }
}
export class DrawScatterPlotError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = "DrawScatterPlotError";
        const message = "Error on drawing scatter plot. This should not have happended.";
        super(message, name);
        this.stack = stack;

    }
}
export class DrawBarPlotError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = "DrawBarPlotError";
        const message = "Error on drawing bar plot. This should not have happended.";
        super(message, name);
        this.stack = stack;

    }
}
export class AddZoomError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = "AddZoomError";
        const message = "Error on adding zoom to plots. This should not have happended.";
        super(message, name);
        this.stack = stack;

    }
}
export class CustomTooltipError extends PlotError {
    /**
     *
     */
    constructor(stack?: string) {
        const name = "CustomTooltipError";
        const message = "Error on adding custom tooltip functions. This should not have happended.";
        super(message, name);
        this.stack = stack;

    }
}
