OllamaAgentLanguageModelLive.ts:17 Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)
NIP90AgentLanguageModelLive.ts:20 Loading NIP90AgentLanguageModelLive module
walletStore.ts:187 Rehydrating wallet store, found existing seed phrase. Initializing services...
walletStore.ts:161 WalletStore: Initializing services with mnemonic starting with: domai...
runtime.ts:183 Creating a production-ready Effect runtime for renderer...
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_start', label: 'Network: REGTEST', value: '2', timestamp: 1747980311940}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1747980311994}
VM1347 renderer_init:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
  Policy set or a policy with "unsafe-eval" enabled. This exposes users of
  this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ VM1347 renderer_init:2
logSecurityWarnings @ VM1347 renderer_init:2
(anonymous) @ VM1347 renderer_init:2
walletStore.ts:172 WalletStore: Services initialized.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_success', label: 'Network: REGTEST', value: 'success', timestamp: 1747980312692}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1747980312695}
SparkServiceImpl.ts:156 [SparkService Finalizer] Wallet connections cleaned up successfully for network: REGTEST.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:dispose', action: 'wallet_cleanup_success', label: 'Network: REGTEST', timestamp: 1747980312699}
runtime.ts:187 Production-ready Effect runtime for renderer created successfully.
renderer.ts:13 Main Effect runtime has been initialized in renderer via startApp.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'renderer_runtime_fully_ready', timestamp: 1747980312699}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1747980312752}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1747980312752}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747980312754}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1747980312756}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1747980312757}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1747980313251}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747980313267}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1747980313268}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'start_listening_attempt', label: '74601f385c819159754da72f85c553142116f67c6c3684d2f0abcec55b4d3c5e', value: 'Relays: 3', timestamp: 1747980316138}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', timestamp: 1747980316141}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:history', action: 'get_job_history_start', label: 'Page: 1, DVM PK: 74601f38...', timestamp: 1747980316142}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_fetch_begin', label: '[Nostr] Fetching events with filters', value: '[{"kinds":[6000,6001,6002,6003,6004,6005,6006,6007…f0abcec55b4d3c5e"],"#s":["success"],"limit":500}]', timestamp: 1747980316142}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_pool_initialize', label: '[Nostr] Pool initialized with relays', value: '["wss://purplepag.es/","wss://nos.lol/","wss://rel…/offchain.pub/","wss://nostr-pub.wellorder.net/"]', timestamp: 1747980316142}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created subscription', value: '{"filters":[{"kinds":[5050,5100],"#p":["74601f385c…us.io","wss://relay.nostr.band","wss://nos.lol"]}', timestamp: 1747980316144}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'start_listening_success', label: '74601f385c819159754da72f85c553142116f67c6c3684d2f0abcec55b4d3c5e', value: 'Relays: 3, Kinds: 5050,5100', timestamp: 1747980316145}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'active', timestamp: 1747980316152}
SellComputePane.tsx:168 DVM Service start command successful.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_fetch_success', label: '[Nostr] Fetched 0 events', timestamp: 1747980316915}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:history', action: 'get_job_history_success', value: '0 entries fetched', timestamp: 1747980316916}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_invoices_found', timestamp: 1747980316916}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_eose_received', label: '[Nostr] EOSE received', timestamp: 1747980317211}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'eose_received', label: '', timestamp: 1747980317211}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_dvm_job_history_pane', timestamp: 1747980320309}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_dvm_job_history_pane', timestamp: 1747980320311}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:stats', action: 'get_job_statistics_start', timestamp: 1747980320320}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_fetch_begin', label: '[Nostr] Fetching events with filters', value: '[{"kinds":[6000,6001,6002,6003,6004,6005,6006,6007…42116f67c6c3684d2f0abcec55b4d3c5e"],"limit":500}]', timestamp: 1747980320321}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:history', action: 'get_job_history_start', label: 'Page: 1, DVM PK: 74601f38...', timestamp: 1747980320322}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_fetch_begin', label: '[Nostr] Fetching events with filters', value: '[{"kinds":[6000,6001,6002,6003,6004,6005,6006,6007…2f0abcec55b4d3c5e"],"#s":["success"],"limit":10}]', timestamp: 1747980320322}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_fetch_success', label: '[Nostr] Fetched 0 events', timestamp: 1747980320746}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:stats', action: 'get_job_statistics_success', value: '{"totalJobsProcessed":0,"totalSuccessfulJobs":0,"t…":0,"jobsPendingPayment":0,"modelUsageCounts":{}}', timestamp: 1747980320747}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_dvm_job_history_pane', timestamp: 1747980320750}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_dvm_job_history_pane', timestamp: 1747980320753}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_fetch_success', label: '[Nostr] Fetched 0 events', timestamp: 1747980320762}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:history', action: 'get_job_history_success', value: '0 entries fetched', timestamp: 1747980320762}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_dvm_job_history_pane', timestamp: 1747980320767}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_dvm_job_history_pane', timestamp: 1747980320767}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1747980343269}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_dvm_job_history_pane', timestamp: 1747980343496}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_dvm_job_history_pane', timestamp: 1747980343497}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1747980343513}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'active', timestamp: 1747980343514}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats', value: 'Token count: 0', timestamp: 1747980343532}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1747980343792}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'stop_listening', timestamp: 1747980350972}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_unsub', label: '[Nostr] Unsubscribing from filters', timestamp: 1747980350973}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'stop_listening_success', timestamp: 1747980350974}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1747980350983}
SellComputePane.tsx:168 DVM Service stop command successful.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'start_listening_attempt', label: '74601f385c819159754da72f85c553142116f67c6c3684d2f0abcec55b4d3c5e', value: 'Relays: 3', timestamp: 1747980352612}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', timestamp: 1747980352613}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:history', action: 'get_job_history_start', label: 'Page: 1, DVM PK: 74601f38...', timestamp: 1747980352614}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_fetch_begin', label: '[Nostr] Fetching events with filters', value: '[{"kinds":[6000,6001,6002,6003,6004,6005,6006,6007…f0abcec55b4d3c5e"],"#s":["success"],"limit":500}]', timestamp: 1747980352614}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created subscription', value: '{"filters":[{"kinds":[5050,5100],"#p":["74601f385c…us.io","wss://relay.nostr.band","wss://nos.lol"]}', timestamp: 1747980352616}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'start_listening_success', label: '74601f385c819159754da72f85c553142116f67c6c3684d2f0abcec55b4d3c5e', value: 'Relays: 3, Kinds: 5050,5100', timestamp: 1747980352617}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'active', timestamp: 1747980352627}
SellComputePane.tsx:168 DVM Service start command successful.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_fetch_success', label: '[Nostr] Fetched 0 events', timestamp: 1747980352808}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:history', action: 'get_job_history_success', value: '0 entries fetched', timestamp: 1747980352808}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_invoices_found', timestamp: 1747980352808}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_eose_received', label: '[Nostr] EOSE received', timestamp: 1747980352822}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'eose_received', label: '', timestamp: 1747980352822}
