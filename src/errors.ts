export class ParseAndTransformError implements Error {
    name: string;
    message: string;
    stack?: string;

    constructor(message: string, name?: string) {
        this.message = message;
        if (name !== undefined) {
            this.name = name;
        } else {
            this.name = "ParseAndTransformError";
        }

    }
}

export class AxisError extends ParseAndTransformError{
    /**
     *
     */
    constructor() {
        const name = "Axis error"; 
        const message =  "Axis count must be either one or match the Values count.";
        super(message,name);
        
    }
}

export class NoValuesError extends ParseAndTransformError{
    /**
     *
     */
    constructor() {
        const name = "No Values Error"; 
        const message =  "There is no data in Values.";
        super(message,name);
        
    }
}
export class NoAxisError extends ParseAndTransformError{
    /**
     *
     */
    constructor() {
        const name = "No Axis Error"; 
        const message =  "There is no data in Axis.";
        super(message,name);
        
    }
}
export class AxisNullValuesError extends ParseAndTransformError{
    /**
     *
     */
    constructor(columnName:string) {
        const name = "Axis Null Values Error"; 
        const message =  `Axis column ${columnName} must not contain null values.`;
        super(message,name);
        
    }
}
