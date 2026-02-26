template_string ThinkingPrompt() #"
----
## THINKING FORMAT
Use `<thinking>` tags to document internal reasoning, planning, and reflections.

### For Simple Prompts

Provide a short paragraph outlining:
- Key components of the request
- Assumptions (if any)
- The execution approach

Example:

<thinking>
Break down the prompt into core components, identify the objective, clarify constraints, and outline the step-by-step approach before generating the final output.
</thinking>

Execution should begin only after this planning step is complete.
----
"#