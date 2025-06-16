/*
 * Copyright © 2025 EC2U Alliance
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
 * Checks if a value is not `undefined` or `null`.
 *
 * @param value the value to check
 *
 * @return `true` if the value is defined; `false` otherwise
 */
export function isDefined<T>(value: undefined | null | T): value is T {
	return value !== undefined && value !== null;
}

/**
 * Checks if a value is `undefined`.
 *
 * @param value the value to check
 *
 * @return `true` if the value is `undefined`; `false` otherwise
 */
export function isUndefined(value: unknown): value is undefined {
	return value === undefined;
}


/**
 * Checks if a value is null.
 *
 * @param value the value to check
 *
 * @return `true` if the value is `null`; `false` otherwise
 */
export function isNull(value: unknown): value is null {
	return value === null;
}

/**
 * Checks if a value is a boolean.
 *
 * @param value the value to check
 *
 * @return `true` if the value is a boolean; `false` otherwise
 */
export function isBoolean(value: unknown): value is boolean {
	return typeof value === "boolean";
}

/**
 * Checks if a value is a finite number.
 *
 * @param value the value to check
 *
 * @return `true` if the value is a finite number; `false` otherwise
 */
export function isNumber(value: unknown): value is number {
	return Number.isFinite(value);
}

/**
 * Checks if a value is a string.
 *
 * @param value the value to check
 *
 * @return `true` if the value is a string; `false` otherwise
 */
export function isString(value: unknown): value is string {
	return typeof value === "string";
}

/**
 * Checks if a value is a plain object.
 *
 * @param value the value to check
 *
 * @return `true` if the value is a plain object; `false` otherwise
 *
 * @see https://stackoverflow.com/a/52694022/739773
 */
export function isObject(value: unknown): value is Record<any, any> & ({ bind?: never } | { call?: never }) {
	return value !== undefined && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

/**
 * Checks if a value is an array.
 *
 * @param value the value to check
 * @param is optional type guard function to check array elements
 *
 * @return `true` if the value is an array (optionally with elements matching the type guard); `false` otherwise
 */
export function isArray<T=unknown>(value: unknown, is?: (value: unknown) => value is T): value is T[] {
	return Array.isArray(value) && (is === undefined || value.every(is));
}


/**
 * Checks if a value is a symbol.
 *
 * @param value the value to check
 *
 * @return `true` if the value is a symbol; `false` otherwise
 */
export function isSymbol(value: unknown): value is Symbol {
	return typeof value === "symbol";
}

/**
 * Checks if a value is a function.
 *
 * @param value the value to check
 *
 * @return `true` if the value is a function; `false` otherwise
 */
export function isFunction(value: unknown): value is Function {
	return value instanceof Function;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Status type representing operation state as either an update, result data, or error trace.
 *
 * @template T the type of result data
 */
export type Status<T>=Update | T | Trace;

/**
 * Enumeration of operation update states.
 */
export const enum Update {
	Initializing,
	Scanning,
	Fetching,
	Extracting,
	Translating
}

/**
 * Error trace information.
 */
export interface Trace {
	/** Error code */
	readonly code: number;
	/** Error message or description */
	readonly text: string;
}


/**
 * Checks if a value is a valid Update enum value.
 *
 * @param value the value to check
 *
 * @return `true` if the value is a valid Update; `false` otherwise
 */
export function isUpdate(value: unknown): value is Update {
	return isNumber(value) && value >= Update.Initializing && value <= Update.Translating;
}

/**
 * Converts a value to an Update enum value if valid.
 *
 * @param value the value to convert
 *
 * @return the Update value if valid; `undefined` otherwise
 */
export function asUpdate(value: unknown): undefined | Update {
	return isUpdate(value) ? value : undefined;
}


/**
 * Checks if a value is a valid Trace object.
 *
 * @param value the value to check
 *
 * @return `true` if the value is a valid Trace; `false` otherwise
 */
export function isTrace(value: unknown): value is Trace {
	return isObject(value)
		&& isNumber(value.code)
		&& isString(value.text);
}

/**
 * Converts a value to a Trace object.
 *
 * @param value the value to convert
 *
 * @return the Trace if valid; otherwise a Trace with code 999 and stringified value
 */
export function asTrace(value: unknown): Trace {
	return isTrace(value) ? value : { code: 999, text: JSON.stringify(value, null, 4) };
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates an immutable deep clone.
 *
 * @warning Only processes plain objects and arrays recursively; all other values (including built-ins like Date,
 *     RegExp, etc.) are treated as atomic and returned as-is. Does not handle circular references.
 *
 * @param value the value to be cloned
 *
 * @return a deeply immutable clone of `value`
 */
export function immutable<T=any>(value: T): Readonly<typeof value> {
	if ( Array.isArray(value) || isObject(value) ) {

		return Object.freeze(Reflect.ownKeys(value as any).reduce((object: any, key) => {

			object[key]=isSymbol(key) ? (value as any)[key] : immutable((value as any)[key]);

			return object;

		}, Array.isArray(value) ? [] : {}));

	} else {

		return value as any;

	}
}
