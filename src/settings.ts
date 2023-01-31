import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';
import { PlotSettingsNames, Settings } from './constants';
import { PlotModel, PlotType, ViewModel } from './plotInterface';

import FormattingSettingsCard = formattingSettings.Card;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;
//TODO: change to powerbi.visuals.Formattingmodel?
//https://learn.microsoft.com/en-us/power-bi/developer/visuals/format-pane#formatting-model
export class CircleSettings extends FormattingSettingsCard {
    public circleColor = new formattingSettings.ColorPicker({
        name: 'circleColor',
        displayName: 'Color',
        value: { value: '#ffffff' },
    });

    public circleThickness = new formattingSettings.NumUpDown({
        name: 'circleThickness',
        displayName: 'Thickness',
        value: 2,
    });

    public name = 'circle';
    public displayName = 'Circle';
    public slices: FormattingSettingsSlice[] = [this.circleColor, this.circleThickness];
}

export class PlotSettingsModel extends FormattingSettingsCard {
    slices?: formattingSettings.Slice[] = [];
    name = Settings.plotSettings;
    displayName = 'Plot Settings';
}

export class VisualSettings extends FormattingSettingsModel {
    public circle: CircleSettings = new CircleSettings();
    public plotSettings = new PlotSettingsModel();
    public cards: FormattingSettingsCard[] = [this.circle, this.plotSettings];
    populateSettings(viewModel: ViewModel) {
        for (const plotModel of viewModel.plotModels) {
            const column = plotModel.metaDataColumn;
            this.addPlotSettings(column, plotModel);
        }
    }

    private addPlotSettings(column: powerbi.DataViewMetadataColumn, plotModel: PlotModel) {
        this.plotSettings.slices.push(
            new formattingSettings.AutoDropdown({
                name: PlotSettingsNames.plotType,
                displayName: 'Plot Type ' + column.displayName,
                filterValues: Object.values(PlotType),
                value: plotModel.plotSettings.plotType,
                selector: { metadata: column.queryName },
            }),
            new formattingSettings.ColorPicker({
                name: PlotSettingsNames.fill,
                displayName: 'Plot Color ' + column.displayName,
                value: { value: plotModel.plotSettings.fill },
                selector: { metadata: column.queryName },
            }),
            new formattingSettings.ToggleSwitch({
                name: PlotSettingsNames.useLegendColor,
                displayName: 'Legend Color ' + column.displayName,
                value: plotModel.plotSettings.useLegendColor,
                selector: { metadata: column.queryName },
            }),
            new formattingSettings.ToggleSwitch({
                name: PlotSettingsNames.showHeatmap,
                displayName: 'Show Heatmap ' + column.displayName,
                value: plotModel.plotSettings.showHeatmap,
                selector: { metadata: column.queryName },
            })
        );
    }
}
