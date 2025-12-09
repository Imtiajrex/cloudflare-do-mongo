# cloudflare-do-mongo

A tiny helper to call MongoDB from Cloudflare Workers using Durable Objects. It wraps the official `mongodb` driver so you can reuse familiar collection methods while the Durable Object keeps a warm connection alive.

## Install

- `npm install cloudflare-do-mongo`
- Ensure your Worker project also has the `mongodb` runtime dependency (included by this package but list it if you vendor-lock versions).

## Configure Wrangler

- Bind the Durable Object and enable Node compat:
  ```jsonc
  {
  	"main": "src/index.ts",
  	"compatibility_flags": [
  		"nodejs_compat",
  		"nodejs_compat_populate_process_env"
  	],
  	"durable_objects": {
  		"bindings": [
  			{ "name": "MONGO_DURABLE_OBJECT", "class_name": "MongoDurableObject" }
  		]
  	},
  	"migrations": [
  		{ "tag": "v1", "new_sqlite_classes": ["MongoDurableObject"] }
  	]
  }
  ```
- Set required secrets for your Mongo deployment:
  - `MONGO_URI` – full MongoDB connection string.
  - `MONGO_DB` – default database name.
  ```sh
  wrangler secret put MONGO_URI
  wrangler secret put MONGO_DB
  ```

## Basic Worker

```ts
import { MongoDurableObject } from "cloudflare-do-mongo/do";
import { getDatabase } from "cloudflare-do-mongo";

export default {
	async fetch(_request, env): Promise<Response> {
		const db = getDatabase("my-db"); // optional, falls back to env.MONGO_DB

		const collection = db.collection("testCollection");
		const inserted = await collection.insertOne({ name: "test", value: 42 });
		const docs = await collection.find().toArray();

		return Response.json({ inserted, docs });
	},
} satisfies ExportedHandler<Env>;

export const MONGO_DURABLE_OBJECT = MongoDurableObject;
```

**Note:** The `MONGO_DURABLE_OBJECT` export is mandatory for the library to access the Durable Object binding.

## API surface

- `getDatabase(databaseName?, shardKey?)` → `DatabaseProxy`
  - Database-level ops: `listCollections`, `createCollection`, `dropCollection`, `dropDatabase`, `renameCollection`, `stats`.
  - `db.collection(name)` returns a `CollectionProxy` that mirrors most familiar `mongodb` collection methods (`find`, `findOne`, `insertOne`, `insertMany`, `updateOne`, `deleteOne`, `aggregate`, `distinct`, `countDocuments`, etc.).
- `getCollection(collectionName, databaseName?, shardKey?)` → shortcut to a `CollectionProxy` without calling `db.collection()`.
- `runTransaction(DURABLE_OBJECT, payloads, txOptions?)` → execute multiple collection operations in a single MongoDB transaction. Each payload is `{ db?, col, op, args }` where `op` matches a supported collection/database method.
- `MongoDurableObject` → Durable Object class to bind in Wrangler. Export it from your Worker (see example above).
- `ObjectId` re-export is available as `import { ObjectId } from "cloudflare-do-mongo"`.

## Sharding by Durable Object ID

- Pass `shardKey` to `getDatabase` or `getCollection` to route traffic to a specific Durable Object instance. Use this if you want to partition workload across DOs (e.g., per-tenant or per-collection sharding).

## Local development

- Run `wrangler dev` to test locally. Ensure your local env has `MONGO_URI` and `MONGO_DB` available (Wrangler prompts for secrets or you can use a `.dev.vars`).
- Run `wrangler types` if you want generated `Env` typings (`worker-configuration.d.ts`) for the DO binding.

## Notes

- The Durable Object keeps a lightweight keep-alive alarm running (~50s) to reduce Mongo cold starts.
- All arguments/results are serialized for the DO boundary using JSON-friendly representations; most BSON types (like `ObjectId`) are handled transparently.
