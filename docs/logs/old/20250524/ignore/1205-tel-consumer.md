OllamaAgentLanguageModelLive.ts:17 Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)
NIP90AgentLanguageModelLive.ts:22 Loading NIP90AgentLanguageModelLive module
runtime.ts:130 [Runtime] Building SparkService layer with MOCK implementation (no wallet initialized)
walletStore.ts:200 Rehydrating wallet store, found existing seed phrase. Initializing services...
walletStore.ts:167 WalletStore: Initializing services with mnemonic starting with: pyram...
runtime.ts:264 Reinitializing Effect runtime with updated wallet configuration...
runtime.ts:112 [Runtime] Building SparkService layer with USER mnemonic: pyramid go...
runtime.ts:234 Creating a production-ready Effect runtime for renderer...
SparkServiceImpl.ts:52 [SparkService] Initializing wallet for network: MAINNET
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_start', label: 'Network: MAINNET', value: '2', timestamp: 1748106203698}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748106203755}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748106203756}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748106203758}
runtime.ts:238 Production-ready Effect runtime for renderer created successfully.
renderer.ts:13 Main Effect runtime has been initialized in renderer via startApp.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'renderer_runtime_fully_ready', timestamp: 1748106203766}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748106203837}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748106203837}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748106203838}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748106203839}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748106203840}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748106203842}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748106203843}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748106203843}
VM8166 renderer_init:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
  Policy set or a policy with "unsafe-eval" enabled. This exposes users of
  this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ VM8166 renderer_init:2
logSecurityWarnings @ VM8166 renderer_init:2
(anonymous) @ VM8166 renderer_init:2
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_success', label: 'Network: MAINNET', value: 'success', timestamp: 1748106204626}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748106204629}
SparkServiceImpl.ts:163 [SparkService Finalizer] Wallet connections cleaned up successfully for network: MAINNET.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:dispose', action: 'wallet_cleanup_success', label: 'Network: MAINNET', timestamp: 1748106204631}
runtime.ts:279 Effect runtime reinitialized successfully with user wallet.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106204632}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748106204853}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748106204854}
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 488 sats', value: 'Token count: 0', timestamp: 1748106205110}
walletStore.ts:185 WalletStore: Services initialized.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 488', timestamp: 1748106205166}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1748106205871}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1748106205872}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106210113}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 488 sats', value: 'Token count: 0', timestamp: 1748106210399}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_start', label: 'User message sent', value: 'hello give me rust work now', timestamp: 1748106214651}
useAgentChat.ts:121 [useAgentChat] Created new AbortController for message: assistant-1748106214652
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'chat_orchestrator_resolved_successfully', label: 'Orchestrator resolved for provider: nip90_devstral', value: 'assistant-1748106214652', timestamp: 1748106214653}
useAgentChat.ts:168 [useAgentChat] Orchestrator: Starting stream via provider: nip90_devstral for message: assistant-1748106214652 Current signal state: {aborted: false, controller: 'present'}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'stream_conversation_start', label: 'nip90_devstral', timestamp: 1748106214654}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start', label: 'nip90_devstral', value: 'devstral', timestamp: 1748106214664}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start_nip90', label: 'nip90_devstral', timestamp: 1748106214664}
ChatOrchestratorService.ts:94 [ChatOrchestratorService] Building NIP90 provider with config: {modelName: 'devstral', isEnabled: true, dvmPubkey: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', dvmRelays: Array(3), requestKind: 5050, …}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_success_nip90', label: 'nip90_devstral', timestamp: 1748106214668}
ChatOrchestratorService.ts:119 [ChatOrchestratorService] Successfully built NIP90 provider for nip90_devstral
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'requester_pubkey_stream', label: 'b57bb671597818bf18408f2e17a9fe16a86ad368edf4f041644925a3c2b49702', value: 'Ephemeral key', timestamp: 1748106214671}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_create_job_request', label: 'Creating job request of kind: 5050', timestamp: 1748106214671}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_pool_initialize', label: '[Nostr] Pool initialized with relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748106214680}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d', timestamp: 1748106214681}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106215401}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event 8d9787dda8c48…743c0903108fa6b46879b786bd14e43d to all 3 relays.', timestamp: 1748106215418}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_job_request_published', label: 'Published job request with ID: 8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d', value: 'Kind: 5050', timestamp: 1748106215418}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_subscribe_job_updates', label: 'Subscribing to updates for job request: 8d9787dda8…afe26750e6faf57c9743c0903108fa6b46879b786bd14e43d', timestamp: 1748106215419}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'subscription_relays', label: 'Using 3 DVM relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748106215419}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'filters_created', label: '8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d', value: 'Result: {"kinds":[6000,6001,6002,6003,6004,6005,60…d6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827"]}', timestamp: 1748106215419}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[6000,6001,6002,6003,6004,6005,…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748106215420}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[7000],"#e":["8d9787dda8c481eaf…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748106215420}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created 2 subscriptions', value: '{"filters":[{"kinds":[6000,6001,6002,6003,6004,600…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748106215420}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'subscription_created_successfully', label: '8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d', value: 'Subscribed to 3 relays for result + feedback events', timestamp: 1748106215420}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 488 sats', value: 'Token count: 0', timestamp: 1748106216132}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'event_received', label: '6f4edf5274fabd71aaa368b6438fad601e2f536ce1fe34f54675c78b949dd580', value: 'Kind: 7000 | Job: 8d9787dda8c481eafe26750e6faf57c9…38ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', timestamp: 1748106216478}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'kind_7000_feedback_received', label: '6f4edf5274fabd71aaa368b6438fad601e2f536ce1fe34f54675c78b949dd580', value: 'Content: ... | Tags: [["e","8d9787dda8c481eafe2675…ajzmx9ks7gnncapp3s03n7zmqz7jwrx5yqq6ycsp0qcjtk"]]', timestamp: 1748106216478}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'payment_required', label: '8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d', value: '3 sats', timestamp: 1748106216479}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'auto_payment_triggered', label: '8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d', value: '3 sats', timestamp: 1748106216479}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'pay_invoice_start', label: 'Invoice: lnbc30n1p5rr7l8pp5sr...', value: '{"maxFeeSats":10,"timeoutSeconds":60}', timestamp: 1748106216479}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106221134}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 480 sats', value: 'Token count: 0', timestamp: 1748106221415}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'event_received', label: '7866ca0d035f511ff6e19216110842e441881e8f3cdcff86b16e2af4f62ceac7', value: 'Kind: 7000 | Job: 8d9787dda8c481eafe26750e6faf57c9…38ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', timestamp: 1748106224599}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'kind_7000_feedback_received', label: '7866ca0d035f511ff6e19216110842e441881e8f3cdcff86b16e2af4f62ceac7', value: 'Content: ... | Tags: [["e","8d9787dda8c481eafe2675…atus","processing","Processing your request..."]]', timestamp: 1748106224600}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'event_received', label: '858c1d2bc8ce618e23e7fcdc836e7e310e9c147fa597bb5b728a650505e4f45e', value: 'Kind: 6050 | Job: 8d9787dda8c481eafe26750e6faf57c9…38ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', timestamp: 1748106224908}
NIP90ServiceImpl.ts:865 Error processing subscription event: (FiberFailure) AsyncFiberException: Fiber #240 cannot be resolved synchronously. This is caused by using runSync on an effect that performs async work
overrideMethod @ hook.js:608
(anonymous) @ NIP90ServiceImpl.ts:865
onevent @ NostrServiceImpl.ts:478
handleNext @ nostr-tools.js?v=ad354b67:2248
runQueue @ nostr-tools.js?v=ad354b67:2215
_onmessage @ nostr-tools.js?v=ad354b67:2378
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"Okay. I can help with that. Please tell me what you’d like to work on!","annotations":[],"_tag":"TextPart"},{"usage":{"inputTokens":0,"outputTokens":70,"totalTokens":70,"reasoningTokens":0,"cacheReadInputTokens":0,"cacheWriteInputTokens":0},"reason":"unknown","providerMetadata":{},"_tag":"FinishPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1748106214652 Chunk length: 70
useAgentChat.ts:265 [useAgentChat] Ensuring block entered. {messageId: 'assistant-1748106214652', abortController: 'present', signalAborted: false, isLoading: false}
useAgentChat.ts:281 [useAgentChat] Clearing abort controller for message: assistant-1748106214652
useAgentChat.ts:285 [useAgentChat] Clearing current assistant message ID: assistant-1748106214652
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106226422}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 485 sats', value: 'Token count: 0', timestamp: 1748106226774}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'pay_invoice_success', label: 'Payment status: PENDING', value: 'Amount: 0, Fee: 0', timestamp: 1748106226968}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'payment_success', label: '8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d', value: '80eb732781b9797378bebe9d93e15d61c244e130250f10e5957d4d6a66d824ae', timestamp: 1748106226971}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106231776}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 485 sats', value: 'Token count: 0', timestamp: 1748106232375}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106237385}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 485 sats', value: 'Token count: 0', timestamp: 1748106237952}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_start', label: 'User message sent', value: 'first of all tell me what model you are. what lab ', timestamp: 1748106241187}
useAgentChat.ts:121 [useAgentChat] Created new AbortController for message: assistant-1748106241187
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'chat_orchestrator_resolved_successfully', label: 'Orchestrator resolved for provider: nip90_devstral', value: 'assistant-1748106241187', timestamp: 1748106241188}
useAgentChat.ts:168 [useAgentChat] Orchestrator: Starting stream via provider: nip90_devstral for message: assistant-1748106241187 Current signal state: {aborted: false, controller: 'present'}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'stream_conversation_start', label: 'nip90_devstral', timestamp: 1748106241190}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start', label: 'nip90_devstral', value: 'devstral', timestamp: 1748106241200}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start_nip90', label: 'nip90_devstral', timestamp: 1748106241200}
ChatOrchestratorService.ts:94 [ChatOrchestratorService] Building NIP90 provider with config: {modelName: 'devstral', isEnabled: true, dvmPubkey: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', dvmRelays: Array(3), requestKind: 5050, …}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_success_nip90', label: 'nip90_devstral', timestamp: 1748106241207}
ChatOrchestratorService.ts:119 [ChatOrchestratorService] Successfully built NIP90 provider for nip90_devstral
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'requester_pubkey_stream', label: '551861b5a8a06c73f69dd01cc00ba4a60fef4de21020beaaf0d182400e399b74', value: 'Ephemeral key', timestamp: 1748106241209}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_create_job_request', label: 'Creating job request of kind: 5050', timestamp: 1748106241209}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38', timestamp: 1748106241218}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event 6ee59a154531c…a2e717a92c404ec1f95d25e8b4d76a38 to all 3 relays.', timestamp: 1748106241463}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_job_request_published', label: 'Published job request with ID: 6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38', value: 'Kind: 5050', timestamp: 1748106241464}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_subscribe_job_updates', label: 'Subscribing to updates for job request: 6ee59a1545…823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38', timestamp: 1748106241464}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'subscription_relays', label: 'Using 3 DVM relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748106241464}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'filters_created', label: '6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38', value: 'Result: {"kinds":[6000,6001,6002,6003,6004,6005,60…d6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827"]}', timestamp: 1748106241464}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[6000,6001,6002,6003,6004,6005,…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748106241464}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[7000],"#e":["6ee59a154531ccd82…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748106241465}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created 2 subscriptions', value: '{"filters":[{"kinds":[6000,6001,6002,6003,6004,600…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748106241465}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'subscription_created_successfully', label: '6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38', value: 'Subscribed to 3 relays for result + feedback events', timestamp: 1748106241465}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106242954}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'event_received', label: '895c47e13918322a0816ea9312a97c4ee8597e9921fe0e534a8a35be1cbe5930', value: 'Kind: 7000 | Job: 6ee59a154531ccd823801c347873add1…38ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', timestamp: 1748106243005}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'kind_7000_feedback_received', label: '895c47e13918322a0816ea9312a97c4ee8597e9921fe0e534a8a35be1cbe5930', value: 'Content: ... | Tags: [["e","6ee59a154531ccd823801c…vdhfxast28cxyhd3x20sq3et6anq7uszyhyukngq3um7hl"]]', timestamp: 1748106243006}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'payment_required', label: '6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38', value: '3 sats', timestamp: 1748106243006}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'auto_payment_triggered', label: '6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38', value: '3 sats', timestamp: 1748106243006}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'pay_invoice_start', label: 'Invoice: lnbc30n1p5rrlqzpp5ej...', value: '{"maxFeeSats":10,"timeoutSeconds":60}', timestamp: 1748106243006}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 485 sats', value: 'Token count: 0', timestamp: 1748106243439}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106248441}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 480 sats', value: 'Token count: 0', timestamp: 1748106248788}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'pay_invoice_success', label: 'Payment status: PENDING', value: 'Amount: 0, Fee: 0', timestamp: 1748106251153}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'payment_success', label: '6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38', value: 'cca8d86bcaa445fadb2f7a32068dc48bb81043074ca6c7699b1203799399b060', timestamp: 1748106251155}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"Auto-paid 3 sats. Payment hash: cca8d86bcaa4... Waiting for DVM to process...","annotations":[],"_tag":"TextPart"},{"usage":{"inputTokens":0,"outputTokens":77,"totalTokens":77,"reasoningTokens":0,"cacheReadInputTokens":0,"cacheWriteInputTokens":0},"reason":"unknown","providerMetadata":{},"_tag":"FinishPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1748106241187 Chunk length: 77
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'event_received', label: 'c5fc3a686bf011556694c962f1e8feb28c384d1545a6d7877c0bcf6dddb71816', value: 'Kind: 7000 | Job: 6ee59a154531ccd823801c347873add1…38ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', timestamp: 1748106251162}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'kind_7000_feedback_received', label: 'c5fc3a686bf011556694c962f1e8feb28c384d1545a6d7877c0bcf6dddb71816', value: 'Content: ... | Tags: [["e","6ee59a154531ccd823801c…atus","processing","Processing your request..."]]', timestamp: 1748106251162}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'event_received', label: '21575a16c231d1ed760015cf32379d3df93cf41d9bb3f15c1b2c74e0b8b8f443', value: 'Kind: 6050 | Job: 6ee59a154531ccd823801c347873add1…38ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', timestamp: 1748106251524}
NIP90ServiceImpl.ts:865 Error processing subscription event: (FiberFailure) AsyncFiberException: Fiber #268 cannot be resolved synchronously. This is caused by using runSync on an effect that performs async work
overrideMethod @ hook.js:608
(anonymous) @ NIP90ServiceImpl.ts:865
onevent @ NostrServiceImpl.ts:478
handleNext @ nostr-tools.js?v=ad354b67:2248
runQueue @ nostr-tools.js?v=ad354b67:2215
_onmessage @ nostr-tools.js?v=ad354b67:2378
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"I am Gemma, a large language model created by the Gemma team at Google DeepMind. I was trained on a massive dataset of text and code.","annotations":[],"_tag":"TextPart"},{"usage":{"inputTokens":0,"outputTokens":133,"totalTokens":133,"reasoningTokens":0,"cacheReadInputTokens":0,"cacheWriteInputTokens":0},"reason":"unknown","providerMetadata":{},"_tag":"FinishPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1748106241187 Chunk length: 133
useAgentChat.ts:265 [useAgentChat] Ensuring block entered. {messageId: 'assistant-1748106241187', abortController: 'present', signalAborted: false, isLoading: false}
useAgentChat.ts:281 [useAgentChat] Clearing abort controller for message: assistant-1748106241187
useAgentChat.ts:285 [useAgentChat] Clearing current assistant message ID: assistant-1748106241187
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106253795}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 482 sats', value: 'Token count: 0', timestamp: 1748106254395}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106259398}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 482 sats', value: 'Token count: 0', timestamp: 1748106259909}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106264915}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 482 sats', value: 'Token count: 0', timestamp: 1748106265405}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_start', label: 'User message sent', value: 'who are you', timestamp: 1748106268834}
useAgentChat.ts:121 [useAgentChat] Created new AbortController for message: assistant-1748106268835
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'chat_orchestrator_resolved_successfully', label: 'Orchestrator resolved for provider: nip90_devstral', value: 'assistant-1748106268835', timestamp: 1748106268836}
useAgentChat.ts:168 [useAgentChat] Orchestrator: Starting stream via provider: nip90_devstral for message: assistant-1748106268835 Current signal state: {aborted: false, controller: 'present'}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'stream_conversation_start', label: 'nip90_devstral', timestamp: 1748106268837}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start', label: 'nip90_devstral', value: 'devstral', timestamp: 1748106268849}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start_nip90', label: 'nip90_devstral', timestamp: 1748106268850}
ChatOrchestratorService.ts:94 [ChatOrchestratorService] Building NIP90 provider with config: {modelName: 'devstral', isEnabled: true, dvmPubkey: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', dvmRelays: Array(3), requestKind: 5050, …}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_success_nip90', label: 'nip90_devstral', timestamp: 1748106268856}
ChatOrchestratorService.ts:119 [ChatOrchestratorService] Successfully built NIP90 provider for nip90_devstral
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'requester_pubkey_stream', label: 'ea9c4df26121a9c2bebd4dec4b87523e44f87bf4d4b4d06dd21b081abeba15ea', value: 'Ephemeral key', timestamp: 1748106268858}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_create_job_request', label: 'Creating job request of kind: 5050', timestamp: 1748106268858}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: 'a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423a77c9c2cc4c44cb305a', timestamp: 1748106268868}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event a4c3653e0a288…fd54f4ca2c423a77c9c2cc4c44cb305a to all 3 relays.', timestamp: 1748106269075}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_job_request_published', label: 'Published job request with ID: a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423a77c9c2cc4c44cb305a', value: 'Kind: 5050', timestamp: 1748106269076}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_subscribe_job_updates', label: 'Subscribing to updates for job request: a4c3653e0a…1fecc68f378a208dffd54f4ca2c423a77c9c2cc4c44cb305a', timestamp: 1748106269076}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'subscription_relays', label: 'Using 3 DVM relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748106269076}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'filters_created', label: 'a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423a77c9c2cc4c44cb305a', value: 'Result: {"kinds":[6000,6001,6002,6003,6004,6005,60…d6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827"]}', timestamp: 1748106269076}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[6000,6001,6002,6003,6004,6005,…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748106269077}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[7000],"#e":["a4c3653e0a288ad1f…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748106269077}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created 2 subscriptions', value: '{"filters":[{"kinds":[6000,6001,6002,6003,6004,600…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748106269077}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'subscription_created_successfully', label: 'a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423a77c9c2cc4c44cb305a', value: 'Subscribed to 3 relays for result + feedback events', timestamp: 1748106269077}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106270408}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'event_received', label: 'b93c2b23c482a3c4e765f4599c13b552ccfe6ad0ba327e9d28024556f89d373b', value: 'Kind: 7000 | Job: a4c3653e0a288ad1fecc68f378a208df…38ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', timestamp: 1748106270436}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'kind_7000_feedback_received', label: 'b93c2b23c482a3c4e765f4599c13b552ccfe6ad0ba327e9d28024556f89d373b', value: 'Content: ... | Tags: [["e","a4c3653e0a288ad1fecc68…pw6nd4rthznwm4m5df43rkum86snzk0wwu5teygq4pwl9m"]]', timestamp: 1748106270437}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'payment_required', label: 'a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423a77c9c2cc4c44cb305a', value: '3 sats', timestamp: 1748106270438}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'auto_payment_triggered', label: 'a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423a77c9c2cc4c44cb305a', value: '3 sats', timestamp: 1748106270438}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'pay_invoice_start', label: 'Invoice: lnbc30n1p5rrlqapp55k...', value: '{"maxFeeSats":10,"timeoutSeconds":60}', timestamp: 1748106270438}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 482 sats', value: 'Token count: 0', timestamp: 1748106270936}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106275938}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 448 sats', value: 'Token count: 0', timestamp: 1748106276246}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'event_received', label: '0e68687d75cd124fffe3df0191becb1cd72ff659ee5a75ea422f95766908922d', value: 'Kind: 7000 | Job: a4c3653e0a288ad1fecc68f378a208df…38ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', timestamp: 1748106278794}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'kind_7000_feedback_received', label: '0e68687d75cd124fffe3df0191becb1cd72ff659ee5a75ea422f95766908922d', value: 'Content: ... | Tags: [["e","a4c3653e0a288ad1fecc68…atus","processing","Processing your request..."]]', timestamp: 1748106278795}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'event_received', label: '015310c7c26ef6e2a6debcbc3d420bc0323f75a0a0260629f304c87c37c6cff3', value: 'Kind: 6050 | Job: a4c3653e0a288ad1fecc68f378a208df…38ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', timestamp: 1748106279187}
NIP90ServiceImpl.ts:865 Error processing subscription event: (FiberFailure) AsyncFiberException: Fiber #292 cannot be resolved synchronously. This is caused by using runSync on an effect that performs async work
overrideMethod @ hook.js:608
(anonymous) @ NIP90ServiceImpl.ts:865
onevent @ NostrServiceImpl.ts:478
handleNext @ nostr-tools.js?v=ad354b67:2248
runQueue @ nostr-tools.js?v=ad354b67:2215
_onmessage @ nostr-tools.js?v=ad354b67:2378
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"Assistant: I am Gemma, a large language model created by Google DeepMind.","annotations":[],"_tag":"TextPart"},{"usage":{"inputTokens":0,"outputTokens":73,"totalTokens":73,"reasoningTokens":0,"cacheReadInputTokens":0,"cacheWriteInputTokens":0},"reason":"unknown","providerMetadata":{},"_tag":"FinishPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1748106268835 Chunk length: 73
useAgentChat.ts:265 [useAgentChat] Ensuring block entered. {messageId: 'assistant-1748106268835', abortController: 'present', signalAborted: false, isLoading: false}
useAgentChat.ts:281 [useAgentChat] Clearing abort controller for message: assistant-1748106268835
useAgentChat.ts:285 [useAgentChat] Clearing current assistant message ID: assistant-1748106268835
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'pay_invoice_success', label: 'Payment status: PENDING', value: 'Amount: 0, Fee: 0', timestamp: 1748106280616}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'payment_success', label: 'a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423a77c9c2cc4c44cb305a', value: 'a586181f3915b78a5a8a7f9cd1f4725c5770c0834bba252198b1c615c735d5bc', timestamp: 1748106280618}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106281252}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 479 sats', value: 'Token count: 0', timestamp: 1748106281562}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106286568}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 479 sats', value: 'Token count: 0', timestamp: 1748106287100}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106292107}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 479 sats', value: 'Token count: 0', timestamp: 1748106292667}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106297673}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 479 sats', value: 'Token count: 0', timestamp: 1748106298218}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106303225}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 479 sats', value: 'Token count: 0', timestamp: 1748106303763}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106308767}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 479 sats', value: 'Token count: 0', timestamp: 1748106309309}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106314319}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 479 sats', value: 'Token count: 0', timestamp: 1748106314921}
