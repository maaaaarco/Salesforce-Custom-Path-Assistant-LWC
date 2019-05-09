'use strict';
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

    constructor(value, label, index) {
        this.value = value;
        this.label = label;
        this.index = index;
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
