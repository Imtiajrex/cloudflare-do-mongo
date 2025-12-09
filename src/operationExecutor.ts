import {
	Collection,
	Db,
	Filter,
	UpdateFilter,
	FindOneAndUpdateOptions,
	FindOneAndDeleteOptions,
	FindOneAndReplaceOptions,
	DistinctOptions,
	Document,
	ClientSession,
} from "mongodb";
import type { MongoCollectionOp, MongoDatabaseOp, MongoRpcPayload } from "./do";

// Function to prepare arguments with a session
export function prepareArgsWithSession(
	originalArgs: any[],
	opName: MongoRpcPayload["op"],
	session: ClientSession
): any[] {
	const args = [...originalArgs];

	const opsWithOptionsAt1: ReadonlyArray<MongoRpcPayload["op"]> = [
		"findOne",
		"find",
		"insertOne",
		"insertMany",
		"deleteOne",
		"findOneAndDelete",
		"countDocuments",
		"aggregate",
	];
	const opsWithOptionsAt2: ReadonlyArray<MongoRpcPayload["op"]> = [
		"updateOne",
		"updateMany",
		"findOneAndUpdate",
		"findOneAndReplace",
		"distinct",
	];

	let optionsIndex = -1;

	if (opsWithOptionsAt1.includes(opName)) {
		optionsIndex = 1;
	} else if (opsWithOptionsAt2.includes(opName)) {
		optionsIndex = 2;
	} else {
		console.warn(
			`[prepareArgsWithSession] Operation '${opName}' not explicitly listed for session injection. Attempting fallback strategy.`
		);
		const lastArgIndex = args.length - 1;
		if (
			lastArgIndex >= 0 &&
			typeof args[lastArgIndex] === "object" &&
			args[lastArgIndex] !== null
		) {
			args[lastArgIndex] = { ...args[lastArgIndex], session };
		} else {
			args.push({ session });
		}
		return args;
	}

	while (args.length <= optionsIndex) {
		args.push(undefined);
	}

	args[optionsIndex] = { ...(args[optionsIndex] || {}), session };

	return args;
}

export async function executeMongoOperation(
	collection: Collection<Document>,
	op: MongoCollectionOp,
	finalArgs: any[]
): Promise<unknown> {
	let operationResult: unknown;

	switch (op) {
		case "findOne":
			operationResult = await collection.findOne(finalArgs[0], finalArgs[1]);
			break;
		case "find":
			operationResult = await collection
				.find(finalArgs[0], finalArgs[1])
				.toArray();
			break;
		case "findOneAndUpdate":
			operationResult = await collection.findOneAndUpdate(
				finalArgs[0] as Filter<Document>,
				finalArgs[1] as UpdateFilter<Document>,
				finalArgs[2] as FindOneAndUpdateOptions
			);
			break;
		case "findOneAndDelete":
			operationResult = await collection.findOneAndDelete(
				finalArgs[0] as Filter<Document>,
				finalArgs[1] as FindOneAndDeleteOptions
			);
			break;
		case "findOneAndReplace":
			operationResult = await collection.findOneAndReplace(
				finalArgs[0] as Filter<Document>,
				finalArgs[1] as Document,
				finalArgs[2] as FindOneAndReplaceOptions
			);
			break;
		case "insertOne":
			operationResult = await collection.insertOne(finalArgs[0], finalArgs[1]);
			break;
		case "insertMany":
			operationResult = await collection.insertMany(finalArgs[0], finalArgs[1]);
			break;
		case "updateOne":
			operationResult = await collection.updateOne(
				finalArgs[0],
				finalArgs[1],
				finalArgs[2]
			);
			break;
		case "updateMany":
			operationResult = await collection.updateMany(
				finalArgs[0],
				finalArgs[1],
				finalArgs[2]
			);
			break;
		case "deleteOne":
			operationResult = await collection.deleteOne(finalArgs[0], finalArgs[1]);
			break;
		case "deleteMany":
			operationResult = await collection.deleteMany(finalArgs[0], finalArgs[1]);
			break;
		case "aggregate":
			operationResult = await collection
				.aggregate(finalArgs[0], finalArgs[1])
				.toArray();
			break;
		case "distinct":
			operationResult = await collection.distinct(
				finalArgs[0] as string, // Or keyof Document
				finalArgs[1] as Filter<Document>,
				finalArgs[2] as DistinctOptions
			);
			break;
		case "countDocuments":
			operationResult = await collection.countDocuments(
				finalArgs[0],
				finalArgs[1]
			);
			break;
		default:
			// Ensure exhaustive check or throw error for unsupported operations
			const exhaustiveCheck: never = op;
			throw new Error(`Unsupported operation: ${exhaustiveCheck}`);
	}
	return operationResult;
}

export async function executeMongoDatabaseOperation(
	db: Db,
	op: MongoDatabaseOp,
	finalArgs: any[]
): Promise<unknown> {
	let operationResult: unknown;

	switch (op) {
		case "listCollections":
			// args: filter?, options?
			operationResult = await db
				.listCollections(finalArgs[0], finalArgs[1])
				.toArray();
			break;
		case "createCollection":
			// args: name, options?
			operationResult = await db.createCollection(finalArgs[0], finalArgs[1]);
			break;
		case "dropCollection":
			// args: name
			operationResult = await db.dropCollection(finalArgs[0]);
			break;
		case "dropDatabase":
			operationResult = await db.dropDatabase();
			break;
		case "renameCollection":
			// args: from, to, options?
			operationResult = await db.renameCollection(
				finalArgs[0],
				finalArgs[1],
				finalArgs[2]
			);
			break;
		case "stats":
			operationResult = await db.stats(finalArgs[0]);
			break;
		default:
			// Ensure exhaustive check or throw error for unsupported operations
			const exhaustiveCheck: never = op;
			throw new Error(`Unsupported database operation: ${exhaustiveCheck}`);
	}

	return operationResult;
}
