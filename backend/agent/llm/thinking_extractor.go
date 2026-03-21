package llm

import (
	"context"
	"encoding/json"
	"fmt"
	baml "github.com/boundaryml/baml/engine/language_client_go/pkg"
	"math/rand"
	"strings"
	"time"
)

type ThinkingExtractor struct {
	onThinking       func(string)
	thinkingMessages []string

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
	onThinking func(string),
	thinkingMessages []string,
) *ThinkingExtractor {

	t := &ThinkingExtractor{
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

		var data map[string]interface{}

		text, err := response.Text()
		if err != nil {
			continue
		}

		if err := json.Unmarshal([]byte(text), &data); err != nil {
			continue
		}

		eventType, _ := data["type"].(string)

		switch eventType {

		// 🧠 reasoning started (still comes as added)
		case "response.reasoning_summary_part.added":

			if !t.started {
				t.startTime = time.Now()
				t.started = true
			}

			select {
			case t.emitCh <- struct{}{}:
			default:
			}

		// ✅ NEW DONE EVENT
		case "response.output_item.done":

			if t.doneProcessed {
				continue
			}

			item, ok := data["item"].(map[string]interface{})
			if !ok {
				continue
			}

			itemType, _ := item["type"].(string)

			// only care about reasoning summaries
			if itemType != "reasoning" {
				continue
			}

			t.doneProcessed = true

			endTime := time.Now()

			if t.started {
				t.duration = endTime.Sub(t.startTime).Seconds()
			}

			// ✅ extract summary array
			if summaries, ok := item["summary"].([]interface{}); ok {
				var builder strings.Builder

				for _, s := range summaries {
					sMap, ok := s.(map[string]interface{})
					if !ok {
						continue
					}

					if txt, ok := sMap["text"].(string); ok {
						builder.WriteString(txt)
						builder.WriteString("\n\n") // spacing between blocks
					}
				}

				t.finalSummary = builder.String()
			}

			// 🛑 stop emitter
			close(t.stopCh)

			if t.onThinking != nil {
				t.onThinking(fmt.Sprintf("Thought for %.2fs...", t.duration))
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
