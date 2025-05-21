_from OAI deep research_

# **Integrating PGlite into an Electron (Vite/Electron Forge) App**

PGlite is an embeddable WASM‑based Postgres for JavaScript that supports Node and browser persistence . In an Electron app you can instantiate PGlite either in the **main process** (Node context, persisting to the filesystem) or in the **renderer** (browser context, persisting to IndexedDB). You then use the ElectricSQL sync plugin to replicate Postgres data (via “shapes”) into your PGlite tables . Below are best practices and examples for setting this up, along with an EffectTS-based data layer and notes on Vite/Electron bundling.

## **1. Instantiating and Persisting PGlite**

**Main process (Node)**: Use PGlite.create() or new PGlite() with a filesystem path. In Electron’s main process (or preload with NodeIntegration), you can do:

```
import { PGlite } from '@electric-sql/pglite';
import path from 'path';
import { app } from 'electron';

const dataDir = path.join(app.getPath('userData'), 'pglite-db');
const pg = await PGlite.create(`file://${dataDir}`);
// Now `pg` is a PGlite Postgres. Create tables or query as usual.
```

- **file:// vs unprefixed path**: PGlite accepts either a file:// URI or a plain filesystem path for Node storage . Using file:// can avoid “invalid URL scheme” errors. The example above uses Electron’s app.getPath('userData') so data is stored per-user.

- After creating the instance, you can execute SQL to create tables. For example:

```
await pg.exec(`
  CREATE TABLE IF NOT EXISTS threads (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT now()
  );
`);
```

This data will be stored on disk in dataDir. You can query with await pg.query("SELECT \* FROM threads").

**Renderer process (Browser/IndexedDB)**: If NodeIntegration is disabled in renderer, PGlite falls back to browser storage. For persistence use an idb:// URI:

```
import { PGlite } from '@electric-sql/pglite';

const pg = await PGlite.create(`idb://my-app-db`);
// Or: const pg = new PGlite("idb://my-app-db");
await pg.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    thread_id INT,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );
`);
```

This creates a Postgres in IndexedDB under the key my-app-db . (You can also use PGlite.create() with no prefix for in-memory only.) In either process you can run queries normally, e.g. await pg.query("SELECT \* FROM messages").

> **Tip:** According to the PGlite API, dataDir can use file://, idb://, or memory:// to specify storage . The default new PGlite() with no args creates an in-memory DB .

## **2. ElectricSQL Sync Integration**

ElectricSQL provides a sync plugin for PGlite (alpha) that streams Postgres “shapes” into your local PGlite tables. First install and add the plugin to your PGlite instance:

```
npm install @electric-sql/pglite-sync
```

```
import { PGlite } from '@electric-sql/pglite';
import { electricSync } from '@electric-sql/pglite-sync';

const pg = await PGlite.create({
  extensions: { electric: electricSync() }
});
// Create local tables (must match your Postgres schema)
await pg.exec(`
  CREATE TABLE IF NOT EXISTS threads (
    id SERIAL PRIMARY KEY,
    title TEXT,
    last_updated TIMESTAMPTZ
  );
  CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    thread_id INT REFERENCES threads(id),
    content TEXT,
    created_at TIMESTAMPTZ
  );
`);
```

Here we enabled the ElectricSQL sync extension. Now you can start syncing. For example, to sync server data into both tables in a single transaction, use syncShapesToTables :

```
const sync = await pg.electric.syncShapesToTables({
  shapes: {
    threads: {
      shape: {
        url: 'https://myserver/api/v1/shape',
        params: { table: 'threads' },
      },
      table: 'threads',
      primaryKey: ['id'],
    },
    messages: {
      shape: {
        url: 'https://myserver/api/v1/shape',
        params: { table: 'messages' },
      },
      table: 'messages',
      primaryKey: ['id'],
    },
  },
  key: 'chat-sync',  // optional key to persist sync state
  onInitialSync: () => console.log('Initial sync done'),
});
// ...later when no longer needed:
sync.unsubscribe();
```

This will continuously stream updates for the threads and messages tables from the server Postgres into your local PGlite tables, maintaining transactional consistency . (For a single-table sync, you can use pg.electric.syncShapeToTable({...}) in a similar fashion .) The plugin currently supports one-way (server→client) streaming of shapes; local writes in these tables will not be sent back to the server automatically.

> **Local‑only tables:** If you have tables that exist only on the client (e.g. draft messages, local settings, etc.), simply create and use them in PGlite as above. Do _not_ include them in the syncShapesToTables config. They will remain purely local and can be read/written via pg.query or live queries. For example, you could have a table local_chat_settings and manage it manually; it will not be affected by ElectricSQL sync.

## **3. EffectTS-Friendly Data Layer**

To integrate PGlite with EffectTS, wrap database operations in an Effect.Service. For example, you might define a PGlite service that creates the DB and exposes a query function:

```
import * as _PGlite from '@electric-sql/pglite';
import { Config, Data, Effect } from 'effect';

class PgliteError extends Data.TaggedError('PgliteError')<{ cause: unknown }> {}

export class PGliteService extends Effect.Service<PGliteService>()('PGliteService', {
  effect: Effect.gen(function* (_) {
    const dataDir = yield* Config.string('DATA_DIR');
    // Use file:// for Node or idb:// for browser, based on config
    const client = yield* Effect.tryPromise({
      try: () => _PGlite.PGlite.create(`file://${dataDir}`),
      catch: (error) => new PgliteError({ cause: error }),
    });
    // Return the raw client for advanced use; see below for query helpers
    return { client };
  }),
})();
```

You can then use Effect.tryPromise to perform queries and commands safely. For example, a helper to run an arbitrary query might look like:

```
const queryEffect = <T>(sql: string, params?: any[]) =>
  Effect.tryPromise<T[]>({
    try: () => client.query<T>(sql, params),
    catch: (error) => new PgliteError({ cause: error }),
  });
```

and use it inside an Effect program:

```
Effect.gen(function* (_) {
  const { client } = yield* _(PGliteService);
  // Example: read all threads
  const threads = yield* _(Effect.tryPromise({
    try: () => client.query<{id:number,title:string}>('SELECT * FROM threads'),
    catch: (e) => new PgliteError({ cause: e })
  }));
  console.log('Threads:', threads.rows);
}).pipe(Effect.provideService(PGliteService, PGliteService.default))
```

For **transactions**, PGlite supports an interactive .transaction() API . For example:

```
const result = yield* _(Effect.tryPromise({
  try: () => client.transaction(async (tx) => {
    await tx.exec("BEGIN");
    await tx.query("INSERT INTO threads(title) VALUES('Test thread')");
    const data = await tx.query("SELECT * FROM threads");
    await tx.exec("COMMIT");
    return data;
  }),
  catch: (e) => new PgliteError({ cause: e }),
}));
```

This will commit if the callback resolves, or rollback if it throws . (You can also omit the explicit BEGIN/COMMIT as transaction() handles them automatically.) Wrapping it in Effect.tryPromise makes it compatible with EffectTS.

In summary, structure your data layer with an EffectTS service (or layer) that creates/owns the PGlite client, and use Effect.tryPromise for all asynchronous DB calls (queries, executes, transactions) to capture errors in Effect. A community example of this pattern is shown here , where a PGlite client is created via PGlite.create(...) inside an Effect, and queries are run with Effect.tryPromise.

## **4. Local-Only Tables (Messages and Threads)**

For tables that are only stored locally (not part of any sync shape), treat them like any normal PGlite table. For example, to store chat messages locally you could:

```
await pg.exec(`
  CREATE TABLE IF NOT EXISTS local_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id INT,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );
`);
```

Then queries are straightforward:

```
// Insert a local message
await pg.exec(
  'INSERT INTO local_messages(thread_id, content) VALUES ($1, $2)',
  [threadId, messageText]
);
// Query messages for a thread
const { rows } = await pg.query<{id:string,content:string}>(
  'SELECT * FROM local_messages WHERE thread_id = $1 ORDER BY created_at',
  [threadId]
);
```

In an Effect service you would wrap these in effects. For example:

```
const addMessage = (threadId: number, text: string) =>
  Effect.tryPromise({
    try: () => client.exec(
      'INSERT INTO local_messages(thread_id, content) VALUES ($1, $2)',
      [threadId, text]
    ),
    catch: e => new PgliteError({ cause: e })
  });
```

By keeping these tables out of the ElectricSQL sync configuration, they remain purely local. You can query them or join them with synced tables as needed in your app logic.

## **5. Vite + Electron Forge Bundling Issues**

PGlite’s WASM and ESM nature requires special bundler settings. In Vite config (main and renderer), **exclude** PGlite from dependency optimization. For example, in vite.config.ts:

```
import { defineConfig } from 'vite';
export default defineConfig({
  optimizeDeps: {
    exclude: ['@electric-sql/pglite'],
  },
  build: {
    // If needed, mark PGlite as external so Vite does not bundle it
    rollupOptions: {
      external: ['@electric-sql/pglite']
    }
  }
});
```

This ensures Vite does not pre-bundle PGlite’s modules (which can break the WASM loading) . In an Electron Forge project using @electron-forge/plugin-vite, apply these settings to both vite.main.config.ts and vite.renderer.config.ts. Also, if Electron’s NodeIntegration is disabled, the renderer is a pure browser context, so use idb:// as shown above.

**Path schemes:** If you encounter errors like ERR_INVALID_URL_SCHEME: The URL must be of scheme file, make sure to prefix your data directory with file:// , or pass an absolute path string. Electron Forge and Vite may convert import.meta.url in unexpected ways, so explicitly constructing a file URI for the database directory (using Node’s path and app.getPath) often avoids this issue.

**ESM vs CJS:** Electron 28+ supports ES modules natively, so you can use ESM syntax in your main and preload scripts. If targeting older Electron, ensure your Forge Vite plugin is set up for CJS in the main bundle, or use the nodeIntegration and externals workarounds recommended by Forge docs.

**Native modules:** If you add Node native modules (e.g. sqlite3, though PGlite itself is WASM), follow Forge/Vite guidelines to externalize them (see Forge docs on “Native Node modules”). In general, treat @electric-sql/pglite as a special case: exclude it from optimization and let it load its WASM at runtime.

## **6. Summary**

By instantiating PGlite with a suitable data directory (file or idb), adding the ElectricSQL sync extension, and wrapping queries in an EffectTS service, you can build a local-first Electron app where Postgres data is stored in-process and kept in sync with a remote database. PGlite’s API supports standard SQL operations (queries, exec, transactions) , and the Electric sync plugin provides syncShapeToTable/syncShapesToTables for partial replication . Local-only tables (e.g. messages, threads) are managed the same way via PGlite but simply aren’t included in the sync shape. Finally, watch out for bundler issues: exclude PGlite from Vite’s optimization and use proper URI schemes, and you’ll have a working PGlite/ElectricSQL stack inside Electron.

**Sources:** Official PGlite docs and ElectricSQL guides , plus community examples with Vite/Electron and EffectTS , were used to compile these best practices.
