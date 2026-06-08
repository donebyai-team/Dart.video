package llm

import (
	"strings"
	"time"
)

type OpenAIExtractor struct {
	started bool
	startAt time.Time
	done    bool
}

func NewOpenAIExtractor() *OpenAIExtractor {
	return &OpenAIExtractor{}
}

func (e *OpenAIExtractor) Finish() []Event {
	return nil
}

func (e *OpenAIExtractor) ProcessChunk(
	data map[string]interface{},
) ([]Event, error) {

	eventType, _ := data["type"].(string)

	switch eventType {

	case "response.reasoning_summary_part.added":

		if !e.started {
			e.started = true
			e.startAt = time.Now()

			return []Event{
				{
					Type: EventThinkingStarted,
				},
			}, nil
		}

		return []Event{
			{
				Type: EventThinkingChunk,
			},
		}, nil

	case "response.output_item.done":

		if e.done {
			return nil, nil
		}

		item, ok := data["item"].(map[string]interface{})
		if !ok {
			return nil, nil
		}

		itemType, _ := item["type"].(string)
		if itemType != "reasoning" {
			return nil, nil
		}

		e.done = true

		var summary strings.Builder

		if summaries, ok := item["summary"].([]interface{}); ok {
			for _, s := range summaries {

				sMap, ok := s.(map[string]interface{})
				if !ok {
					continue
				}

				if txt, ok := sMap["text"].(string); ok {
					summary.WriteString(txt)
					summary.WriteString("\n\n")
				}
			}
		}

		duration := 0.0
		if e.started {
			duration = time.Since(e.startAt).Seconds()
		}

		return []Event{
			{
				Type:     EventThinkingDone,
				Text:     summary.String(),
				Duration: duration,
			},
		}, nil
	}

	return nil, nil
}

type GeminiExtractor struct {
	started bool
	startAt time.Time
}

func NewGeminiExtractor() *GeminiExtractor {
	return &GeminiExtractor{}
}

func (e *GeminiExtractor) ProcessChunk(
	data map[string]interface{},
) ([]Event, error) {

	candidates, ok := data["candidates"].([]interface{})
	if !ok {
		return nil, nil
	}

	var events []Event

	for _, candidateRaw := range candidates {

		candidate, ok := candidateRaw.(map[string]interface{})
		if !ok {
			continue
		}

		content, ok := candidate["content"].(map[string]interface{})
		if !ok {
			continue
		}

		parts, ok := content["parts"].([]interface{})
		if !ok {
			continue
		}

		for _, partRaw := range parts {

			part, ok := partRaw.(map[string]interface{})
			if !ok {
				continue
			}

			thought, _ := part["thought"].(bool)
			if !thought {
				continue
			}

			if !e.started {
				e.started = true
				e.startAt = time.Now()

				events = append(events, Event{
					Type: EventThinkingStarted,
				})
			}

			txt, _ := part["text"].(string)

			events = append(events, Event{
				Type: EventThinkingChunk,
				Text: txt,
			})
		}
	}

	return events, nil
}

func (e *GeminiExtractor) Finish() []Event {
	if !e.started {
		return nil
	}

	return []Event{
		{
			Type:     EventThinkingDone,
			Duration: time.Since(e.startAt).Seconds(),
		},
	}
}
