/**
 * Custom path assistant.
 * Standard path component doesn't support closed stages.
 * This component wants to mimic the Opportunity Sales Path where you can have
 * up to two closed statuses.
 *
 * Used only on RecordPages, this component is fully aware of it's context.
 */
import { LightningElement, api, wire, track } from 'lwc';
import { getPicklistValuesByRecordType } from 'lightning/uiObjectInfoApi';
import { updateRecord, getRecordUi } from 'lightning/uiRecordApi';
import {
    ScenarioState,
    ScenarioLayout,
    MarkAsCompleteScenario,
    MarkAsCurrentScenario,
    SelectClosedScenario,
    ChangeClosedScenario,
    getMasterRecordTypeId,
    getRecordTypeId
} from './utils';

// value to assign to the last stage when user has to select a proper closed stage
const OPEN_MODAL_TO_SELECT_CLOSED_STAGE =
    'pathAssistant_selectAClosedStageValue';

export default class PathAssistant extends LightningElement {
    // current object api name
    @api objectApiName;

    // current record's id
    @api recordId;

    // picklist field's API name used to render the path assistant
    @api picklistField;

    // closed OK stage. When selected will render a green progress bar
    @api closedOk;

    // closed KO stage. When selected will render a red progress bar
    @api closedKo;

    // label to give the last stage
    @api lastStageLabel;

    // show/hide the update button
    @api hideUpdateButton;

    // show/hide a loading spinner
    @track spinner = false;

    // show/hide the modal to select a closed stage
    @track openModal = false;

    // current object metadata info
    @track objectInfo;

    // current record
    @track record;

    // error message, when set will render the error panel
    @track errorMsg;

    // available picklist values for current record (based on record type)
    @track picklistValues;

    // stage selected by the user
    @track selectedStage;

    // picklist field's label
    _picklistFieldLabel;

    // current record's record type id
    _recordTypeId;

    // master record type of the object
    _masterRecordTypeId;

    // action that can be performed by the user
    _currentScenario;

    // user selected closed stage
    _selectedClosedStage;

    // array of possible user interaction scenarios
    _scenarios = [];

    /**
     * Creates possible user interaction scenarios
     */
    constructor() {
        super();
        const token = '{0}';

        // note: all the hard coded strings passed to ScenarioLayout can be replaced with Custom Labels

        this._scenarios.push(
            new MarkAsCompleteScenario(
                new ScenarioLayout(
                    'Select Closed {0}',
                    'Mark {0} as Complete',
                    token
                )
            )
        );

        this._scenarios.push(
            new MarkAsCurrentScenario(
                new ScenarioLayout('', 'Mark as Current {0}', token)
            )
        );

        this._scenarios.push(
            new SelectClosedScenario(
                new ScenarioLayout(
                    'Select Closed {0}',
                    'Select Closed {0}',
                    token
                )
            )
        );

        this._scenarios.push(
            new ChangeClosedScenario(
                new ScenarioLayout(
                    'Select Closed {0}',
                    'Change Closed {0}',
                    token
                )
            )
        );
    }

    /* ========== WIRED METHODS ========== */

    @wire(getRecordUi, {
        recordIds: '$recordId',
        layoutTypes: 'Full',
        modes: 'View'
    })
    wiredRecordUI({ error, data }) {
        if (error) {
            this.errorMsg = error.body.message;
        }

        if (data && data.records[this.recordId]) {
            // set the record
            this.record = data.records[this.recordId];

            // set the object info
            this.objectInfo = data.objectInfos[this.objectApiName];

            // get picklist field's label
            this._picklistFieldLabel = this.objectInfo.fields[
                this.picklistField
            ].label;

            // set the current record type
            const rtId = getRecordTypeId(this.record);
            this._recordTypeId = rtId
                ? rtId
                : getMasterRecordTypeId(this.objectInfo);
        }
    }

    // load picklist values available for current record type
    @wire(getPicklistValuesByRecordType, {
        objectApiName: '$objectApiName',
        recordTypeId: '$_recordTypeId'
    })
    wiredPicklistValues({ error, data }) {
        if (!this._recordTypeId) {
            // invalid call
            return;
        }

        if (error) {
            this.errorMsg = error.body.message;
        }

        if (data) {
            if (data.picklistFieldValues[this.picklistField]) {
                // stores picklist values
                this.picklistValues = data.picklistFieldValues[
                    this.picklistField
                ].values.map((elem, idx) => {
                    // add the index property to each item
                    return {
                        value: elem.value,
                        label: elem.label,
                        index: idx
                    };
                });

                // checks that required values are included
                this._validateValues();
            } else {
                this.errorMsg = `Impossible to load ${
                    this.picklistField
                } values for record type ${this._recordTypeId}`;
            }
        }
    }

    /* ========== PRIVATE METHODS ========== */

    /**
     * Based on current component state set the current scenario
     */
    _setCurrentScenario() {
        const state = new ScenarioState(
            this.isClosed,
            this.selectedStage,
            this.currentStage.value,
            OPEN_MODAL_TO_SELECT_CLOSED_STAGE
        );

        for (let idx in this._scenarios) {
            if (this._scenarios[idx].appliesToState(state)) {
                this._currentScenario = this._scenarios[idx];
                break;
            }
        }
    }

    /**
     * Validate picklist values available for current record type.
     * ClosedOk and ClosedKo values should be available together at least with another
     * value.
     */
    _validateValues() {
        let isClosedOkAvailable = false;
        let isClosedKoAvailable = false;

        this.picklistValues.forEach(elem => {
            isClosedKoAvailable |= elem.value === this.closedKo;
            isClosedOkAvailable |= elem.value === this.closedOk;
        });

        if (!isClosedOkAvailable) {
            this.errorMsg = `${
                this.closedOk
            } stage is not available for record type ${this._recordTypeId}`;
        }

        if (!isClosedKoAvailable) {
            this.errorMsg = `${
                this.closedKo
            } stage is not available for record type ${this._recordTypeId}`;
        }

        // checks stages contains at least three items (starting stage plus the two closed ones)
        if (this.picklistValues.length < 3) {
            // note: should I make this configurable?
            this.errorMsg = `Not enough picklist values are available for record type ${
                this._recordTypeId
            }.`;
        }
    }

    /**
     * Given a stage element returns the css class to apply in the rendered html element
     * @param {Object} elem Stage element
     */
    _getStageElementCssClass(stage) {
        let classText = 'slds-path__item';

        if (stage.value === this.closedOk) {
            classText += ' slds-is-won';
        }

        if (stage.value === this.closedKo) {
            classText += ' slds-is-lost';
        }

        if (stage.value === this.selectedStage) {
            classText += ' slds-is-active';
        }

        if (stage.value === this.currentStage.value) {
            classText += ' slds-is-current';

            if (!this.selectedStage) {
                // if user didn't select any stage this is also the active one
                classText += ' slds-is-active';
            }
        } else if (stage.index < this.currentStage.index && !this.isClosedKo) {
            classText += ' slds-is-complete';
        } else {
            // not yet completed or closedKo
            classText += ' slds-is-incomplete';
        }

        return classText;
    }

    /**
     * Reset the component state
     */
    _resetComponentState() {
        this.record = undefined;
        this.selectedStage = undefined;
        this._selectedClosedStage = undefined;
        this._currentScenario = undefined;
    }

    /**
     * Update current record with the specified stage.
     * @param {String} stage Stage to set on current record
     */
    _updateRecord(stage) {
        // format the record for update call
        let toUpdate = {
            fields: {
                Id: this.recordId
            }
        };

        // set stage field to new stage
        toUpdate.fields[this.picklistField] = stage;

        // starts spinner
        this.spinner = true;

        updateRecord(toUpdate)
            .then(() => {
                // close spinner
                this.spinner = false;
            })
            .catch(error => {
                this.errorMsg = error.body.message;
                this.spinner = false;
            });

        // reset component state
        this._resetComponentState();
    }

    /* ========== GETTER METHODS ========== */

    // returns current step of path assistant
    get currentStage() {
        for (let idx in this.picklistValues) {
            if (
                this.picklistValues[idx].value ===
                this.record.fields[this.picklistField].value
            ) {
                return this.picklistValues[idx];
            }
        }
        return {};
    }

    // returns next stage
    get nextStage() {
        return this.picklistValues[this.currentStage.index + 1];
    }

    // get progress bar stages
    get stages() {
        let closedOkElem;
        let closedKoElem;

        // makes a copy of picklistValues. This is because during rendering phase we cannot alter the status of a tracked variable
        const picklistValues = JSON.parse(JSON.stringify(this.picklistValues));

        let res = picklistValues
            .filter(elem => {
                // filters out closed stages
                if (elem.value === this.closedOk) {
                    closedOkElem = elem;
                    return false;
                }

                if (elem.value === this.closedKo) {
                    closedKoElem = elem;
                    return false;
                }

                return true;
            })
            .map(elem => {
                // adds the classText property used to render correctly the element
                elem.classText = this._getStageElementCssClass(elem);
                return elem;
            });

        let lastStage;

        if (this.isClosedOk) {
            lastStage = closedOkElem;
        } else if (this.isClosedKo) {
            lastStage = closedKoElem;
        } else {
            // record didn't reach a closed stage
            // create a fake one that will allow users to pick either the closedOk or closedKo
            lastStage = {
                label: this.lastStageLabel,
                value: OPEN_MODAL_TO_SELECT_CLOSED_STAGE,
                index: Infinity
            };
        }

        lastStage.classText = this._getStageElementCssClass(lastStage);

        res.push(lastStage);

        return res;
    }

    // returns only closed stages
    get closedStages() {
        return this.picklistValues.filter(elem => {
            return elem.value === this.closedKo || elem.value === this.closedOk;
        });
    }

    // return action button text label
    get updateButtonText() {
        return this._currentScenario
            ? this._currentScenario.layout.getUpdateButtonText(
                  this._picklistFieldLabel
              )
            : '';
    }

    // returns the header for the modal
    get modalHeader() {
        return this._currentScenario
            ? this._currentScenario.layout.getModalHeader(
                  this._picklistFieldLabel
              )
            : '';
    }

    // returns the label for the select input field inside the modal
    get selectLabel() {
        return this._picklistFieldLabel;
    }

    // true if current record reached a closed stage
    get isClosed() {
        return this.isClosedKo || this.isClosedOk;
    }

    // true if current record was closed OK
    get isClosedOk() {
        return this.currentStage.value === this.closedOk;
    }

    // true if current record was closed KO
    get isClosedKo() {
        return this.currentStage.value === this.closedKo;
    }

    // true when all required data is loaded
    get isLoaded() {
        const res = this.record && this.objectInfo && this.picklistValues;
        if (res && !this._currentScenario) {
            // when fully loaded initialize the action
            this._setCurrentScenario();
        }
        return res;
    }

    // true if picklist field is empty and user didn't select any value yet
    get isUpdateButtonDisabled() {
        return !this.currentStage.value && !this.selectedStage;
    }

    // true if either spinner = true or component is not fully loaded
    get hasToShowSpinner() {
        return this.spinner || !this.isLoaded;
    }

    get genericErrorMessage() {
        // note: you can store this in a custom label if you need
        return 'An unexpected error occurred. Please contact your System Administrator.';
    }

    /* ========== EVENT HANDLER METHODS ========== */

    /**
     * Called when user press either the Cancel button or the Close icon
     * in the modal.
     */
    closeModal() {
        this.openModal = false;
    }

    /**
     * Called when user selects a value for the closed stage
     * @param {Event} event Change Event
     */
    setClosedStage(event) {
        this._selectedClosedStage = event.target.value;
    }

    /**
     * Called when user clicks on a stage
     * @param {Event} event Click event
     */
    handleStageSelected(event) {
        this.selectedStage = event.currentTarget.getAttribute('data-value');
        this._setCurrentScenario();
    }

    /**
     * Called when user press the action button
     */
    handleUpdateButtonClick() {
        switch (this._currentScenario.constructor) {
            case MarkAsCompleteScenario:
                if (
                    this.nextStage.value === this.closedKo ||
                    this.nextStage.value === this.closedOk
                ) {
                    // in case next stage is a closed one open the modal
                    this.openModal = true;
                } else {
                    // otherwise update the record directly
                    this._updateRecord(this.nextStage.value);
                }
                break;
            case MarkAsCurrentScenario:
                this._updateRecord(this.selectedStage);
                break;
            case SelectClosedScenario:
            case ChangeClosedScenario:
                this.openModal = true;
                break;
            default:
                break;
        }
    }

    /**
     * Called when user press Save button inside the modal
     */
    handleSaveButtonClick() {
        if (!this._selectedClosedStage) {
            return;
        }

        this._updateRecord(this._selectedClosedStage);
        this.openModal = false;
    }
}
