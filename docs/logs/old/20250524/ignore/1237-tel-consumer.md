OllamaAgentLanguageModelLive.ts:17 Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)
NIP90AgentLanguageModelLive.ts:22 Loading NIP90AgentLanguageModelLive module
runtime.ts:130 [Runtime] Building SparkService layer with MOCK implementation (no wallet initialized)
walletStore.ts:200 Rehydrating wallet store, found existing seed phrase. Initializing services...
walletStore.ts:167 WalletStore: Initializing services with mnemonic starting with: pyram...
runtime.ts:264 Reinitializing Effect runtime with updated wallet configuration...
runtime.ts:112 [Runtime] Building SparkService layer with USER mnemonic: pyramid go...
runtime.ts:234 Creating a production-ready Effect runtime for renderer...
SparkServiceImpl.ts:52 [SparkService] Initializing wallet for network: MAINNET
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_start', label: 'Network: MAINNET', value: '2', timestamp: 1748107891729}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748107891805}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748107891807}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748107891810}
runtime.ts:238 Production-ready Effect runtime for renderer created successfully.
renderer.ts:13 Main Effect runtime has been initialized in renderer via startApp.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'renderer_runtime_fully_ready', timestamp: 1748107891822}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748107891920}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748107891920}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748107891921}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748107891923}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748107891923}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748107891932}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748107891932}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748107891942}
VM5858 renderer_init:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
Policy set or a policy with "unsafe-eval" enabled. This exposes users of
this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ VM5858 renderer*init:2
logSecurityWarnings @ VM5858 renderer_init:2
(anonymous) @ VM5858 renderer_init:2
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_success', label: 'Network: MAINNET', value: 'success', timestamp: 1748107892755}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748107892756}
SparkServiceImpl.ts:163 [SparkService Finalizer] Wallet connections cleaned up successfully for network: MAINNET.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:dispose', action: 'wallet_cleanup_success', label: 'Network: MAINNET', timestamp: 1748107892760}
runtime.ts:279 Effect runtime reinitialized successfully with user wallet.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107892761}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748107893259}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
walletStore.ts:185 WalletStore: Services initialized.
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748107893850}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748107893851}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 470', timestamp: 1748107894155}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107898838}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748107899314}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107904837}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748107905300}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107910836}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748107911595}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107916839}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748107917316}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107922837}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748107923325}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107928837}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748107929327}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107934841}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748107935306}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107940840}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748107941313}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107946836}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748107947401}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107952840}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748107953326}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107958841}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748107959316}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107964843}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748107965344}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107970840}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748107971368}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107976840}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748107977321}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107982838}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748107983653}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107988841}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748107989306}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107994838}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748107995313}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108000838}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108001301}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108006841}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108007316}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108012838}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108013310}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108018841}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108019339}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108024840}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108025310}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108030842}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108031355}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108036839}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108037414}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108042839}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108043320}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108048842}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108049306}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108054841}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108055306}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108060842}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108061354}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108066841}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108067713}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108072838}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108073319}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108078842}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108079315}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108084841}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108085344}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108090842}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108091331}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108096846}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108097404}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108102843}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108103339}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108108843}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108109333}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108114843}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108115351}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108120843}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108121337}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108126840}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108127349}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108132841}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108133308}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108138843}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108139341}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108144166}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108144619}
HomePage.tsx:195 Keyboard: Toggle Wallet Pane
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108146386}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_wallet_pane', timestamp: 1748108146388}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_wallet_pane', timestamp: 1748108146389}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108147000}
HomePage.tsx:199 Keyboard: Toggle DVM Job History Pane
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_dvm_job_history_pane', timestamp: 1748108148552}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_dvm_job_history_pane', timestamp: 1748108148557}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:stats', action: 'get_job_statistics_start', timestamp: 1748108148570}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_fetch_begin', label: '[Nostr] Fetching events with filters', value: '[{"kinds":[6000,6001,6002,6003,6004,6005,6006,6007…507d1d6e0a5d0072ff65372d123378827"],"limit":500}]', timestamp: 1748108148571}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_pool_initialize', label: '[Nostr] Pool initialized with relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748108148571}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:history', action: 'get_job_history_start', label: 'Page: 1, DVM PK: 71461789...', timestamp: 1748108148573}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_fetch_begin', label: '[Nostr] Fetching events with filters', value: '[{"kinds":[6000,6001,6002,6003,6004,6005,6006,6007…ff65372d123378827"],"#s":["success"],"limit":10}]', timestamp: 1748108148573}
HomePage.tsx:203 Keyboard: Toggle Agent Chat Pane
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_dvm_job_history_pane', timestamp: 1748108148989}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_dvm_job_history_pane', timestamp: 1748108148989}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1748108149011}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_agent_chat_pane', label: 'Agent Chat', timestamp: 1748108149012}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_fetch_success', label: '[Nostr] Fetched 45 events', timestamp: 1748108149660}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:stats', action: 'get_job_statistics_success', value: '{"totalJobsProcessed":21,"totalSuccessfulJobs":9,"…27,"jobsPendingPayment":22,"modelUsageCounts":{}}', timestamp: 1748108149660}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_dvm_job_history_pane', timestamp: 1748108149661}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_dvm_job_history_pane', timestamp: 1748108149662}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_fetch_success', label: '[Nostr] Fetched 9 events', timestamp: 1748108149676}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:history', action: 'get_job_history_success', value: '9 entries fetched', timestamp: 1748108149676}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_dvm_job_history_pane', timestamp: 1748108149676}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_dvm_job_history_pane', timestamp: 1748108149691}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108152001}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108152448}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_start', label: 'User message sent', value: 'What AI model are you?', timestamp: 1748108155533}
useAgentChat.ts:121 [useAgentChat] Created new AbortController for message: assistant-1748108155534
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'chat_orchestrator_resolved_successfully', label: 'Orchestrator resolved for provider: nip90_devstral', value: 'assistant-1748108155534', timestamp: 1748108155535}
useAgentChat.ts:168 [useAgentChat] Orchestrator: Starting stream via provider: nip90_devstral for message: assistant-1748108155534 Current signal state: {aborted: false, controller: 'present'}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'stream_conversation_start', label: 'nip90_devstral', timestamp: 1748108155536}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start', label: 'nip90_devstral', value: 'devstral', timestamp: 1748108155546}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_start_nip90', label: 'nip90_devstral', timestamp: 1748108155546}
ChatOrchestratorService.ts:94 [ChatOrchestratorService] Building NIP90 provider with config: {modelName: 'devstral', isEnabled: true, dvmPubkey: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', dvmRelays: Array(3), requestKind: 5050, …}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'get_provider_model_success_nip90', label: 'nip90_devstral', timestamp: 1748108155553}
ChatOrchestratorService.ts:119 [ChatOrchestratorService] Successfully built NIP90 provider for nip90_devstral
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'requester_pubkey_stream', label: '9d93f44dd7061cf424bd2368817f6e6a2b55714e935cf556349cee26f1ba8614', value: 'Ephemeral key', timestamp: 1748108155557}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_create_job_request', label: 'Creating job request of kind: 5050', timestamp: 1748108155558}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb', timestamp: 1748108155569}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event 2926c22322fda…3d88625e6045900cff959d947d2b48bb to all 3 relays.', timestamp: 1748108155760}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_job_request_published', label: 'Published job request with ID: 2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb', value: 'Kind: 5050', timestamp: 1748108155760}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'feature', action: 'nip90_subscribe_job_updates', label: 'Subscribing to updates for job request: 2926c22322…33c2f227991e63ab93d88625e6045900cff959d947d2b48bb', timestamp: 1748108155760}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'subscription_relays', label: 'Using 3 DVM relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748108155760}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'filters_created', label: '2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb', value: 'Result: {"kinds":[6000,6001,6002,6003,6004,6005,60…d6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827"]}', timestamp: 1748108155761}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[6000,6001,6002,6003,6004,6005,…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748108155761}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[7000],"#e":["2926c22322fda4733…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748108155762}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created 2 subscriptions', value: '{"filters":[{"kinds":[6000,6001,6002,6003,6004,600…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748108155762}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'subscription_created_successfully', label: '2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb', value: 'Subscribed to 3 relays for result + feedback events', timestamp: 1748108155762}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'event_received', label: 'd70537cded971f5a32dab9f8f5e0b7a607b04fbd546223fdb9a7c48f5fdd29fa', value: 'Kind: 7000 | Job: 2926c22322fda4733c2f227991e63ab9…38ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', timestamp: 1748108156000}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'kind_7000_feedback_received', label: 'd70537cded971f5a32dab9f8f5e0b7a607b04fbd546223fdb9a7c48f5fdd29fa', value: 'Content: ... | Tags: [["e","2926c22322fda4733c2f22…unt","3000","lnbc3n1mock_invoice_1748108155829"]]', timestamp: 1748108156001}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'payment_required', label: '2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb', value: '3 sats', timestamp: 1748108156001}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'auto_payment_triggered', label: '2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb', value: '3 sats', timestamp: 1748108156002}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'pay_invoice_start', label: 'Invoice: lnbc3n1mock_invoice*...', value: '{"maxFeeSats":10,"timeoutSeconds":60}', timestamp: 1748108156002}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'pay_invoice_failure', label: 'Failed to pay Lightning invoice via SparkSDK', value: '{"errorMessage":"Failed to pay Lightning invoice v…108155829","maxFeeSats":10,"timeoutSeconds":60}}}', timestamp: 1748108156004}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:consumer', action: 'payment_error', label: '2926c22322fda4733c2f227991e63ab93d88625e6045900cff959d947d2b48bb', value: 'Failed to pay Lightning invoice via SparkSDK', timestamp: 1748108156004}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'orchestrator', action: 'stream_error', label: 'Payment failed: Failed to pay Lightning invoice via SparkSDK', timestamp: 1748108156007}
useAgentChat.ts:228 [useAgentChat] Stream error state: {isAbort: false, messageId: 'assistant-1748108155534', signalAborted: false, causeType: 'Fail', defectType: 'N/A'}
useAgentChat.ts:248 [useAgentChat] Stream error: {messageId: 'assistant-1748108155534', error: AiProviderError: Payment failed: Failed to pay Lightning invoice via SparkSDK
at http://localho…, cause: 'AiProviderError: Payment failed: Failed to pay Lig…0AgentLanguageModelLive.ts?t=1748107685673:264:35'}
overrideMethod @ hook.js:608
(anonymous) @ useAgentChat.ts:248
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:9242
effect_internal_function @ chunk-3LBJP6S5.js?v=ad354b67:723
Sync @ chunk-QHMFDAEA.js?v=ad354b67:9242
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:9428
context @ chunk-QHMFDAEA.js?v=ad354b67:2162
runLoop @ chunk-QHMFDAEA.js?v=ad354b67:9424
evaluateEffect @ chunk-QHMFDAEA.js?v=ad354b67:9055
evaluateMessageWhileSuspended @ chunk-QHMFDAEA.js?v=ad354b67:9032
drainQueueOnCurrentThread @ chunk-QHMFDAEA.js?v=ad354b67:8820
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:8519
starveInternal @ chunk-QHMFDAEA.js?v=ad354b67:869
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:885
Promise.then
starve @ chunk-QHMFDAEA.js?v=ad354b67:885
starveInternal @ chunk-QHMFDAEA.js?v=ad354b67:875
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:885
Promise.then
starve @ chunk-QHMFDAEA.js?v=ad354b67:885
starveInternal @ chunk-QHMFDAEA.js?v=ad354b67:875
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:885
Promise.then
starve @ chunk-QHMFDAEA.js?v=ad354b67:885
starveInternal @ chunk-QHMFDAEA.js?v=ad354b67:875
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:885
Promise.then
starve @ chunk-QHMFDAEA.js?v=ad354b67:885
starveInternal @ chunk-QHMFDAEA.js?v=ad354b67:875
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:885
Promise.then
starve @ chunk-QHMFDAEA.js?v=ad354b67:885
starveInternal @ chunk-QHMFDAEA.js?v=ad354b67:875
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:885
Promise.then
starve @ chunk-QHMFDAEA.js?v=ad354b67:885
scheduleTask @ chunk-QHMFDAEA.js?v=ad354b67:901
drainQueueLaterOnExecutor @ chunk-QHMFDAEA.js?v=ad354b67:8849
tell @ chunk-QHMFDAEA.js?v=ad354b67:8626
callback @ chunk-QHMFDAEA.js?v=ad354b67:9149
deferredUnsafeDone @ chunk-3LBJP6S5.js?v=ad354b67:9639
unsafeCompleteDeferred @ chunk-WMVVNI5K.js?v=ad354b67:1014
(anonymous) @ chunk-WMVVNI5K.js?v=ad354b67:740
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:9394
effect_internal_function @ chunk-3LBJP6S5.js?v=ad354b67:723
Commit @ chunk-QHMFDAEA.js?v=ad354b67:9394
(anonymous) @ chunk-QHMFDAEA.js?v=ad354b67:9428
context @ chunk-QHMFDAEA.js?v=ad354b67:2162
runLoop @ chunk-QHMFDAEA.js?v=ad354b67:9424
evaluateEffect @ chunk-QHMFDAEA.js?v=ad354b67:9055
start @ chunk-QHMFDAEA.js?v=ad354b67:9103
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:140
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:109
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:272
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:267
(anonymous) @ chunk-KYPYFHD7.js?v=ad354b67:109
pipe @ chunk-3LBJP6S5.js?v=ad354b67:122
(anonymous) @ chunk-WMVVNI5K.js?v=ad354b67:8028
fail @ chunk-WMVVNI5K.js?v=ad354b67:7574
(anonymous) @ NIP90AgentLanguageModelLive.ts:347
Promise.catch
(anonymous) @ NIP90AgentLanguageModelLive.ts:336
(anonymous) @ NIP90ServiceImpl.ts:789
onevent @ NostrServiceImpl.ts:478
handleNext @ nostr-tools.js?v=ad354b67:2248
runQueue @ nostr-tools.js?v=ad354b67:2215
\_onmessage @ nostr-tools.js?v=ad354b67:2378
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'agent_chat', action: 'send_message_failure_stream', label: 'Payment failed: Failed to pay Lightning invoice via SparkSDK', value: 'AiProviderError: Payment failed: Failed to pay Lig…0AgentLanguageModelLive.ts?t=1748107685673:264:35', timestamp: 1748108156009}
useAgentChat.ts:265 [useAgentChat] Ensuring block entered. {messageId: 'assistant-1748108155534', abortController: 'present', signalAborted: false, isLoading: false}
useAgentChat.ts:281 [useAgentChat] Clearing abort controller for message: assistant-1748108155534
useAgentChat.ts:285 [useAgentChat] Clearing current assistant message ID: assistant-1748108155534
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108157451}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108158188}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748108163196}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 470 sats', value: 'Token count: 0', timestamp: 1748108163662}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'event_received', label: '03297734eb8b55345cd26da8315ef2273508e2a29c5a59db0e162df421f39dc5', value: 'Kind: 7000 | Job: 2926c22322fda4733c2f227991e63ab9…38ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', timestamp: 1748108164290}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'kind_7000_feedback_received', label: '03297734eb8b55345cd26da8315ef2273508e2a29c5a59db0e162df421f39dc5', value: 'Content: ... | Tags: [["e","2926c22322fda4733c2f22…atus","processing","Processing your request..."]]', timestamp: 1748108164291}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'nip90:subscription', action: 'event_received', label: '986cdd27ba12eaa3b9d0fe873b7844bd7bfc0ab64db19adfa096e91bf582ae14', value: 'Kind: 6050 | Job: 2926c22322fda4733c2f227991e63ab9…38ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', timestamp: 1748108168195}
NIP90ServiceImpl.ts:865 Error processing subscription event: (FiberFailure) AsyncFiberException: Fiber #307 cannot be resolved synchronously. This is caused by using runSync on an effect that performs async work
overrideMethod @ hook.js:608
(anonymous) @ NIP90ServiceImpl.ts:865
onevent @ NostrServiceImpl.ts:478
handleNext @ nostr-tools.js?v=ad354b67:2248
runQueue @ nostr-tools.js?v=ad354b67:2215
\_onmessage @ nostr-tools.js?v=ad354b67:2378
