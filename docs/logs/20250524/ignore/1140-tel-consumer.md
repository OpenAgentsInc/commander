OllamaAgentLanguageModelLive.ts:17 Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)
NIP90AgentLanguageModelLive.ts:22 Loading NIP90AgentLanguageModelLive module
runtime.ts:130 [Runtime] Building SparkService layer with MOCK implementation (no wallet initialized)
walletStore.ts:200 Rehydrating wallet store, found existing seed phrase. Initializing services...
walletStore.ts:167 WalletStore: Initializing services with mnemonic starting with: pyram...
runtime.ts:264 Reinitializing Effect runtime with updated wallet configuration...
runtime.ts:112 [Runtime] Building SparkService layer with USER mnemonic: pyramid go...
runtime.ts:234 Creating a production-ready Effect runtime for renderer...
SparkServiceImpl.ts:52 [SparkService] Initializing wallet for network: MAINNET
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_start', label: 'Network: MAINNET', value: '2', timestamp: 1748104750204}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748104750251}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748104750251}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748104750253}
runtime.ts:238 Production-ready Effect runtime for renderer created successfully.
renderer.ts:13 Main Effect runtime has been initialized in renderer via startApp.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'renderer_runtime_fully_ready', timestamp: 1748104750259}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748104750312}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748104750312}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748104750313}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748104750314}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748104750314}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748104750317}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748104750317}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748104750318}
VM1028 renderer_init:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
  Policy set or a policy with "unsafe-eval" enabled. This exposes users of
  this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ VM1028 renderer_init:2
logSecurityWarnings @ VM1028 renderer_init:2
(anonymous) @ VM1028 renderer_init:2
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_success', label: 'Network: MAINNET', value: 'success', timestamp: 1748104750890}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748104750892}
SparkServiceImpl.ts:163 [SparkService Finalizer] Wallet connections cleaned up successfully for network: MAINNET.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:dispose', action: 'wallet_cleanup_success', label: 'Network: MAINNET', timestamp: 1748104750895}
runtime.ts:279 Effect runtime reinitialized successfully with user wallet.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104750896}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748104751329}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748104751330}
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 494 sats', value: 'Token count: 0', timestamp: 1748104751382}
walletStore.ts:185 WalletStore: Services initialized.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 494', timestamp: 1748104751624}
HomePage.tsx:195 Keyboard: Toggle Wallet Pane
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104751877}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_wallet_pane', timestamp: 1748104751878}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_wallet_pane', timestamp: 1748104751879}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 494 sats', value: 'Token count: 0', timestamp: 1748104752165}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104757168}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 494 sats', value: 'Token count: 0', timestamp: 1748104757443}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1748104757924}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1748104757926}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_start', label: 'User message sent', value: 'hello world', timestamp: 1748104760589}
useAgentChat.ts:121 [useAgentChat] Created new AbortController for message: assistant-1748104760590
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'chat_orchestrator_resolved_successfully', label: 'Orchestrator resolved for provider: nip90_devstral', value: 'assistant-1748104760590', timestamp: 1748104760591}
useAgentChat.ts:168 [useAgentChat] Orchestrator: Starting stream via provider: nip90_devstral for message: assistant-1748104760590 Current signal state: {aborted: false, controller: 'present'}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'stream_conversation_start', label: 'nip90_devstral', timestamp: 1748104760592}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start', label: 'nip90_devstral', value: 'devstral', timestamp: 1748104760606}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start_nip90', label: 'nip90_devstral', timestamp: 1748104760607}
ChatOrchestratorService.ts:94 [ChatOrchestratorService] Building NIP90 provider with config: {modelName: 'devstral', isEnabled: true, dvmPubkey: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', dvmRelays: Array(3), requestKind: 5050, …}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_success_nip90', label: 'nip90_devstral', timestamp: 1748104760612}
ChatOrchestratorService.ts:119 [ChatOrchestratorService] Successfully built NIP90 provider for nip90_devstral
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'requester_pubkey_stream', label: 'b8d4d3333bd01d5779515c13bf8600311583474f7c12b836c93e419cc4e56d22', value: 'Ephemeral key', timestamp: 1748104760616}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_create_job_request', label: 'Creating job request of kind: 5050', timestamp: 1748104760616}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_pool_initialize', label: '[Nostr] Pool initialized with relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748104760629}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: 'd09116bc050aa4ea0689b2ffe0224ee5813d0d592cc347d984605886cdbda0c6', timestamp: 1748104760629}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event d09116bc050aa…813d0d592cc347d984605886cdbda0c6 to all 3 relays.', timestamp: 1748104761366}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_job_request_published', label: 'Published job request with ID: d09116bc050aa4ea0689b2ffe0224ee5813d0d592cc347d984605886cdbda0c6', value: 'Kind: 5050', timestamp: 1748104761367}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_subscribe_job_updates', label: 'Subscribing to updates for job request: d09116bc05…a0689b2ffe0224ee5813d0d592cc347d984605886cdbda0c6', timestamp: 1748104761367}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'subscription_relays', label: 'Using 3 DVM relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748104761367}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'filters_created', label: 'd09116bc050aa4ea0689b2ffe0224ee5813d0d592cc347d984605886cdbda0c6', value: 'Result: {"kinds":[6000,6001,6002,6003,6004,6005,60…d6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827"]}', timestamp: 1748104761367}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[6000,6001,6002,6003,6004,6005,…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748104761368}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[7000],"#e":["d09116bc050aa4ea0…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748104761368}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created 2 subscriptions', value: '{"filters":[{"kinds":[6000,6001,6002,6003,6004,600…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748104761368}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'subscription_created_successfully', label: 'd09116bc050aa4ea0689b2ffe0224ee5813d0d592cc347d984605886cdbda0c6', value: 'Subscribed to 3 relays for result + feedback events', timestamp: 1748104761368}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104762445}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 494 sats', value: 'Token count: 0', timestamp: 1748104762734}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'event_received', label: 'fd8c613b3840af82efe0c6a2a8f2fb73169ddc11d821e5221c36ed6583c102c8', value: 'Kind: 7000 | Job: d09116bc050aa4ea0689b2ffe0224ee5…38ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', timestamp: 1748104763834}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'kind_7000_feedback_received', label: 'fd8c613b3840af82efe0c6a2a8f2fb73169ddc11d821e5221c36ed6583c102c8', value: 'Content: ... | Tags: [["e","d09116bc050aa4ea0689b2…l7srustctnfm6szlrx9zrr2gqrlhp3z3j53tv6qqaav70l"]]', timestamp: 1748104763835}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'payment_required', label: 'd09116bc050aa4ea0689b2ffe0224ee5813d0d592cc347d984605886cdbda0c6', value: '3 sats', timestamp: 1748104763835}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'auto_payment_triggered', label: 'd09116bc050aa4ea0689b2ffe0224ee5813d0d592cc347d984605886cdbda0c6', value: '3 sats', timestamp: 1748104763835}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'pay_invoice_start', label: 'Invoice: lnbc30n1p5rra36pp5n2...', value: '{"maxFeeSats":10,"timeoutSeconds":60}', timestamp: 1748104763836}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104767737}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 488 sats', value: 'Token count: 0', timestamp: 1748104768018}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104773020}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 494 sats', value: 'Token count: 0', timestamp: 1748104773313}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'pay_invoice_success', label: 'Payment status: PENDING', value: 'Amount: 0, Fee: 0', timestamp: 1748104775840}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'payment_success', label: 'd09116bc050aa4ea0689b2ffe0224ee5813d0d592cc347d984605886cdbda0c6', value: '9aa1a7b2127f2a5fc4d0c1e5c2c6baa29bdb590f6f1c009c9c657d22bc773859', timestamp: 1748104775843}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"Auto-paid 3 sats. Payment hash: 9aa1a7b2127f... Waiting for DVM to process...","annotations":[],"_tag":"TextPart"},{"usage":{"inputTokens":0,"outputTokens":77,"totalTokens":77,"reasoningTokens":0,"cacheReadInputTokens":0,"cacheWriteInputTokens":0},"reason":"unknown","providerMetadata":{},"_tag":"FinishPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1748104760590 Chunk length: 77
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104778315}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 491 sats', value: 'Token count: 0', timestamp: 1748104778598}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104783599}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 491 sats', value: 'Token count: 0', timestamp: 1748104783884}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104788886}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 491 sats', value: 'Token count: 0', timestamp: 1748104789172}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104794175}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 491 sats', value: 'Token count: 0', timestamp: 1748104794477}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104799479}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 491 sats', value: 'Token count: 0', timestamp: 1748104799774}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104804776}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 491 sats', value: 'Token count: 0', timestamp: 1748104805067}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104810069}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 491 sats', value: 'Token count: 0', timestamp: 1748104810357}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104815359}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 491 sats', value: 'Token count: 0', timestamp: 1748104815644}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104820646}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 491 sats', value: 'Token count: 0', timestamp: 1748104820944}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748104825946}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 491 sats', value: 'Token count: 0', timestamp: 1748104826239}
