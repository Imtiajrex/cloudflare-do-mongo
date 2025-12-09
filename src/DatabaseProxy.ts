import {
	Collection,
	CreateCollectionOptions,
	DbStatsOptions,
	Document,
	ListCollectionsOptions,
	RenameOptions,
} from "mongodb";
import type { ToJsonFriendly } from "./bson-types";
import { CollectionProxy } from "./CollectionProxy";
import type {
	MongoDatabaseOp,
	MongoDurableObject,
	MongoRpcPayload,
	MongoRpcResponseData,
} from "./do";
import { deserializeFromJSON, serializeToJSON } from "./serialization";

export class DatabaseProxy {
	private databaseName?: string;
	private doStub: DurableObjectStub<MongoDurableObject>;

	constructor(
		databaseName: string | undefined,
		doStub: DurableObjectStub<MongoDurableObject>
	) {
		this.databaseName = databaseName;
		this.doStub = doStub;
	}

	private async _executeRemote<TArgs extends unknown[], TDriverResult>(
		op: MongoDatabaseOp,
		args: TArgs
	): Promise<TDriverResult> {
		const payload: MongoRpcPayload = {
			op,
			args: serializeToJSON(args) as ToJsonFriendly<unknown[]>,
		};

		try {
			const responseDataJson: MongoRpcResponseData = await (this.doStub.execute(
				payload
			) as Promise<MongoRpcResponseData>);
			return deserializeFromJSON(responseDataJson) as TDriverResult;
		} catch (error: any) {
			console.error(
				`DB Client RPC Error (Op: ${op}, Db: ${
					this.databaseName ?? "default"
				}):`,
				error.message
			);
			throw error;
		}
	}
	collection<TSchema extends Document = Document>(collectionName: string) {
		return new CollectionProxy<TSchema>(
			this.databaseName,
			collectionName,
			this.doStub
		);
	}

	async listCollections(
		filter?: Document,
		options?: ListCollectionsOptions
	): Promise<Document[]> {
		return this._executeRemote("listCollections", [filter, options]);
	}

	async createCollection(
		name: string,
		options?: CreateCollectionOptions
	): Promise<Collection<Document>> {
		return this._executeRemote("createCollection", [name, options]);
	}

	async dropCollection(name: string): Promise<boolean> {
		return this._executeRemote("dropCollection", [name]);
	}

	async dropDatabase(): Promise<boolean> {
		return this._executeRemote("dropDatabase", []);
	}

	async renameCollection(
		fromCollection: string,
		toCollection: string,
		options?: RenameOptions
	): Promise<Collection<Document>> {
		return this._executeRemote("renameCollection", [
			fromCollection,
			toCollection,
			options,
		]);
	}

	async stats(options?: DbStatsOptions): Promise<Document> {
		return this._executeRemote("stats", [options]);
	}
}
