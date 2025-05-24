OllamaAgentLanguageModelLive.ts:17 Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)
NIP90AgentLanguageModelLive.ts:22 Loading NIP90AgentLanguageModelLive module
runtime.ts:130 [Runtime] Building SparkService layer with MOCK implementation (no wallet initialized)
walletStore.ts:200 Rehydrating wallet store, found existing seed phrase. Initializing services...
walletStore.ts:167 WalletStore: Initializing services with mnemonic starting with: pyram...
runtime.ts:264 Reinitializing Effect runtime with updated wallet configuration...
runtime.ts:112 [Runtime] Building SparkService layer with USER mnemonic: pyramid go...
runtime.ts:234 Creating a production-ready Effect runtime for renderer...
SparkServiceImpl.ts:52 [SparkService] Initializing wallet for network: MAINNET
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_start', label: 'Network: MAINNET', value: '2', timestamp: 1748107212424}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748107212501}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748107212501}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748107212503}
runtime.ts:238 Production-ready Effect runtime for renderer created successfully.
renderer.ts:13 Main Effect runtime has been initialized in renderer via startApp.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'renderer_runtime_fully_ready', timestamp: 1748107212508}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748107212574}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748107212574}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748107212575}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748107212576}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748107212576}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748107212579}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748107212579}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748107212580}
VM1286 renderer_init:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
  Policy set or a policy with "unsafe-eval" enabled. This exposes users of
  this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ VM1286 renderer_init:2
logSecurityWarnings @ VM1286 renderer_init:2
(anonymous) @ VM1286 renderer_init:2
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_success', label: 'Network: MAINNET', value: 'success', timestamp: 1748107213396}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748107213398}
SparkServiceImpl.ts:163 [SparkService Finalizer] Wallet connections cleaned up successfully for network: MAINNET.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:dispose', action: 'wallet_cleanup_success', label: 'Network: MAINNET', timestamp: 1748107213400}
runtime.ts:279 Effect runtime reinitialized successfully with user wallet.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107213401}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748107213597}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748107213599}
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
walletStore.ts:185 WalletStore: Services initialized.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 464 sats', value: 'Token count: 0', timestamp: 1748107213917}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1748107214057}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1748107214059}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 464', timestamp: 1748107214148}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_start', label: 'User message sent', value: 'what lab trained you', timestamp: 1748107217015}
useAgentChat.ts:121 [useAgentChat] Created new AbortController for message: assistant-1748107217016
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'chat_orchestrator_resolved_successfully', label: 'Orchestrator resolved for provider: nip90_devstral', value: 'assistant-1748107217016', timestamp: 1748107217017}
useAgentChat.ts:168 [useAgentChat] Orchestrator: Starting stream via provider: nip90_devstral for message: assistant-1748107217016 Current signal state: {aborted: false, controller: 'present'}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'stream_conversation_start', label: 'nip90_devstral', timestamp: 1748107217018}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start', label: 'nip90_devstral', value: 'devstral', timestamp: 1748107217027}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start_nip90', label: 'nip90_devstral', timestamp: 1748107217028}
ChatOrchestratorService.ts:94 [ChatOrchestratorService] Building NIP90 provider with config: {modelName: 'devstral', isEnabled: true, dvmPubkey: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', dvmRelays: Array(3), requestKind: 5050, …}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_success_nip90', label: 'nip90_devstral', timestamp: 1748107217038}
ChatOrchestratorService.ts:119 [ChatOrchestratorService] Successfully built NIP90 provider for nip90_devstral
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'requester_pubkey_stream', label: '7f6eac97f278d8999bdfa8ea21510528886c2366d44f25385b53c835de28b167', value: 'Ephemeral key', timestamp: 1748107217041}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_create_job_request', label: 'Creating job request of kind: 5050', timestamp: 1748107217041}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_pool_initialize', label: '[Nostr] Pool initialized with relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748107217051}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '858cc17e758588900b42a9d43a581affadf40394eb4d2bd933c20a9bb2a73d9b', timestamp: 1748107217051}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:warn', action: 'nostr_publish_partial_failure', label: '[Nostr] Partially published event 858cc17e75858890…4eb4d2bd933c20a9bb2a73d9b: 2 succeeded, 1 failed.', value: 'Failures: Error: Policy violated and pubkey is not in our web of trust.', timestamp: 1748107217817}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_job_request_published', label: 'Published job request with ID: 858cc17e758588900b42a9d43a581affadf40394eb4d2bd933c20a9bb2a73d9b', value: 'Kind: 5050', timestamp: 1748107217817}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_subscribe_job_updates', label: 'Subscribing to updates for job request: 858cc17e75…00b42a9d43a581affadf40394eb4d2bd933c20a9bb2a73d9b', timestamp: 1748107217818}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'subscription_relays', label: 'Using 3 DVM relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748107217818}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'filters_created', label: '858cc17e758588900b42a9d43a581affadf40394eb4d2bd933c20a9bb2a73d9b', value: 'Result: {"kinds":[6000,6001,6002,6003,6004,6005,60…d6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827"]}', timestamp: 1748107217818}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[6000,6001,6002,6003,6004,6005,…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748107217819}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[7000],"#e":["858cc17e758588900…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748107217819}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created 2 subscriptions', value: '{"filters":[{"kinds":[6000,6001,6002,6003,6004,600…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748107217819}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'subscription_created_successfully', label: '858cc17e758588900b42a9d43a581affadf40394eb4d2bd933c20a9bb2a73d9b', value: 'Subscribed to 3 relays for result + feedback events', timestamp: 1748107217819}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107218918}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'event_received', label: 'aee58377758b3d7bd13cc764d9de9e8e4dbc81461b08b9b8967d6acb33a62387', value: 'Kind: 7000 | Job: 858cc17e758588900b42a9d43a581aff…38ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', timestamp: 1748107219042}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'kind_7000_feedback_received', label: 'aee58377758b3d7bd13cc764d9de9e8e4dbc81461b08b9b8967d6acb33a62387', value: 'Content: ... | Tags: [["e","858cc17e758588900b42a9…e955772neuzrxvpdetnuc6r3wuz7x6fgpnduu3sp2395cc"]]', timestamp: 1748107219042}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'payment_required', label: '858cc17e758588900b42a9d43a581affadf40394eb4d2bd933c20a9bb2a73d9b', value: '3 sats', timestamp: 1748107219043}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'auto_payment_triggered', label: '858cc17e758588900b42a9d43a581affadf40394eb4d2bd933c20a9bb2a73d9b', value: '3 sats', timestamp: 1748107219043}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'pay_invoice_start', label: 'Invoice: lnbc30n1p5rrl7jpp5ec...', value: '{"maxFeeSats":10,"timeoutSeconds":60}', timestamp: 1748107219043}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 464 sats', value: 'Token count: 0', timestamp: 1748107219392}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107224395}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 448 sats', value: 'Token count: 0', timestamp: 1748107224687}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'event_received', label: 'dc2585272846f3d636b348642260849578fbe4bd2a6932eb1b2fd70ff83f8705', value: 'Kind: 7000 | Job: 858cc17e758588900b42a9d43a581aff…38ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', timestamp: 1748107227619}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'kind_7000_feedback_received', label: 'dc2585272846f3d636b348642260849578fbe4bd2a6932eb1b2fd70ff83f8705', value: 'Content: ... | Tags: [["e","858cc17e758588900b42a9…atus","processing","Processing your request..."]]', timestamp: 1748107227620}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'event_received', label: '1698f77d8ada20b68f002317b851451c4fff55051c0dc9f8b4be53d515e35bbe', value: 'Kind: 6050 | Job: 858cc17e758588900b42a9d43a581aff…38ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', timestamp: 1748107228017}
NIP90ServiceImpl.ts:865 Error processing subscription event: (FiberFailure) AsyncFiberException: Fiber #239 cannot be resolved synchronously. This is caused by using runSync on an effect that performs async work
overrideMethod @ hook.js:608
(anonymous) @ NIP90ServiceImpl.ts:865
onevent @ NostrServiceImpl.ts:478
handleNext @ nostr-tools.js?v=ad354b67:2248
runQueue @ nostr-tools.js?v=ad354b67:2215
_onmessage @ nostr-tools.js?v=ad354b67:2378
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"I was trained by Google DeepMind.","annotations":[],"_tag":"TextPart"},{"usage":{"inputTokens":0,"outputTokens":33,"totalTokens":33,"reasoningTokens":0,"cacheReadInputTokens":0,"cacheWriteInputTokens":0},"reason":"unknown","providerMetadata":{},"_tag":"FinishPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1748107217016 Chunk length: 33
useAgentChat.ts:265 [useAgentChat] Ensuring block entered. {messageId: 'assistant-1748107217016', abortController: 'present', signalAborted: false, isLoading: false}
useAgentChat.ts:281 [useAgentChat] Clearing abort controller for message: assistant-1748107217016
useAgentChat.ts:285 [useAgentChat] Clearing current assistant message ID: assistant-1748107217016
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'pay_invoice_success', label: 'Payment status: PENDING', value: 'Amount: 0, Fee: 0', timestamp: 1748107229243}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'payment_success', label: '858cc17e758588900b42a9d43a581affadf40394eb4d2bd933c20a9bb2a73d9b', value: 'ce04b5b5ac9a8d1729b42b06ba8a2bb25d1dc766e5441852b5ca073c80abb93b', timestamp: 1748107229245}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107229693}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 461 sats', value: 'Token count: 0', timestamp: 1748107230036}
