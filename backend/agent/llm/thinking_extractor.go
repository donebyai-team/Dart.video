package llm

import (
	"context"
	"encoding/json"
	"fmt"
	baml "github.com/boundaryml/baml/engine/language_client_go/pkg"
	"math/rand"
	"time"
)

type ThinkingExtractor struct {
	extractor           Extractor
	onThinking          func(string)
	thinkingMessages    []string
	msgIndex            int
	startTime           time.Time
	started             bool
	sentInitialThinking bool

	finalSummary string
	duration     float64

	doneProcessed      bool
	lastProcessedIndex int

	// async control
	emitCh chan struct{}
	stopCh chan struct{}
}

func (l *llmService) NewThinkingExtractor(
	extractor Extractor,
	onThinking func(string),
	thinkingMessages []string,
) *ThinkingExtractor {

	t := &ThinkingExtractor{
		extractor:        extractor,
		onThinking:       onThinking,
		thinkingMessages: thinkingMessages,
		emitCh:           make(chan struct{}, 1),
		stopCh:           make(chan struct{}),
	}

	// 🚀 Background emitter (handles delays)
	go t.runEmitter()

	return t
}

func (t *ThinkingExtractor) runEmitter() {
	for {
		select {

		case <-t.stopCh:
			return

		case <-t.emitCh:
			if t.onThinking == nil {
				continue
			}

			// random pause (natural feel)
			time.Sleep(time.Duration(500+rand.Intn(700)) * time.Millisecond)

			// emit logic
			if !t.sentInitialThinking {
				t.onThinking("Thinking...")
				t.sentInitialThinking = true
				continue
			}

			if t.msgIndex < len(t.thinkingMessages) {
				t.onThinking(t.thinkingMessages[t.msgIndex])
				t.msgIndex++
			} else {
				t.onThinking("Thinking...")
			}
		}
	}
}

func (t *ThinkingExtractor) handleEvent(event Event) {

	switch event.Type {

	case EventThinkingStarted:

		t.started = true

		select {
		case t.emitCh <- struct{}{}:
		default:
		}

	case EventThinkingChunk:

		if event.Text != "" {
			t.finalSummary += event.Text
		}

		select {
		case t.emitCh <- struct{}{}:
		default:
		}

	case EventThinkingDone:

		if t.doneProcessed {
			return
		}

		t.doneProcessed = true
		t.duration = event.Duration

		if event.Text != "" {
			t.finalSummary = event.Text
		}

		close(t.stopCh)

		if t.onThinking != nil {

			if t.duration < 60 {
				t.onThinking(
					fmt.Sprintf(
						"Thought for %.2fs...",
						t.duration,
					),
				)
			} else {
				t.onThinking(
					fmt.Sprintf(
						"Thought for %.2fm...",
						t.duration/60,
					),
				)
			}
		}
	}
}

func (t *ThinkingExtractor) HandleTick(
	ctx context.Context,
	reason baml.TickReason,
	log baml.FunctionLog,
) baml.FunctionSignal {

	if t.doneProcessed {
		return nil
	}

	calls, err := log.Calls()
	if err != nil || len(calls) == 0 {
		return nil
	}

	lastCall := calls[len(calls)-1]

	streamCall, ok := lastCall.(baml.LLMStreamCall)
	if !ok {
		return nil
	}

	responses, err := streamCall.SSEChunks()
	if err != nil {
		return nil
	}

	for i := t.lastProcessedIndex; i < len(responses); i++ {

		response := responses[i]

		text, err := response.Text()
		if err != nil {
			continue
		}

		var data map[string]interface{}

		if err := json.Unmarshal([]byte(text), &data); err != nil {
			continue
		}

		events, err := t.extractor.ProcessChunk(data)
		if err != nil {
			continue
		}

		for _, event := range events {

			switch event.Type {

			case EventThinkingStarted:

				if !t.started {
					t.started = true
				}

				select {
				case t.emitCh <- struct{}{}:
				default:
				}

			case EventThinkingChunk:

				if event.Text != "" {
					t.finalSummary += event.Text
				}

				select {
				case t.emitCh <- struct{}{}:
				default:
				}

			case EventThinkingDone:

				if t.doneProcessed {
					continue
				}

				t.doneProcessed = true
				t.duration = event.Duration

				// OpenAI provides the final reasoning summary
				if event.Text != "" {
					t.finalSummary = event.Text
				}

				close(t.stopCh)

				if t.onThinking != nil {

					if t.duration < 60 {
						t.onThinking(
							fmt.Sprintf(
								"Thought for %.2fs...",
								t.duration,
							),
						)
					} else {
						t.onThinking(
							fmt.Sprintf(
								"Thought for %.2fm...",
								t.duration/60,
							),
						)
					}
				}
			}
		}
	}

	t.lastProcessedIndex = len(responses)

	return nil
}

func (t *ThinkingExtractor) FinalSummary() string {
	return t.finalSummary
}

func (t *ThinkingExtractor) Duration() float64 {
	return t.duration
}
