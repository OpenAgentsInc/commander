OllamaAgentLanguageModelLive.ts:17 Loading OllamaAgentLanguageModelLive module (Proper Effect Pattern)
NIP90AgentLanguageModelLive.ts:22 Loading NIP90AgentLanguageModelLive module
runtime.ts:130 [Runtime] Building SparkService layer with MOCK implementation (no wallet initialized)
walletStore.ts:200 Rehydrating wallet store, found existing seed phrase. Initializing services...
walletStore.ts:167 WalletStore: Initializing services with mnemonic starting with: domai...
runtime.ts:264 Reinitializing Effect runtime with updated wallet configuration...
runtime.ts:112 [Runtime] Building SparkService layer with USER mnemonic: domain mam...
runtime.ts:234 Creating a production-ready Effect runtime for renderer...
SparkServiceImpl.ts:52 [SparkService] Initializing wallet for network: MAINNET
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_start', label: 'Network: MAINNET', value: '2', timestamp: 1748107205344}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748107205387}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ai:config', action: 'ollama_model_from_config_service', value: 'gemma3:1b', timestamp: 1748107205387}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748107205389}
runtime.ts:238 Production-ready Effect runtime for renderer created successfully.
renderer.ts:13 Main Effect runtime has been initialized in renderer via startApp.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'renderer_runtime_fully_ready', timestamp: 1748107205394}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748107205452}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748107205452}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748107205452}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', timestamp: 1748107205454}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 0 sats (no wallet)', value: 'Token count: 0', timestamp: 1748107205454}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748107205456}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 0', timestamp: 1748107205456}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748107205457}
VM730 renderer_init:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
  Policy set or a policy with "unsafe-eval" enabled. This exposes users of
  this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ VM730 renderer_init:2
logSecurityWarnings @ VM730 renderer_init:2
(anonymous) @ VM730 renderer_init:2
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:init', action: 'wallet_initialize_success', label: 'Network: MAINNET', value: 'success', timestamp: 1748107206096}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:init', action: 'kind5050_dvm_service_init', label: 'Initial state: inactive', timestamp: 1748107206097}
SparkServiceImpl.ts:163 [SparkService Finalizer] Wallet connections cleaned up successfully for network: MAINNET.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:dispose', action: 'wallet_cleanup_success', label: 'Network: MAINNET', timestamp: 1748107206099}
runtime.ts:279 Effect runtime reinitialized successfully with user wallet.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107206100}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_start', timestamp: 1748107206470}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'inactive', timestamp: 1748107206470}
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 27 sats', value: 'Token count: 0', timestamp: 1748107206590}
walletStore.ts:185 WalletStore: Services initialized.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:status', action: 'check_wallet_status_success', label: 'Wallet ready, balance: 27', timestamp: 1748107206770}
SellComputePane.tsx:142 [SellComputePane] Running delayed Ollama status check
SellComputePane.tsx:62 [SellComputePane] Attempting to check Ollama status via IPC
SellComputePane.tsx:70 [SellComputePane] IPC Ollama status check succeeded: true
Kind5050DVMServiceImpl.ts:1577
========================================
DVM PROVIDER PUBKEY: 714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827
========================================
Configure consumer with this pubkey!
========================================

TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'start_listening_attempt', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'Relays: 3', timestamp: 1748107207825}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'DVM_PUBKEY_FOR_CONSUMER', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'USE THIS PUBKEY IN CONSUMER CONFIG!', timestamp: 1748107207825}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748107207828}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748107207828}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_pool_initialize', label: '[Nostr] Pool initialized with relays', value: '["wss://nostr.mom","wss://relay.primal.net","wss://offchain.pub"]', timestamp: 1748107207829}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_filter_created', label: '[Nostr] Created subscription for filter', value: '{"filter":{"kinds":[5050,5100],"#p":["714617896896…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748107207832}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_sub_created', label: '[Nostr] Created 1 subscriptions', value: '{"filters":[{"kinds":[5050,5100],"#p":["7146178968…","wss://relay.primal.net","wss://offchain.pub"]}', timestamp: 1748107207834}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'start_listening_success', label: '714617896896f2838ad6cd25d27b0b6507d1d6e0a5d0072ff65372d123378827', value: 'Relays: 3, Kinds: 5050,5100', timestamp: 1748107207834}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:admin', action: 'check_listening_status', value: 'active', timestamp: 1748107207846}
SellComputePane.tsx:168 DVM Service start command successful.
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'received_job_request', label: '9f20a17d3f410dffca4da4fa1b95ee9814cde7212266434866a67296b6fc598e', value: 'Kind: 5050', timestamp: 1748107208309}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_request_received', label: '9f20a17d3f410dffca4da4fa1b95ee9814cde7212266434866a67296b6fc598e', value: 'Kind: 5050', timestamp: 1748107208311}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_start', label: 'Amount: 3 sats', value: '{"amountSats":3,"memo":"NIP-90 DVM Job 9f20a17d | Kind: 5050 | Tokens: ~293 | Encrypted"}', timestamp: 1748107208318}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_eose_received', label: '[Nostr] EOSE received', timestamp: 1748107208811}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'eose_received', label: '', timestamp: 1748107208811}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748107208830}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748107208830}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 0 pending jobs', timestamp: 1748107209831}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'no_pending_jobs_to_check', timestamp: 1748107209832}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_success', label: 'Invoice created: lnbc30n1p5rrl7fpp5ec...', value: 'ce3a4b02e93ce39e90a8c3b67129c50c36a41f114f6e0272773ceb88a885f03e', timestamp: 1748107210166}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'creating_feedback_event', label: 'Job: 9f20a17d3f410dffca4da4fa1b95ee9814cde72122664…om pubkey: 97db147eb0... status: payment-required', timestamp: 1748107210167}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'finalizing_kind_7000_event', label: 'Finalizing Kind 7000 event template with tags', value: '[["e","9f20a17d3f410dffca4da4fa1b95ee9814cde721226…7rkv86udkyfuxr7tm6gjqy2nduddqwnlyy8mmusqxrfu79"]]', timestamp: 1748107210167}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '0bce9d54a1cffe75ace9a6ec695e6f998039447d4cb5499bb0ba47f99c409908', timestamp: 1748107210174}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:warn', action: 'nostr_publish_partial_failure', label: '[Nostr] Partially published event 0bce9d54a1cffe75…d4cb5499bb0ba47f99c409908: 2 succeeded, 1 failed.', value: 'Failures: Error: Policy violated and pubkey is not in our web of trust.', timestamp: 1748107210347}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'payment_requested', label: '9f20a17d3f410dffca4da4fa1b95ee9814cde7212266434866a67296b6fc598e', value: '3 sats', timestamp: 1748107210347}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_pending_payment', label: '9f20a17d3f410dffca4da4fa1b95ee9814cde7212266434866a67296b6fc598e', value: '{"priceSats":3,"estimatedTokens":293,"encrypted":true}', timestamp: 1748107210348}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748107210833}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: 9f20a17d3f410dffca4da4fa1b95ee9814cde7212266434866a67296b6fc598e, Attempt: 1', value: 'Invoice: lnbc30n1p5rrl7fpp5ec...', timestamp: 1748107210834}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rrl7fpp5ec...', timestamp: 1748107210836}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rrl7fpp5ec..."}', timestamp: 1748107210837}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: '9f20a17d3f410dffca4da4fa1b95ee9814cde7212266434866a67296b6fc598e', value: 'Attempt: 1', timestamp: 1748107210837}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107211592}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748107211839}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 27 sats', value: 'Token count: 0', timestamp: 1748107211903}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748107212841}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748107213843}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748107214845}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748107215846}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748107216848}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107216905}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 27 sats', value: 'Token count: 0', timestamp: 1748107217232}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 1 pending jobs', timestamp: 1748107217850}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:event', action: 'received_job_request', label: '858cc17e758588900b42a9d43a581affadf40394eb4d2bd933c20a9bb2a73d9b', value: 'Kind: 5050', timestamp: 1748107217931}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_request_received', label: '858cc17e758588900b42a9d43a581affadf40394eb4d2bd933c20a9bb2a73d9b', value: 'Kind: 5050', timestamp: 1748107217931}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_start', label: 'Amount: 3 sats', value: '{"amountSats":3,"memo":"NIP-90 DVM Job 858cc17e | Kind: 5050 | Tokens: ~48 | Encrypted"}', timestamp: 1748107217934}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'create_invoice_success', label: 'Invoice created: lnbc30n1p5rrl7jpp5ec...', value: 'ce04b5b5ac9a8d1729b42b06ba8a2bb25d1dc766e5441852b5ca073c80abb93b', timestamp: 1748107218850}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'creating_feedback_event', label: 'Job: 858cc17e758588900b42a9d43a581affadf40394eb4d2…om pubkey: 7f6eac97f2... status: payment-required', timestamp: 1748107218850}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'finalizing_kind_7000_event', label: 'Finalizing Kind 7000 event template with tags', value: '[["e","858cc17e758588900b42a9d43a581affadf40394eb4…e955772neuzrxvpdetnuc6r3wuz7x6fgpnduu3sp2395cc"]]', timestamp: 1748107218851}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: 'aee58377758b3d7bd13cc764d9de9e8e4dbc81461b08b9b8967d6acb33a62387', timestamp: 1748107218856}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748107218857}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: 9f20a17d3f410dffca4da4fa1b95ee9814cde7212266434866a67296b6fc598e, Attempt: 2', value: 'Invoice: lnbc30n1p5rrl7fpp5ec...', timestamp: 1748107218857}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rrl7fpp5ec...', timestamp: 1748107218857}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rrl7fpp5ec..."}', timestamp: 1748107218857}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment', action: 'OPTIMISTIC_PROCESSING_TRIGGERED', label: '9f20a17d3f410dffca4da4fa1b95ee9814cde7212266434866a67296b6fc598e', value: 'After 2 attempts - FAST MODE', timestamp: 1748107218857}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'processing_optimistic', label: '9f20a17d3f410dffca4da4fa1b95ee9814cde7212266434866a67296b6fc598e', value: '3 sats (FAST MODE)', timestamp: 1748107218857}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'creating_feedback_event', label: 'Job: 9f20a17d3f410dffca4da4fa1b95ee9814cde72122664…50) from pubkey: 97db147eb0... status: processing', timestamp: 1748107218857}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'finalizing_kind_7000_event', label: 'Finalizing Kind 7000 event template with tags', value: '[["e","9f20a17d3f410dffca4da4fa1b95ee9814cde721226…atus","processing","Processing your request..."]]', timestamp: 1748107218858}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: 'f48b40e8637af6346e12d9e64fddfc1df8ad715e17b93c84876e4a2459e079ec', timestamp: 1748107218859}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:warn', action: 'nostr_publish_partial_failure', label: '[Nostr] Partially published event aee58377758b3d7b…61b08b9b8967d6acb33a62387: 2 succeeded, 1 failed.', value: 'Failures: Error: Policy violated and pubkey is not in our web of trust.', timestamp: 1748107219027}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'payment_requested', label: '858cc17e758588900b42a9d43a581affadf40394eb4d2bd933c20a9bb2a73d9b', value: '3 sats', timestamp: 1748107219028}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'job_pending_payment', label: '858cc17e758588900b42a9d43a581affadf40394eb4d2bd933c20a9bb2a73d9b', value: '{"priceSats":3,"estimatedTokens":48,"encrypted":true}', timestamp: 1748107219028}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:warn', action: 'nostr_publish_partial_failure', label: '[Nostr] Partially published event f48b40e8637af634…e17b93c84876e4a2459e079ec: 2 succeeded, 1 failed.', value: 'Failures: Error: Policy violated and pubkey is not in our web of trust.', timestamp: 1748107219029}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'ai_model_selected', label: 'Job ID: 9f20a17d3f410dffca4da4fa1b95ee9814cde7212266434866a67296b6fc598e', value: 'Using model: devstral (requested: devstral, default: gemma2:latest)', timestamp: 1748107219036}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:nonstream', action: 'create_start', label: 'gemma3:1b', timestamp: 1748107219037}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:nonstream', action: 'create_success', label: 'gemma3:1b', timestamp: 1748107219180}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: 'a2c7a2ae6a05acdf536d5f0580e7f15eb78df6ed0e7ae215a769b2c791e9caf3', timestamp: 1748107219185}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:warn', action: 'nostr_publish_partial_failure', label: '[Nostr] Partially published event a2c7a2ae6a05acdf…d0e7ae215a769b2c791e9caf3: 2 succeeded, 1 failed.', value: 'Failures: Error: Policy violated and pubkey is not in our web of trust.', timestamp: 1748107219358}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'optimistic_result_sent_awaiting_payment', label: '9f20a17d3f410dffca4da4fa1b95ee9814cde7212266434866a67296b6fc598e', timestamp: 1748107219358}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'optimistic_job_result_published', label: '9f20a17d3f410dffca4da4fa1b95ee9814cde7212266434866a67296b6fc598e', value: 'a2c7a2ae6a05acdf536d5f0580e7f15eb78df6ed0e7ae215a769b2c791e9caf3', timestamp: 1748107219359}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: 858cc17e758588900b42a9d43a581affadf40394eb4d2bd933c20a9bb2a73d9b, Attempt: 1', value: 'Invoice: lnbc30n1p5rrl7jpp5ec...', timestamp: 1748107219359}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rrl7jpp5ec...', timestamp: 1748107219359}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rrl7jpp5ec..."}', timestamp: 1748107219360}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: '858cc17e758588900b42a9d43a581affadf40394eb4d2bd933c20a9bb2a73d9b', value: 'Attempt: 1', timestamp: 1748107219360}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748107220361}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748107221364}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107222235}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748107222365}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 27 sats', value: 'Token count: 0', timestamp: 1748107222553}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748107223367}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748107224369}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748107225370}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748107226372}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748107227374}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: 858cc17e758588900b42a9d43a581affadf40394eb4d2bd933c20a9bb2a73d9b, Attempt: 2', value: 'Invoice: lnbc30n1p5rrl7jpp5ec...', timestamp: 1748107227374}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rrl7jpp5ec...', timestamp: 1748107227375}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rrl7jpp5ec..."}', timestamp: 1748107227375}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment', action: 'OPTIMISTIC_PROCESSING_TRIGGERED', label: '858cc17e758588900b42a9d43a581affadf40394eb4d2bd933c20a9bb2a73d9b', value: 'After 2 attempts - FAST MODE', timestamp: 1748107227376}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'processing_optimistic', label: '858cc17e758588900b42a9d43a581affadf40394eb4d2bd933c20a9bb2a73d9b', value: '3 sats (FAST MODE)', timestamp: 1748107227376}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'creating_feedback_event', label: 'Job: 858cc17e758588900b42a9d43a581affadf40394eb4d2…50) from pubkey: 7f6eac97f2... status: processing', timestamp: 1748107227376}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:feedback', action: 'finalizing_kind_7000_event', label: 'Finalizing Kind 7000 event template with tags', value: '[["e","858cc17e758588900b42a9d43a581affadf40394eb4…atus","processing","Processing your request..."]]', timestamp: 1748107227377}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: 'dc2585272846f3d636b348642260849578fbe4bd2a6932eb1b2fd70ff83f8705', timestamp: 1748107227382}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107227555}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:warn', action: 'nostr_publish_partial_failure', label: '[Nostr] Partially published event dc2585272846f3d6…d2a6932eb1b2fd70ff83f8705: 2 succeeded, 1 failed.', value: 'Failures: Error: Policy violated and pubkey is not in our web of trust.', timestamp: 1748107227668}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'ai_model_selected', label: 'Job ID: 858cc17e758588900b42a9d43a581affadf40394eb4d2bd933c20a9bb2a73d9b', value: 'Using model: devstral (requested: devstral, default: gemma2:latest)', timestamp: 1748107227675}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:nonstream', action: 'create_start', label: 'gemma3:1b', timestamp: 1748107227675}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'ollama_adapter:nonstream', action: 'create_success', label: 'gemma3:1b', timestamp: 1748107227758}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:info', action: 'nostr_publish_begin', label: '[Nostr] Publishing event', value: '1698f77d8ada20b68f002317b851451c4fff55051c0dc9f8b4be53d515e35bbe', timestamp: 1748107227762}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 27 sats', value: 'Token count: 0', timestamp: 1748107227853}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'log:warn', action: 'nostr_publish_partial_failure', label: '[Nostr] Partially published event 1698f77d8ada20b6…51c0dc9f8b4be53d515e35bbe: 2 succeeded, 1 failed.', value: 'Failures: Error: Policy violated and pubkey is not in our web of trust.', timestamp: 1748107227950}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'optimistic_result_sent_awaiting_payment', label: '858cc17e758588900b42a9d43a581affadf40394eb4d2bd933c20a9bb2a73d9b', timestamp: 1748107227951}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:job', action: 'optimistic_job_result_published', label: '858cc17e758588900b42a9d43a581affadf40394eb4d2bd933c20a9bb2a73d9b', value: '1698f77d8ada20b68f002317b851451c4fff55051c0dc9f8b4be53d515e35bbe', timestamp: 1748107227951}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748107228953}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748107229954}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748107230956}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'individual_invoice_check_start', label: 'Job ID: 9f20a17d3f410dffca4da4fa1b95ee9814cde7212266434866a67296b6fc598e, Attempt: 3', value: 'Invoice: lnbc30n1p5rrl7fpp5ec...', timestamp: 1748107230957}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_start', label: 'Checking invoice: lnbc30n1p5rrl7fpp5ec...', timestamp: 1748107230957}
SparkServiceImpl.ts:976 [SparkService] checkInvoiceStatus raw response: null
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:lightning', action: 'check_invoice_status_success', label: 'Invoice status: pending', value: '{"invoice":"lnbc30n1p5rrl7fpp5ec..."}', timestamp: 1748107230958}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'invoice_still_pending', label: '9f20a17d3f410dffca4da4fa1b95ee9814cde7212266434866a67296b6fc598e', value: 'Attempt: 3', timestamp: 1748107230958}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748107231959}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_start', label: 'Fetching balance', value: '', timestamp: 1748107232855}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748107232960}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'spark:balance', action: 'get_balance_success', label: 'Balance: 27 sats', value: 'Token count: 0', timestamp: 1748107233161}
TelemetryServiceImpl.ts:111 [Telemetry] {category: 'dvm:payment_check', action: 'check_all_invoices_start', label: 'Checking 2 pending jobs', timestamp: 1748107233962}
