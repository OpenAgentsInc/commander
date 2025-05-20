import { Context, Effect, Layer } from 'effect';
import { TelemetryService } from '@/services/telemetry';
import {
  CreateLightningInvoiceParams,
  LightningInvoice,
  LightningPayment,
  PayLightningInvoiceParams,
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
  BalanceInfo
} from './SparkService';

// Import the Spark SDK with all its types
import { 
  AuthenticationError, 
  ConfigurationError, 
  NetworkError, 
  NotImplementedError, 
  RPCError, 
  SparkSDKError, 
  ValidationError
} from '@buildonspark/spark-sdk';
import { SparkNotImplementedError } from './SparkService';
import { SparkWallet } from '@buildonspark/spark-sdk';

// Define interfaces for SDK types that we interact with

// SparkWallet initialization options - using any for compatibility with actual SDK
interface SparkWalletInitOptions {
  mnemonicOrSeed?: string | Uint8Array;
  accountNumber?: number;
  options?: Record<string, unknown>;
}

// Since we don't have the actual SDK types, we'll use a more generic approach
// that will work with the actual SDK without needing to define all the exact types

// SDK response types
interface SDKLightningInvoice {
  invoice: {
    encodedInvoice: string;
    paymentHash: string;
    // Other fields the SDK might return
  };
}

interface SDKLightningPayment {
  id?: string;
  paymentHash?: string;
  amountSats?: number;
  feeSats?: number;
  status?: string;
  destination?: string;
  // Other fields the SDK might return
}

interface SDKBalanceInfo {
  balance: bigint;
  tokenBalances?: Map<string, {
    balance: bigint;
    tokenInfo: {
      tokenPublicKey?: string;
      tokenName?: string;
      tokenSymbol?: string;
      tokenDecimals?: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/**
 * Implements the SparkService interface using the Spark SDK
 */
export const SparkServiceLive = Layer.effect(
  SparkService,
  Effect.gen(function* (_) {
    // Get dependencies from the context
    const sparkConfig = yield* _(SparkServiceConfigTag);
    const telemetry = yield* _(TelemetryService);

    // Initialize the SparkWallet instance
    const wallet = yield* _(
      Effect.tryPromise({
        try: async () => {
          // Track wallet initialization in telemetry
          await Effect.runPromise(telemetry.trackEvent({
            category: 'spark:init',
            action: 'wallet_initialize_start',
            label: `Network: ${sparkConfig.network}`,
            value: sparkConfig.accountNumber?.toString() || '0'
          }));

          // Initialize the SparkWallet using the provided configuration
          // Use the config directly, assuming the SDK can handle our config object structure
          // This would be better typed with actual SDK types, but we're mocking it
          const { wallet } = await SparkWallet.initialize({
            mnemonicOrSeed: sparkConfig.mnemonicOrSeed,
            accountNumber: sparkConfig.accountNumber,
            options: sparkConfig.sparkSdkOptions
          } as any); // Using any here is acceptable since we're working with a mocked SDK

          // Track successful initialization
          await Effect.runPromise(telemetry.trackEvent({
            category: 'spark:init',
            action: 'wallet_initialize_success',
            label: `Network: ${sparkConfig.network}`,
            value: 'success'
          }));

          return wallet;
        },
        catch: (e) => {
          // Track initialization failure
          Effect.runSync(telemetry.trackEvent({
            category: 'spark:init',
            action: 'wallet_initialize_failure',
            label: e instanceof Error ? e.message : 'Unknown error',
            value: JSON.stringify({ accountNumber: sparkConfig.accountNumber })
          }));

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

    // Return the implementation of the SparkService interface
    return {
      /**
       * Creates a Lightning invoice for receiving payments
       */
      createLightningInvoice: (params: CreateLightningInvoiceParams) =>
        Effect.gen(function* (_) {
          // Track the start of the operation
          yield* _(telemetry.trackEvent({
            category: 'spark:lightning',
            action: 'create_invoice_start',
            label: `Amount: ${params.amountSats} sats`,
            value: JSON.stringify(params)
          }));

          return yield* _(
            Effect.tryPromise({
              try: async () => {
                // Call the SDK method
                const sdkResult = await wallet.createLightningInvoice(params) as SDKLightningInvoice;
                
                // Map SDK result to our interface type
                const result: LightningInvoice = {
                  invoice: {
                    encodedInvoice: sdkResult.invoice.encodedInvoice,
                    paymentHash: sdkResult.invoice.paymentHash,
                    amountSats: params.amountSats, // Use the amount from our params
                    createdAt: Math.floor(Date.now() / 1000), // Current timestamp as approximation
                    expiresAt: Math.floor(Date.now() / 1000) + (params.expirySeconds || 3600), // Default 1hr
                    memo: params.memo
                  }
                };
                
                return result;
              },
              catch: (e) => {
                // Map the error to the appropriate type
                if (e instanceof ValidationError) {
                  return new SparkValidationError({
                    message: 'Invalid parameters for Lightning invoice creation',
                    cause: e,
                    context: { params }
                  });
                }
                if (e instanceof NetworkError) {
                  return new SparkConnectionError({
                    message: 'Network error during Lightning invoice creation',
                    cause: e,
                    context: { params }
                  });
                }
                if (e instanceof RPCError) {
                  return new SparkRPCError({
                    message: 'RPC error during Lightning invoice creation',
                    cause: e,
                    context: { params }
                  });
                }
                if (e instanceof AuthenticationError) {
                  return new SparkAuthenticationError({
                    message: 'Authentication error during Lightning invoice creation',
                    cause: e,
                    context: { params }
                  });
                }
                if (e instanceof NotImplementedError) {
                  return new SparkNotImplementedError({
                    message: 'Lightning invoice creation not implemented in this environment',
                    cause: e,
                    context: { params }
                  });
                }
                if (e instanceof SparkSDKError) {
                  return new SparkLightningError({
                    message: 'SDK error during Lightning invoice creation',
                    cause: e,
                    context: { params }
                  });
                }
                
                // Default fallback for unknown errors
                return new SparkLightningError({
                  message: 'Failed to create Lightning invoice via SparkSDK',
                  cause: e,
                  context: { amountSats: params.amountSats }
                });
              }
            }),
            Effect.tapBoth({
              onSuccess: (invoice: LightningInvoice) => telemetry.trackEvent({
                category: 'spark:lightning',
                action: 'create_invoice_success',
                label: `Invoice created: ${invoice.invoice.encodedInvoice.substring(0, 20)}...`,
                value: invoice.invoice.paymentHash
              }),
              onFailure: (err) => telemetry.trackEvent({
                category: 'spark:lightning',
                action: 'create_invoice_failure',
                label: err.message,
                value: JSON.stringify(err.context)
              })
            })
          );
        }),

      /**
       * Pays a Lightning invoice
       */
      payLightningInvoice: (params: PayLightningInvoiceParams) =>
        Effect.gen(function* (_) {
          // Track the start of the operation
          yield* _(telemetry.trackEvent({
            category: 'spark:lightning',
            action: 'pay_invoice_start',
            label: `Invoice: ${params.invoice.substring(0, 20)}...`,
            value: JSON.stringify({
              maxFeeSats: params.maxFeeSats,
              timeoutSeconds: params.timeoutSeconds
            })
          }));

          return yield* _(
            Effect.tryPromise({
              try: async () => {
                // Call the SDK method
                const sdkResult = await wallet.payLightningInvoice({
                  invoice: params.invoice,
                  maxFeeSats: params.maxFeeSats
                }) as SDKLightningPayment;
                
                // Map SDK result to our interface type
                const result: LightningPayment = {
                  payment: {
                    id: sdkResult.id || 'unknown-id',
                    paymentHash: sdkResult.paymentHash || 'unknown-hash',
                    amountSats: sdkResult.amountSats || 0,
                    feeSats: sdkResult.feeSats || 0,
                    createdAt: Math.floor(Date.now() / 1000),
                    status: 'SUCCESS', // Assume success if we get here
                    destination: sdkResult.destination
                  }
                };
                
                return result;
              },
              catch: (e) => {
                // Map the error to the appropriate type
                const invoicePrefix = params.invoice.substring(0, 20) + '...';
                const errorContext = { invoice: invoicePrefix };

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
            Effect.tapBoth({
              onSuccess: (payment: LightningPayment) => telemetry.trackEvent({
                category: 'spark:lightning',
                action: 'pay_invoice_success',
                label: `Payment status: ${payment.payment.status}`,
                value: `Amount: ${payment.payment.amountSats}, Fee: ${payment.payment.feeSats}`
              }),
              onFailure: (err) => telemetry.trackEvent({
                category: 'spark:lightning',
                action: 'pay_invoice_failure',
                label: err.message,
                value: JSON.stringify(err.context)
              })
            })
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
                // Call the SDK method
                const sdkResult = await wallet.getBalance() as SDKBalanceInfo;
                
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
            Effect.tapBoth({
              onSuccess: (balance) => telemetry.trackEvent({
                category: 'spark:balance',
                action: 'get_balance_success',
                label: `Balance: ${balance.balance} sats`,
                value: `Token count: ${balance.tokenBalances.size}`
              }),
              onFailure: (err) => telemetry.trackEvent({
                category: 'spark:balance',
                action: 'get_balance_failure',
                label: err.message,
                value: JSON.stringify(err.context)
              })
            })
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
            Effect.tapBoth({
              onSuccess: (address) => telemetry.trackEvent({
                category: 'spark:deposit',
                action: 'get_deposit_address_success',
                label: `Address: ${address.substring(0, 10)}...`,
                value: address
              }),
              onFailure: (err) => telemetry.trackEvent({
                category: 'spark:deposit',
                action: 'get_deposit_address_failure',
                label: err.message,
                value: JSON.stringify(err.context)
              })
            })
          );
        })
    };
  })
);