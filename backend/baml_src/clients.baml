// Learn more about clients at https://docs.boundaryml.com/docs/snippets/clients/overview

client<llm> CustomGeminiFlash {
  provider google-ai
  retry_policy Exponential
  options {
    model "gemini-2.0-flash"
    api_key env.GOOGLE_API_KEY
    generationConfig {
      temperature 0.3
    }
  }
}

client<llm> CustomClaudeOpus {
  provider "anthropic"
  retry_policy Exponential
  options {
    model "claude-opus-4-6"
    api_key env.ANTHROPIC_API_KEY
    max_tokens 12000
    temperature 0.1
  }
}

client<llm> CustomOpenAI {
  provider "openai-responses"
  retry_policy Exponential
  options {
    model "gpt-5.4"
    api_key env.OPENAI_API_KEY
    //max_completion_tokens 12000
  }
}

client<llm> CustomOpenAI5 {
  provider "openai-responses"
  retry_policy Exponential
  options {
    model "gpt-5.4"
    api_key env.OPENAI_API_KEY
    //max_completion_tokens 12000
    reasoning {
      effort "medium"
    }
  }
}

client<llm> CustomOpenAI5Nano {
  provider "openai-responses"
  retry_policy Exponential
  options {
    model "gpt-5.4-mini"
    api_key env.OPENAI_API_KEY
  }
}

client<llm> OpenAIImageAnalysis {
  provider "openai-responses"
  retry_policy Exponential
  options {
    model "gpt-5.4-mini"
    api_key env.OPENAI_API_KEY
  }
}

client<llm> CustomOpenAI5WithThinkingSummary {
  provider "openai-responses"
  retry_policy Exponential
  options {
    model "gpt-5.4"
    api_key env.OPENAI_API_KEY
    //max_completion_tokens 12000
    reasoning {
      effort "medium"
      summary "auto"
    }
  }
}

client<llm> CustomOpenAI55WithThinkingSummary {
  provider "openai-responses"
  retry_policy Exponential
  options {
    model "gpt-5.5"
    api_key env.OPENAI_API_KEY
    //max_completion_tokens 12000
    reasoning {
      effort "medium"
      summary "auto"
    }
  }
}

client<llm> CustomOpenAI5WithLowThinkingSummary {
  provider "openai-responses"
  retry_policy Exponential
  options {
    model "gpt-5.4"
    api_key env.OPENAI_API_KEY
    //max_completion_tokens 12000
    reasoning {
      effort "low"
      summary "auto"
    }
  }
}

// https://docs.boundaryml.com/docs/snippets/clients/retry
retry_policy Constant {
  max_retries 3
  strategy {
    type constant_delay
    delay_ms 200
  }
}

retry_policy Exponential {
  max_retries 2
  strategy {
    type exponential_backoff
    delay_ms 300
    multiplier 1.5
    max_delay_ms 10000
  }
}