import {
	Document,
	ObjectId as NativeObjectId,
	TransactionOptions,
} from "mongodb";
import type { ToJsonFriendly } from "./bson-types";
import { deserializeFromJSON, serializeToJSON } from "./serialization";
// Make sure this path correctly points to your DO file and exports the class
import { AggregateCursor } from "./AggregateCursor";
import { CollectionProxy } from "./CollectionProxy";
import { DatabaseProxy } from "./DatabaseProxy";
import type { MongoRpcPayload, MongoRpcResponseData } from "./do";
import { FindCursor } from "./FindCursor";
import { getDoStubForShard } from "./sharding";
import { env } from "cloudflare:workers";

// Define a new type for transaction payloads with native JS arguments
interface TransactionPayloadWithNativeArgs {
	col: string;
	op: MongoRpcPayload["op"]; // Reuse op type from MongoRpcPayload
	args: unknown[]; // Native JS arguments, not yet serialized
}

/**
 * Gets a CollectionProxy for a specific MongoDB collection.
 * This is now the primary way to interact with the database.
 * @param DURABLE_OBJECT The Durable Object namespace.
 * @param collectionName The name of the MongoDB collection.
 * @param shardKey Optional: Name for the Durable Object ID.
 * @returns A CollectionProxy instance.
 */
export function getCollection<TSchema extends Document = Document>(
	collectionName: string,
	databaseName?: string,
	shardKey?: string | number
) {
	let doStub = getDoStubForShard(env.MONGO_DURABLE_OBJECT, shardKey);
	return new CollectionProxy<TSchema>(databaseName, collectionName, doStub);
}

/**
 * Gets a DatabaseProxy for database-level operations like listing/creating collections.
 * @param DURABLE_OBJECT The Durable Object namespace.
 * @param shardKey Optional: Name for the Durable Object ID.
 * @returns A DatabaseProxy instance.
 */
export function getDatabase(databaseName?: string, shardKey?: string | number) {
	const doStub = getDoStubForShard(env.MONGO_DURABLE_OBJECT, shardKey);
	return new DatabaseProxy(databaseName, doStub);
}
export async function runTransaction(
	DURABLE_OBJECT: DurableObjectNamespace,
	payloads: TransactionPayloadWithNativeArgs[],
	txOptions?: TransactionOptions
): Promise<any[]> {
	// Updated payload type
	const doStub = getDoStubForShard(DURABLE_OBJECT);

	// Serialize arguments before sending to DO
	const serializedPayloads: MongoRpcPayload[] = payloads.map((p) => ({
		...p,
		args: serializeToJSON(p.args) as ToJsonFriendly<unknown[]>, // Serialize native args
	}));

	const doResults: MongoRpcResponseData[] = await (doStub.runTransaction(
		serializedPayloads,
		txOptions
	) as Promise<MongoRpcResponseData[]>);
	// Deserialize results from DO
	return doResults.map((result: MongoRpcResponseData) =>
		deserializeFromJSON(result)
	);
}

export {
	AggregateCursor,
	DatabaseProxy,
	FindCursor,
	NativeObjectId as ObjectId,
};
