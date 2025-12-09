import {
	AggregateOptions,
	BulkWriteOptions,
	CountDocumentsOptions,
	DeleteOptions,
	DeleteResult,
	DistinctOptions,
	Document,
	Filter,
	FindOneAndDeleteOptions,
	FindOneAndReplaceOptions,
	FindOneAndUpdateOptions,
	FindOptions,
	InsertManyResult,
	InsertOneOptions,
	InsertOneResult,
	ObjectId as NativeObjectId,
	OptionalUnlessRequiredId,
	UpdateFilter,
	UpdateOptions,
	UpdateResult,
	WithId,
} from "mongodb";
import type { ToJsonFriendly } from "./bson-types";
import { deserializeFromJSON, serializeToJSON } from "./serialization";
import { AggregateCursor } from "./AggregateCursor";
import type {
	MongoDurableObject,
	MongoRpcPayload,
	MongoRpcResponseData,
} from "./do";
import { FindCursor } from "./FindCursor";
import { ICollectionProxy } from "./types";

export class CollectionProxy<TSchema extends Document = Document>
	implements ICollectionProxy<TSchema>
{
	private databaseName?: string;
	private collectionName: string;
	private doStub: DurableObjectStub<MongoDurableObject>;

	constructor(
		databaseName: string | undefined,
		collectionName: string,
		doStub: DurableObjectStub<MongoDurableObject>
	) {
		this.databaseName = databaseName;
		this.collectionName = collectionName;
		this.doStub = doStub;
	}

	private async _executeRemote<TArgs extends unknown[], TDriverResult>(
		op: MongoRpcPayload["op"],
		args: TArgs
	): Promise<TDriverResult> {
		const argumentsAsJson = serializeToJSON(args) as ToJsonFriendly<unknown[]>;
		const payload: MongoRpcPayload = {
			db: this.databaseName,
			col: this.collectionName,
			op,
			args: argumentsAsJson,
		};
		try {
			const responseDataJson: MongoRpcResponseData = await (this.doStub.execute(
				payload
			) as Promise<MongoRpcResponseData>);
			return deserializeFromJSON(responseDataJson) as TDriverResult;
		} catch (error: any) {
			console.error(
				`DB Client RPC Error (Op: ${op}, Coll: ${this.collectionName}):`,
				error.message
			);
			throw error;
		}
	}

	// Internal method used by FindCursor
	async _executeFindWithOptions(
		filter: Filter<TSchema>,
		options?: FindOptions
	): Promise<WithId<TSchema>[]> {
		return this._executeRemote("find", [filter, options]);
	}

	// Internal method used by AggregateCursor
	async _executeAggregateWithOptions<TResultDoc extends Document = Document>(
		pipeline: Document[],
		options?: AggregateOptions
	): Promise<TResultDoc[]> {
		return this._executeRemote("aggregate", [pipeline, options]);
	}

	async findOne(
		filter: Filter<TSchema>,
		options?: FindOptions
	): Promise<WithId<TSchema> | null> {
		return await this._executeRemote("findOne", [filter, options]);
	}

	// Modified find method to return FindCursor
	find(filter: Filter<TSchema> = {}): FindCursor<TSchema> {
		return new FindCursor(filter, this);
	}

	async findOneAndUpdate(
		filter: Filter<TSchema>,
		update: UpdateFilter<TSchema>,
		options?: FindOneAndUpdateOptions
	): Promise<WithId<TSchema> | null> {
		return this._executeRemote("findOneAndUpdate", [filter, update, options]);
	}

	async findOneAndDelete(
		filter: Filter<TSchema>,
		options?: FindOneAndDeleteOptions
	): Promise<WithId<TSchema> | null> {
		return this._executeRemote("findOneAndDelete", [filter, options]);
	}

	async findOneAndReplace(
		filter: Filter<TSchema>,
		replacement: Document,
		options?: FindOneAndReplaceOptions
	): Promise<WithId<TSchema> | null> {
		return this._executeRemote("findOneAndReplace", [
			filter,
			replacement,
			options,
		]);
	}

	async insertOne(
		doc: OptionalUnlessRequiredId<TSchema>,
		options?: InsertOneOptions
	): Promise<InsertOneResult<TSchema>> {
		return this._executeRemote("insertOne", [doc, options]);
	}

	async insertMany(
		docs: OptionalUnlessRequiredId<TSchema>[],
		options?: BulkWriteOptions
	): Promise<InsertManyResult<TSchema>> {
		return this._executeRemote("insertMany", [docs, options]);
	}

	async updateOne(
		filter: Filter<TSchema>,
		update: UpdateFilter<TSchema> | Partial<TSchema>,
		options?: UpdateOptions
	): Promise<UpdateResult> {
		return this._executeRemote("updateOne", [filter, update, options]);
	}

	async updateMany(
		filter: Filter<TSchema>,
		update: UpdateFilter<TSchema>,
		options?: UpdateOptions
	): Promise<UpdateResult> {
		return this._executeRemote("updateMany", [filter, update, options]);
	}

	async deleteOne(
		filter: Filter<TSchema>,
		options?: DeleteOptions
	): Promise<DeleteResult> {
		return this._executeRemote("deleteOne", [filter, options]);
	}

	async deleteMany(
		filter: Filter<TSchema>,
		options?: DeleteOptions
	): Promise<DeleteResult> {
		return this._executeRemote("deleteMany", [filter, options]);
	}

	// Modified aggregate method to return AggregateCursor
	aggregate<TResultDoc extends Document = Document>(
		pipeline: Document[],
		options?: AggregateOptions
	): AggregateCursor<TResultDoc> {
		return new AggregateCursor<TResultDoc>(pipeline, this as any);
	}

	async distinct<TValue = any>(
		key: string,
		filter?: Filter<TSchema>,
		options?: DistinctOptions
	): Promise<TValue[]> {
		return this._executeRemote("distinct", [key, filter, options]);
	}

	async countDocuments(
		filter?: Filter<TSchema>,
		options?: CountDocumentsOptions
	): Promise<number> {
		return this._executeRemote("countDocuments", [filter, options]);
	}
}
