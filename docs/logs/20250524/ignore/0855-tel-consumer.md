OllamaAgentLanguageModelLive.ts:17 Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)
NIP90AgentLanguageModelLive.ts:22 Loading NIP90AgentLanguageModelLive module
runtime.ts:130 [Runtime] Building SparkService layer with MOCK implementation (no wallet initialized)
walletStore.ts:200 Rehydrating wallet store, found existing seed phrase. Initializing services...
walletStore.ts:167 WalletStore: Initializing services with mnemonic starting with: pyram...
runtime.ts:264 Reinitializing Effect runtime with updated wallet configuration...
runtime.ts:112 [Runtime] Building SparkService layer with USER mnemonic: pyramid go...
runtime.ts:234 Creating a production-ready Effect runtime for renderer...
SparkServiceImpl.ts:52 [SparkService] Initializing wallet for network: MAINNET
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_start', label: 'Network: MAINNET', value: '2', timestamp: 1748093996846}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748093996915}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748093996917}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748093996921}
runtime.ts:238 Production-ready Effect runtime for renderer created successfully.
renderer.ts:13 Main Effect runtime has been initialized in renderer via startApp.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'renderer_runtime_fully_ready', timestamp: 1748093996934}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748093997025}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748093997026}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748093997027}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748093997028}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748093997028}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748093997038}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748093997038}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748093997039}
VM2432 renderer_init:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
  Policy set or a policy with "unsafe-eval" enabled. This exposes users of
  this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ VM2432 renderer_init:2
logSecurityWarnings @ VM2432 renderer_init:2
(anonymous) @ VM2432 renderer_init:2
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_success', label: 'Network: MAINNET', value: 'success', timestamp: 1748093998720}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748093998721}
SparkServiceImpl.ts:163 [SparkService Finalizer] Wallet connections cleaned up successfully for network: MAINNET.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:dispose', action: 'wallet_cleanup_success', label: 'Network: MAINNET', timestamp: 1748093998725}
runtime.ts:279 Effect runtime reinitialized successfully with user wallet.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748093998726}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 497 sats', value: 'Token count: 0', timestamp: 1748093999220}
walletStore.ts:185 WalletStore: Services initialized.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094004646}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 497 sats', value: 'Token count: 0', timestamp: 1748094004949}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094010654}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 497 sats', value: 'Token count: 0', timestamp: 1748094010978}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094016661}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 497 sats', value: 'Token count: 0', timestamp: 1748094017148}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094022664}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 497 sats', value: 'Token count: 0', timestamp: 1748094022956}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094028671}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 497 sats', value: 'Token count: 0', timestamp: 1748094028969}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094029617}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 497 sats', value: 'Token count: 0', timestamp: 1748094029938}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094034953}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 497 sats', value: 'Token count: 0', timestamp: 1748094035261}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094040273}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 497 sats', value: 'Token count: 0', timestamp: 1748094040555}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094045564}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 497 sats', value: 'Token count: 0', timestamp: 1748094045848}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094050858}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 497 sats', value: 'Token count: 0', timestamp: 1748094051233}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094056242}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 497 sats', value: 'Token count: 0', timestamp: 1748094056529}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094061537}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 497 sats', value: 'Token count: 0', timestamp: 1748094061885}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094066891}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 497 sats', value: 'Token count: 0', timestamp: 1748094068161}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748094068822}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748094068823}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1748094068824}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1748094068826}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 497', timestamp: 1748094069155}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_start', label: 'User message sent', value: 'hi', timestamp: 1748094072573}
useAgentChat.ts:121 [useAgentChat] Created new AbortController for message: assistant-1748094072573
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'chat_orchestrator_resolved_successfully', label: 'Orchestrator resolved for provider: nip90_devstral', value: 'assistant-1748094072573', timestamp: 1748094072574}
useAgentChat.ts:168 [useAgentChat] Orchestrator: Starting stream via provider: nip90_devstral for message: assistant-1748094072573 Current signal state: {aborted: false, controller: 'present'}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'stream_conversation_start', label: 'nip90_devstral', timestamp: 1748094072575}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start', label: 'nip90_devstral', value: 'devstral', timestamp: 1748094072585}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start_nip90', label: 'nip90_devstral', timestamp: 1748094072585}
ChatOrchestratorService.ts:94 [ChatOrchestratorService] Building NIP90 provider with config: {modelName: 'devstral', isEnabled: true, dvmPubkey: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', dvmRelays: Array(3), requestKind: 5050, …}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_success_nip90', label: 'nip90_devstral', timestamp: 1748094072591}
ChatOrchestratorService.ts:119 [ChatOrchestratorService] Successfully built NIP90 provider for nip90_devstral
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'requester_pubkey_stream', label: '1256f627beb540d793c8b85b2dc9e53d11d1b3becd6769e71d5472cc8439c71d', value: 'Ephemeral key', timestamp: 1748094072596}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_create_job_request', label: 'Creating job request of kind: 5050', timestamp: 1748094072597}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_pool_initialize', label: '[Nostr] Pool initialized with relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748094072612}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '4cb84e9fdf0e0f185c05964a80055f726f7a3e6b828f41bacda4888a67471105', timestamp: 1748094072612}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094073163}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event 4cb84e9fdf0e0…6f7a3e6b828f41bacda4888a67471105 to all 3 relays.', timestamp: 1748094073323}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_job_request_published', label: 'Published job request with ID: 4cb84e9fdf0e0f185c05964a80055f726f7a3e6b828f41bacda4888a67471105', value: 'Kind: 5050', timestamp: 1748094073323}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_subscribe_job_updates', label: 'Subscribing to updates for job request: 4cb84e9fdf…85c05964a80055f726f7a3e6b828f41bacda4888a67471105', timestamp: 1748094073324}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'subscription_relays', label: 'Using 3 DVM relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748094073324}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'filters_created', label: '4cb84e9fdf0e0f185c05964a80055f726f7a3e6b828f41bacda4888a67471105', value: 'Result: {"kinds":[6000,6001,6002,6003,6004,6005,60…d6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827"]}', timestamp: 1748094073324}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[6000,6001,6002,6003,6004,6005,…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748094073325}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[7000],"#e":["4cb84e9fdf0e0f185…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748094073325}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created 2 subscriptions', value: '{"filters":[{"kinds":[6000,6001,6002,6003,6004,600…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748094073325}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'subscription_created_successfully', label: '4cb84e9fdf0e0f185c05964a80055f726f7a3e6b828f41bacda4888a67471105', value: 'Subscribed to 3 relays for result + feedback events', timestamp: 1748094073326}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 497 sats', value: 'Token count: 0', timestamp: 1748094073438}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'event_received', label: '67cd92fe99c12b4d8db17093af5763693dc71eab8aea24f1ee4c23d11e5fe11f', value: 'Kind: 7000 | Job: 4cb84e9fdf0e0f185c05964a80055f72…38ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', timestamp: 1748094076163}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'kind_7000_feedback_received', label: '67cd92fe99c12b4d8db17093af5763693dc71eab8aea24f1ee4c23d11e5fe11f', value: 'Content: ... | Tags: [["e","4cb84e9fdf0e0f185c0596…qrrctd77lfrx6xjtm3h9cluqefm7tgrf25a2lfqqh22lzw"]]', timestamp: 1748094076163}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'payment_required', label: '4cb84e9fdf0e0f185c05964a80055f726f7a3e6b828f41bacda4888a67471105', value: '3 sats', timestamp: 1748094076164}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'auto_payment_triggered', label: '4cb84e9fdf0e0f185c05964a80055f726f7a3e6b828f41bacda4888a67471105', value: '3 sats', timestamp: 1748094076164}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'pay_invoice_start', label: 'Invoice: lnbc30n1p5rrnrmpp5ty...', value: '{"maxFeeSats":10,"timeoutSeconds":60}', timestamp: 1748094076165}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094078440}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 480 sats', value: 'Token count: 0', timestamp: 1748094078724}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094083726}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 480 sats', value: 'Token count: 0', timestamp: 1748094084002}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'pay_invoice_success', label: 'Payment status: PENDING', value: 'Amount: 0, Fee: 0', timestamp: 1748094087570}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'payment_success', label: '4cb84e9fdf0e0f185c05964a80055f726f7a3e6b828f41bacda4888a67471105', value: '593b8bc3ed58ba20df441d158dcde88f8501e5afc5254fef92a7b7c2ae58a7dc', timestamp: 1748094087575}
useAgentChat.ts:182 [useAgentChat runForEach] Processing chunk: {"parts":[{"text":"Auto-paid 3 sats. Payment hash: 593b8bc3ed58... Waiting for DVM to process...","annotations":[],"_tag":"TextPart"},{"usage":{"inputTokens":0,"outputTokens":77,"totalTokens":77,"reasoningTokens":0,"cacheReadInputTokens":0,"cacheWriteInputTokens":0},"reason":"unknown","providerMetadata":{},"_tag":"FinishPart"}]} Abort signal status: false
useAgentChat.ts:211 [useAgentChat] Updated message content for: assistant-1748094072573 Chunk length: 77
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094089004}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 494 sats', value: 'Token count: 0', timestamp: 1748094089304}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094094307}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 494 sats', value: 'Token count: 0', timestamp: 1748094094603}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094099605}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 494 sats', value: 'Token count: 0', timestamp: 1748094099896}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094104900}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 494 sats', value: 'Token count: 0', timestamp: 1748094105185}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094110189}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 494 sats', value: 'Token count: 0', timestamp: 1748094110488}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094115492}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 494 sats', value: 'Token count: 0', timestamp: 1748094115814}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094120816}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 494 sats', value: 'Token count: 0', timestamp: 1748094121098}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094126100}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 494 sats', value: 'Token count: 0', timestamp: 1748094126395}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748094131399}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 494 sats', value: 'Token count: 0', timestamp: 1748094131673}
