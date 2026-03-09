Allow user to add a new AnimationSlide using promot or edit an existing Animation in AnimationSlide

Steps to follow:
Implement a new component called AnimationEditor(already exists). It has settings prop which is of type AddOrEditAnimationSettings. If we have the field slideToEdit present then we are editing an existing animation, otherwise we are creating a new one

Inside that, we show these things:
1. A prompt input where user can type in their prompt
2. A submit button inside the bottom right corner to generate the animation
3. A stop button which can cancel the request if it's in progress
4. A thinking view component from @ThinkingViewComponent to show the thinking process on top of the input box. 

You can look at the VideoIntentComposer for the logic of how to handle the thinking process and the submit button. There we have a similar input box, stop button, handle thinking and ask user question panel etc. Reuse the components as much as you can. I has QuestionPanel as well which is used to show a question to the user.

Backend APIs:
Its available in the portal.proto
rpc GenerateOrEditAnimationSlide(GenerateOrEditAnimationRequest) returns (stream GenerateOrEditAnimationResponse);

message GenerateOrEditAnimationRequest {
  string videoId = 1;
  oneof input {
    EditAnimationUserInput edit_animation_user_input = 2;
    CreateNewAnimationInput create_new_animation_input = 3;
    AskUserInput ask_user_input = 4;
  }
}

message EditAnimationUserInput {
  string slide_id = 1;
  string prompt = 2;
}

message CreateNewAnimationInput {
  bool suggestions = 1;
  string prompt = 2;
}

message AskUserInput {
  optional string slide_id = 1;
  string response = 2;
}

message GenerateOrEditAnimationResponse {
  core.v1.Slide slide = 1; // updated slide which can we used as it is to update the slide
  string thinking_summary = 2;
  AskUserQuestion ask_user_question = 3;
  bool waiting_for_user_input = 4;
  repeated core.v1.AnimationTemplate suggestions = 5;
}

when suggestions(default true) we return suggestions and we have to show it in the UI below the prompt box as a grid of animation templates with preview url as thumbnail. Two in a row

Also we should have an option that user can say I don't like any of these, in this can you make the same api call but with suggestions false. By default the first suggestion is selected and the slide object is available to have that template in it.

Make sure that once the slide is received you can immedialy update or add it. If user edit after the add then you should pass the newly created slide id. 

For addding a new slide, just add a temp function in the AnimationEditor component, don't implement it. 

The overall UI should be modern and profesional. 
