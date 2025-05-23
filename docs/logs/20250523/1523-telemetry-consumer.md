OllamaAgentLanguageModelLive.ts:17 Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)
NIP90AgentLanguageModelLive.ts:22 Loading NIP90AgentLanguageModelLive module
runtime.ts:130 [Runtime] Building SparkService layer with MOCK implementation (no wallet initialized)
walletStore.ts:200 Rehydrating wallet store, found existing seed phrase. Initializing services...
walletStore.ts:167 WalletStore: Initializing services with mnemonic starting with: pyram...
runtime.ts:264 Reinitializing Effect runtime with updated wallet configuration...
runtime.ts:112 [Runtime] Building SparkService layer with USER mnemonic: pyramid go...
runtime.ts:234 Creating a production-ready Effect runtime for renderer...
SparkServiceImpl.ts:52 [SparkService] Initializing wallet for network: MAINNET
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_start', label: 'Network: MAINNET', value: '2', timestamp: 1748031789273}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748031789342}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748031789342}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748031789344}
runtime.ts:238 Production-ready Effect runtime for renderer created successfully.
renderer.ts:13 Main Effect runtime has been initialized in renderer via startApp.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'renderer_runtime_fully_ready', timestamp: 1748031789349}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748031789414}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748031789414}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748031789415}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748031789416}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748031789417}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748031789420}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748031789420}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748031789421}
VM6974 renderer_init:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
  Policy set or a policy with "unsafe-eval" enabled. This exposes users of
  this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ VM6974 renderer_init:2
logSecurityWarnings @ VM6974 renderer_init:2
(anonymous) @ VM6974 renderer_init:2
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_success', label: 'Network: MAINNET', value: 'success', timestamp: 1748031790084}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748031790086}
SparkServiceImpl.ts:163 [SparkService Finalizer] Wallet connections cleaned up successfully for network: MAINNET.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:dispose', action: 'wallet_cleanup_success', label: 'Network: MAINNET', timestamp: 1748031790090}
runtime.ts:279 Effect runtime reinitialized successfully with user wallet.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031790091}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748031790429}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748031790429}
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 500 sats', value: 'Token count: 0', timestamp: 1748031790567}
walletStore.ts:185 WalletStore: Services initialized.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 500', timestamp: 1748031790714}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1748031793893}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1748031793894}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031795571}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_start', label: 'User message sent', value: 'hi', timestamp: 1748031795663}
useAgentChat.ts:121 [useAgentChat] Created new AbortController for message: assistant-1748031795663
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'chat_orchestrator_resolved_successfully', label: 'Orchestrator resolved for provider: nip90_devstral', value: 'assistant-1748031795663', timestamp: 1748031795664}
useAgentChat.ts:168 [useAgentChat] Orchestrator: Starting stream via provider: nip90_devstral for message: assistant-1748031795663 Current signal state: {aborted: false, controller: 'present'}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'stream_conversation_start', label: 'nip90_devstral', timestamp: 1748031795664}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start', label: 'nip90_devstral', value: 'devstral', timestamp: 1748031795677}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start_nip90', label: 'nip90_devstral', timestamp: 1748031795677}
ChatOrchestratorService.ts:94 [ChatOrchestratorService] Building NIP90 provider with config: {modelName: 'devstral', isEnabled: true, dvmPubkey: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', dvmRelays: Array(3), requestKind: 5050, …}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_success_nip90', label: 'nip90_devstral', timestamp: 1748031795682}
ChatOrchestratorService.ts:119 [ChatOrchestratorService] Successfully built NIP90 provider for nip90_devstral
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'requester_pubkey_stream', label: 'a1f0109e3ef071c39cb24a097d4e713d51e89e2a43f385e4b51b3c49e5662f3c', value: 'Ephemeral key', timestamp: 1748031795686}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_create_job_request', label: 'Creating job request of kind: 5050', timestamp: 1748031795687}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_pool_initialize', label: '[Nostr] Pool initialized with relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748031795699}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '270b1381c6ed6ffbdf89462dd3299d8696e681b6e7d4c96b06704d90602260bd', timestamp: 1748031795699}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 500 sats', value: 'Token count: 0', timestamp: 1748031796071}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event 270b1381c6ed6…96e681b6e7d4c96b06704d90602260bd to all 3 relays.', timestamp: 1748031796403}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_job_request_published', label: 'Published job request with ID: 270b1381c6ed6ffbdf89462dd3299d8696e681b6e7d4c96b06704d90602260bd', value: 'Kind: 5050', timestamp: 1748031796404}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_subscribe_job_updates', label: 'Subscribing to updates for job request: 270b1381c6…bdf89462dd3299d8696e681b6e7d4c96b06704d90602260bd', timestamp: 1748031796404}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'subscription_relays', label: 'Using 3 DVM relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748031796404}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'filters_created', label: '270b1381c6ed6ffbdf89462dd3299d8696e681b6e7d4c96b06704d90602260bd', value: 'Result: {"kinds":[6000,6001,6002,6003,6004,6005,60…d6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827"]}', timestamp: 1748031796404}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[6000,6001,6002,6003,6004,6005,…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748031796405}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[7000],"#e":["270b1381c6ed6ffbd…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748031796405}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created 2 subscriptions', value: '{"filters":[{"kinds":[6000,6001,6002,6003,6004,600…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748031796405}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'subscription_created_successfully', label: '270b1381c6ed6ffbdf89462dd3299d8696e681b6e7d4c96b06704d90602260bd', value: 'Subscribed to 3 relays for result + feedback events', timestamp: 1748031796406}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'event_received', label: '522eec117b14c8c83ef4534c27c99f73f3eb1e01a0bcec5a5da1cc6346d2dd43', value: 'Kind: 7000 | Job: 270b1381c6ed6ffbdf89462dd3299d86…38ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', timestamp: 1748031798926}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'kind_7000_feedback_received', label: '522eec117b14c8c83ef4534c27c99f73f3eb1e01a0bcec5a5da1cc6346d2dd43', value: 'Content: ... | Tags: [["e","270b1381c6ed6ffbdf8946…e5c6afaufq2pc9q9jstks94n9qf72f4xtfde0tqp8s8tcm"]]', timestamp: 1748031798926}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'payment_required', label: '270b1381c6ed6ffbdf89462dd3299d8696e681b6e7d4c96b06704d90602260bd', value: '3 sats', timestamp: 1748031798926}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'auto_payment_triggered', label: '270b1381c6ed6ffbdf89462dd3299d8696e681b6e7d4c96b06704d90602260bd', value: '3 sats', timestamp: 1748031798926}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'pay_invoice_start', label: 'Invoice: lnbc30n1p5rpkf4pp50l...', value: '{"maxFeeSats":10,"timeoutSeconds":60}', timestamp: 1748031798927}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031801073}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 496 sats', value: 'Token count: 0', timestamp: 1748031801382}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031806385}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 496 sats', value: 'Token count: 0', timestamp: 1748031806662}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'pay_invoice_success', label: 'Payment status: FAILED', value: 'Amount: 0, Fee: 0', timestamp: 1748031809164}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'payment_success', label: '270b1381c6ed6ffbdf89462dd3299d8696e681b6e7d4c96b06704d90602260bd', value: 'unknown-hash', timestamp: 1748031809165}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"Auto-paid 3 sats. Payment hash: unknown-hash... Waiting for DVM to process...","annotations":[],"_tag":"TextPart"},{"usage":{"inputTokens":0,"outputTokens":77,"totalTokens":77,"reasoningTokens":0,"cacheReadInputTokens":0,"cacheWriteInputTokens":0},"reason":"unknown","providerMetadata":{},"_tag":"FinishPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1748031795663 Chunk length: 77
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031811664}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 497 sats', value: 'Token count: 0', timestamp: 1748031812229}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031817231}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 497 sats', value: 'Token count: 0', timestamp: 1748031817696}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031822697}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 497 sats', value: 'Token count: 0', timestamp: 1748031823194}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748031828195}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 497 sats', value: 'Token count: 0', timestamp: 1748031828666}
