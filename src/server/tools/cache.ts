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

import { storage } from "@forge/api";
import { Activity } from "../../shared/tasks";
import { setStatus } from "../async";
import { checkPage } from "./pages";


const purgeKey="system:purged";
const purgePeriod=24 * 60 * 60 * 1000; // 1d in ms


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Cache key patterns for policy documents:
 * - Original extracted text: "policy:{page}:{source}"
 * - Translated documents: "policy:{page}:{source}:{language}"
 */
export function policyKey(page: string, source: string, language?: string): string {
	return language ? `policy:${page}:${source}:${language}` : `policy:${page}:${source}`;
}

/**
 * Extract page id from policy cache key
 * @param key - Cache key in format "policy:{page}:{source}[:{language}]"
 * @returns Page id
 */
export function policyKeyPage(key: string): string {
	return key.split(":")[1];
}

/**
 * Extract source id from policy cache key
 * @param key - Cache key in format "policy:{page}:{source}[:{language}]"
 * @returns Source (attachment) id
 */
export function policyKeySource(key: string): string {
	return key.split(":")[2];
}

/**
 * Extract language from policy cache key (if present)
 * @param key - Cache key in format "policy:{page}:{source}[:{language}]"
 * @returns Language code or undefined if not present
 */
export function policyKeyLanguage(key: string): string | undefined {
	return key.split(":")[3];
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export async function dirty(): Promise<boolean> {

	const last=await storage.get(purgeKey) as string | undefined;
	const next=Date.now();

	if ( !last || (next - parseInt(last)) > purgePeriod ) {

		await storage.set(purgeKey, next.toString());

		return true;

	} else {

		return false; // Not dirty yet

	}
}

export async function purge(job: string): Promise<void> {

	await setStatus(job, Activity.Scanning);

	// get all cached policy documents with pagination

	let allResults: Array<{ key: string; value: any }>=[];
	let cursor: string | undefined;

	do {

		const query=storage.query()
			.where("key", { condition: "STARTS_WITH", value: "policy:" })
			.limit(100);

		if ( cursor ) {
			query.cursor(cursor);
		}

		const batch=await query.getMany();

		allResults.push(...batch.results);
		cursor=batch.nextCursor;

	} while ( cursor );

	const cached={ results: allResults };


	await setStatus(job, Activity.Purging);

	// group cache entries by page id

	const entriesByPage=new Map<string, Array<{ key: string; value: any }>>();

	for (const result of cached.results) {

		const page=policyKeyPage(result.key);

		if ( !entriesByPage.has(page) ) {
			entriesByPage.set(page, []);
		}

		entriesByPage.get(page)!.push(result);
	}

	// check which pages still exist and delete entries for deleted pages

	await Promise.all(Array.from(entriesByPage.entries()).map(async ([pageId, entries]) => {
		if ( !await checkPage(pageId) ) {
			await Promise.all(entries.map(result => storage.delete(result.key)));
		}
	}));
}

export async function clearPageCache(page: string) {
	// get all cached policy documents for the target page
	const query=storage.query()
		.where("key", { condition: "STARTS_WITH", value: "policy:" })
		.limit(100);

	let allResults: Array<{ key: string; value: any }>=[];
	let cursor: string | undefined;

	do {
		const batchQuery=cursor ? query.cursor(cursor) : query;
		const batch=await batchQuery.getMany();
		allResults.push(...batch.results);
		cursor=batch.nextCursor;
	} while ( cursor );

	// filter entries that belong to the target page
	const pageEntries=allResults.filter(result => policyKeyPage(result.key) === page);

	// delete all cache entries for this page
	await Promise.all(pageEntries.map(result => storage.delete(result.key)));
}
