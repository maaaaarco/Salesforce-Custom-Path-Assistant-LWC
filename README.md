# Salesforce-Custom-Path-Assistant-LWC

Replicates the same look and feel of the Opportunity Sales Path for any Standard and Custom object.

## Example

We have a Project Object used to track the different implementation projects related to specified customers. Each Project record has a Status that can be:

-   New
-   In progress
-   On hold
-   Completed
-   Failed

We want to display the Status as a path on the Project record page. We want the path to be green in case the status is Completed, red in case the status is Failed.

In the Lightning App Builder drag and drop the custom component on the record page and fill the form on the right like this:

![alt text](./doc/images/appBuilder.png 'App Builder')

This is the result on the record page

![alt text](./doc/images/initialStatus.png 'Initial Status')

Users can now select the final _Closed_ status and after pressing on the button _Select Closed Status_ they'll be able to select the proper value

![alt text](./doc/images/selectClosed.png 'Select Closed')

![alt text](./doc/images/modal.png 'Modal')

Depending on the final status they pick these can be the results:

![alt text](./doc/images/completed.png 'Completed')

![alt text](./doc/images/failed.png 'Failed')

## Requirements

-   The picklist field, on which the path is based, has to be included in the Page Layout of the object.
-   User has to have Edit permission on the field

## Considerations

-   This Lightning Web Component is fully aware of its context when added to a Record page. This means that it's not object specific and can be added on any object that has a picklist field.
-   It doesn't need to use an Apex controller thanks to the _uiRecordApi_ module that provides method to update and retrieve records.
-   In case your object has multiple record types the picklist values displayed are the one you enabled for it (same as standard Path Assistant).
