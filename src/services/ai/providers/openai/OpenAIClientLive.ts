// src/services/ai/providers/openai/OpenAIClientLive.ts
import { Layer, Effect, Config, Option, Context, Redacted } from "effect";
import { OpenAiClient } from "@effect/ai-openai"; // Tag from @effect/ai-openai
import {
  ConfigurationService,
  type ConfigError,
} from "@/services/configuration"; // Adjust path and ensure ConfigError is a typed error
import * as HttpClient from "@effect/platform/HttpClient"; // Import everything from HttpClient
import { AiConfigurationError } from "@/services/ai/core/AIError";
import { TelemetryService } from "@/services/telemetry";

export const OpenAIClientLive = Layer.effect(
  OpenAiClient.OpenAiClient, // The service tag this layer provides
  Effect.gen(function* (_) {
    const configService = yield* _(ConfigurationService);
    const httpClient = yield* _(HttpClient.HttpClient); // HttpClient is a dependency
    const telemetry = yield* _(TelemetryService); // For logging configuration attempts

    // Fetch API Key (secret)
    const apiKeyEffect = configService.getSecret("OPENAI_API_KEY").pipe(
      Effect.tapError((e) =>
        telemetry.trackEvent({
          category: "ai:config:error",
          action: "openai_api_key_fetch_failed",
          label: "OPENAI_API_KEY",
          value: (e as Error).message || String(e), // Ensure error message is captured
        }),
      ),
      Effect.mapError(
        (e) =>
          new AiConfigurationError({
            message: "OpenAI API Key not found or configuration error.",
            cause: e,
            context: { keyName: "OPENAI_API_KEY" },
          }),
      ),
      Effect.filterOrFail(
        (key): key is string => typeof key === "string" && key.trim() !== "",
        () =>
          new AiConfigurationError({
            message: "OpenAI API Key cannot be empty.",
          }),
      ),
    );
    const apiKey = yield* _(apiKeyEffect);
    yield* _(
      telemetry.trackEvent({
        category: "ai:config",
        action: "openai_api_key_loaded",
      }),
    );

    // Fetch Base URL (optional)
    const baseUrlEffect = configService.get("OPENAI_BASE_URL").pipe(
      Effect.map(Option.some), // Wrap in Option for optional config
      Effect.catchTag("ConfigError", (e: ConfigError) => {
        // Assuming ConfigError is a tagged error
        // If OPENAI_BASE_URL is not explicitly configured, treat as Option.none()
        // Log that it's not found but don't fail unless it's a different ConfigError type.
        if (e.message.includes("not found")) {
          // Adapt this check to your ConfigError structure
          return Effect.succeed(Option.none<string>());
        }
        return Effect.fail(
          new AiConfigurationError({
            message: "Error fetching OpenAI Base URL configuration.",
            cause: e,
            context: { keyName: "OPENAI_BASE_URL" },
          }),
        );
      }),
      Effect.tapError((e) =>
        telemetry.trackEvent({
          category: "ai:config:error",
          action: "openai_base_url_fetch_failed",
          label: "OPENAI_BASE_URL",
          value: (e as Error).message || String(e),
        }),
      ),
    );
    const baseUrlOption = yield* _(baseUrlEffect);
    if (Option.isSome(baseUrlOption)) {
      yield* _(
        telemetry.trackEvent({
          category: "ai:config",
          action: "openai_base_url_loaded",
          value: baseUrlOption.value,
        }),
      );
    } else {
      yield* _(
        telemetry.trackEvent({
          category: "ai:config",
          action: "openai_base_url_not_configured",
        }),
      );
    }

    // Create a redacted API key for OpenAI client
    const redactedApiKey = Redacted.make(apiKey);

    const clientSetupConfig = {
      apiKey: Config.succeed(redactedApiKey),
      baseUrl: Option.match(baseUrlOption, {
        onNone: () => Config.succeed(undefined), // Use undefined for missing optional value
        onSome: (url) => Config.succeed(url),
      }),
    };

    // OpenAiClient.layerConfig returns Layer<OpenAiClient, never, HttpClient>
    // We provide HttpClient to it to get Layer<OpenAiClient, never, never>
    // then extract the service implementation using Layer.build and Context.get
    const clientLayerWithHttp = Layer.provide(
      OpenAiClient.layerConfig(clientSetupConfig),
      Layer.succeed(HttpClient.HttpClient, httpClient), // Provide the specific HttpClient instance
    );

    // Build the layer in a scoped effect and get the service instance
    const openAiClientService = yield* _(
      Layer.build(clientLayerWithHttp).pipe(
        Effect.map((context) =>
          Context.get(context, OpenAiClient.OpenAiClient),
        ),
        Effect.scoped, // Ensure resources are managed correctly if clientLayerWithHttp has finalizers
      ),
    );

    yield* _(
      telemetry.trackEvent({
        category: "ai:config",
        action: "openai_client_created",
      }),
    );
    return openAiClientService;
  }),
);
