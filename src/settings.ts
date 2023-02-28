import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';
import { Constants, PlotSettingsNames, Settings } from './constants';
import { PlotModel, PlotType, ViewModel } from './plotInterface';

import FormattingSettingsCard = formattingSettings.Card;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;
import FormattingGroup = powerbi.visuals.FormattingGroup;
import FormattingGroupPlaceholder = powerbi.visuals.FormattingGroupPlaceholder;
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
    public test: powerbi.visuals.FormattingCard;
}

export class PlotSettingsModel implements powerbi.visuals.FormattingCard {
    slices?: formattingSettings.Slice[] = [];
    name = Settings.plotSettings;
    displayName = 'Plot Settings';
    groups = [];
    uid = Settings.plotSettings + '_uid';
}

export class VisualSettings implements powerbi.visuals.FormattingModel {
    public circle: CircleSettings = new CircleSettings();
    public plotSettings = new PlotSettingsModel();
    public cards: (powerbi.visuals.FormattingCard | powerbi.visuals.FormattingCardPlaceholder)[] = [this.plotSettings];
    populateSettings(viewModel: ViewModel) {
        for (const plotModel of viewModel.plotModels) {
            const column = plotModel.metaDataColumn;
            this.addPlotSettings(column, plotModel);
        }
    }

    private addPlotSettings(column: powerbi.DataViewMetadataColumn, plotModel: PlotModel) {
        const groupName = Settings.plotSettings + column.displayName;
        this.plotSettings.groups.push({
            displayName: column.displayName,
            uid: groupName + Constants.uid,
            slices: [
                {
                    uid: groupName + PlotSettingsNames.plotType + Constants.uid,
                    displayName: 'Plot Type ',
                    control: {
                        type: powerbi.visuals.FormattingComponent.Dropdown,
                        descriptor: {
                            objectName: Settings.plotSettings,
                            propertyName: PlotSettingsNames.plotType,
                            filterValues: Object.values(PlotType),
                            selector: { metadata: column.queryName },
                        },
                    },
                    value: plotModel.plotSettings.plotType,
                },

                //     new formattingSettings.ReadOnlyText({
                //     name: PlotSettingsNames.plotName,
                //     displayName: column.displayName,
                //     value: column.displayName,
                // })}
                // new formattingSettings.ReadOnlyText({
                //     name: PlotSettingsNames.plotName,
                //     displayName: column.displayName,
                //     value: column.displayName,
                // }),
                // new formattingSettings.AutoDropdown({
                //     name: PlotSettingsNames.plotType,
                //     displayName: 'Plot Type ' + column.displayName,
                //     filterValues: Object.values(PlotType),
                //     value: plotModel.plotSettings.plotType,
                //     selector: { metadata: column.queryName },
                // }),
                // new formattingSettings.ColorPicker({
                //     name: PlotSettingsNames.fill,
                //     displayName: 'Plot Color ' + column.displayName,
                //     value: { value: plotModel.plotSettings.fill },
                //     selector: { metadata: column.queryName },
                // }),
                // new formattingSettings.ToggleSwitch({
                //     name: PlotSettingsNames.useLegendColor,
                //     displayName: 'Legend Color ' + column.displayName,
                //     value: plotModel.plotSettings.useLegendColor,
                //     selector: { metadata: column.queryName },
                // }),
                // new formattingSettings.ToggleSwitch({
                //     name: PlotSettingsNames.showHeatmap,
                //     displayName: 'Show Heatmap ' + column.displayName,
                //     value: plotModel.plotSettings.showHeatmap,
                //     selector: { metadata: column.queryName },
                // }),
            ],
        });
    }
}
