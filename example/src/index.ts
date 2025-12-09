import { MONGO_DURABLE_OBJECT } from '../../src/do';
import { getDatabase } from '../../src/index';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const db = getDatabase('dotest2');
		const collection = db.collection('testCollection');
		const insertedData = await collection.insertOne({ name: 'test', value: 42 });
		const docs = await collection.find().toArray();
		return Response.json({
			insertedData: insertedData,
			docs: docs,
		});
	},
} satisfies ExportedHandler<Env>;

export { MONGO_DURABLE_OBJECT };
