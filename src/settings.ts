import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';

import FormattingSettingsCard = formattingSettings.Card;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

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

    public name: string = 'circle';
    public displayName: string = 'Circle';
    public slices: FormattingSettingsSlice[] = [this.circleColor, this.circleThickness];
}

export class VisualSettings extends FormattingSettingsModel {
    public circle: CircleSettings = new CircleSettings();
    public cards: FormattingSettingsCard[] = [this.circle];
}
