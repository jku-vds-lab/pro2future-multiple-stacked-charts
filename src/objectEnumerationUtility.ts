import powerbi from 'powerbi-visuals-api';
import { ColorSelectorNames, PlotSettingsNames, Settings } from './constants';
import DataViewObjects = powerbi.DataViewObjects;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewObject = powerbi.DataViewObject;
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;
import Fill = powerbi.Fill;
/**
 * Gets property value for a particular object.
 *
 * @function
 * @param {DataViewObjects} objects - Map of defined objects.
 * @param {string} objectName       - Name of desired object.
 * @param {string} propertyName     - Name of desired property.
 * @param {T} defaultValue          - Default value of desired property.
 */

export function getValue<T>(objects: DataViewObjects, objectName: string, propertyName: string, defaultValue: T): T {
    if (objects) {
        const object = objects[objectName];
        if (object) {
            const property: T = <T>object[propertyName];
            if (property != undefined) {
                return property;
            }
        }
    }

    return defaultValue;
}

/**
 * Gets property value for a particular object in a category.
 *
 * @function
 * @param {DataViewCategoryColumn} category - List of category objects.
 * @param {number} index                    - Index of category object.
 * @param {string} objectName               - Name of desired object.
 * @param {string} propertyName             - Name of desired property.
 * @param {T} defaultValue                  - Default value of desired property.
 */

export function getCategoricalObjectValue<T>(category: DataViewCategoryColumn, index: number, objectName: string, propertyName: string, defaultValue: T): T {
    const categoryObjects = category.objects;

    if (categoryObjects) {
        const categoryObject: DataViewObject = categoryObjects[index];
        if (categoryObject) {
            const object = categoryObject[objectName];
            if (object) {
                const property: T = <T>object[propertyName];
                if (property !== undefined) {
                    return property;
                }
            }
        }
    }
    return defaultValue;
}

export function getCategoricalObjectColor(category: DataViewCategoryColumn, index: number, objectName: string, propertyName: string, defaultValue: string): string {
    const categoryObjects = category.objects;

    if (categoryObjects) {
        const categoryObject: DataViewObject = categoryObjects[index];
        if (categoryObject) {
            const object = categoryObject[objectName];
            if (object) {
                const property: Fill = <Fill>object[propertyName];
                if (property !== undefined) {
                    return property.solid.color;
                }
            }
        }
    }
    return defaultValue;
}

export function getAxisTextFillColor(objects: DataViewObjects, colorPalette: ISandboxExtendedColorPalette, defaultColor: string): string {
    if (colorPalette.isHighContrast) {
        return colorPalette.foreground.value;
    }
    return getValue<Fill>(objects, 'enableAxis', 'fill', {
        solid: {
            color: defaultColor,
        },
    }).solid.color;
}

export function getPlotFillColor(objects: DataViewObjects, colorPalette: ISandboxExtendedColorPalette, defaultColor: string): string {
    if (colorPalette.isHighContrast) {
        return colorPalette.foreground.value;
    }
    return getValue<Fill>(objects, Settings.plotSettings, PlotSettingsNames.fill, {
        solid: {
            color: defaultColor,
        },
    }).solid.color;
}

export function getColorSettings(objects: DataViewObjects, settingsName: string, colorPalette: ISandboxExtendedColorPalette, defaultColor: string): string {
    if (colorPalette.isHighContrast) {
        return colorPalette.foreground.value;
    }
    return getValue<Fill>(objects, Settings.colorSettings, settingsName, {
        solid: {
            color: defaultColor,
        },
    }).solid.color;
}

export function getColumnnColorByIndex(category: DataViewCategoryColumn, index: number, colorPalette: ISandboxExtendedColorPalette): string {
    if (colorPalette.isHighContrast) {
        return colorPalette.background.value;
    }
    const defaultColor: Fill = {
        solid: {
            color: colorPalette.getColor(`${category.values[index]}`).value,
        },
    };

    return getCategoricalObjectValue<Fill>(category, index, Settings.colorSelector, ColorSelectorNames.fill, defaultColor).solid.color;
}
