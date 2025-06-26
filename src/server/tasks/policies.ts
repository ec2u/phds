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
import { isUndefined } from "../../shared";
import { Document } from "../../shared/documents";
import { Activity, PoliciesTask } from "../../shared/tasks";
import { setStatus } from "../async";
import { listAttachments, pdf } from "../tools/attachments";
import { checkPage } from "../tools/pages";

export async function policies(job: string, page: string, {}: PoliciesTask) {

	// get all attachments metadata

	await setStatus(job, Activity.Scanning);

	const attachments=(await listAttachments(page))
		.filter(attachment => attachment.mediaType === pdf);


	// get cached policy documents for this page

	await setStatus(job, Activity.Fetching);

	const cached=await storage.query()
		.where("key", { condition: "STARTS_WITH", value: `policy:${page}:` })
		.limit(100)
		.getMany();


	// purge stale cache entries

	await setStatus(job, Activity.Purging);

	await Promise.all(cached.results
		.filter(result => {

			// extract source id from cache key (policy:{pageId}:{source}[:{language}])

			const source=(result.key.split(":"))[2];

			// find matching attachment

			const attachment=attachments.find(attachment => source === attachment.id);

			if ( isUndefined(attachment) ) { // attachment no longer exists, purge this cache entry

				return true;

			} else { // check timestamp staleness: purge if document was cached before attachment was modified

				const document=result.value as Document;
				const attachmentCreated=new Date(attachment.createdAt).getTime();
				const cachedCreated=new Date(document.created).getTime();

				return cachedCreated < attachmentCreated; // stale if cached before attachment modified

			}

		})
		.map(result => storage.delete(result.key)));

	// create catalog (using attachment title, as document title is quite expensive to get upfront)

	await setStatus(job, attachments.reduce((catalog, attachment) => ({
		...catalog,
		[attachment.id]: attachment.title.replace(/\.pdf$/, "")
	}), {} as Record<string, string>));

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export async function purgeDeletedPageDocuments(job: string): Promise<void> {

	await setStatus(job, Activity.Scanning);

	// Get all cached policy documents
	const cached=await storage.query()
		.where("key", { condition: "STARTS_WITH", value: "policy:" })
		.limit(1000)
		.getMany();

	await setStatus(job, Activity.Purging);

	// Extract unique page IDs from cached documents  
	const pageIds=new Set<string>();

	for (const result of cached.results) {
		const pageId=extractPageIdFromCacheKey(result.key);
		if ( pageId ) {
			pageIds.add(pageId);
		}
	}

	// Check which pages still exist
	const deletedPages=new Set<string>();

	await Promise.all(Array.from(pageIds).map(async pageId => {
		const exists=await checkPage(pageId);
		if ( !exists ) {
			deletedPages.add(pageId);
		}
	}));

	// Delete cache entries for deleted pages
	if ( deletedPages.size > 0 ) {
		const entriesToDelete=cached.results.filter(result => {
			const pageId=extractPageIdFromCacheKey(result.key);
			return pageId && deletedPages.has(pageId);
		});

		await Promise.all(entriesToDelete.map(result => storage.delete(result.key)));
	}
}

function extractPageIdFromCacheKey(cacheKey: string): string | null {
	// Extract page ID from cache key: policy:{pageId}:{source}[:{language}]
	const keyParts=cacheKey.split(":");
	return keyParts.length >= 3 ? keyParts[1] : null;
}
