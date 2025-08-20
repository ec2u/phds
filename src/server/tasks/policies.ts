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
import { isUndefined } from "../../shared";
import { Document, Source, Title } from "../../shared/documents";
import { Activity, Payload, PoliciesTask } from "../../shared/tasks";
import { setStatus } from "../async";
import { listAttachments } from "../tools/attachments";
import { keyPrefix, keySource, lock, policiesKey } from "../tools/cache";
import { pdf } from "../tools/mime";

export async function policies(job: string, page: string, {}: Payload<PoliciesTask>): Promise<Record<Source, Title>> {

	return await lock(job, policiesKey(page), async () => {

		// get all attachments metadata

		await setStatus(job, Activity.Scanning);

		const attachments=await listAttachments(page, pdf);


		// get cached policy documents for this page (100 should be sufficient for single page, no pagination needed)

		await setStatus(job, Activity.Fetching);

		const cached=await kvs.query()
			.where("key", WhereConditions.beginsWith(keyPrefix(policiesKey(page))))
			.limit(100)
			.getMany();


		// purge stale cache entries

		await setStatus(job, Activity.Purging);

		await Promise.all(cached.results
			.filter(result => {

				// extract source id from cache key

				const source=keySource(result.key);

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
			.map(result => kvs.delete(result.key))
		);

		// create catalog (using attachment title, as document title is quite expensive to get upfront)

		const catalog=attachments.reduce((catalog, attachment) => ({
			...catalog,
			[attachment.id]: attachment.title.replace(/\.pdf$/, "")
		}), {} as Record<Source, Title>);

		await setStatus(job, catalog);

		return catalog;

	});

}
