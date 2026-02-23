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
 * Hierarchical cache with observer-based change notification.
 *
 * Entries are indexed by colon-separated resource keys. Observers registered at a key receive notifications for that
 * key. Parent/child relationships are derived from key prefixes: {@link Cache.insert insert} stores values and notifies
 * observers at the key and removes descendant entries, notifying descendant observers.
 *
 * @module
 */

import { isNestedKey } from "../shared/store";
import { immutable } from "../shared/tools/core";


/**
 * Hierarchical cache with observer-based change notification.
 *
 * Entries are indexed by colon-separated resource keys. Observers registered at a key receive notifications for that
 * key. Parent/child relationships are derived from key prefixes: {@link Cache.insert insert} stores values and notifies
 * observers at the key and removes descendant entries, notifying descendant observers.
 */
export interface Cache {

	/**
	 * Retrieves the cached value for a key, optionally initialising it on cache miss.
	 *
	 * On cache hit, returns the cached value. On cache miss without a generator, returns `undefined`. On cache miss
	 * with a generator, returns `undefined`, calls the generator, and stores the result via {@link Cache.insert
	 * insert} when available. The generator may return a value synchronously or a `Promise` that resolves to the value
	 * asynchronously.
	 *
	 * @typeParam T The expected value type
	 *
	 * @param key The resource key
	 * @param generator Optional factory producing the value to cache, synchronously or asynchronously
	 *
	 * @returns The cached value, or `undefined` on miss
	 */
	lookup<T>(key: string, generator?: () => T | Promise<T>): undefined | T;

	/**
	 * Stores a value for a key.
	 *
	 * Removes descendant entries (as determined by {@link isNestedKey}) and notifies observers registered at `key`
	 * and at each removed descendant key.
	 *
	 * @typeParam T The expected value type
	 *
	 * @param key The resource key
	 * @param value The value to cache
	 *
	 * @returns The stored value
	 */
	insert<T>(key: string, value: T): T;

	/**
	 * Removes the entry at a key.
	 *
	 * Removes descendant entries (as determined by {@link isNestedKey}) and notifies observers registered at `key`
	 * and at each removed descendant key.
	 *
	 * @param key The resource key to remove
	 */
	remove(key: string): void;


	/**
	 * Registers an observer for changes at a key.
	 *
	 * The observer is fired asynchronously on registration, then on future {@link Cache.insert insert} and
	 * {@link Cache.remove remove} calls. Returns a cleanup function that removes the observer.
	 *
	 * @param key The resource key to observe
	 * @param observer The handler notified on changes
	 *
	 * @returns A cleanup function that removes the observer
	 */
	observe(key: string, observer: () => void): () => void;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a {@link Cache} instance.
 */
export function createCache(): Cache {

	const entries = new Map<string, unknown>();
	const observers = new Map<string, Set<() => void>>();


	return immutable({

		lookup,
		insert,
		remove,

		observe

	});


	function lookup<T>(key: string, generator?: () => T | Promise<T>): undefined | T {

		const cached = entries.get(key) as undefined | T;

		if ( cached !== undefined ) {

			return cached;

		} else if ( generator ) {

			const value = generator();

			if ( value instanceof Promise ) {
				value.then(resolved => insert(key, resolved));
			} else {
				insert(key, value);
			}

			return undefined;

		} else {

			return undefined;

		}

	}

	function remove(key: string): void {

		entries.delete(key);

		purge(key);
		notify(key);

	}

	function insert<T>(key: string, value: T): T {

		entries.set(key, value);

		purge(key);
		notify(key);

		return value;

	}


	function observe(key: string, observer: () => void): () => void {

		if ( !observers.has(key) ) {
			observers.set(key, new Set());
		}

		observers.get(key)!.add(observer);

		// fire asynchronously to ensure cleanup is returned before the observer runs

		queueMicrotask(() => observer());

		return () => {

			const set = observers.get(key);

			set?.delete(observer);

			if ( set?.size === 0 ) {
				observers.delete(key);
			}

		};

	}


	function purge(key: string): void {
		[...entries.keys()]
			.filter(k => isNestedKey(key, k))
			.forEach(k => entries.delete(k));
	}

	function notify(key: string): void {
		[...observers.entries()]
			.filter(([k]) => k === key || isNestedKey(key, k))
			.forEach(([, set]) => set.forEach(o => o()));
	}

}
