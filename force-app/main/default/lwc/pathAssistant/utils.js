/**
 MIT License

Copyright (c) 2024 Marco Zeuli <marco@spaghetti.dev>;

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/**
 * Defines possible user interaction scenarios.
 * Note: all hard coded text inside the layout elements can be replaced
 * by custom labels.
 */
class AbstractScenario {
    // instance of ScenarioLayout
    layout;

    constructor(layout) {
        this.layout = layout;
    }

    /**
     * Function to determine if this scenario applies to a certain state.
     * It takes only one argument that is an instance of ScenarioState
     */
    appliesToState() {}
}

export class ScenarioState {
    isClosedStage;
    selectedStage;
    currentStage;
    openModalStage;

    constructor(isClosedStage, selectedStage, currentStage, openModalStage) {
        this.isClosedStage = isClosedStage;
        this.selectedStage = selectedStage;
        this.currentStage = currentStage;
        this.openModalStage = openModalStage;
    }
}

export class ScenarioLayout {
    _modalHeader;
    _updateButtonText;
    _tokenToReplace;

    constructor(modalHeader, updateButtonText, tokenToReplace) {
        this._modalHeader = modalHeader;
        this._updateButtonText = updateButtonText;
        this._tokenToReplace = tokenToReplace;
    }

    getModalHeader(arg) {
        return this._replaceToken(this._modalHeader, arg);
    }

    getUpdateButtonText(arg) {
        return this._replaceToken(this._updateButtonText, arg);
    }

    _replaceToken(str, arg) {
        return str.replace(this._tokenToReplace, arg);
    }
}

export class MarkAsCompleteScenario extends AbstractScenario {
    appliesToState(state) {
        if (state.isClosedStage) {
            return false;
        }

        return (
            !state.selectedStage || state.selectedStage === state.currentStage
        );
    }
}

export class MarkAsCurrentScenario extends AbstractScenario {
    appliesToState(state) {
        if (state.selectedStage === state.currentStage) {
            return false;
        } else if (state.isClosedStage) {
            return !!state.selectedStage;
        }

        return (
            state.selectedStage && state.selectedStage !== state.openModalStage
        );
    }
}

export class SelectClosedScenario extends AbstractScenario {
    appliesToState(state) {
        return (
            !state.isClosedStage && state.selectedStage === state.openModalStage
        );
    }
}

export class ChangeClosedScenario extends AbstractScenario {
    appliesToState(state) {
        if (!state.isClosedStage) {
            return false;
        }

        return (
            !state.selectedStage || state.selectedStage === state.currentStage
        );
    }
}

export class Step {
    value;
    label;
    index;
    classText;

    constructor(value, label, index) {
        this.value = value;
        this.label = label;
        this.index = index;
    }

    /**
     * Returns true if current Step instance has same value property as the other one.
     * In case otherStep is a string compares current instance value property with the string value
     * @param {Step|string} otherStep Other step to compare to. Can be an instance of Step or a string.
     */
    equals(otherStep) {
        if (!otherStep) {
            return false;
        }

        if (otherStep instanceof Step) {
            return this.value === otherStep.value;
        }

        if (typeof otherStep === 'string' || otherStep instanceof String) {
            // eslint-disable-next-line eqeqeq
            return this.value == otherStep;
        }

        return false;
    }

    setClassText(val) {
        this.classText = val;
    }

    /**
     * Returns true if current instance has a lower index value than the other one
     * @param {Step} otherStep Step instance to compare
     */
    isBefore(otherStep) {
        return this.index < otherStep.index;
    }

    /**
     * Returns true if current instance has a greater index value than the other one
     * @param {Step} otherStep Step instance to compare
     */
    isAfter(otherStep) {
        return this.index > otherStep.index;
    }

    /**
     * Returns true if current instance has same index value than the other one
     * @param {Step} otherStep Step instance to compare
     */
    isSame(otherStep) {
        return this.index === otherStep.index;
    }

    hasValue() {
        return !!this.value;
    }
}

/**
 * Returns the object's master record type id
 * @param {Object} objectInfo Object metadata
 */
export function getMasterRecordTypeId(objectInfo) {
    if (objectInfo.recordTypeInfos) {
        for (let rtId in objectInfo.recordTypeInfos) {
            if (objectInfo.recordTypeInfos[rtId].master) {
                return objectInfo.recordTypeInfos[rtId].recordTypeId;
            }
        }
    }
    return null;
}

/**
 * Returns the record's record type id
 * @param {Object} record SObject record
 */
export function getRecordTypeId(record) {
    if (record.recordTypeInfo) {
        return record.recordTypeInfo.recordTypeId;
    }
    return null;
}
