/*
 * Copyright © 2025-2026 EC2U Alliance
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Shared type checking and utilities.
 *
 * @module core
 */


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks if a value is a boolean.
 *
 * @param value The value to check
 *
 * @returns true if the value is a boolean; false otherwise
 */
export function isBoolean(value: unknown): value is boolean {
	return typeof value === "boolean";
}

/**
 * Checks if a value is a finite number.
 *
 * @param value The value to check
 *
 * @returns true if the value is a finite number; false otherwise
 */
export function isNumber(value: unknown): value is number {
	return Number.isFinite(value);
}

/**
 * Checks if a value is a string.
 *
 * @param value The value to check
 *
 * @returns true if the value is a string; false otherwise
 */
export function isString(value: unknown): value is string {
	return typeof value === "string";
}

/**
 * Checks if a value is an array.
 *
 * @param value The value to check
 * @param is Optional type guard function to check array elements
 *
 * @returns true if the value is an array (optionally with elements matching the type guard); false otherwise
 */
export function isArray<T = unknown>(value: unknown, is?: (value: unknown) => value is T): value is T[] {
	return Array.isArray(value) && (is === undefined || value.every(is));
}

/**
 * Checks if a value is a plain object.
 *
 * @param value The value to check
 *
 * @returns true if the value is a plain object; false otherwise
 *
 * @see https://stackoverflow.com/a/52694022/739773
 */
export function isObject(value: unknown): value is Record<any, any> & ({ bind?: never } | { call?: never }) {
	return value !== undefined && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

/**
 * Checks if a value is a function.
 *
 * @param value The value to check
 *
 * @returns true if the value is a function; false otherwise
 */
export function isFunction(value: unknown): value is Function {
	return value instanceof Function;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates an immutable deep clone.
 *
 * > [!WARNING]
 * > Only processes plain objects and arrays recursively; all other values (including built-ins like `Date`,
 * > `RegExp`, and others) are treated as atomic and returned as-is. Does not handle circular references.
 *
 * @param value The value to clone
 *
 * @returns A deeply frozen clone of `value`
 */
export function immutable<T>(value: T): Readonly<typeof value> {
	if ( Array.isArray(value) || isObject(value) ) {

		return Object.freeze(Reflect.ownKeys(value as any).reduce((object: any, key) => {

			object[key] = immutable((value as any)[key]);

			return object;

		}, Array.isArray(value) ? [] : {}));

	} else {

		return value as any;

	}
}

/**
 * Converts a value to an error message string.
 *
 * @param value The value to convert
 *
 * @returns The value itself if already a string; the `Error.message` if an `Error`; a JSON representation otherwise
 */
export function message(value: unknown): string {
	return isString(value) ? value
		: value instanceof Error ? value.message
			: JSON.stringify(value, null, 2);
}

/**
 * Encodes a record of key-value pairs as a URL query string.
 *
 * @param params The key-value pairs to encode
 *
 * @returns The URL-encoded query string
 */
export function query(params: Record<string, string>): string {
	return new URLSearchParams(params).toString();
}
