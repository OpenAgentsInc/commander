// Mock implementation of SparkService for testing purposes
// This avoids the ECC library issues that come from the real Spark SDK

import { Context, Effect, Layer } from "effect";
import { TelemetryService } from "@/services/telemetry";
import {
  CreateLightningInvoiceParams,
  LightningInvoice,
  LightningPayment,
  PayLightningInvoiceParams,
  SparkService,
  SparkServiceConfig,
  SparkServiceConfigTag,
  BalanceInfo,
  SparkLightningError,
  SparkBalanceError,
  SparkConnectionError,
  SparkValidationError,
} from "./SparkService";

/**
 * Test implementation of SparkService that doesn't use the actual Spark SDK
 * This avoids ECC library dependency issues in tests
 */
export const SparkServiceTestLive = Layer.effect(
  SparkService,
  Effect.gen(function* (_) {
    const sparkConfig = yield* _(SparkServiceConfigTag);
    const telemetry = yield* _(TelemetryService);

    return SparkService.of({
      createLightningInvoice: (params: CreateLightningInvoiceParams) =>
        Effect.gen(function* (_) {
          yield* _(
            telemetry.trackEvent({
              category: "spark:lightning",
              action: "create_invoice_start",
              value: String(params.amountSats),
            })
          );

          // Mock invoice creation with network-appropriate prefix
          const invoicePrefix = sparkConfig.network === "MAINNET" ? "lnbc" : 
                               sparkConfig.network === "REGTEST" ? "lnbcrt" : 
                               sparkConfig.network === "LOCAL" ? "lnbcrt" : "lntb";
          const mockInvoice: LightningInvoice = {
            invoice: {
              encodedInvoice: `${invoicePrefix}${params.amountSats}n1mock_invoice_${Date.now()}`,
              paymentHash: `mock_hash_${Date.now()}`,
              amountSats: params.amountSats,
              createdAt: Date.now(),
              expiresAt: Date.now() + (params.expirySeconds || 3600) * 1000,
              memo: params.memo,
            }
          };

          yield* _(
            telemetry.trackEvent({
              category: "spark:lightning",
              action: "create_invoice_success",
              value: String(params.amountSats),
            })
          );

          return mockInvoice;
        }),

      payLightningInvoice: (params: PayLightningInvoiceParams) =>
        Effect.gen(function* (_) {
          yield* _(
            telemetry.trackEvent({
              category: "spark:lightning",
              action: "pay_invoice_start",
              label: params.invoice.substring(0, 20),
            })
          );

          // Mock payment processing
          if (params.invoice.includes("fail")) {
            yield* _(
              telemetry.trackEvent({
                category: "spark:lightning",
                action: "pay_invoice_failed",
                label: "Mock payment failure",
              })
            );
            return yield* _(
              Effect.fail(
                new SparkLightningError({
                  message: "Mock payment failed for testing",
                  context: { invoice: params.invoice },
                })
              )
            );
          }

          const mockPayment: LightningPayment = {
            payment: {
              id: `mock_payment_${Date.now()}`,
              paymentHash: `mock_hash_${Date.now()}`,
              amountSats: 1000, // Mock amount
              feeSats: 10, // Mock fee
              createdAt: Date.now(),
              status: "SUCCESS",
              destination: "mock_destination",
            }
          };

          yield* _(
            telemetry.trackEvent({
              category: "spark:lightning",
              action: "pay_invoice_success",
              label: params.invoice.substring(0, 20),
            })
          );

          return mockPayment;
        }),

      getBalance: () =>
        Effect.gen(function* (_) {
          yield* _(
            telemetry.trackEvent({
              category: "spark:balance",
              action: "get_balance_start",
            })
          );

          // Mock balance - return 0 if no real wallet initialized
          const isNoWallet = sparkConfig.mnemonicOrSeed === "mock_no_wallet";
          const mockBalance: BalanceInfo = {
            balance: isNoWallet ? BigInt(0) : BigInt(100000), // 0 for no wallet, 100k for tests
            tokenBalances: isNoWallet ? new Map() : new Map([
              ["mock_token_1", {
                balance: BigInt(50000),
                tokenInfo: {
                  tokenId: "mock_token_1",
                  name: "Mock Token",
                  symbol: "MOCK",
                  decimals: 8,
                }
              }]
            ])
          };

          yield* _(
            telemetry.trackEvent({
              category: "spark:balance",
              action: "get_balance_success",
              label: `Balance: ${mockBalance.balance} sats${isNoWallet ? ' (no wallet)' : ''}`,
              value: `Token count: ${mockBalance.tokenBalances.size}`,
            })
          );

          return mockBalance;
        }),

      getSingleUseDepositAddress: () =>
        Effect.gen(function* (_) {
          yield* _(
            telemetry.trackEvent({
              category: "spark:address",
              action: "generate_address_start",
            })
          );

          // Mock address generation
          const mockAddress = `mock_address_${Date.now()}_${Math.random().toString(36).substring(7)}`;

          yield* _(
            telemetry.trackEvent({
              category: "spark:address",
              action: "generate_address_success",
              value: mockAddress,
            })
          );

          return mockAddress;
        }),

      checkWalletStatus: () =>
        Effect.gen(function* (_) {
          yield* _(
            telemetry.trackEvent({
              category: "spark:status",
              action: "check_wallet_status_start",
            })
          );

          // Mock wallet status check
          const isReady = sparkConfig.network !== undefined;

          yield* _(
            telemetry.trackEvent({
              category: "spark:status",
              action: "check_wallet_status_success",
              label: isReady ? "Wallet ready, balance: 0" : "Wallet not ready",
            })
          );

          return isReady;
        }),

      checkInvoiceStatus: (invoiceBolt11: string) =>
        Effect.gen(function* (_) {
          yield* _(
            telemetry.trackEvent({
              category: "spark:invoice",
              action: "check_status_start",
              label: invoiceBolt11.substring(0, 20),
            })
          );

          // Mock invoice status check
          let status: "pending" | "paid" | "expired" | "error";
          let amountPaidMsats: number | undefined;

          if (invoiceBolt11.includes("paid")) {
            status = "paid";
            amountPaidMsats = 1000000; // 1000 sats in msats
          } else if (invoiceBolt11.includes("expired")) {
            status = "expired";
          } else if (invoiceBolt11.includes("error")) {
            status = "error";
          } else {
            status = "pending";
          }

          yield* _(
            telemetry.trackEvent({
              category: "spark:invoice",
              action: "check_status_success",
              label: `Status: ${status}`,
              value: amountPaidMsats ? String(amountPaidMsats) : undefined,
            })
          );

          return { status, amountPaidMsats };
        }),
    });
  })
);

// Test configuration layer that doesn't cause ECC issues
export const TestSparkServiceConfigLayer = Layer.succeed(
  SparkServiceConfigTag,
  {
    network: "MAINNET",
    mnemonicOrSeed: "test test test test test test test test test test test junk",
    accountNumber: 2,
    sparkSdkOptions: {
      grpcUrl: "http://localhost:8080",
      authToken: "test_token",
    },
  } satisfies SparkServiceConfig
);