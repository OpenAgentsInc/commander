OllamaAgentLanguageModelLive.ts:17 Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)
NIP90AgentLanguageModelLive.ts:20 Loading NIP90AgentLanguageModelLive module
runtime.ts:126 [Runtime] Building SparkService layer with MOCK implementation (no wallet initialized)
walletStore.ts:200 Rehydrating wallet store, found existing seed phrase. Initializing services...
walletStore.ts:167 WalletStore: Initializing services with mnemonic starting with: pyram...
runtime.ts:259 Reinitializing Effect runtime with updated wallet configuration...
runtime.ts:108 [Runtime] Building SparkService layer with USER mnemonic: pyramid go...
runtime.ts:229 Creating a production-ready Effect runtime for renderer...
SparkServiceImpl.ts:52 [SparkService] Initializing wallet for network: MAINNET
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_start', label: 'Network: MAINNET', value: '2', timestamp: 1748017833611}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748017833655}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748017833656}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748017833657}
runtime.ts:233 Production-ready Effect runtime for renderer created successfully.
renderer.ts:13 Main Effect runtime has been initialized in renderer via startApp.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'renderer_runtime_fully_ready', timestamp: 1748017833662}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748017833716}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748017833717}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748017833717}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748017833718}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748017833719}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748017833721}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748017833721}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748017833721}
VM659 renderer_init:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
  Policy set or a policy with "unsafe-eval" enabled. This exposes users of
  this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ VM659 renderer_init:2
logSecurityWarnings @ VM659 renderer_init:2
(anonymous) @ VM659 renderer_init:2
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_success', label: 'Network: MAINNET', value: 'success', timestamp: 1748017834303}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748017834304}
SparkServiceImpl.ts:163 [SparkService Finalizer] Wallet connections cleaned up successfully for network: MAINNET.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:dispose', action: 'wallet_cleanup_success', label: 'Network: MAINNET', timestamp: 1748017834308}
runtime.ts:274 Effect runtime reinitialized successfully with user wallet.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748017834309}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748017834732}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748017834733}
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 500 sats', value: 'Token count: 0', timestamp: 1748017834776}
walletStore.ts:185 WalletStore: Services initialized.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 500', timestamp: 1748017835009}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748017835778}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 500 sats', value: 'Token count: 0', timestamp: 1748017836066}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748017837069}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 500 sats', value: 'Token count: 0', timestamp: 1748017837354}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1748017837973}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1748017837975}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748017838357}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 500 sats', value: 'Token count: 0', timestamp: 1748017838655}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748017839658}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 500 sats', value: 'Token count: 0', timestamp: 1748017839944}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_start', label: 'User message sent', value: 'Test', timestamp: 1748017840027}
useAgentChat.ts:121 [useAgentChat] Created new AbortController for message: assistant-1748017840028
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'chat_orchestrator_resolved_successfully', label: 'Orchestrator resolved for provider: nip90_devstral', value: 'assistant-1748017840028', timestamp: 1748017840028}
useAgentChat.ts:168 [useAgentChat] Orchestrator: Starting stream via provider: nip90_devstral for message: assistant-1748017840028 Current signal state: {aborted: false, controller: 'present'}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'stream_conversation_start', label: 'nip90_devstral', timestamp: 1748017840029}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start', label: 'nip90_devstral', value: 'devstral', timestamp: 1748017840042}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start_nip90', label: 'nip90_devstral', timestamp: 1748017840043}
ChatOrchestratorService.ts:92 [ChatOrchestratorService] Building NIP90 provider with config: {modelName: 'devstral', isEnabled: true, dvmPubkey: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', dvmRelays: Array(2), requestKind: 5050, …}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_success_nip90', label: 'nip90_devstral', timestamp: 1748017840047}
ChatOrchestratorService.ts:116 [ChatOrchestratorService] Successfully built NIP90 provider for nip90_devstral
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'requester_pubkey_stream', label: 'fa129e1fdee0f562ee33c3421279bd994363d755494c31c4587abf7d298271c7', value: 'Ephemeral key', timestamp: 1748017840050}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_create_job_request', label: 'Creating job request of kind: 5050', timestamp: 1748017840051}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_pool_initialize', label: '[Nostr] Pool initialized with relays', value: '["wss://nos.lol/","wss://relay.damus.io/","wss://relay.snort.social/"]', timestamp: 1748017840062}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: 'a19fa3b1f5205391a405a6244e923d1431527dd705f536b99088b73709bf1d65', timestamp: 1748017840063}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748017840946}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 500 sats', value: 'Token count: 0', timestamp: 1748017841229}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:warn', action: 'nostr_publish_partial_failure', label: '[Nostr] Partially published event a19fa3b1f5205391…705f536b99088b73709bf1d65: 1 succeeded, 2 failed.', value: 'Failures: Error: pow: 28 bits needed. (2), Error: no active subscription', timestamp: 1748017841305}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_job_request_published', label: 'Published job request with ID: a19fa3b1f5205391a405a6244e923d1431527dd705f536b99088b73709bf1d65', value: 'Kind: 5050', timestamp: 1748017841305}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_subscribe_job_updates', label: 'Subscribing to updates for job request: a19fa3b1f5…1a405a6244e923d1431527dd705f536b99088b73709bf1d65', timestamp: 1748017841306}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created subscription', value: '{"filters":[{"kinds":[6000,6001,6002,6003,6004,600…://relay.damus.io/","wss://relay.snort.social/"]}', timestamp: 1748017841307}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748017842232}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 500 sats', value: 'Token count: 0', timestamp: 1748017842558}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748017843559}
