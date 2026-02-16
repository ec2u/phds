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
 * Resource-centric resolver endpoints for the Forge resolver.
 *
 * @module
 */

import { Queue } from "@forge/events";
import { kvs, WhereConditions } from "@forge/kvs";
import { Activity, asTrace, isActivity, isDefined, isTrace, isUndefined, type Status } from "../../shared/index";
import { Catalog, Document, Source } from "../../shared/items/documents";
import { Issue, type IssueUpdate, normalizeIssue } from "../../shared/items/issues";
import { Language } from "../../shared/items/languages";
import { Request } from "../_index";
import { getAttachment, listAttachments } from "../tools/attachments";
import {
	issueKey,
	issuesKey,
	keyPrefix,
	keySource,
	lock,
	pageKey,
	policiesKey,
	policyKey,
	purge
} from "../tools/cache";
import { pdf } from "../tools/mime";


/**
 * The Forge event queue for scheduling asynchronous task execution.
 */
const queue = new Queue({ key: "executor-queue" });


/**
 * Retrieves the catalogue of available policy documents for the current page.
 *
 * Lists PDF attachments, purges stale cache entries for removed or updated attachments, and returns a mapping from
 * source identifiers to display titles.
 *
 * @param request the resolver request with Confluence context
 *
 * @return the catalogue mapping, or an error trace on failure
 */
export async function getPolicies({ context }: Request<{}>): Promise<Status<Catalog>> {
	try {

		const page: string = context.extension.content.id;
		const owner = `getPolicies:${Date.now()}-${(Math.random()*1e4)|0}`;

		return await lock(owner, policiesKey(page), async () => {

			const attachments = await listAttachments(page, pdf);

			const cached = await kvs.query()
				.where("key", WhereConditions.beginsWith(keyPrefix(policiesKey(page))))
				.limit(100)
				.getMany();

			await Promise.all(cached.results
				.filter(result => {

					const source = keySource(result.key);
					const attachment = attachments.find(a => source === a.id);

					if ( isUndefined(attachment) ) {
						return true;
					} else {
						const document = result.value as Document;
						return new Date(document.created).getTime() < new Date(attachment.createdAt).getTime();
					}

				})
				.map(result => kvs.delete(result.key))
			);

			return attachments.reduce((catalog, attachment) => ({
				...catalog,
				[attachment.id]: attachment.title.replace(/\.pdf$/, "")
			}), {});

		});

	} catch ( error ) {

		return asTrace(error);

	}
}

/**
 * Retrieves or triggers extraction of a single policy document.
 *
 * Reads the resource key from Forge KVS and branches on its state: returns a cached document if fresh, the current
 * activity if a job is in progress, or an error trace if the previous attempt failed. When no cached value exists (or
 * the cached value is stale), writes an {@link Activity.Scheduling} sentinel to the resource key and queues an
 * asynchronous extraction job.
 *
 * @param request the resolver request with source, optional language, and Confluence context
 *
 * @return the document, current activity, or an error trace
 */
export async function getPolicy({ payload: { source, language }, context }: Request<{ source: Source; language?: Language }>): Promise<Status<Document>> {
	try {

		const page: string = context.extension.content.id;
		const key = policyKey(page, source, language);

		const cached = await kvs.get<Status<Document>>(key);

		if ( isActivity(cached) ) { // job in progress — #25: check lock presence to detect crashed jobs

			return cached;

		} else if ( isTrace(cached) ) { // previous error — dismiss clears it

			return cached;

		} else {

			if ( isDefined(cached) ) {

				const document = cached;
				const attachment = await getAttachment(page, source);

				if ( new Date(document.created).getTime() >= new Date(attachment.createdAt).getTime() ) {
					return document; // fresh
				}

				await kvs.delete(key); // stale — purge and fall through

			}

			// empty or stale — write sentinel and queue async job

			await kvs.set(key, Activity.Scheduling);

			await queue.push({ page, key, task: { type: "policy", source, language } } as any);

			return Activity.Scheduling;

		}

	} catch ( error ) {

		return asTrace(error);

	}
}


/**
 * Retrieves compliance issues for the current page.
 *
 * Checks for a running analysis sentinel at the issues collection key. If an analysis is in progress, returns the
 * current activity state. Otherwise, scans all individual issue entries from the KVS and returns them.
 *
 * @param request the resolver request with Confluence context
 *
 * @return the issues list, current activity, or an error trace
 */
export async function getIssues({ context }: Request<{}>): Promise<Status<ReadonlyArray<Issue>>> {
	try {

		const page: string = context.extension.content.id;

		// check for running analysis sentinel

		const sentinel = await kvs.get(issuesKey(page));

		if ( isActivity(sentinel) ) {

			return sentinel;

		} else if ( isTrace(sentinel) ) {

			return sentinel;

		} else {

			// read individual issues from KVS

			const results: Array<{ key: string; value: unknown }> = [];

			let cursor: string | undefined;

			do {

				const query = kvs.query()
					.where("key", WhereConditions.beginsWith(keyPrefix(issuesKey(page))))
					.limit(100);

				const batch = await (cursor ? query.cursor(cursor) : query).getMany();

				results.push(...batch.results);
				cursor = batch.nextCursor;

			} while ( cursor );

			return results.map(result => normalizeIssue(result.value as Issue));

		}

	} catch ( error ) {

		return asTrace(error);

	}
}

/**
 * Triggers a new compliance analysis for the current page.
 *
 * Writes an {@link Activity.Scheduling} sentinel to the issues collection key and queues an asynchronous analysis
 * job. The sentinel is cleared by the analysis task on completion or replaced with an error trace on failure.
 *
 * @param request the resolver request with Confluence context
 *
 * @return void on success, or an error trace on failure
 */
export async function refreshIssues({ context }: Request<{}>): Promise<Status<void>> {
	try {

		const page: string = context.extension.content.id;

		const key = issuesKey(page);

		await kvs.set(key, Activity.Scheduling);

		await queue.push({ page, key, task: { type: "analyze" } } as any);

	} catch ( error ) {

		return asTrace(error);

	}
}

/**
 * Retrieves a single compliance issue by identifier.
 *
 * @param request the resolver request with issue identifier and Confluence context
 *
 * @return the issue, or an error trace if not found or on failure
 */
export async function getIssue({ payload: { issue }, context }: Request<{ issue: string }>): Promise<Status<Issue>> {
	try {

		const page: string = context.extension.content.id;
		const key = issueKey(page, issue);
		const cached = await kvs.get<Issue>(key);

		if ( isDefined(cached) ) {

			return normalizeIssue(cached);

		} else {

			return asTrace(new Error(`issue not found: ${issue}`));

		}

	} catch ( error ) {

		return asTrace(error);

	}
}

/**
 * Updates mutable fields of a compliance issue.
 *
 * Acquires an exclusive lock on the individual issue key, reads the current value, merges the changes with an
 * updated timestamp, and writes back.
 *
 * @param request the resolver request with issue identifier, changes, and Confluence context
 *
 * @return void on success, or an error trace on failure
 */
export async function updateIssue({ payload: { issue, ...changes }, context }: Request<{ issue: string } & IssueUpdate>): Promise<Status<void>> {
	try {

		const page: string = context.extension.content.id;
		const owner = `updateIssue:${Date.now()}-${(Math.random()*1e4)|0}`;
		const key = issueKey(page, issue);

		await lock(owner, key, async () => {

			const current = await kvs.get<Issue>(key);

			if ( current ) {
				await kvs.set<Issue>(key, { ...current, ...changes, updated: new Date().toISOString() });
			}

		});

	} catch ( error ) {

		return asTrace(error);

	}
}


/**
 * Clears all cached data for the current page.
 *
 * Acquires a page-level lock to prevent concurrent access, then purges all cache entries for the page.
 *
 * @param request the resolver request with Confluence context
 *
 * @return void on success, or an error trace on failure
 */
export async function clearCache({ context }: Request<{}>): Promise<Status<void>> {
	try {

		const page: string = context.extension.content.id;
		const owner = `clearCache:${Date.now()}-${(Math.random()*1e4)|0}`;

		await lock(owner, pageKey(page), () => purge(page));

	} catch ( error ) {

		return asTrace(error);

	}
}
