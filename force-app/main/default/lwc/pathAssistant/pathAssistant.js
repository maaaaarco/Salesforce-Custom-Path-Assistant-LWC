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
    Step,
    getMasterRecordTypeId,
    getRecordTypeId
} from './utils';

// value to assign to the last step when user has to select a proper closed step
const OPEN_MODAL_TO_SELECT_CLOSED_STEP =
    'pathAssistant_selectAClosedStepValue';

export default class PathAssistant extends LightningElement {
    // current object api name
    @api objectApiName;

    // current record's id
    @api recordId;

    // picklist field's API name used to render the path assistant
    @api picklistField;

    // closed OK step value. When selected will render a green progress bar
    @api closedOk;

    // closed KO step value. When selected will render a red progress bar
    @api closedKo;

    // label to give the last step
    @api lastStepLabel;

    // show/hide the update button
    @api hideUpdateButton;

    // show/hide a loading spinner
    @track spinner = false;

    // show/hide the modal to select a closed step
    @track openModal = false;

    // current object metadata info
    @track objectInfo;

    // current record
    @track record;

    // error message, when set will render the error panel
    @track errorMsg;

    // available picklist values for current record (based on record type)
    @track possibleSteps;

    // step selected by the user
    @track selectedStep;

    // current record's record type id
    _recordTypeId;

    // action that can be performed by the user
    _currentScenario;

    // user selected closed step
    _selectedClosedStep;

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
                // stores possible steps
                this.possibleSteps = data.picklistFieldValues[
                    this.picklistField
                ].values.map((elem, idx) => {
                    return new Step(elem.value, elem.label, idx);
                });

                // checks that required values are included
                this._validateSteps();
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
            this.selectedStep,
            this.currentStep.value,
            OPEN_MODAL_TO_SELECT_CLOSED_STEP
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
    _validateSteps() {
        let isClosedOkAvailable = false;
        let isClosedKoAvailable = false;

        this.possibleSteps.forEach(elem => {
            isClosedKoAvailable |= elem.value === this.closedKo;
            isClosedOkAvailable |= elem.value === this.closedOk;
        });

        if (!isClosedOkAvailable) {
            this.errorMsg = `${
                this.closedOk
            } value is not available for record type ${this._recordTypeId}`;
        }

        if (!isClosedKoAvailable) {
            this.errorMsg = `${
                this.closedKo
            } value is not available for record type ${this._recordTypeId}`;
        }

        // checks steps contains at least three items (starting step plus the two closed ones)
        if (this.possibleSteps.length < 3) {
            // note: should I make this configurable?
            this.errorMsg = `Not enough picklist values are available for record type ${
                this._recordTypeId
            }.`;
        }
    }

    /**
     * Given a step returns the css class to apply in the rendered html element
     * @param {Object} step Step instance
     */
    _getStepElementCssClass(step) {
        let classText = 'slds-path__item';

        if (step.equals(this.closedOk)) {
            classText += ' slds-is-won';
        }

        if (step.equals(this.closedKo)) {
            classText += ' slds-is-lost';
        }

        if (step.equals(this.selectedStep)) {
            classText += ' slds-is-active';
        }

        if (step.equals(this.currentStep)) {
            classText += ' slds-is-current';

            if (!this.selectedStep) {
                // if user didn't select any step this is also the active one
                classText += ' slds-is-active';
            }
        } else if (step.isBefore(this.currentStep) && !this.isClosedKo) {
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
        this.selectedStep = undefined;
        this._selectedClosedStep = undefined;
        this._currentScenario = undefined;
    }

    /**
     * Update current record with the specified step.
     * @param {String} stepValue Step value to set on current record
     */
    _updateRecord(stepValue) {
        // format the record for update call
        let toUpdate = {
            fields: {
                Id: this.recordId
            }
        };

        // set new field value
        toUpdate.fields[this.picklistField] = stepValue;

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
    get currentStep() {
        for (let idx in this.possibleSteps) {
            if (
                this.possibleSteps[idx].equals(
                    this.record.fields[this.picklistField].value
                )
            ) {
                return this.possibleSteps[idx];
            }
        }
        // empty step
        return new Step();
    }

    // returns next step
    get nextStep() {
        return this.possibleSteps[this.currentStep.index + 1];
    }

    // get progress bar steps
    get steps() {
        let closedOkElem;
        let closedKoElem;

        // makes a copy of picklistValues. This is because during rendering phase we cannot alter the status of a tracked variable
        // const possibleSteps = JSON.parse(JSON.stringify(this.possibleSteps));

        let res = this.possibleSteps
            .filter(step => {
                // filters out closed steps
                if (step.equals(this.closedOk)) {
                    closedOkElem = step;
                    return false;
                }

                if (step.equals(this.closedKo)) {
                    closedKoElem = step;
                    return false;
                }

                return true;
            })
            .map(step => {
                // adds the classText property used to render correctly the element
                step.setClassText(this._getStepElementCssClass(step));
                return step;
            });

        let lastStep;

        if (this.isClosedOk) {
            lastStep = closedOkElem;
        } else if (this.isClosedKo) {
            lastStep = closedKoElem;
        } else {
            // record didn't reach a closed step
            // create a fake one that will allow users to pick either the closedOk or closedKo
            lastStep = new Step(OPEN_MODAL_TO_SELECT_CLOSED_STEP, this.lastStepLabel, Infinity);
        }

        lastStep.setClassText(this._getStepElementCssClass(lastStep));

        res.push(lastStep);

        return res;
    }

    // returns only closed steps
    get closedSteps() {
        return this.possibleSteps.filter(elem => {
            return elem.equals(this.closedKo) || elem.equals(this.closedOk);
        });
    }

    // return action button text label
    get updateButtonText() {
        return this._currentScenario
            ? this._currentScenario.layout.getUpdateButtonText(
                  this.picklistFieldLabel
              )
            : '';
    }

    // returns the header for the modal
    get modalHeader() {
        return this._currentScenario
            ? this._currentScenario.layout.getModalHeader(
                  this.picklistFieldLabel
              )
            : '';
    }

    // returns the label for the select input field inside the modal
    get selectLabel() {
        return this.picklistFieldLabel;
    }

    // returns the label of the picklist field used to render the path
    get picklistFieldLabel() {
        return this.objectInfo.fields[this.picklistField].label;
    }

    // true if current record reached a closed step
    get isClosed() {
        return this.isClosedKo || this.isClosedOk;
    }

    // true if current record was closed OK
    get isClosedOk() {
        return this.currentStep.equals(this.closedOk);
    }

    // true if current record was closed KO
    get isClosedKo() {
        return this.currentStep.equals(this.closedKo);
    }

    // true when all required data is loaded
    get isLoaded() {
        const res = this.record && this.objectInfo && this.possibleSteps;
        if (res && !this._currentScenario) {
            // when fully loaded initialize the action
            this._setCurrentScenario();
        }
        return res;
    }

    // true if picklist field is empty and user didn't select any value yet
    get isUpdateButtonDisabled() {
        return !this.currentStep.hasValue() && !this.selectedStep;
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
     * Called when user selects a value for the closed step
     * @param {Event} event Change Event
     */
    setClosedStep(event) {
        this._selectedClosedStep = event.target.value;
    }

    /**
     * Called when user clicks on a step
     * @param {Event} event Click event
     */
    handleStepSelected(event) {
        this.selectedStep = event.currentTarget.getAttribute('data-value');
        this._setCurrentScenario();
    }

    /**
     * Called when user press the action button
     */
    handleUpdateButtonClick() {
        switch (this._currentScenario.constructor) {
            case MarkAsCompleteScenario:
                if (
                    this.nextStep.equals(this.closedKo) ||
                    this.nextStep.equals(this.closedOk)
                ) {
                    // in case next step is a closed one open the modal
                    this.openModal = true;
                } else {
                    // otherwise update the record directly
                    this._updateRecord(this.nextStep.value);
                }
                break;
            case MarkAsCurrentScenario:
                this._updateRecord(this.selectedStep);
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
        if (!this._selectedClosedStep) {
            return;
        }

        this._updateRecord(this._selectedClosedStep);
        this.openModal = false;
    }
}
