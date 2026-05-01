The goal for this animation package is to have a library of remotion templates which will be feed to LLM and it will use it to create videos based on the user's provided script. 

Each template has a description which LLM used to understand when to use a template

Each template also exposed two schema
1. LLM schema , the props LLM will return 
2. Our internal schema which can be a bit complex and has more options than what LLM needs

LLM only returns the required props and in backend we convert it to our internal schema and add default values for the rest of the props

The schema always has a key and its object props. We try to keep everything at one level avoiding nested objects.

There are some core assets which we reuse across templates:
- LogoAsset
- ImageAsset
- Text
- VideoAsset 
- ContainerAsset etc

There is also a theme and a style concept which are used to define the overall look and feel of the video.

The ultimate goal is that we should be able to do both template and on demand animations generations because templates has limits but at the same time, template are deterministic and reliable. 

The goal is that we reach to a stage where we should be able to perfect our template generation process and build enough common components that we can use them to create on demand animations.

We can use LLM to generate ondemand animation by generating remotion code but that is not reliable. We would want to build a Lego like system where we can build animations using pre-built components and let the LLM focus only animation maths, logic. For example, instead of letting LLM think adding a section to add an image, pre load it and add rendering settings etc. We just ask it to use that component. 

Also, when we manually generate new templates, we'd want to move to a stage where 70-80% of the code should be prebuilt components. 

Current problems:
1. Right now, even manually templates takes time as the common components library are not enough
2. Current template has a lot of code, there is no common grammer or structure. 
3. Every animation, exposes random props which are not following any common grammer

For example, would would want a system where a animaiton scene consists of well defined elements, there should be predefined animation grammer. We have some of the animation and a common function but when comes to grammer like holdDuration, stagger, restDuratio etc it is quite random. There should be a clean way of defining an animation and where ever it is used it should follow and have common terminologies and props. 

Animation should be element specifc, eg a scene can have multiple animations and each animation should follow a common grammer. Right now, somewhere we expose a speed which changes all animation props values ina ratio and where indiviudal props are exposed. There should be a common way, either exposing a single param speed or individual props but not both. I mean don't know, suggest here. 

Also, current template has a lot of mess in terms of using styleOverrise, usepatchesProps hooks etc. they are useful as animation always starts with default state and user can change it which is reflected using these hooks. Just that there should be easy way to do it. 

Also, for ArrayItem. We have this concept that when we wrapp ArrayItem , it makes that array of element editable on the canvas, so user can add or remove from the canvas itseld as we don't want to have a settings to show complex array of object. SceneSettings are just for simple key value props.

Overall, we have to decide
1. Clean way to create template manually by exposing a AI skill
2. That same skill can be used to generate templates on demand and manually
3. The skill should be super simple and should not expose any remotion specific stuff. 
4. Ai animation generation should be more like assembling components rather than writing too much code. 


But at the same time, to keep the skill simple. We have to decide what all things we would like LLM to work upon. LLM should mainly be focusing on generating good animations in one shot and only focus on interpolate and spring maths. 

We need to also decide, what we would like LLM to generate and what we can do on our server side. Eg. We can say that, don't assign ids to elements, we will do it on our side or don't generate schema, only provide the minimal props using which we can templatise it. 

If the skill is becoming too complex, we are fine reducing the scope like on demand animation generations need not to be templatized and edited from the editor. We let user prompt again to change values instead of forcing it too much to write code which fits out template terminilogy and we manually or templatized a generated code separatly either manually or in a separate LLM call. 

Overall, the end goal is to build new templates and generate new animations on demand by not asking AI to focus too much to achevie one shot pixel perfect generations. We are fine if the output quality is a bit degraded and limited to what components we expose. We want reliability than perfection.

Your task is to AUDIT existing animation templates and system to understand how it works current and suggest a plan to reach out goal with pros and cons if there are any. 

Its fine, that we might need to rewrite some parts of the system if needed. 