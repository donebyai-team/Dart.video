package llm

type EventType string

const (
	EventThinkingStarted EventType = "thinking_started"
	EventThinkingChunk   EventType = "thinking_chunk"
	EventThinkingDone    EventType = "thinking_done"
)

type Event struct {
	Type     EventType
	Text     string
	Duration float64
}

type Extractor interface {
	ProcessChunk(data map[string]interface{}) ([]Event, error)
	Finish() []Event
}

var thinkingMessages = []string{
	"Understanding the request...",
	"Planning the animation structure...",
	"Designing flow...",
	"Organizing the storyline...",
	"Sailing...",
	"Organizing...",
	"Finalizing...",
	"Analyzing...",
	"Thinking...",
	"Processing...",
	"Exploring...",
	"Reviewing...",
	"Refining...",
	"Drafting...",
	"Building...",
	"Preparing...",
	"Generating...",
	"Creating...",
	"Structuring...",
	"Designing...",
	"Mapping...",
	"Evaluating...",
	"Inspecting...",
	"Checking...",
	"Optimizing...",
	"Composing...",
	"Assembling...",
	"Polishing...",
	"Synthesizing...",
	"Calculating...",
	"Researching...",
	"Connecting...",
	"Resolving...",
	"Transforming...",
	"Wrapping up...",
}
