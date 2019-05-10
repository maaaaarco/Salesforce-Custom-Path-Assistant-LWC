# Salesforce-Custom-Path-Assistant-LWC

A custom path assistant built using only Lightning Web Components

## Reasons

Main reason for this project is that currently is not possible to replicate the same look and feel of the Opportunity Sales Path using custom Path Assistants.
When you create a new Path Assistant you can specify an Object, a picklist field and a record type... What you miss is the ability to defines which picklist values are mutually exclusive at the end of the path.

## Example

We have a Project Object used to track the different implementation projects related to specified customers. Each Project record has a Status that can be:

-   New
-   In progress
-   On hold
-   Completed
-   Failed

We want to display the Status as a path on the Project record page. We want the path to be green in case the status is Completed, red in case the status is Failed.
If we create a Path Assistant and then add the standard _Path_ Lightning component to the record page this is what we get:

![alt text](./doc/images/projectStatus.png 'Project status')

Not really want we wanted! As you can see both values _Completed_ and _Failed_ are displayed. Even worst seems that _Failed_ is the status that comes after _Completed_.

Without creating the Path Assistant we can instead use the custom Lightning Component called _pathAssistant_.
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

## Considerations

This Lightning Web Component is fully aware of its context when added to a Record page. This means that it's not object specific and can be added on any object that has a picklist field.
It doesn't need to use an Apex controller thanks to the _uiRecordApi_ module that provides method to update and retrieve records.
In case your object has multiple record types the picklist values displayed are the one you enabled for it (same as standard Path Assistant).
The only requirements this component has is that the picklist field, on which the path is based, has to be included in the Page Layout of the object.
