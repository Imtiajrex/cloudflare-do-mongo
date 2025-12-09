import { ObjectId as NativeObjectId } from "mongodb";
export type SerializedObjectId = { $oid: string };
export type SerializedDate = { $date: string };
export type BufferedObjectId =
	| { buffer: ArrayBuffer }
	| { buffer: ArrayBufferView }
	| { buffer: number[] }
	| { buffer: { type: "Buffer"; data: number[] } };
export type ToJsonFriendly<T = any> = T extends NativeObjectId
	? SerializedObjectId
	: T extends Date
	? SerializedDate
	: T extends Array<infer U>
	? Array<ToJsonFriendly<U>>
	: T extends object
	? { [K in keyof T]: ToJsonFriendly<T[K]> }
	: T;
export type FromJsonFriendly<T = any> = T extends SerializedObjectId
	? NativeObjectId
	: T extends SerializedDate
	? Date
	: T extends BufferedObjectId
	? NativeObjectId
	: T extends Array<infer U>
	? Array<FromJsonFriendly<U>>
	: T extends { $oid: string; [key: string]: any }
	? NativeObjectId
	: T extends { $date: string; [key: string]: any }
	? Date
	: T extends object
	? { [K in keyof T]: FromJsonFriendly<T[K]> }
	: T;
export function isSerializedObjectId(value: any): value is SerializedObjectId {
	return (
		typeof value === "object" &&
		value !== null &&
		"$oid" in value &&
		typeof value.$oid === "string"
	);
}
export function isSerializedDate(value: any): value is SerializedDate {
	return (
		typeof value === "object" &&
		value !== null &&
		"$date" in value &&
		typeof value.$date === "string"
	);
}
export function isBufferedObjectId(value: any): value is BufferedObjectId {
	if (typeof value !== "object" || value === null || !("buffer" in value))
		return false;
	const buffer = (value as any).buffer;
	if (buffer instanceof ArrayBuffer) return true;
	if (ArrayBuffer.isView(buffer)) return buffer.byteLength === 12;
	if (Array.isArray(buffer))
		return buffer.length === 12 && buffer.every((b) => typeof b === "number");
	if (
		buffer &&
		typeof buffer === "object" &&
		buffer.type === "Buffer" &&
		Array.isArray(buffer.data)
	)
		return (
			buffer.data.length === 12 &&
			buffer.data.every((b) => typeof b === "number")
		);
	return false;
}
