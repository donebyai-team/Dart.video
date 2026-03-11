Feature Overview:
Allow user to import product screens from figma and animate them using the editor.

Technical Implementation:
- In PlayerToolbar for media slides we have options of Insert, along with that give an option to import from figma

- In portal.proto add a new endpoint to implement figma integration
- We already have oauth for google, we can use the same pattern for figma
- use integrations table to store the figma configuration(tables and queries already exits)
- psql/integration.go is what you can use to upsert an integration and get the integration details
- I will provide the client secret and credentials needed in the env file. you can just put a TODO
- Implement the figma as a service inside services folder


Once the user authrise the integration from UI. We should be able to import the selected screen into the media slide. 
- Here I would need suggestions from you on what is the best way to do the integration and how it will work in UI
- In the end, i want user to import a figma screen and animate it using the editor
- When comes to animation, sugeest what should be the ideal flow between backend and frontend. As animation would need backend api calls. 
- Suggest on cases if the json is too big
- Does figma provide the screenshot or what is the format in which it will provide the screen data

First plan and then share your plan with me for approval.
