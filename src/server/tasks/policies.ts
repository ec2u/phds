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

export async function policies(job: string, page: string, { language }: PoliciesTask) {

	// get all attachments metadata

	await setStatus(job, Activity.Scanning);

	const attachments=(await listAttachments(page))
		.filter(attachment => attachment.mediaType === pdf);


	// get all cached documents

	await setStatus(job, Activity.Fetching);

	const cached=await storage.query()
		.where("key", { condition: "STARTS_WITH", value: "policy:" })
		.limit(100)
		.getMany();


	// purge stale cache entries

	await setStatus(job, Activity.Purging);

	await Promise.all(cached.results
		.filter(result => {

			// extract source id from cache key (policy:{source} or policy:{source}:{language})

			const source=(result.key.split(":"))[1]; // policy:{source}:{language?}

			// find matching attachment

			const attachment=attachments.find(attachment => attachment.id === source);

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


	// create catalog (using attachment title, as document title is quite expensive to get upfront))

	await setStatus(job, attachments.reduce((catalog, attachment) => ({
		...catalog,
		[attachment.id]: attachment.title.replace(/\.pdf$/, "")
	}), {} as Record<string, string>));

}
