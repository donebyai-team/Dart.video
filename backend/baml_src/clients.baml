// Learn more about clients at https://docs.boundaryml.com/docs/snippets/clients/overview

client<llm> CustomGeminiProPreview {
  provider google-ai
  retry_policy Exponential
  options {
    model "gemini-3.1-pro-preview"
    api_key env.GOOGLE_API_KEY
    generationConfig { thinkingConfig { includeThoughts true } }
  }
}

client<llm> SmallBoyFastGemini {
  provider google-ai
  retry_policy Exponential
  options {
    model "gemini-2.5-flash-lite"
    api_key env.GOOGLE_API_KEY
  }
}

client<llm> SmallBoyFastGPT {
  provider openai
  retry_policy Exponential
  options {
    model "gpt-4o-mini"
    api_key env.OPENAI_API_KEY
  }
}

client<llm> SmartBoyGPTSOL {
  provider "openai-responses"
  retry_policy Exponential
  options {
    model "gpt-5.6-sol"
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