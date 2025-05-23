# Problem

Switching a model to use devstral via NIP90 looks like it is not sending that request to the Nostr network, it still uses the local model via ollama.

## Telemetry

```
OllamaAgentLanguageModelLive.ts:17 Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)
NIP90AgentLanguageModelLive.ts:20 Loading NIP90AgentLanguageModelLive module
walletStore.ts:187 Rehydrating wallet store, found existing seed phrase. Initializing services...
walletStore.ts:161 WalletStore: Initializing services with mnemonic starting with: draft...
runtime.ts:165 Creating a production-ready Effect runtime for renderer...
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_start', label: 'Network: REGTEST', value: '2', timestamp: 1747977198137}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1747977198183}
VM17072 renderer_init:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
  Policy set or a policy with "unsafe-eval" enabled. This exposes users of
  this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ VM17072 renderer_init:2
logSecurityWarnings @ VM17072 renderer_init:2
(anonymous) @ VM17072 renderer_init:2
walletStore.ts:172 WalletStore: Services initialized.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_success', label: 'Network: REGTEST', value: 'success', timestamp: 1747977198746}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1747977198747}
SparkServiceImpl.ts:156 [SparkService Finalizer] Wallet connections cleaned up successfully for network: REGTEST.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:dispose', action: 'wallet_cleanup_success', label: 'Network: REGTEST', timestamp: 1747977198750}
runtime.ts:169 Production-ready Effect runtime for renderer created successfully.
renderer.ts:13 Main Effect runtime has been initialized in renderer via startApp.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'renderer_runtime_fully_ready', timestamp: 1747977198750}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1747977198821}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1747977198822}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747977198824}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1747977198853}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1747977198854}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1747977199375}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1747977199386}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747977199402}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
HomePage.tsx:203 Keyboard: Toggle Agent Chat Pane
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1747977200454}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1747977200456}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_start', label: 'User message sent', value: 'test message to devstral', timestamp: 1747977206420}
useAgentChat.ts:116 [useAgentChat] Created new AbortController for message: assistant-1747977206421
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'agent_language_model_resolved_successfully', label: 'AgentLanguageModel.Tag resolved from runtime', value: 'assistant-1747977206421', timestamp: 1747977206422}
useAgentChat.ts:155 [useAgentChat] Starting stream for message: assistant-1747977206421 Current signal state: {aborted: false, controller: 'present'}
OllamaAsOpenAIClientLive.ts:424 [OllamaAsOpenAIClientLive] Starting stream for gemma3:1b with params: {
  "model": "gemma3:1b",
  "messages": [
    {
      "role": "system",
      "content": "You are Commander's AI Agent. Be helpful and concise."
    },
    {
      "role": "user",
      "content": "test message to devstral"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2048,
  "stream": true
}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:stream', action: 'create_start', label: 'gemma3:1b', timestamp: 1747977206436}
OllamaAsOpenAIClientLive.ts:439 [OllamaAsOpenAIClientLive] Setting up IPC stream for gemma3:1b
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-983","object":"chat.completion.chunk","created":1747977206,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":"Okay","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:164 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"Okay","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:186 [useAgentChat] Updated message content for: assistant-1747977206421 Chunk length: 4
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-983","object":"chat.completion.chunk","created":1747977206,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":",","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:164 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":",","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:186 [useAgentChat] Updated message content for: assistant-1747977206421 Chunk length: 1
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-983","object":"chat.completion.chunk","created":1747977206,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" I","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:164 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" I","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:186 [useAgentChat] Updated message content for: assistant-1747977206421 Chunk length: 2
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-983","object":"chat.completion.chunk","created":1747977206,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":"'","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:164 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"'","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:186 [useAgentChat] Updated message content for: assistant-1747977206421 Chunk length: 1
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-983","object":"chat.completion.chunk","created":1747977206,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":"m","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:164 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"m","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:186 [useAgentChat] Updated message content for: assistant-1747977206421 Chunk length: 1
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-983","object":"chat.completion.chunk","created":1747977206,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" ready","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:164 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" ready","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:186 [useAgentChat] Updated message content for: assistant-1747977206421 Chunk length: 6
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-983","object":"chat.completion.chunk","created":1747977206,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":".","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:164 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":".","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:186 [useAgentChat] Updated message content for: assistant-1747977206421 Chunk length: 1
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-983","object":"chat.completion.chunk","created":1747977206,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" Please","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:164 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" Please","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:186 [useAgentChat] Updated message content for: assistant-1747977206421 Chunk length: 7
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-983","object":"chat.completion.chunk","created":1747977206,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" send","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:164 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" send","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:186 [useAgentChat] Updated message content for: assistant-1747977206421 Chunk length: 5
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-983","object":"chat.completion.chunk","created":1747977207,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" the","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:164 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" the","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:186 [useAgentChat] Updated message content for: assistant-1747977206421 Chunk length: 4
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-983","object":"chat.completion.chunk","created":1747977207,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" test","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:164 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" test","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:186 [useAgentChat] Updated message content for: assistant-1747977206421 Chunk length: 5
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-983","object":"chat.completion.chunk","created":1747977207,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":" message","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:164 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":" message","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:186 [useAgentChat] Updated message content for: assistant-1747977206421 Chunk length: 8
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-983","object":"chat.completion.chunk","created":1747977207,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[{"text":".","annotations":[],"_tag":"TextPart"}]}
useAgentChat.ts:164 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":".","annotations":[],"_tag":"TextPart"}]} Abort signal status: false
useAgentChat.ts:186 [useAgentChat] Updated message content for: assistant-1747977206421 Chunk length: 1
OllamaAsOpenAIClientLive.ts:444 [OllamaAsOpenAIClientLive] IPC onChunk received for gemma3:1b: {"id":"chatcmpl-983","object":"chat.completion.chunk","created":1747977207,"model":"gemma3:1b","choi
OllamaAsOpenAIClientLive.ts:464 [OllamaAsOpenAIClientLive] Emitting AiResponse to effect stream for gemma3:1b: {"parts":[]}
useAgentChat.ts:164 [useAgentChat runForEach] Processing chunk: {"parts":[]} Abort signal status: false
useAgentChat.ts:186 [useAgentChat] Updated message content for: assistant-1747977206421 Chunk length: 0
OllamaAsOpenAIClientLive.ts:490 [OllamaAsOpenAIClientLive] IPC onDone received for gemma3:1b. Calling emit.end().
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:stream', action: 'create_done', label: 'gemma3:1b', timestamp: 1747977207059}
OllamaAsOpenAIClientLive.ts:574 [OllamaAsOpenAIClientLive] Cancellation function executed for IPC stream with gemma3:1b. ipcStreamCancel called.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:stream', action: 'cancel_requested', label: 'gemma3:1b', timestamp: 1747977207061}
useAgentChat.ts:240 [useAgentChat] Ensuring block entered. {messageId: 'assistant-1747977206421', abortController: 'present', signalAborted: false, isLoading: false}
useAgentChat.ts:256 [useAgentChat] Clearing abort controller for message: assistant-1747977206421
useAgentChat.ts:260 [useAgentChat] Clearing current assistant message ID: assistant-1747977206421
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747977223537}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747977223993}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747977254982}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747977255556}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747977285981}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747977286537}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747977316988}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747977317470}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747977347937}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747977348431}
```
