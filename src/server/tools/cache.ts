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


const purgeKey="system:purged";
const purgePeriod=24 * 60 * 60 * 1000; // 1d in ms


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Cache key patterns for policy documents:
 * - Original extracted text: "{page}:policy:{source}"
 * - Translated documents: "{page}:policy:{source}:{language}"
 */
export function policyKey(page: string, source: string, language?: string): string {
	return language ? `${page}:policy:${source}:${language}` : `${page}:policy:${source}`;
}

/**
 * Cache key for issue
 * @param page - Page id
 * @param issueId - Issue id
 * @returns Issue cache key
 */
export function issueKey(page: string, issueId: string): string {
	return `${page}:issue:${issueId}`;
}


/**
 * Extract page id from cache key
 * @param key - Cache key in format "{page}:type:..."
 * @returns Page id
 */
export function keyPage(key: string): string {
	return key.split(":")[0];
}

/**
 * Extract source id from policy cache key
 * @param key - Cache key in format "{page}:policy:{source}[:{language}]"
 * @returns Source (attachment) id
 */
export function policyKeySource(key: string): string {
	return key.split(":")[2];
}

/**
 * Extract language from policy cache key (if present)
 * @param key - Cache key in format "{page}:policy:{source}[:{language}]"
 * @returns Language code or undefined if not present
 */
export function policyKeyLanguage(key: string): string | undefined {
	return key.split(":")[3];
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export async function dirty(): Promise<boolean> {

	const last=await kvs.get<string>(purgeKey);
	const next=Date.now();

	if ( !last || (next - parseInt(last)) > purgePeriod ) {

		await kvs.set<string>(purgeKey, next.toString());

		return true;

	} else {

		return false; // Not dirty yet

	}
}

export async function purge(job: string, page?: string): Promise<void> {

	await setStatus(job, Activity.Scanning);

	// get cached documents with pagination

	let allResults: Array<{ key: string; value: any }>=[];
	let cursor: string | undefined;

	do {

		let query=kvs.query()
			.limit(100);

		// if targeting specific page, query only that page's entries

		if ( page ) {
			query=query.where("key", WhereConditions.beginsWith(`${page}:`));
		}

		if ( cursor ) {
			query=query.cursor(cursor);
		}

		const batch=await query.getMany();

		// filter out system keys (only needed for global purge)

		const userEntries=page
			? batch.results
			: batch.results.filter(result => !result.key.startsWith("system:"));

		allResults.push(...userEntries);
		cursor=batch.nextCursor;

	} while ( cursor );

	await setStatus(job, Activity.Purging);

	if ( page ) { // clear all entries for the target page

		await Promise.all(allResults.map(result => kvs.delete(result.key)));

	} else { // group cache entries by page id and purge deleted pages

		const entriesByPage=new Map<string, Array<{ key: string; value: any }>>();

		for (const result of allResults) {

			const page=keyPage(result.key);

			if ( !entriesByPage.has(page) ) {
				entriesByPage.set(page, []);
			}

			entriesByPage.get(page)!.push(result);
		}

		// check which pages still exist and delete entries for deleted pages

		await Promise.all(Array.from(entriesByPage.entries()).map(async ([pageId, entries]) => {
			if ( !await checkPage(pageId) ) {
				await Promise.all(entries.map(result => kvs.delete(result.key)));
			}
		}));

	}
}
