import { MONGO_DURABLE_OBJECT } from 'cloudflare-do-mongo/do';
import { getDatabase } from 'cloudflare-do-mongo/index';
import { ObjectId } from 'mongodb';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const db = getDatabase('dotest4');
		const collection = db.collection('testCollection');
		const insertedData = await collection.insertOne({ name: 'sdfafewf', value: 23423, _id: new ObjectId() });
		const docs = await collection.find().toArray();
		return Response.json({
			insertedData: insertedData,
			docs: docs,
		});
	},
} satisfies ExportedHandler<Env>;

export { MONGO_DURABLE_OBJECT };
