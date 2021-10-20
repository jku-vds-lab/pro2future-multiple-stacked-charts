import powerbi from 'powerbi-visuals-api';
import { interactivitySelectionService } from 'powerbi-visuals-utils-interactivityutils';
import SelectableDataPoint = interactivitySelectionService.SelectableDataPoint;
import PrimitiveValue = powerbi.PrimitiveValue;

// TODO #10: Add field for x and y labels
// TODO #11: Make the bar chart transparent

export interface ViewModel {
    formatSettings: FormatSettings;
    plotSettings: PlotSettings;
    dataPoints: DataPoint[];

    xRange: {
        min: number;
        max: number;
    };
    yRange: {
        min: number;
        max: number;
    };
}

export interface DataPoint extends SelectableDataPoint {
    //selection can be added here on demand

    xValue: PrimitiveValue;
    yValue: PrimitiveValue;
    color?: string;
    highlight?: boolean;
    opacity?: number;
}

export interface FormatSettings {
    enableAxis: {
        show: boolean;
        fill: string;
    };
}

export interface PlotSettings {
    plotType: {
        plot: number;
        type: string;
    };
}

export interface Legend {
    text: string;
    transform?: string;
    dx?: string;
    dy?: string;
}
