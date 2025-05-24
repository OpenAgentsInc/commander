OllamaAgentLanguageModelLive.ts:17 Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)
NIP90AgentLanguageModelLive.ts:22 Loading NIP90AgentLanguageModelLive module
runtime.ts:130 [Runtime] Building SparkService layer with MOCK implementation (no wallet initialized)
walletStore.ts:200 Rehydrating wallet store, found existing seed phrase. Initializing services...
walletStore.ts:167 WalletStore: Initializing services with mnemonic starting with: domai...
runtime.ts:264 Reinitializing Effect runtime with updated wallet configuration...
runtime.ts:112 [Runtime] Building SparkService layer with USER mnemonic: domain mam...
runtime.ts:234 Creating a production-ready Effect runtime for renderer...
SparkServiceImpl.ts:52 [SparkService] Initializing wallet for network: MAINNET
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_start', label: 'Network: MAINNET', value: '2', timestamp: 1748106027942}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748106027985}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748106027985}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748106027986}
runtime.ts:238 Production-ready Effect runtime for renderer created successfully.
renderer.ts:13 Main Effect runtime has been initialized in renderer via startApp.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'renderer_runtime_fully_ready', timestamp: 1748106027990}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748106028044}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748106028045}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748106028045}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748106028046}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748106028047}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748106028049}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748106028049}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748106028049}
VM1035 renderer_init:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
  Policy set or a policy with "unsafe-eval" enabled. This exposes users of
  this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ VM1035 renderer_init:2
logSecurityWarnings @ VM1035 renderer_init:2
(anonymous) @ VM1035 renderer_init:2
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_success', label: 'Network: MAINNET', value: 'success', timestamp: 1748106028648}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748106028649}
SparkServiceImpl.ts:163 [SparkService Finalizer] Wallet connections cleaned up successfully for network: MAINNET.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:dispose', action: 'wallet_cleanup_success', label: 'Network: MAINNET', timestamp: 1748106028651}
runtime.ts:279 Effect runtime reinitialized successfully with user wallet.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106028652}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748106029076}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748106029078}
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106029138}
walletStore.ts:185 WalletStore: Services initialized.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 9', timestamp: 1748106029356}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106034140}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106034419}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106036092}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_wallet_pane', timestamp: 1748106036094}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ui:pane', action: 'open_wallet_pane', timestamp: 1748106036095}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106036684}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106041687}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106041961}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106046964}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106047257}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106052260}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106052540}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106057562}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106057941}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106062944}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106063244}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106068247}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106068535}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106073537}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106073831}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106078834}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106079123}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106084125}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106084442}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106089444}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106089992}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106094995}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106095303}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106100306}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106100607}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106105609}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106105911}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106110913}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106111199}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106116202}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106116565}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106121567}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106121882}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106126884}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106127175}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106132177}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106132468}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106137470}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106137762}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106142764}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106143069}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106148071}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106148359}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106153361}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106153664}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106158667}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106158943}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106163946}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106164236}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106169238}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106169524}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106174527}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106174805}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106179807}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106180206}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106185208}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106185492}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106190494}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106190781}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748106195488}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748106195488}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106195783}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 9', timestamp: 1748106196104}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106196446}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
Kind5050DVMServiceImpl.ts:1564
========================================
DVM PROVIDER PUBKEY: 714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827
========================================
Configure consumer with this pubkey!
========================================

TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'start_listening_attempt', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'Relays: 3', timestamp: 1748106196939}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'DVM_PUBKEY_FOR_CONSUMER', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'USE THIS PUBKEY IN CONSUMER CONFIG!', timestamp: 1748106196939}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748106196942}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748106196943}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_pool_initialize', label: '[Nostr] Pool initialized with relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748106196944}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[5050,5100],"#p":["714617896896…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748106196945}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created 1 subscriptions', value: '{"filters":[{"kinds":[5050,5100],"#p":["7146178968…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748106196945}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'start_listening_success', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'Relays: 3, Kinds: 5050,5100', timestamp: 1748106196945}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'active', timestamp: 1748106196951}
SellComputePane.tsx:168 DVM Service start command successful.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'received_job_request', label: 'ced22fda9fd0325d67865fe7c72e4c11d51602090a2c45b73d4ea3e8440b3bc7', value: 'Kind: 5050', timestamp: 1748106197210}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_request_received', label: 'ced22fda9fd0325d67865fe7c72e4c11d51602090a2c45b73d4ea3e8440b3bc7', value: 'Kind: 5050', timestamp: 1748106197210}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_start', label: 'Amount: 3 sats', value: '{"amountSats":3,"memo":"NIP-90 DVM Job ced22fda | Kind: 5050 | Tokens: ~190 | Encrypted"}', timestamp: 1748106197214}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_eose_received', label: '[Nostr] EOSE received', timestamp: 1748106197611}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'eose_received', label: '', timestamp: 1748106197612}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748106197944}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748106197945}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748106198947}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748106198947}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_success', label: 'Invoice created: lnbc30n1p5rr77hpp5h3...', value: 'bc4ce48bb149d117bb42b61cf2b3c9a663e6c13fdf0773f1452ad0bc90027515', timestamp: 1748106199932}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'creating_feedback_event', label: 'Job: ced22fda9fd0325d67865fe7c72e4c11d51602090a2c4…om pubkey: 599f848112... status: payment-required', timestamp: 1748106199933}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'finalizing_kind_7000_event', label: 'Finalizing Kind 7000 event template with tags', value: '[["e","ced22fda9fd0325d67865fe7c72e4c11d51602090a2…30pd9u5kn3txcqxh7h4x803l76wc997juxu8dsgquy86nj"]]', timestamp: 1748106199934}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '29b98974bb599a3cc391884576140f1743dd80368e41e744aac2592f0c073fd4', timestamp: 1748106199941}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748106199948}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: ced22fda9fd0325d67865fe7c72e4c11d51602090a2c45b73d4ea3e8440b3bc7, Attempt: 1', value: 'Invoice: lnbc30n1p5rr77hpp5h3...', timestamp: 1748106199948}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rr77hpp5h3...', timestamp: 1748106199949}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rr77hpp5h3..."}', timestamp: 1748106199949}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: 'ced22fda9fd0325d67865fe7c72e4c11d51602090a2c45b73d4ea3e8440b3bc7', value: 'Attempt: 1', timestamp: 1748106199949}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event 29b98974bb599…43dd80368e41e744aac2592f0c073fd4 to all 3 relays.', timestamp: 1748106200132}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'payment_requested', label: 'ced22fda9fd0325d67865fe7c72e4c11d51602090a2c45b73d4ea3e8440b3bc7', value: '3 sats', timestamp: 1748106200132}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_pending_payment', label: 'ced22fda9fd0325d67865fe7c72e4c11d51602090a2c45b73d4ea3e8440b3bc7', value: '{"priceSats":3,"estimatedTokens":190,"encrypted":true}', timestamp: 1748106200133}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748106200951}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106201448}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106201813}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748106201953}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748106202955}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748106203957}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748106204959}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748106205961}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106206815}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748106206962}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106207236}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748106207964}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: ced22fda9fd0325d67865fe7c72e4c11d51602090a2c45b73d4ea3e8440b3bc7, Attempt: 2', value: 'Invoice: lnbc30n1p5rr77hpp5h3...', timestamp: 1748106207964}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rr77hpp5h3...', timestamp: 1748106207965}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rr77hpp5h3..."}', timestamp: 1748106207966}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment', action: 'OPTIMISTIC_PROCESSING_TRIGGERED', label: 'ced22fda9fd0325d67865fe7c72e4c11d51602090a2c45b73d4ea3e8440b3bc7', value: 'After 2 attempts - FAST MODE', timestamp: 1748106207966}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'processing_optimistic', label: 'ced22fda9fd0325d67865fe7c72e4c11d51602090a2c45b73d4ea3e8440b3bc7', value: '3 sats (FAST MODE)', timestamp: 1748106207967}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'creating_feedback_event', label: 'Job: ced22fda9fd0325d67865fe7c72e4c11d51602090a2c4…50) from pubkey: 599f848112... status: processing', timestamp: 1748106207967}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'finalizing_kind_7000_event', label: 'Finalizing Kind 7000 event template with tags', value: '[["e","ced22fda9fd0325d67865fe7c72e4c11d51602090a2…atus","processing","Processing your request..."]]', timestamp: 1748106207968}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '8521deda70a3b10ff10ee1e78405bbf4a2c2e73c3bc7d99125d7be7c4097dd0a', timestamp: 1748106207973}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event 8521deda70a3b…a2c2e73c3bc7d99125d7be7c4097dd0a to all 3 relays.', timestamp: 1748106208147}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:nonstream', action: 'create_start', label: 'gemma3:1b', timestamp: 1748106208158}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:nonstream', action: 'create_success', label: 'gemma3:1b', timestamp: 1748106209248}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '8671f2af300ee06962edea289daf826b13c5cdd1849d58211b081db1aaf65849', timestamp: 1748106209254}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event 8671f2af300ee…13c5cdd1849d58211b081db1aaf65849 to all 3 relays.', timestamp: 1748106209439}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'optimistic_result_sent_awaiting_payment', label: 'ced22fda9fd0325d67865fe7c72e4c11d51602090a2c45b73d4ea3e8440b3bc7', timestamp: 1748106209440}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'optimistic_job_result_published', label: 'ced22fda9fd0325d67865fe7c72e4c11d51602090a2c45b73d4ea3e8440b3bc7', value: '8671f2af300ee06962edea289daf826b13c5cdd1849d58211b081db1aaf65849', timestamp: 1748106209440}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748106210441}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748106211443}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106212238}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748106212444}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106212525}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748106213446}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748106214448}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'received_job_request', label: '8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d', value: 'Kind: 5050', timestamp: 1748106215132}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_request_received', label: '8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d', value: 'Kind: 5050', timestamp: 1748106215133}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_start', label: 'Amount: 3 sats', value: '{"amountSats":3,"memo":"NIP-90 DVM Job 8d9787dd | Kind: 5050 | Tokens: ~52 | Encrypted"}', timestamp: 1748106215136}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748106215449}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_success', label: 'Invoice created: lnbc30n1p5rr7l8pp5sr...', value: '80eb732781b9797378bebe9d93e15d61c244e130250f10e5957d4d6a66d824ae', timestamp: 1748106216354}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'creating_feedback_event', label: 'Job: 8d9787dda8c481eafe26750e6faf57c9743c0903108fa…om pubkey: b57bb67159... status: payment-required', timestamp: 1748106216355}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'finalizing_kind_7000_event', label: 'Finalizing Kind 7000 event template with tags', value: '[["e","8d9787dda8c481eafe26750e6faf57c9743c0903108…ajzmx9ks7gnncapp3s03n7zmqz7jwrx5yqq6ycsp0qcjtk"]]', timestamp: 1748106216355}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '6f4edf5274fabd71aaa368b6438fad601e2f536ce1fe34f54675c78b949dd580', timestamp: 1748106216360}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106216450}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: 8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d, Attempt: 1', value: 'Invoice: lnbc30n1p5rr7l8pp5sr...', timestamp: 1748106216450}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rr7l8pp5sr...', timestamp: 1748106216451}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rr7l8pp5sr..."}', timestamp: 1748106216451}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: '8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d', value: 'Attempt: 1', timestamp: 1748106216451}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event 6f4edf5274fab…1e2f536ce1fe34f54675c78b949dd580 to all 3 relays.', timestamp: 1748106216554}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'payment_requested', label: '8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d', value: '3 sats', timestamp: 1748106216554}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_pending_payment', label: '8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d', value: '{"priceSats":3,"estimatedTokens":52,"encrypted":true}', timestamp: 1748106216554}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106217452}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106217527}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106217807}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106218453}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106219455}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: ced22fda9fd0325d67865fe7c72e4c11d51602090a2c45b73d4ea3e8440b3bc7, Attempt: 3', value: 'Invoice: lnbc30n1p5rr77hpp5h3...', timestamp: 1748106219456}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rr77hpp5h3...', timestamp: 1748106219457}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rr77hpp5h3..."}', timestamp: 1748106219457}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: 'ced22fda9fd0325d67865fe7c72e4c11d51602090a2c45b73d4ea3e8440b3bc7', value: 'Attempt: 3', timestamp: 1748106219458}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106220460}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106221462}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106222465}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106222809}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106223106}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106223466}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106224468}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: 8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d, Attempt: 2', value: 'Invoice: lnbc30n1p5rr7l8pp5sr...', timestamp: 1748106224469}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rr7l8pp5sr...', timestamp: 1748106224469}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rr7l8pp5sr..."}', timestamp: 1748106224470}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment', action: 'OPTIMISTIC_PROCESSING_TRIGGERED', label: '8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d', value: 'After 2 attempts - FAST MODE', timestamp: 1748106224470}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'processing_optimistic', label: '8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d', value: '3 sats (FAST MODE)', timestamp: 1748106224470}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'creating_feedback_event', label: 'Job: 8d9787dda8c481eafe26750e6faf57c9743c0903108fa…50) from pubkey: b57bb67159... status: processing', timestamp: 1748106224471}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'finalizing_kind_7000_event', label: 'Finalizing Kind 7000 event template with tags', value: '[["e","8d9787dda8c481eafe26750e6faf57c9743c0903108…atus","processing","Processing your request..."]]', timestamp: 1748106224471}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '7866ca0d035f511ff6e19216110842e441881e8f3cdcff86b16e2af4f62ceac7', timestamp: 1748106224477}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event 7866ca0d035f5…41881e8f3cdcff86b16e2af4f62ceac7 to all 3 relays.', timestamp: 1748106224655}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:nonstream', action: 'create_start', label: 'gemma3:1b', timestamp: 1748106224663}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:nonstream', action: 'create_success', label: 'gemma3:1b', timestamp: 1748106224792}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '858c1d2bc8ce618e23e7fcdc836e7e310e9c147fa597bb5b728a650505e4f45e', timestamp: 1748106224797}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event 858c1d2bc8ce6…0e9c147fa597bb5b728a650505e4f45e to all 3 relays.', timestamp: 1748106224979}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'optimistic_result_sent_awaiting_payment', label: '8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d', timestamp: 1748106224979}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'optimistic_job_result_published', label: '8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d', value: '858c1d2bc8ce618e23e7fcdc836e7e310e9c147fa597bb5b728a650505e4f45e', timestamp: 1748106224979}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106225981}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106226983}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106227984}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106228108}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106228405}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106228986}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106229988}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106230990}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106231992}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106232994}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106233407}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106233697}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106233995}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106234997}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106235999}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: 8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d, Attempt: 3', value: 'Invoice: lnbc30n1p5rr7l8pp5sr...', timestamp: 1748106235999}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rr7l8pp5sr...', timestamp: 1748106236000}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rr7l8pp5sr..."}', timestamp: 1748106236001}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: '8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d', value: 'Attempt: 3', timestamp: 1748106236001}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106237003}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: ced22fda9fd0325d67865fe7c72e4c11d51602090a2c45b73d4ea3e8440b3bc7, Attempt: 4', value: 'Invoice: lnbc30n1p5rr77hpp5h3...', timestamp: 1748106237003}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rr77hpp5h3...', timestamp: 1748106237004}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rr77hpp5h3..."}', timestamp: 1748106237004}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: 'ced22fda9fd0325d67865fe7c72e4c11d51602090a2c45b73d4ea3e8440b3bc7', value: 'Attempt: 4', timestamp: 1748106237005}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106238006}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106238699}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106238983}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106239007}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106240008}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106241010}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'received_job_request', label: '6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38', value: 'Kind: 5050', timestamp: 1748106241753}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_request_received', label: '6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38', value: 'Kind: 5050', timestamp: 1748106241753}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_start', label: 'Amount: 3 sats', value: '{"amountSats":3,"memo":"NIP-90 DVM Job 6ee59a15 | Kind: 5050 | Tokens: ~127 | Encrypted"}', timestamp: 1748106241757}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748106242011}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_success', label: 'Invoice created: lnbc30n1p5rrlqzpp5ej...', value: 'cca8d86bcaa445fadb2f7a32068dc48bb81043074ca6c7699b1203799399b060', timestamp: 1748106242875}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'creating_feedback_event', label: 'Job: 6ee59a154531ccd823801c347873add1a2e717a92c404…om pubkey: 551861b5a8... status: payment-required', timestamp: 1748106242876}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'finalizing_kind_7000_event', label: 'Finalizing Kind 7000 event template with tags', value: '[["e","6ee59a154531ccd823801c347873add1a2e717a92c4…vdhfxast28cxyhd3x20sq3et6anq7uszyhyukngq3um7hl"]]', timestamp: 1748106242876}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '895c47e13918322a0816ea9312a97c4ee8597e9921fe0e534a8a35be1cbe5930', timestamp: 1748106242886}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106243013}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: 6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38, Attempt: 1', value: 'Invoice: lnbc30n1p5rrlqzpp5ej...', timestamp: 1748106243014}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rrlqzpp5ej...', timestamp: 1748106243014}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rrlqzpp5ej..."}', timestamp: 1748106243015}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: '6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38', value: 'Attempt: 1', timestamp: 1748106243015}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event 895c47e139183…e8597e9921fe0e534a8a35be1cbe5930 to all 3 relays.', timestamp: 1748106243063}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'payment_requested', label: '6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38', value: '3 sats', timestamp: 1748106243063}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_pending_payment', label: '6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38', value: '{"priceSats":3,"estimatedTokens":127,"encrypted":true}', timestamp: 1748106243063}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106243985}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106244016}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106244261}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106245017}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106246018}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106247020}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106247238}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106247522}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106248021}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106248549}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106248834}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106249023}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106249339}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106249591}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106250024}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106250133}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106250409}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106251026}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: 6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38, Attempt: 2', value: 'Invoice: lnbc30n1p5rrlqzpp5ej...', timestamp: 1748106251027}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rrlqzpp5ej...', timestamp: 1748106251027}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rrlqzpp5ej..."}', timestamp: 1748106251028}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment', action: 'OPTIMISTIC_PROCESSING_TRIGGERED', label: '6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38', value: 'After 2 attempts - FAST MODE', timestamp: 1748106251028}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'processing_optimistic', label: '6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38', value: '3 sats (FAST MODE)', timestamp: 1748106251028}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'creating_feedback_event', label: 'Job: 6ee59a154531ccd823801c347873add1a2e717a92c404…50) from pubkey: 551861b5a8... status: processing', timestamp: 1748106251029}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'finalizing_kind_7000_event', label: 'Finalizing Kind 7000 event template with tags', value: '[["e","6ee59a154531ccd823801c347873add1a2e717a92c4…atus","processing","Processing your request..."]]', timestamp: 1748106251029}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: 'c5fc3a686bf011556694c962f1e8feb28c384d1545a6d7877c0bcf6dddb71816', timestamp: 1748106251034}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event c5fc3a686bf01…8c384d1545a6d7877c0bcf6dddb71816 to all 3 relays.', timestamp: 1748106251212}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:nonstream', action: 'create_start', label: 'gemma3:1b', timestamp: 1748106251220}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:nonstream', action: 'create_success', label: 'gemma3:1b', timestamp: 1748106251406}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '21575a16c231d1ed760015cf32379d3df93cf41d9bb3f15c1b2c74e0b8b8f443', timestamp: 1748106251411}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event 21575a16c231d…f93cf41d9bb3f15c1b2c74e0b8b8f443 to all 3 relays.', timestamp: 1748106251588}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'optimistic_result_sent_awaiting_payment', label: '6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38', timestamp: 1748106251589}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'optimistic_job_result_published', label: '6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38', value: '21575a16c231d1ed760015cf32379d3df93cf41d9bb3f15c1b2c74e0b8b8f443', timestamp: 1748106251589}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106252590}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106253592}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: 8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d, Attempt: 4', value: 'Invoice: lnbc30n1p5rr7l8pp5sr...', timestamp: 1748106253593}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rr7l8pp5sr...', timestamp: 1748106253593}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rr7l8pp5sr..."}', timestamp: 1748106253594}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: '8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d', value: 'Attempt: 4', timestamp: 1748106253594}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106254596}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106255411}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106255597}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106255732}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106256598}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106257600}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106258602}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106259604}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106260605}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106260734}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106261025}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106261607}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106262609}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: ced22fda9fd0325d67865fe7c72e4c11d51602090a2c45b73d4ea3e8440b3bc7, Attempt: 5', value: 'Invoice: lnbc30n1p5rr77hpp5h3...', timestamp: 1748106262609}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rr77hpp5h3...', timestamp: 1748106262610}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rr77hpp5h3..."}', timestamp: 1748106262610}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: 'ced22fda9fd0325d67865fe7c72e4c11d51602090a2c45b73d4ea3e8440b3bc7', value: 'Attempt: 5', timestamp: 1748106262611}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: 6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38, Attempt: 3', value: 'Invoice: lnbc30n1p5rrlqzpp5ej...', timestamp: 1748106262611}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rrlqzpp5ej...', timestamp: 1748106262611}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rrlqzpp5ej..."}', timestamp: 1748106262612}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: '6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38', value: 'Attempt: 3', timestamp: 1748106262612}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106263614}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106264616}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106265617}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106266027}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106266316}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106266619}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106267621}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106268623}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'received_job_request', label: 'a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423a77c9c2cc4c44cb305a', value: 'Kind: 5050', timestamp: 1748106269196}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_request_received', label: 'a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423a77c9c2cc4c44cb305a', value: 'Kind: 5050', timestamp: 1748106269197}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_start', label: 'Amount: 3 sats', value: '{"amountSats":3,"memo":"NIP-90 DVM Job a4c3653e | Kind: 5050 | Tokens: ~247 | Encrypted"}', timestamp: 1748106269200}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 3 pending jobs', timestamp: 1748106269624}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_success', label: 'Invoice created: lnbc30n1p5rrlqapp55k...', value: 'a586181f3915b78a5a8a7f9cd1f4725c5770c0834bba252198b1c615c735d5bc', timestamp: 1748106270318}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'creating_feedback_event', label: 'Job: a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423…om pubkey: ea9c4df261... status: payment-required', timestamp: 1748106270319}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'finalizing_kind_7000_event', label: 'Finalizing Kind 7000 event template with tags', value: '[["e","a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c4…pw6nd4rthznwm4m5df43rkum86snzk0wwu5teygq4pwl9m"]]', timestamp: 1748106270320}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: 'b93c2b23c482a3c4e765f4599c13b552ccfe6ad0ba327e9d28024556f89d373b', timestamp: 1748106270327}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event b93c2b23c482a…ccfe6ad0ba327e9d28024556f89d373b to all 3 relays.', timestamp: 1748106270510}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'payment_requested', label: 'a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423a77c9c2cc4c44cb305a', value: '3 sats', timestamp: 1748106270510}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_pending_payment', label: 'a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423a77c9c2cc4c44cb305a', value: '{"priceSats":3,"estimatedTokens":247,"encrypted":true}', timestamp: 1748106270511}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106270626}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423a77c9c2cc4c44cb305a, Attempt: 1', value: 'Invoice: lnbc30n1p5rrlqapp55k...', timestamp: 1748106270626}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rrlqapp55k...', timestamp: 1748106270627}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rrlqapp55k..."}', timestamp: 1748106270627}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: 'a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423a77c9c2cc4c44cb305a', value: 'Attempt: 1', timestamp: 1748106270628}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106271319}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106271626}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106271641}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106272642}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106273644}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106274646}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106275647}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106276628}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106276648}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106276900}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106277650}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106278651}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423a77c9c2cc4c44cb305a, Attempt: 2', value: 'Invoice: lnbc30n1p5rrlqapp55k...', timestamp: 1748106278652}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rrlqapp55k...', timestamp: 1748106278652}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rrlqapp55k..."}', timestamp: 1748106278653}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment', action: 'OPTIMISTIC_PROCESSING_TRIGGERED', label: 'a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423a77c9c2cc4c44cb305a', value: 'After 2 attempts - FAST MODE', timestamp: 1748106278653}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'processing_optimistic', label: 'a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423a77c9c2cc4c44cb305a', value: '3 sats (FAST MODE)', timestamp: 1748106278653}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'creating_feedback_event', label: 'Job: a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423…50) from pubkey: ea9c4df261... status: processing', timestamp: 1748106278654}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'finalizing_kind_7000_event', label: 'Finalizing Kind 7000 event template with tags', value: '[["e","a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c4…atus","processing","Processing your request..."]]', timestamp: 1748106278654}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '0e68687d75cd124fffe3df0191becb1cd72ff659ee5a75ea422f95766908922d', timestamp: 1748106278661}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_success', label: '[Nostr] Successfully published event 0e68687d75cd1…d72ff659ee5a75ea422f95766908922d to all 3 relays.', timestamp: 1748106278836}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:nonstream', action: 'create_start', label: 'gemma3:1b', timestamp: 1748106278847}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:nonstream', action: 'create_success', label: 'gemma3:1b', timestamp: 1748106278980}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '015310c7c26ef6e2a6debcbc3d420bc0323f75a0a0260629f304c87c37c6cff3', timestamp: 1748106278984}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:warn', action: 'nostr_publish_partial_failure', label: '[Nostr] Partially published event 015310c7c26ef6e2…0a0260629f304c87c37c6cff3: 2 succeeded, 1 failed.', value: 'Failures: Error: Policy violated and pubkey is not in our web of trust.', timestamp: 1748106279176}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'optimistic_result_sent_awaiting_payment', label: 'a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423a77c9c2cc4c44cb305a', timestamp: 1748106279177}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'optimistic_job_result_published', label: 'a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423a77c9c2cc4c44cb305a', value: '015310c7c26ef6e2a6debcbc3d420bc0323f75a0a0260629f304c87c37c6cff3', timestamp: 1748106279177}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106280179}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: 8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d, Attempt: 5', value: 'Invoice: lnbc30n1p5rr7l8pp5sr...', timestamp: 1748106280179}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rr7l8pp5sr...', timestamp: 1748106280179}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rr7l8pp5sr..."}', timestamp: 1748106280180}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: '8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d', value: 'Attempt: 5', timestamp: 1748106280180}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: 6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38, Attempt: 4', value: 'Invoice: lnbc30n1p5rrlqzpp5ej...', timestamp: 1748106280181}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rrlqzpp5ej...', timestamp: 1748106280181}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rrlqzpp5ej..."}', timestamp: 1748106280181}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: '6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38', value: 'Attempt: 4', timestamp: 1748106280182}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106281183}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106281902}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106282184}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106282212}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106283186}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106284188}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106285189}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106286190}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106287192}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106287213}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106287481}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106288193}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106289195}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106290197}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423a77c9c2cc4c44cb305a, Attempt: 3', value: 'Invoice: lnbc30n1p5rrlqapp55k...', timestamp: 1748106290197}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rrlqapp55k...', timestamp: 1748106290198}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rrlqapp55k..."}', timestamp: 1748106290198}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: 'a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423a77c9c2cc4c44cb305a', value: 'Attempt: 3', timestamp: 1748106290198}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106291200}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106292202}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106292483}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106292765}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106293203}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106294205}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106295207}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106296209}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106297210}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106297767}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106298053}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106298212}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106299214}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106300215}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106301217}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: ced22fda9fd0325d67865fe7c72e4c11d51602090a2c45b73d4ea3e8440b3bc7, Attempt: 6', value: 'Invoice: lnbc30n1p5rr77hpp5h3...', timestamp: 1748106301218}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rr77hpp5h3...', timestamp: 1748106301218}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rr77hpp5h3..."}', timestamp: 1748106301219}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: 'ced22fda9fd0325d67865fe7c72e4c11d51602090a2c45b73d4ea3e8440b3bc7', value: 'Attempt: 6', timestamp: 1748106301219}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106302221}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106303055}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106303222}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106303350}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106304224}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106305226}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106306228}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: 6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38, Attempt: 5', value: 'Invoice: lnbc30n1p5rrlqzpp5ej...', timestamp: 1748106306228}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rrlqzpp5ej...', timestamp: 1748106306229}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rrlqzpp5ej..."}', timestamp: 1748106306229}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: '6ee59a154531ccd823801c347873add1a2e717a92c404ec1f95d25e8b4d76a38', value: 'Attempt: 5', timestamp: 1748106306229}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106307231}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423a77c9c2cc4c44cb305a, Attempt: 4', value: 'Invoice: lnbc30n1p5rrlqapp55k...', timestamp: 1748106307232}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rrlqapp55k...', timestamp: 1748106307232}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rrlqapp55k..."}', timestamp: 1748106307233}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: 'a4c3653e0a288ad1fecc68f378a208dffd54f4ca2c423a77c9c2cc4c44cb305a', value: 'Attempt: 4', timestamp: 1748106307233}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106308235}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106308352}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106308654}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106309237}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106310239}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106311240}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106312242}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106313243}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106313656}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106313939}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106314245}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106315246}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106316248}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106317250}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106318252}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: 8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d, Attempt: 6', value: 'Invoice: lnbc30n1p5rr7l8pp5sr...', timestamp: 1748106318252}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rr7l8pp5sr...', timestamp: 1748106318253}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rr7l8pp5sr..."}', timestamp: 1748106318253}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: '8d9787dda8c481eafe26750e6faf57c9743c0903108fa6b46879b786bd14e43d', value: 'Attempt: 6', timestamp: 1748106318254}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106318941}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106319255}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106319306}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106320256}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106321258}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106322260}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106323261}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106324263}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106324307}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106324591}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106325265}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106326267}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106327269}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106328270}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106329273}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748106329594}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 9 sats', value: 'Token count: 0', timestamp: 1748106329888}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 4 pending jobs', timestamp: 1748106330274}
