Allow user to add transitions between the slides

Current, we allow user to select transations via <TransitionPicker>

bugs:
1. On picking a transition, it should add it into the currentSelectedSlide.transition
2. Last slide should not have a transtion if it does logically don't render it. It happens in <RemotionSlideShow>
3. Right now, there is some issue in which it adds it into the next slide and also in timeline it doesn't show at right index


New functionality:
1. I added a few more transitions in RemotionSlideShow under getTransitionPresentation, make it at one place. They are places in editorConfig, TransitionPicker and RemotionSlideShow. Just put it in one config from where all are picked up
2. In the transtions, there is a prop field direction. Which is currently hardcoded. 
3. We should also get the direction from the SlideProto both transition and direction fields. Direction is optional as not all transitons needs it. Make enums of direction as well in the Slide.proto
4. buf generate proto is used to regenerate protos
5. In the UI in StoryboardPanel, there should be a way to select from the list of transtions (already there) but we need to also add the ability to edit the direction. 
6. On edit it should be synced to store already there, we need to add "direction" 
7. Maybe for adding direction and transtion in UI. You can make use of <ToolsSettingsPanel>

IMP:
1. Always use or create components for new UIs
2. add comments