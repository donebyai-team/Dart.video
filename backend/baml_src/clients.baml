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
    thinking: {"type": "adaptive"}
  }
}


client<llm> CustomGPT5Mini {
  provider openai-responses
  retry_policy Exponential
  options {
    model "gpt-5-mini"
    api_key env.OPENAI_API_KEY
  }
}

// https://docs.boundaryml.com/docs/snippets/clients/fallback
client<llm> OpenaiFallback {
  provider fallback
  options {
    // This will try the clients in order until one succeeds
    strategy [CustomGPT5Mini]
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