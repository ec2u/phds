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
 * Forge KVS access layer.
 *
 * Encapsulates all direct interactions with the
 * {@link https://developer.atlassian.com/platform/forge/runtime-reference/storage-api/ Forge KVS API},
 * providing typed single-entry operations and bulk query/delete helpers with transparent pagination.
 *
 * @module
 */

import { kvs, WhereConditions } from "@forge/kvs";
import { prefixKey } from "../../shared/store";

/**
 * Retrieves a single value from the KVS.
 *
 * @param key The entry key
 *
 * @returns The stored value, or `undefined` if absent
 */
export async function getValue<T>(key: string): Promise<undefined | T> {
	return kvs.get<T>(key);
}

/**
 * Stores a single value in the KVS.
 *
 * @param key The entry key
 * @param value The value to store
 */
export async function setValue<T>(key: string, value: T): Promise<void> {
	await kvs.set<T>(key, value);
}

/**
 * Deletes a single value from the KVS.
 *
 * @param key The entry key
 */
export async function deleteValue(key: string): Promise<void> {
	await kvs.delete(key);
}


/**
 * Retrieves KVS entries matching a key prefix and predicate.
 *
 * Keys are matched using a `<prefix>:` pattern. Handles pagination transparently across all stored entries.
 *
 * @param prefix Key prefix to match (a `:` separator is appended automatically); pass `undefined` to scan all entries
 * @param predicate Filter selecting entries to return; returns all if omitted
 *
 * @returns Matching entries as key-value pairs
 *
 * @see {@link deleteMatches} for the destructive counterpart
 */
export async function getMatches(
	prefix?: string,
	predicate?: (entry: { key: string; value: unknown }) => boolean
): Promise<Array<{ key: string; value: unknown }>> {

	const results: Array<{ key: string; value: unknown }> = [];

	let cursor: string | undefined;

	do {

		const query = kvs.query().limit(100);

		if ( prefix ) { query.where("key", WhereConditions.beginsWith(prefixKey(prefix))); }

		const batch = await (cursor ? query.cursor(cursor) : query).getMany();

		results.push(...batch.results);

		cursor = batch.nextCursor;

	} while ( cursor );

	return predicate ? results.filter(predicate) : results;

}

/**
 * Deletes KVS entries matching a key prefix and predicate.
 *
 * Retrieves matching entries via {@link getMatches} and deletes them.
 *
 * @param prefix Key prefix to match (a `:` separator is appended automatically); pass `undefined` to target all entries
 * @param predicate Filter selecting entries to delete; deletes all if omitted
 *
 * @see {@link getMatches} for the non-destructive counterpart
 */
export async function deleteMatches(
	prefix?: string,
	predicate?: (entry: { key: string; value: unknown }) => boolean
): Promise<void> {

	await getMatches(prefix)
		.then(entries => predicate ? entries.filter(predicate) : entries)
		.then(entries => Promise.all(entries.map(entry => kvs.delete(entry.key))));

}
