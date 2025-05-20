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
      // Using a simpler approach that doesn't yield any errors to match the expected type signature
      return Effect.sync(() => {
        // Synchronous cleanup to avoid type issues with Effect channels
        if (typeof wallet.cleanupConnections === 'function') {
          try {
            // We need to log success via a fire-and-forget promise
            wallet.cleanupConnections()
              .then(() => {
                // We can't use Effect here due to type constraints with Effect.addFinalizer
                console.log('[SparkService] Wallet connections cleaned up successfully');
                // Try to log to telemetry service, but can't rely on it at this point
                // Can't use Effect here in a finalizer, just log to console
                console.log('[SparkService] Telemetry: wallet_cleanup_success')
              })
              .catch(error => {
                console.error('[SparkService] Failed to cleanup wallet connections', error);
                // Try to log error to telemetry
                // Can't use Effect here in a finalizer, just log to console
                console.log('[SparkService] Telemetry: wallet_cleanup_failure', error instanceof Error ? error.message : String(error))
              });
          } catch (e) {
            console.error('[SparkService] Critical error during wallet.cleanupConnections', e);
          }
        }
        return undefined;
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
          yield* _(
            Effect.flatMap(
              Schema.decodeUnknown(CreateLightningInvoiceParamsSchema)(params),
              () => Effect.succeed(null)
            ),
            Effect.mapError((parseError: unknown) => new SparkValidationError({
              message: "Invalid parameters for createLightningInvoice",
              cause: parseError,
              context: { originalParams: params }
            }))
          );
          
          // Additional validation checks
          if (params.amountSats <= 0) {
            return yield* _(Effect.fail(new SparkValidationError({
              message: "Invalid parameters for createLightningInvoice: Amount must be greater than 0",
              context: { originalParams: params }
            })));
          }
          
          // Use the original params since they already have the correct type
          const validatedParams = params;

          // Track the start of the operation
          yield* _(telemetry.trackEvent({
            category: 'spark:lightning',
            action: 'create_invoice_start',
            label: `Amount: ${validatedParams.amountSats} sats`,
            value: JSON.stringify(validatedParams)
          }));

          return yield* _(
            Effect.tryPromise({
              try: async () => {
                // Call the SDK method with explicit return type
                const sdkResult = await wallet.createLightningInvoice(validatedParams);
                
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
                
                return result;
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
            }),
            Effect.tap((invoice: LightningInvoice) => telemetry.trackEvent({
              category: 'spark:lightning',
              action: 'create_invoice_success',
              label: `Invoice created: ${invoice.invoice.encodedInvoice.substring(0, 20)}...`,
              value: invoice.invoice.paymentHash
            })),
            Effect.tapError((err) => telemetry.trackEvent({
              category: 'spark:lightning',
              action: 'create_invoice_failure',
              label: err.message,
              value: JSON.stringify(err.context)
            }))
          );
        }),

      /**
       * Pays a Lightning invoice
       */
      payLightningInvoice: (params: PayLightningInvoiceParams) =>
        Effect.gen(function* (_) {
          // Validate input parameters using the schema
          yield* _(
            Effect.flatMap(
              Schema.decodeUnknown(PayLightningInvoiceParamsSchema)(params),
              () => Effect.succeed(null)
            ),
            Effect.mapError((parseError: unknown) => new SparkValidationError({
              message: "Invalid parameters for payLightningInvoice",
              cause: parseError,
              context: { originalParams: params }
            }))
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
          
          // Use the original params since they already have the correct type
          const validatedParams = params;
          
          // Track the start of the operation
          yield* _(telemetry.trackEvent({
            category: 'spark:lightning',
            action: 'pay_invoice_start',
            label: `Invoice: ${validatedParams.invoice.substring(0, 20)}...`,
            value: JSON.stringify({
              maxFeeSats: validatedParams.maxFeeSats,
              timeoutSeconds: validatedParams.timeoutSeconds
            })
          }));

          return yield* _(
            Effect.tryPromise({
              try: async () => {
                // Call the SDK method with validated params
                const sdkResult = await wallet.payLightningInvoice({
                  invoice: validatedParams.invoice,
                  maxFeeSats: validatedParams.maxFeeSats
                });
                
                // Map SDK result to our interface type
                // Based on LightningSendRequest from the SDK
                const result: LightningPayment = {
                  payment: {
                    id: sdkResult.id || 'unknown-id',
                    // The SDK uses paymentPreimage, not paymentHash
                    paymentHash: sdkResult.paymentPreimage || 'unknown-hash',
                    // Prefer actual amount sent by SDK if available
                    amountSats: sdkResult.amount?.originalValue || 
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
                    destination: sdkResult.destinationNodePubkey || 
                      sdkResult.transfer?.sparkId || 
                      (sdkResult.encodedInvoice ? sdkResult.encodedInvoice.substring(0, 20) + '...' : 'unknown-destination')
                  }
                };
                
                return result;
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
            }),
            Effect.tap((payment: LightningPayment) => telemetry.trackEvent({
              category: 'spark:lightning',
              action: 'pay_invoice_success',
              label: `Payment status: ${payment.payment.status}`,
              value: `Amount: ${payment.payment.amountSats}, Fee: ${payment.payment.feeSats}`
            })),
            Effect.tapError((err) => telemetry.trackEvent({
              category: 'spark:lightning',
              action: 'pay_invoice_failure',
              label: err.message,
              value: JSON.stringify(err.context)
            }))
          );
        }),

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

          return yield* _(
            Effect.tryPromise({
              try: async () => {
                // Call the SDK method with explicit type inference
                const sdkResult = await wallet.getBalance();
                
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
                
                return result;
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
            }),
            Effect.tap((balance: BalanceInfo) => telemetry.trackEvent({
              category: 'spark:balance',
              action: 'get_balance_success',
              label: `Balance: ${balance.balance} sats`,
              value: `Token count: ${balance.tokenBalances.size}`
            })),
            Effect.tapError((err) => telemetry.trackEvent({
              category: 'spark:balance',
              action: 'get_balance_failure',
              label: err.message,
              value: JSON.stringify(err.context)
            }))
          );
        }),

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

          return yield* _(
            Effect.tryPromise({
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
            }),
            Effect.tap((address: string) => telemetry.trackEvent({
              category: 'spark:deposit',
              action: 'get_deposit_address_success',
              label: `Address: ${address.substring(0, 10)}...`,
              value: address
            })),
            Effect.tapError((err) => telemetry.trackEvent({
              category: 'spark:deposit',
              action: 'get_deposit_address_failure',
              label: err.message,
              value: JSON.stringify(err.context)
            }))
          );
        })
    };
  })
);