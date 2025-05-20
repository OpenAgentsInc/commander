import { Context, Effect, Layer, Schema, Cause } from 'effect';
import { TelemetryService, TelemetryServiceConfigTag } from '@/services/telemetry';
import {
  CreateLightningInvoiceParams,
  CreateLightningInvoiceParamsSchema,
  LightningInvoice,
  LightningPayment,
  PayLightningInvoiceParams,
  PayLightningInvoiceParamsSchema,
  SparkAuthenticationError,
  SparkBalanceError,
  SparkConfigError,
  SparkConnectionError,
  SparkError,
  SparkLightningError,
  SparkRPCError,
  SparkService,
  SparkServiceConfig,
  SparkServiceConfigTag,
  SparkTransactionError,
  SparkValidationError,
  BalanceInfo,
  SparkNotImplementedError
} from './SparkService';

// Import the Spark SDK with all its types
import { 
  AuthenticationError, 
  ConfigurationError, 
  NetworkError, 
  NotImplementedError, 
  RPCError, 
  SparkSDKError, 
  ValidationError,
  SparkWallet
} from '@buildonspark/spark-sdk';

/**
 * Implements the SparkService interface using the Spark SDK
 */
export const SparkServiceLive = Layer.scoped(
  SparkService,
  Effect.gen(function* (_) {
    // Get dependencies from the context
    const sparkConfig = yield* _(SparkServiceConfigTag);
    const telemetry = yield* _(TelemetryService);

    // Track wallet initialization start in telemetry
    yield* _(telemetry.trackEvent({
      category: 'spark:init',
      action: 'wallet_initialize_start',
      label: `Network: ${sparkConfig.network}`,
      value: sparkConfig.accountNumber?.toString() || '0'
    }));

    // Initialize the SparkWallet instance
    const wallet = yield* _(
      Effect.tryPromise({
        try: async () => {
          // Initialize the SparkWallet using the provided configuration
          const { wallet } = await SparkWallet.initialize({
            mnemonicOrSeed: sparkConfig.mnemonicOrSeed,
            accountNumber: sparkConfig.accountNumber,
            options: sparkConfig.sparkSdkOptions
          });

          return wallet;
        },
        catch: (e) => {
          // Log the raw error from SparkWallet.initialize via telemetry
          Effect.runFork(telemetry.trackEvent({
            category: "spark:error",
            action: "wallet_initialize_sdk_failure_raw",
            label: `SDK Error: ${e instanceof Error ? e.message : String(e)}`,
            // Attempt to stringify the error, including non-standard properties
            value: JSON.stringify(e, Object.getOwnPropertyNames(e instanceof Error ? e : Object(e)))
          }).pipe(Effect.ignoreLogged)); // Use ignoreLogged for fire-and-forget telemetry
          
          // Map the error to the appropriate type
          if (e instanceof NetworkError) {
            return new SparkConnectionError({
              message: 'Failed to connect to Spark network during initialization',
              cause: e,
              context: { network: sparkConfig.network }
            });
          }
          
          if (e instanceof ConfigurationError) {
            return new SparkConfigError({
              message: 'Invalid configuration for SparkWallet',
              cause: e,
              context: { accountNumber: sparkConfig.accountNumber, network: sparkConfig.network }
            });
          }

          if (e instanceof AuthenticationError) {
            return new SparkAuthenticationError({
              message: 'Authentication failed during SparkWallet initialization',
              cause: e,
              context: { network: sparkConfig.network }
            });
          }
          
          // Default to config error for other cases
          return new SparkConfigError({
            message: 'Failed to initialize SparkWallet',
            cause: e,
            context: { accountNumber: sparkConfig.accountNumber, network: sparkConfig.network }
          });
        }
      })
    );

    // Track successful initialization
    yield* _(telemetry.trackEvent({
      category: 'spark:init',
      action: 'wallet_initialize_success',
      label: `Network: ${sparkConfig.network}`,
      value: 'success'
    }));
    
    // Add finalizer to clean up wallet connections when the layer is released
    yield* _(Effect.addFinalizer(() => {
      // Use Effect.sync to ensure the finalizer itself doesn't have a typed error channel
      return Effect.sync(() => {
        if (typeof wallet.cleanupConnections === 'function') {
          wallet.cleanupConnections()
            .then(() => {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL (Finalizer logging)
              console.log(`[SparkService Finalizer] Wallet connections cleaned up successfully for network: ${sparkConfig.network}.`);
              // Attempt to use telemetry via Effect.runFork (fire-and-forget)
              Effect.runFork(telemetry.trackEvent({
                category: 'spark:dispose',
                action: 'wallet_cleanup_success',
                label: `Network: ${sparkConfig.network}`
              }));
            })
            .catch(error => {
              // TELEMETRY_IGNORE_THIS_CONSOLE_CALL (Finalizer logging)
              console.error(`[SparkService Finalizer] Failed to cleanup wallet connections for network: ${sparkConfig.network}:`, error);
              Effect.runFork(telemetry.trackEvent({
                category: 'spark:dispose',
                action: 'wallet_cleanup_failure',
                label: error instanceof Error ? error.message : 'Unknown cleanup error',
                value: `Network: ${sparkConfig.network}|Error: ${String(error)}`
              }));
            });
        }
        return undefined; // Effect.sync requires a return value
      });
    }));

    // Return the implementation of the SparkService interface
    return {
      /**
       * Creates a Lightning invoice for receiving payments
       */
      createLightningInvoice: (params: CreateLightningInvoiceParams) =>
        Effect.gen(function* (_) {
          // Validate input parameters using the schema
          const validatedParams = yield* _(
            Schema.decodeUnknown(CreateLightningInvoiceParamsSchema)(params).pipe(
              Effect.mapError((parseError) => new SparkValidationError({
                message: "Invalid parameters for createLightningInvoice",
                cause: parseError,
                context: { originalParams: params }
              }))
            )
          );
          
          // Additional validation checks
          if (params.amountSats <= 0) {
            // Fail with validation error for zero or negative amounts
            return yield* _(Effect.fail(new SparkValidationError({
              message: "Invalid parameters for createLightningInvoice: Amount must be greater than 0",
              context: { originalParams: params }
            })));
          }

          // Track the start of the operation - ONLY after successful validation
          yield* _(telemetry.trackEvent({
            category: 'spark:lightning',
            action: 'create_invoice_start',
            label: `Amount: ${validatedParams.amountSats} sats`,
            value: JSON.stringify(validatedParams)
          }));

          // Call the SDK and handle errors
          const sdkResult = yield* _(Effect.tryPromise({
            try: async () => {
              return await wallet.createLightningInvoice(validatedParams);
            },
            catch: (e) => {
              // Map the error to the appropriate type
              const context = { params: validatedParams };
              
              if (e instanceof ValidationError) {
                return new SparkValidationError({
                  message: 'Invalid parameters for Lightning invoice creation',
                  cause: e,
                  context
                });
              }
              if (e instanceof NetworkError) {
                return new SparkConnectionError({
                  message: 'Network error during Lightning invoice creation',
                  cause: e,
                  context
                });
              }
              if (e instanceof RPCError) {
                return new SparkRPCError({
                  message: 'RPC error during Lightning invoice creation',
                  cause: e,
                  context
                });
              }
              if (e instanceof AuthenticationError) {
                return new SparkAuthenticationError({
                  message: 'Authentication error during Lightning invoice creation',
                  cause: e,
                  context
                });
              }
              if (e instanceof NotImplementedError) {
                return new SparkNotImplementedError({
                  message: 'Lightning invoice creation not implemented in this environment',
                  cause: e,
                  context
                });
              }
              if (e instanceof ConfigurationError) {
                return new SparkConfigError({
                  message: 'Configuration error during Lightning invoice creation',
                  cause: e,
                  context
                });
              }
              if (e instanceof SparkSDKError) {
                return new SparkLightningError({
                  message: 'SDK error during Lightning invoice creation',
                  cause: e,
                  context
                });
              }
              
              // Default fallback for unknown errors
              return new SparkLightningError({
                message: 'Failed to create Lightning invoice via SparkSDK',
                cause: e,
                context: { amountSats: validatedParams.amountSats }
              });
            }
          }));
          
          // Map SDK result to our interface type with explicit type
          const result: LightningInvoice = {
            invoice: {
              encodedInvoice: sdkResult.invoice.encodedInvoice,
              paymentHash: sdkResult.invoice.paymentHash,
              // If SDK returns amount, prefer it. Otherwise, use the requested amount
              amountSats: sdkResult.invoice.amount?.originalValue ?? validatedParams.amountSats,
              createdAt: sdkResult.invoice.createdAt ? Date.parse(sdkResult.invoice.createdAt) / 1000 : Math.floor(Date.now() / 1000),
              expiresAt: sdkResult.invoice.expiresAt ? Date.parse(sdkResult.invoice.expiresAt) / 1000 : Math.floor(Date.now() / 1000) + (validatedParams.expirySeconds || 3600), // Default 1hr
              memo: sdkResult.invoice.memo || validatedParams.memo
            }
          };
          
          // Track success
          yield* _(telemetry.trackEvent({
            category: 'spark:lightning',
            action: 'create_invoice_success',
            label: `Invoice created: ${result.invoice.encodedInvoice.substring(0, 20)}...`,
            value: result.invoice.paymentHash
          }));
          
          return result;
        }).pipe(
          // Use tapError to catch and log all errors using the telemetry service
          Effect.tapError(err => telemetry.trackEvent({
            category: 'spark:lightning',
            action: 'create_invoice_failure',
            label: err.message,
            value: JSON.stringify({
              errorMessage: err.message,
              errorName: (err as Error).name,
              errorContext: (err as SparkError).context
            })
          }))
        ),

      /**
       * Pays a Lightning invoice
       */
      payLightningInvoice: (params: PayLightningInvoiceParams) =>
        Effect.gen(function* (_) {
          // Validate input parameters using the schema
          const validatedParams = yield* _(
            Schema.decodeUnknown(PayLightningInvoiceParamsSchema)(params).pipe(
              Effect.mapError((parseError) => new SparkValidationError({
                message: "Invalid parameters for payLightningInvoice",
                cause: parseError,
                context: { originalParams: params }
              }))
            )
          );
          
          // Additional validation checks
          if (!params.invoice || params.invoice.trim().length === 0) {
            return yield* _(Effect.fail(new SparkValidationError({
              message: "Invalid parameters for payLightningInvoice: Invoice string cannot be empty",
              context: { originalParams: params }
            })));
          }
          
          if (params.maxFeeSats < 0) {
            return yield* _(Effect.fail(new SparkValidationError({
              message: "Invalid parameters for payLightningInvoice: Max fee must be non-negative",
              context: { originalParams: params }
            })));
          }
          
          // Track the start of the operation - ONLY after successful validation
          yield* _(telemetry.trackEvent({
            category: 'spark:lightning',
            action: 'pay_invoice_start',
            label: `Invoice: ${validatedParams.invoice.substring(0, 20)}...`,
            value: JSON.stringify({
              maxFeeSats: validatedParams.maxFeeSats,
              timeoutSeconds: validatedParams.timeoutSeconds
            })
          }));

          const sdkResult = yield* _(Effect.tryPromise({
            try: async () => {
              // Call the SDK method with validated params
              return await wallet.payLightningInvoice({
                invoice: validatedParams.invoice,
                maxFeeSats: validatedParams.maxFeeSats
              });
            },
            catch: (e) => {
              // Map the error to the appropriate type
              const invoicePrefix = validatedParams.invoice.substring(0, 20) + '...';
              const errorContext = { invoice: invoicePrefix, params: validatedParams };

              if (e instanceof ValidationError) {
                return new SparkValidationError({
                  message: 'Invalid Lightning invoice format',
                  cause: e,
                  context: errorContext
                });
              }
              if (e instanceof NetworkError) {
                return new SparkConnectionError({
                  message: 'Network error during Lightning payment',
                  cause: e,
                  context: errorContext
                });
              }
              if (e instanceof RPCError) {
                return new SparkRPCError({
                  message: 'RPC error during Lightning payment',
                  cause: e,
                  context: errorContext
                });
              }
              if (e instanceof AuthenticationError) {
                return new SparkAuthenticationError({
                  message: 'Authentication error during Lightning payment',
                  cause: e,
                  context: errorContext
                });
              }
              if (e instanceof NotImplementedError) {
                return new SparkNotImplementedError({
                  message: 'Lightning payment not implemented in this environment',
                  cause: e,
                  context: errorContext
                });
              }
              if (e instanceof ConfigurationError) {
                return new SparkConfigError({
                  message: 'Configuration error during Lightning payment',
                  cause: e,
                  context: errorContext
                });
              }
              if (e instanceof SparkSDKError) {
                return new SparkLightningError({
                  message: 'SDK error during Lightning payment',
                  cause: e,
                  context: errorContext
                });
              }
              
              // Default fallback for unknown errors
              return new SparkLightningError({
                message: 'Failed to pay Lightning invoice via SparkSDK',
                cause: e,
                context: errorContext
              });
            }
          }));
          
          // Map SDK result to our interface type
          // Based on LightningSendRequest from the SDK
          const result: LightningPayment = {
            payment: {
              id: sdkResult.id || 'unknown-id',
              // The SDK uses paymentPreimage, not paymentHash
              paymentHash: sdkResult.paymentPreimage || 'unknown-hash',
              // Prefer actual amount sent by SDK if available
              amountSats: (sdkResult as any).amount?.originalValue || 
                sdkResult.transfer?.totalAmount?.originalValue || 
                // Fallback to fee - not ideal but we need to get payment amount somewhere
                (sdkResult.fee && typeof sdkResult.fee.originalValue === 'number' ? 
                  sdkResult.fee.originalValue : 0),
              // SDK provides fee with CurrencyAmount structure
              feeSats: sdkResult.fee && typeof sdkResult.fee.originalValue === 'number' ? 
                sdkResult.fee.originalValue : 0,
              createdAt: sdkResult.createdAt ? Date.parse(sdkResult.createdAt) / 1000 : Math.floor(Date.now() / 1000),
              // Map actual SDK status to our internal status
              status: String(sdkResult.status).toUpperCase().includes('SUCCESS') ? 'SUCCESS' : 
                (String(sdkResult.status).toUpperCase().includes('PEND') ? 'PENDING' : 'FAILED'),
              // Prefer specific destination field from SDK if available
              destination: (sdkResult as any).destinationNodePubkey || 
                sdkResult.transfer?.sparkId || 
                (sdkResult.encodedInvoice ? sdkResult.encodedInvoice.substring(0, 20) + '...' : 'unknown-destination')
            }
          };
          
          // Track success
          yield* _(telemetry.trackEvent({
            category: 'spark:lightning',
            action: 'pay_invoice_success',
            label: `Payment status: ${result.payment.status}`,
            value: `Amount: ${result.payment.amountSats}, Fee: ${result.payment.feeSats}`
          }));
          
          return result;
        }).pipe(
          // Use tapError to catch and log all errors using the telemetry service
          Effect.tapError(err => telemetry.trackEvent({
            category: 'spark:lightning',
            action: 'pay_invoice_failure',
            label: err.message,
            value: JSON.stringify({
              errorMessage: err.message,
              errorName: (err as Error).name,
              errorContext: (err as SparkError).context
            })
          }))
        ),

      /**
       * Gets the current balance
       */
      getBalance: () =>
        Effect.gen(function* (_) {
          // Track the start of the operation
          yield* _(telemetry.trackEvent({
            category: 'spark:balance',
            action: 'get_balance_start',
            label: 'Fetching balance',
            value: ''
          }));

          const sdkResult = yield* _(Effect.tryPromise({
            try: async () => {
              // Call the SDK method with explicit type inference
              return await wallet.getBalance();
            },
            catch: (e) => {
              // Map the error to the appropriate type
              const errorContext = {};

              if (e instanceof NetworkError) {
                return new SparkConnectionError({
                  message: 'Network error fetching balance',
                  cause: e,
                  context: errorContext
                });
              }
              if (e instanceof AuthenticationError) {
                return new SparkAuthenticationError({
                  message: 'Authentication error fetching balance',
                  cause: e,
                  context: errorContext
                });
              }
              if (e instanceof RPCError) {
                return new SparkRPCError({
                  message: 'RPC error fetching balance',
                  cause: e,
                  context: errorContext
                });
              }
              if (e instanceof ValidationError) {
                return new SparkValidationError({
                  message: 'Validation error fetching balance',
                  cause: e,
                  context: errorContext
                });
              }
              if (e instanceof NotImplementedError) {
                return new SparkNotImplementedError({
                  message: 'Balance retrieval not implemented in this environment',
                  cause: e,
                  context: errorContext
                });
              }
              if (e instanceof ConfigurationError) {
                return new SparkConfigError({
                  message: 'Configuration error during balance retrieval',
                  cause: e,
                  context: errorContext
                });
              }
              if (e instanceof SparkSDKError) {
                return new SparkBalanceError({
                  message: 'SDK error fetching balance',
                  cause: e,
                  context: errorContext
                });
              }
              
              // Default fallback for unknown errors
              return new SparkBalanceError({
                message: 'Failed to get balance via SparkSDK',
                cause: e,
                context: errorContext
              });
            }
          }));
          
          // Map SDK result to our interface type
          const mappedTokenBalances = new Map<string, {
            balance: bigint;
            tokenInfo: {
              tokenId: string;
              name: string;
              symbol: string;
              decimals: number;
            };
          }>();
          
          // Convert the token balance Map if it exists
          if (sdkResult.tokenBalances) {
            for (const [key, value] of sdkResult.tokenBalances.entries()) {
              mappedTokenBalances.set(key, {
                balance: value.balance,
                tokenInfo: {
                  tokenId: value.tokenInfo.tokenPublicKey || key,
                  name: value.tokenInfo.tokenName || 'Unknown Token',
                  symbol: value.tokenInfo.tokenSymbol || 'UNK',
                  decimals: value.tokenInfo.tokenDecimals || 0
                }
              });
            }
          }
          
          const result: BalanceInfo = {
            balance: sdkResult.balance,
            tokenBalances: mappedTokenBalances
          };
          
          // Track success
          yield* _(telemetry.trackEvent({
            category: 'spark:balance',
            action: 'get_balance_success',
            label: `Balance: ${result.balance} sats`,
            value: `Token count: ${result.tokenBalances.size}`
          }));
          
          return result;
        }).pipe(
          // Use tapError to catch and log all errors using the telemetry service
          Effect.tapError(err => telemetry.trackEvent({
            category: 'spark:balance',
            action: 'get_balance_failure',
            label: err.message,
            value: JSON.stringify({
              errorMessage: err.message,
              errorName: (err as Error).name,
              errorContext: (err as SparkError).context
            })
          }))
        ),

      /**
       * Gets a single-use deposit address
       */
      getSingleUseDepositAddress: () =>
        Effect.gen(function* (_) {
          // Track the start of the operation
          yield* _(telemetry.trackEvent({
            category: 'spark:deposit',
            action: 'get_deposit_address_start',
            label: 'Generating new address',
            value: ''
          }));

          const address = yield* _(Effect.tryPromise({
            try: () => wallet.getSingleUseDepositAddress(),
            catch: (e) => {
              // Map the error to the appropriate type
              const errorContext = {};

              if (e instanceof NetworkError) {
                return new SparkConnectionError({
                  message: 'Network error generating deposit address',
                  cause: e,
                  context: errorContext
                });
              }
              if (e instanceof AuthenticationError) {
                return new SparkAuthenticationError({
                  message: 'Authentication error generating deposit address',
                  cause: e,
                  context: errorContext
                });
              }
              if (e instanceof RPCError) {
                return new SparkRPCError({
                  message: 'RPC error generating deposit address',
                  cause: e,
                  context: errorContext
                });
              }
              if (e instanceof ValidationError) {
                return new SparkValidationError({
                  message: 'Validation error generating deposit address',
                  cause: e,
                  context: errorContext
                });
              }
              if (e instanceof NotImplementedError) {
                return new SparkNotImplementedError({
                  message: 'Deposit address generation not implemented in this environment',
                  cause: e,
                  context: errorContext
                });
              }
              if (e instanceof ConfigurationError) {
                return new SparkConfigError({
                  message: 'Configuration error during deposit address generation',
                  cause: e,
                  context: errorContext
                });
              }
              if (e instanceof SparkSDKError) {
                return new SparkTransactionError({
                  message: 'SDK error generating deposit address',
                  cause: e,
                  context: errorContext
                });
              }
              
              // Default fallback for unknown errors
              return new SparkTransactionError({
                message: 'Failed to generate deposit address via SparkSDK',
                cause: e,
                context: errorContext
              });
            }
          }));
          
          // Track success
          yield* _(telemetry.trackEvent({
            category: 'spark:deposit',
            action: 'get_deposit_address_success',
            label: `Address: ${address.substring(0, 10)}...`,
            value: address
          }));
          
          return address;
        }).pipe(
          // Use tapError to catch and log all errors using the telemetry service
          Effect.tapError(err => telemetry.trackEvent({
            category: 'spark:deposit',
            action: 'get_deposit_address_failure',
            label: err.message,
            value: JSON.stringify({
              errorMessage: err.message,
              errorName: (err as Error).name,
              errorContext: (err as SparkError).context
            })
          }))
        ),
        
      /**
       * Checks if the wallet is initialized and connected by attempting a lightweight operation
       */
      checkWalletStatus: () => Effect.gen(function* (_) {
        yield* _(telemetry.trackEvent({
          category: 'spark:status',
          action: 'check_wallet_status_start',
        }).pipe(Effect.ignoreLogged));

        try {
          // Attempting getBalance is a reasonable way to check if wallet is operational
          const balanceInfoSDK = yield* _(
            Effect.tryPromise({
              try: () => wallet.getBalance(),
              catch: (e) => new SparkBalanceError({ message: "getBalance failed during status check", cause: e }),
            })
          );
          
          // If getBalance succeeds, consider wallet connected and ready
          yield* _(telemetry.trackEvent({
            category: 'spark:status',
            action: 'check_wallet_status_success',
            label: `Wallet ready, balance: ${balanceInfoSDK.balance}`,
          }).pipe(Effect.ignoreLogged));
          
          return true;
        } catch (error) {
          const sparkError = error as SparkError;
          
          if (sparkError instanceof SparkConfigError || 
              (sparkError.message && sparkError.message.toLowerCase().includes("initialize"))) {
            yield* _(telemetry.trackEvent({
              category: 'spark:status',
              action: 'check_wallet_status_failure_not_initialized',
              label: sparkError.message,
            }).pipe(Effect.ignoreLogged));
            return false;
          }
          
          yield* _(telemetry.trackEvent({
            category: 'spark:status',
            action: 'check_wallet_status_failure_other',
            label: sparkError.message,
          }).pipe(Effect.ignoreLogged));
          
          return false;
        }
      }),
    };
  })
);