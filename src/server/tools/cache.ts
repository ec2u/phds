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

import { kvs, WhereConditions } from "@forge/kvs";
import { Activity } from "../../shared/tasks";
import { setStatus } from "../async";
import { checkPage } from "./pages";


const policiesTag="policies";
const issuesTag="issues";

const purgeKey="system:purged";
const purgePeriod=24 * 60 * 60 * 1000; // purge period in ms

const lockAttempts=15; // ~5 minutes max with exponential backoff
const lockDelay=30 * 1000; // max backoff delay in ms
const lockTimeout=2 * 60 * 1000; // lock expiration timeout in ms (reduced to minimize stuck lock impact)


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

type Key=string


/**
 * Lock catalog containing all active locks for a page
 * Uses optimistic concurrency control with version tracking to handle race conditions
 */
interface LockCatalog {

	readonly version: number;
	readonly locks: Record<Key, LockEntry>;

}

interface LockEntry {

	readonly job: string;
	readonly expires: number;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Page-level lock key
 *
 * @param page - Page id
 *
 * @returns Page-level lock key that conflicts with all other locks on the page
 */
export function pageKey(page: string): Key {
	return `${page}`;
}


/**
 * Policies catalog lock key
 *
 * @param page - Page id
 *
 * @returns Policies catalog lock key that conflicts with all individual policy locks on the page
 */
export function policiesKey(page: string): Key {
	return `${page}:${policiesTag}`;
}

/**
 * Policy document cache key
 *
 * @param page - Page id
 * @param source - Policy source (attachment) id
 * @param language - Optional language code for translated documents
 *
 * @returns Policy cache key (e.g., "{page}:policy:{source}" or "{page}:policy:{source}:{language}")
 */
export function policyKey(page: string, source: string, language?: string): Key {
	return language ? `${page}:${policiesTag}:${source}:${language}` : `${page}:${policiesTag}:${source}`;
}


/**
 *
 * Issues catalog lock key
 * @param page - Page id
 *
 * @returns Issues catalog lock key that conflicts with all individual issue locks on the page
 */
export function issuesKey(page: string): Key {
	return `${page}:${issuesTag}`;
}

/**
 * Issue cache key
 *
 * @param page - Page id
 * @param issueId - Issue id
 *
 * @returns Issue cache key
 */
export function issueKey(page: string, issueId: string): Key {
	return `${page}:${issuesTag}:${issueId}`;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Generate cache key prefix for filtering operations
 * @param entry - Cache key entry type
 * @returns Formatted prefix string ending with ":"
 */
export function keyPrefix(entry: Key) {
	return `${entry}:`;
}


/**
 * Extract page id from cache key
 * @param key - Cache key in format "{page}:type:..."
 * @returns Page id
 */
export function keyPage(key: Key): string {
	return key.split(":")[0];
}

/**
 * Extract source id from policy cache key
 * @param key - Cache key in format "{page}:policy:{source}[:{language}]"
 * @returns Source (attachment) id
 */
export function keySource(key: Key): string {
	return key.split(":")[2];
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export async function purge(page?: string): Promise<void> {

	if ( page ) { // clear all entries for the target page

		const results=await scan(page);

		// delete all entries for the target page; locking handled at the call site

		await Promise.all(results.map(result => kvs.delete(result.key)));

	} else if ( await dirty() ) {

		const results=await scan();

		// group cache entries by page

		const entriesByPage=results.reduce((entries, result) => {

			const page=keyPage(result.key);

			return { ...entries, [page]: [...(entries[page] || []), result] };

		}, {} as Record<string, Array<{ key: string; value: any }>>);

		// check which pages still exist and delete entries for deleted pages; no locking required here because:
		// - only deleting entries for non-existent pages (no active users)
		// - dirty() race prevents multiple concurrent global purges
		// - page-specific operations use their own page-level locks

		await Promise.all(Object.entries(entriesByPage).map(async ([pageId, entries]) => {

			if ( !await checkPage(pageId) ) {
				await Promise.all(entries.map(result => kvs.delete(result.key)));
			}

		}));
	}

}


/**
 * Check if global purge is needed and claim the purge period atomically
 *
 * Uses check-and-set pattern to prevent multiple concurrent global purges:
 *
 * - Only one process per 24-hour period can successfully claim the purge
 * - First process to call this after the period expires wins the race
 * - Other processes get false and should skip their global purge
 *
 * @returns true if this process won the purge race and should proceed, false otherwise
 */
async function dirty(): Promise<boolean> {

	const last=await kvs.get<string>(purgeKey);
	const next=Date.now();

	if ( !last || (next - parseInt(last)) > purgePeriod ) {

		// claim this purge period by setting our timestamp
		await kvs.set<string>(purgeKey, next.toString());

		return true; // we won the race - proceed with global purge

	} else {

		return false; // another process already claimed this period

	}
}

async function scan(page?: string) {

	// get cached documents with pagination

	let results: Array<{ key: string; value: any }>=[];
	let cursor: string | undefined;

	do {

		let query=kvs.query()
			.limit(100);

		// if targeting specific page, query only that page's entries

		if ( page ) {
			query=query.where("key", WhereConditions.beginsWith(keyPrefix(pageKey(page))));
		}

		if ( cursor ) {
			query=query.cursor(cursor);
		}

		const batch=await query.getMany();

		// filter out system keys (only needed for global purge)

		const userEntries=page
			? batch.results
			: batch.results.filter(result => !result.key.startsWith("system:"));

		results.push(...userEntries);

		cursor=batch.nextCursor;

	} while ( cursor );

	return results;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Execute a task with exclusive lock protection
 *
 * @param job - Job identifier for lock ownership
 * @param key - Lock key (includes page prefix)
 * @param task - Function to execute while holding the lock
 *
 * @returns Promise resolving to task result
 *
 * @throws Error if lock cannot be acquired or released or task fails
 */
export async function lock<T>(job: string, key: Key, task: () => Promise<T>): Promise<T> {

	await setStatus(job, Activity.Locking);

	await acquire(job, key);

	try {

		return await task();

	} finally {

		await release(job, key);

	}
}


async function acquire(job: string, key: Key): Promise<void> {

	const now=Date.now();
	const page=keyPage(key);
	const locks=pageKey(page);

	for (let attempts=0; attempts < lockAttempts; attempts++) {
		try {

			// read current lock state

			const catalog=await kvs.get<LockCatalog>(locks) || { locks: {}, version: 0 };

			// clean expired locks

			const entries=Object.fromEntries(
				Object.entries(catalog.locks).filter(([_, lock]) => lock.expires > now)
			);


			if ( conflicts(key, entries) ) { // wait for conflicting locks to expire or be released

				await backoff(attempts);

			} else { // optimistic update with version check

				// use single read to reduce race condition window

				if ( catalog.version === ((await kvs.get<LockCatalog>(locks))?.version ?? 0) ) { // no version conflict

					await kvs.transact()
						.set(locks, {

							locks: {
								...entries,
								[key]: {
									job: job,
									expires: now + lockTimeout
								}
							},
							version: catalog.version + 1

						})
						.execute();

					return;

				} else { // version conflict, retry

					await backoff(attempts);

				}
			}

		} catch ( error ) {

			console.warn(`lock acquisition for <${key}> failed on attempt <${attempts + 1}>:`, error);

			await backoff(attempts);

		}
	}

	throw new Error(`lock acquisition for <${key}> failed after <${lockAttempts}> attempts`);
}

async function release(job: string, key: Key): Promise<void> {

	const page=keyPage(key);
	const locks=pageKey(page);

	for (let attempts=0; attempts < lockAttempts; attempts++) {
		try {

			// read current lock state

			const catalog=await kvs.get<LockCatalog>(locks);

			if ( catalog ) {

				const currentLock=catalog.locks[key];

				if ( currentLock?.job === job ) {

					if ( catalog.version === ((await kvs.get<LockCatalog>(locks))?.version ?? 0) ) { // no version conflict

						const { [key]: _, ...remainingLocks }=catalog.locks;

						const transaction=kvs.transact();

						if ( Object.keys(remainingLocks).length > 0 ) {

							transaction.set(locks, {
								locks: remainingLocks,
								version: catalog.version + 1
							});

						} else {

							transaction.delete(locks);

						}

						await transaction.execute();

						return;

					} else { // version conflict, retry

						await backoff(attempts);

					}

				} else { // lock not owned by this job

					console.warn(`attempted to release lock <${key}> not owned by job <${job}>`);

					return;
				}

			} else { // no catalog exists, nothing to release
				return;
			}

		} catch ( error ) {

			console.warn(`lock release for ${key} failed on attempt ${attempts + 1}:`, error);

			await backoff(attempts);
		}
	}

	throw new Error(`lock release for ${key} failed after ${lockAttempts} attempts`);
}


function conflicts(requested: Key, entries: Record<Key, LockEntry>): boolean {

	for (const entry in entries) {

		// hierarchical conflict: one lock is prefix of another

		if ( requested === entry
			|| requested.startsWith(keyPrefix(entry))
			|| entry.startsWith(keyPrefix(requested))
		) {
			return true;
		}
	}

	return false;
}

/**
 * Exponential backoff delay for retry operations
 *
 * @param attempts - Current attempt number (0-based)
 *
 * @returns Promise that resolves after exponential backoff delay
 */
function backoff(attempts: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve,
		Math.min(1000 * Math.pow(2, attempts), lockDelay)
	));
}
