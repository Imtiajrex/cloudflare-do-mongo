import type { MONGO_DURABLE_OBJECT } from "./do";

// sharding config (not required, but useful for scaling)
const NUMBER_OF_DO_SHARDS = 2; // increase this number to add more shards
const DO_INSTANCE_NAME_PREFIX = "mongo_shard_"; // Consistent prefix

// sharding logic function
export function getDoStubForShard(
	DURABLE_OBJECT: DurableObjectNamespace,
	shardKey?: string | number
): DurableObjectStub<MONGO_DURABLE_OBJECT> {
	if (!DURABLE_OBJECT) {
		throw new Error("getDoStubForShard: MONGO_DO binding missing from AppEnv.");
	}

	let shardIndex = 0;
	if (typeof shardKey === "number") {
		shardIndex = Math.abs(shardKey) % NUMBER_OF_DO_SHARDS;
	} else if (typeof shardKey === "string" && shardKey.length > 0) {
		let hash = 0;
		for (let i = 0; i < shardKey.length; i++) {
			const char = shardKey.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash |= 0; // Convert to 32bit integer
		}
		shardIndex = Math.abs(hash) % NUMBER_OF_DO_SHARDS;
	} else {
		// Default to random shard if no key provided - good for distributing load for unkeyed operations
		shardIndex = Math.floor(Math.random() * NUMBER_OF_DO_SHARDS);
	}

	const doInstanceName = `${DO_INSTANCE_NAME_PREFIX}${shardIndex}`;

	const durableObjectId = DURABLE_OBJECT.idFromName(doInstanceName);
	const newStub = DURABLE_OBJECT.get(
		durableObjectId
	) as unknown as DurableObjectStub<MONGO_DURABLE_OBJECT>;

	return newStub;
}
