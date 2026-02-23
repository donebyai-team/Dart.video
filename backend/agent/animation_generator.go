package agent

//
//import "context"
//
//// AnimationGeneratorService generates, validates, and stores new Remotion components
//// on the fly when no suitable template exists in the library.
//// TODO: implement
//type AnimationGeneratorService interface {
//	// Generate produces a new Remotion component for the given slide context.
//	// Model: claude-opus-4-6 or gpt-4o
//	// Temperature: 0.4
//	Generate(ctx context.Context, slide SlidePlan, category MatchedCategory) (GeneratedComponent, error)
//
//	// Validate runs static analysis and esbuild transpile check on generated code.
//	Validate(ctx context.Context, code string) error
//
//	// RenderTest renders a single frame (frame 0) with dummy props to confirm
//	// the component runs without runtime errors.
//	RenderTest(ctx context.Context, component GeneratedComponent) error
//
//	// Store saves a validated generated component as a new template entry.
//	// Sets repeatable=false and promote_candidate=true by default.
//	Store(ctx context.Context, component GeneratedComponent, categoryID string) (Template, error)
//}
