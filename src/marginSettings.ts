import { Margins } from './plotInterface';

export class MarginSettings {
    static readonly svgTopPadding = 0;
    static readonly svgBottomPadding = 10
    static readonly plotTitleHeight = 18;
    static readonly legendHeight = 20;
    static readonly dotMargin = 4;
    static readonly margins: Margins = {
        top: 10,
        right: 30,
        bottom: 10,
        left: 50,
    }
    static readonly miniumumPlotHeight = 40;
    static readonly miniumumPlotWidth = 120;
}