import { ObjectId as NativeObjectId } from "mongodb";
import {
	SerializedObjectId,
	SerializedDate,
	isSerializedObjectId,
	isSerializedDate,
	isBufferedObjectId,
	ToJsonFriendly,
	FromJsonFriendly,
} from "./bson-types";

export function serializeToJSON<TInput>(data: TInput): ToJsonFriendly<TInput> {
	if (data instanceof NativeObjectId)
		return { $oid: data.toHexString() } as ToJsonFriendly<TInput>;
	if (data instanceof Date)
		return { $date: data.toISOString() } as ToJsonFriendly<TInput>;
	if (Array.isArray(data))
		return data.map((item) => serializeToJSON(item)) as ToJsonFriendly<TInput>;
	if (
		data !== null &&
		typeof data === "object" &&
		!(data instanceof NativeObjectId) &&
		!(data instanceof Date)
	) {
		const resultObject: any = {};
		for (const key in data)
			if (Object.prototype.hasOwnProperty.call(data, key))
				resultObject[key] = serializeToJSON((data as any)[key]);
		return resultObject as ToJsonFriendly<TInput>;
	}
	return data as ToJsonFriendly<TInput>;
}

export function deserializeFromJSON<TOutput>(
	data: TOutput
): FromJsonFriendly<TOutput> {
	if (isSerializedObjectId(data)) {
		try {
			return new NativeObjectId(data.$oid) as FromJsonFriendly<TOutput>;
		} catch {
			console.warn(`Invalid ObjectId string: ${data.$oid}`);
			return data as FromJsonFriendly<TOutput>;
		}
	}
	if (isBufferedObjectId(data)) {
		const hexString = toHexFromObjectIdBuffer(data);
		if (hexString) {
			try {
				return new NativeObjectId(hexString) as FromJsonFriendly<TOutput>;
			} catch {
				console.warn("Invalid ObjectId buffer, could not construct ObjectId");
				return data as FromJsonFriendly<TOutput>;
			}
		}
		console.warn("Invalid ObjectId buffer shape, expected 12-byte buffer");
		return data as FromJsonFriendly<TOutput>;
	}
	if (isSerializedDate(data)) {
		const dateValue = new Date(data.$date);
		if (isNaN(dateValue.getTime())) {
			console.warn(`Invalid Date string: ${data.$date}`);
			return data as FromJsonFriendly<TOutput>;
		}
		return dateValue as FromJsonFriendly<TOutput>;
	}
	if (Array.isArray(data))
		return data.map((item) =>
			deserializeFromJSON(item)
		) as FromJsonFriendly<TOutput>;
	if (
		data !== null &&
		typeof data === "object" &&
		!isSerializedObjectId(data) &&
		!isSerializedDate(data)
	) {
		const resultObject: any = {};
		for (const key in data)
			if (Object.prototype.hasOwnProperty.call(data, key))
				resultObject[key] = deserializeFromJSON((data as any)[key]);
		return resultObject as FromJsonFriendly<TOutput>;
	}
	return data as FromJsonFriendly<TOutput>;
}

function toHexFromObjectIdBuffer(value: { buffer: any }): string | null {
	const bufferArray = Object.values(value.buffer);

	const bytes = extractObjectIdBytes(bufferArray);
	if (!bytes || bytes.length !== 12) return null;
	let hex = "";
	for (let i = 0; i < bytes.length; i++) {
		const byte = bytes[i]!;
		if (!Number.isInteger(byte) || byte < 0 || byte > 255) return null;
		hex += byte?.toString(16).padStart(2, "0");
	}
	return hex;
}

function extractObjectIdBytes(buffer: any): number[] | null {
	if (buffer instanceof ArrayBuffer) return Array.from(new Uint8Array(buffer));
	if (ArrayBuffer.isView(buffer))
		return Array.from(
			new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
		);
	if (Array.isArray(buffer)) return buffer.map((b) => Number(b));
	if (
		buffer &&
		typeof buffer === "object" &&
		buffer.type === "Buffer" &&
		Array.isArray(buffer.data)
	)
		return buffer.data.map((b: any) => Number(b));
	return null;
}
