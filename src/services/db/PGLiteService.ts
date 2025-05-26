import { Context, Effect, Layer, Data } from "effect";
import { PGlite } from "@electric-sql/pglite";
import path from "path";
import { app } from "electron";
import fs from "fs";
import { ConfigurationService } from "@/services/configuration";
import { TelemetryService } from "@/services/telemetry";

export class PGliteError extends Data.TaggedError("PGliteError")<{
  message: string;
  cause?: unknown;
}> {}

export interface PGLiteService {
  readonly client: PGlite;
}
export const PGLiteService = Context.GenericTag<PGLiteService>("PGLiteService");

export const PGLiteServiceLive = Layer.effect(
  PGLiteService,
  Effect.gen(function*(_) {
    const configService = yield* _(ConfigurationService);
    const telemetry = yield* _(TelemetryService);
    const dbDataDirName = yield* _(configService.get("DB_DATA_DIR"));

    const userDataPath = app.getPath("userData");
    const dataDir = path.join(userDataPath, dbDataDirName);

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    yield* _(telemetry.trackEvent({ 
      category: "db_setup", 
      action: "pglite_service_init_start", 
      label: `Data Dir: ${dataDir}` 
    }));

    const pgliteClient = yield* _(Effect.tryPromise({
      try: async () => {
        const client = new PGlite(`file://${dataDir}`); // Ensure file:// prefix for Node persistence
        await client.waitReady;
        return client;
      },
      catch: (cause) => new PGliteError({ 
        message: "Failed to initialize PGlite client (main process)", 
        cause 
      })
    }));

    yield* _(telemetry.trackEvent({ 
      category: "db_setup", 
      action: "pglite_service_init_success", 
      label: "PGlite client ready (main process)" 
    }));
    
    return PGLiteService.of({ client: pgliteClient });
  })
);