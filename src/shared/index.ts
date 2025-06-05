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
 * Checks if a value is undefined.
 */
export function isUndefined(value: unknown): value is undefined {
	return value === undefined;
}

/**
 * Checks if a value is null.
 */
export function isNull(value: unknown): value is null {
	return value === null;
}

/**
 * Checks if a value is a boolean.
 */
export function isBoolean(value: unknown): value is boolean {
	return typeof value === "boolean";
}

/**
 * Checks if a value is a finite number.
 */
export function isNumber(value: unknown): value is number {
	return Number.isFinite(value);
}

/**
 * Checks if a value is a string.
 */
export function isString(value: unknown): value is string {
	return typeof value === "string";
}

/**
 * Checks if a value is a plain object.
 *
 * @see https://stackoverflow.com/a/52694022/739773
 */
export function isObject(value: unknown): value is Record<any, any> & ({ bind?: never } | { call?: never }) {
	return value !== undefined && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

/**
 * Checks if a value is an array.
 */
export function isArray<T=unknown>(value: unknown, is?: (value: unknown) => value is T): value is T[] {
	return Array.isArray(value) && (is === undefined || value.every(is));
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export type Content<T>=null | T | Status;

interface Status {

	code: number;
	text: string;

}


export function isStatus(value: unknown): value is Status {
	return isObject(value) && isNumber(value.code) && isString(value.text);
}
