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