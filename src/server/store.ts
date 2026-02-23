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
 * Server-side page state acting as the single source of truth.
 *
 * Implements the shared {@link PageStore} contract backed by Forge KVS. The server updates KVS directly when handling
 * requests or completing async tasks, and publishes {@link PageEvent} notifications to clients after state updates.
 *
 * > [!IMPORTANT]
 * > Forge functions are stateless and request-scoped — no long-lived process can hold a subscription. The server
 * > publishes events but never subscribes to them.
 *
 * @module
 */

import { JobDoesNotExistError, Queue } from "@forge/events";
import { publishGlobal } from "@forge/realtime";
import type { Catalogue, Document } from "../shared/items/documents";
import type { Issue, IssueUpdate } from "../shared/items/issues";
import { normalizeIssue } from "../shared/items/issues";
import {
	Activity,
	isActivity,
	isContent,
	issueKey,
	issuesKey,
	on,
	type PageEvent,
	pageKey,
	type PageStore,
	policiesKey,
	policyKey,
	prefixKey,
	type Status
} from "../shared/store";
import { immutable, message } from "../shared/tools/core";
import type { Task } from "./tasks";
import { getAttachment, listAttachments } from "./tools/attachments";
import { deleteMatches, deleteValue, getMatches, getValue, setValue } from "./tools/kvs";
import { pdf } from "./tools/mime";
import { checkPage } from "./tools/pages";


/**
 * The KVS key prefix for system-level entries.
 *
 * Separates housekeeping keys (for example {@link purgeKey}) from page-scoped cache entries, so that global scans can
 * skip system entries when grouping by page.
 */
const systemKey = "system";


/**
 * The KVS key for tracking the last global purge timestamp.
 */
const purgeKey = `${systemKey}:purged`;

/**
 * The minimum interval between global purge operations in milliseconds.
 */
const purgePeriod = 24*60*60*1000;


/**
 * The Forge event queue for scheduling asynchronous task execution.
 */
const queue = new Queue({ key: "executor-queue" });


/**
 * Tracks the active job and its current progress stage for a resource.
 *
 * Stored in the job-tracking KVS key so that resolvers can return the actual current activity
 * when a duplicate request arrives while a job is already running.
 */
interface JobState {

	readonly id: string;
	readonly activity: Activity;

}


//// Housekeeping //////////////////////////////////////////////////////////////////////////////////////////////////////

purge().catch(error => console.error("background purge failed:", error));


//// API ///////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Server-side page store extending {@link PageStore} with event publishing.
 *
 * Adds methods for publishing {@link PageEvent} notifications to connected clients after state mutations.
 */
export interface ServerStore extends PageStore {

	/**
	 * Worker-side deduplication gate.
	 *
	 * Determines whether this worker should proceed with execution or exit silently because a newer job has
	 * superseded it for the same resource.
	 *
	 * @param jobId The current worker's job identifier
	 * @param task The task descriptor identifying the target resource
	 *
	 * @returns true if the worker should proceed; false if superseded
	 */
	isActive(jobId: string, task: Task): Promise<boolean>;


	/**
	 * Publishes a {@link PolicyUpdated} event on the page channel.
	 *
	 * @param source The source attachment identifier
	 * @param language The target language tag
	 * @param status The current status
	 */
	publishPolicyUpdated(source: string, language: string | undefined, status: Status<null | Document>): Promise<void>;

	/**
	 * Publishes an {@link IssuesUpdated} event on the page channel.
	 *
	 * @param status The current status
	 */
	publishIssuesUpdated(status: Status<ReadonlyArray<Issue>>): Promise<void>;

}


//// Factory ///////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a {@link ServerStore} for the given Confluence page.
 *
 * Returns a store instance backed by Forge KVS. Sync mutations update KVS and publish {@link PageEvent} notifications
 * on the page channel. Async operations push a task to the queue; the queue consumer publishes progress and completion
 * events.
 *
 * Event publishing is best-effort — failures are logged but do not affect the operation result.
 *
 * @param page The Confluence page identifier
 *
 * @returns A new {@link ServerStore} instance
 */
export function createServerStore(page: string): ServerStore {
	return immutable({

		page,

		getPolicies: () => getPolicies(page),

		getPolicy: (source, language) => getPolicy(page, source, language),
		clearPolicy: (source, language) => clearPolicy(page, source, language),

		getIssues: () => getIssues(page),
		analyseIssues: () => analyseIssues(page),
		clearIssues: () => clearIssues(page),
		updateIssues: (issue, update) => updateIssues(page, issue, update),

		isActive: (jobId, task) => isActive(page, jobId, task),

		publishPolicyUpdated: (source, language, status) => publishPolicyUpdated(page, source, language, status),
		publishIssuesUpdated: (status) => publishIssuesUpdated(page, status)

	});
}


//// Async Job Keys ////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Returns the resource key for tracking the active convert job.
 *
 * > [!IMPORTANT]
 * > MUST be placed outside the {@link policiesKey} prefix. Prefix scans on policy documents would otherwise match
 * > job-tracking entries.
 *
 * @param page The Confluence page identifier
 * @param source The source attachment identifier
 * @param language The target language tag
 *
 * @returns The resource key
 */
function policyConvertKey(page: string, source: string, language?: string): string {
	return language ? `${page}:convert:${source}:${language}` : `${page}:convert:${source}`;
}

/**
 * Returns the resource key for tracking the active analyse job.
 *
 * > [!IMPORTANT]
 * > MUST be placed outside the {@link issuesKey} prefix. Prefix scans on issue entries would otherwise match
 * > job-tracking entries.
 *
 * @param page The Confluence page identifier
 *
 * @returns The resource key
 */
function issuesAnalyseKey(page: string): string {
	return `${page}:analyse`;
}


//// Store Operations //////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Retrieves the policy catalogue for the current page, derived dynamically from PDF attachments.
 *
 * Lists PDF attachments, purges stale content cache entries for removed or updated attachments, and returns a mapping
 * from source identifiers to display titles.
 *
 * @param page The Confluence page identifier
 *
 * @returns The catalogue mapping, or an error trace on failure
 */
async function getPolicies(page: string): Promise<Status<Catalogue>> {
	try {

		const attachments = await listAttachments(page, pdf);

		// purge entries for removed or updated attachments

		await deleteMatches(policiesKey(page), result => {

			const source = result.key.split(":")[2];
			const attachment = attachments.find(a => source === a.id);

			if ( attachment === undefined ) {
				return true;
			} else {
				const document = result.value as Document;
				return new Date(document.created).getTime() < new Date(attachment.createdAt).getTime();
			}

		});

		return attachments.reduce((catalog, attachment) => ({
			...catalog,
			[attachment.id]: attachment.title.replace(/\.pdf$/, "")
		}), {});

	} catch ( error ) {

		return message(error);

	}
}

/**
 * Clears a cached policy document and publishes a {@link PolicyUpdated} event with `null` status.
 *
 * @param page The Confluence page identifier
 * @param source The source attachment identifier
 * @param language The target language tag; omit for original language
 *
 * @returns Void on success, or an error trace on failure
 */
async function clearPolicy(page: string, source: string, language?: string): Promise<Status<void>> {
	try {

		await deleteValue(policyKey(page, source, language));
		await publishPolicyUpdated(page, source, language, null);

	} catch ( error ) {

		return message(error);

	}
}

/**
 * Retrieves or triggers extraction of a single policy document.
 *
 * Returns a cached document if fresh. When no cached value exists (or the cached value is stale), queues an
 * asynchronous extraction job and returns {@link Activity.Scheduling}.
 *
 * @param page The Confluence page identifier
 * @param source The source attachment identifier
 * @param language The target language tag; omit for original language
 *
 * @returns The document, or {@link Activity.Scheduling} if a job was queued
 */
async function getPolicy(page: string, source: string, language?: string): Promise<Status<Document>> {
	try {

		const key = policyKey(page, source, language);
		const cached = await getValue<Document>(key);

		if ( cached != null ) {

			const attachment = await getAttachment(page, source);

			if ( new Date((cached).created).getTime() >= new Date(attachment.createdAt).getTime() ) {
				return cached;
			} else {
				await deleteValue(key);
			}

		}

		// empty or stale — queue async job unless already running

		return await schedule(
			policyConvertKey(page, source, language),
			{ page, task: { type: "convert", source, language } }
		);

	} catch ( error ) {

		return message(error);

	}
}


/**
 * Retrieves compliance issues for the current page.
 *
 * Scans all individual issue entries from the KVS and returns them.
 *
 * @param page The Confluence page identifier
 *
 * @returns The issues list, or an error trace on failure
 */
async function getIssues(page: string): Promise<Status<ReadonlyArray<Issue>>> {
	try {

		// check for in-progress analysis job

		const running = await getValue<JobState>(issuesAnalyseKey(page));

		if ( running ) {
			try {

				const response = await queue.getJob(running.id).getStats();
				const stats = await response.json();

				if ( stats.inProgress > 0 ) {
					return running.activity;
				}

			} catch ( error ) {

				if ( !(error instanceof JobDoesNotExistError) ) {
					throw error;
				}

			}
		}

		// no active job — return cached issues

		return readIssues(page);

	} catch ( error ) {

		return message(error);

	}
}

/**
 * Triggers a new compliance analysis for the current page.
 *
 * Queues an asynchronous analysis job. The task handler publishes progress and results as events.
 *
 * @param page The Confluence page identifier
 *
 * @returns Void on success, or an error trace on failure
 */
async function analyseIssues(page: string): Promise<Status<void>> {
	try {

		return await schedule(
			issuesAnalyseKey(page),
			{ page, task: { type: "analyse" } }
		);

	} catch ( error ) {

		return message(error);

	}
}

/**
 * Clears all cached issue data for the current page.
 *
 * Deletes all individual issue cache entries for the page, then publishes a {@link PageEvent} to notify connected
 * clients.
 *
 * @param page The Confluence page identifier
 *
 * @returns Void on success, or an error trace on failure
 */
async function clearIssues(page: string): Promise<Status<void>> {
	try {

		await deleteMatches(issuesKey(page));

		await publish(page, { type: "issues-updated", page, status: [] });

	} catch ( error ) {

		return message(error);

	}
}

/**
 * Updates mutable fields of a compliance issue.
 *
 * Reads the current value, merges the changes with an updated timestamp, writes back, and publishes an
 * {@link IssuesUpdated} event with the full catalogue to notify connected clients.
 *
 * @param page The Confluence page identifier
 * @param issue The unique issue identifier
 * @param update The partial {@link IssueUpdate} with fields to modify
 *
 * @returns Void on success, or an error trace on failure
 */
async function updateIssues(page: string, issue: string, update: IssueUpdate): Promise<Status<void>> {
	try {

		const key = issueKey(page, issue);
		const current = await getValue<Issue>(key);

		if ( current ) {

			const updated: Issue = { ...current, ...update, updated: new Date().toISOString() };

			await setValue<Issue>(key, updated);

			const catalogue = await readIssues(page);

			await publish(page, { type: "issues-updated", page, status: catalogue });

		}

	} catch ( error ) {

		return message(error);

	}
}


//// Event Publishing //////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Publishes a {@link PolicyUpdated} event, reactively caching the document on success.
 *
 * When the status is a {@link Document}, writes it to KVS before publishing the event.
 * When `null`, deletes the cached document from KVS.
 * {@link Activity} and {@link Trace} statuses are published without modifying the store.
 *
 * @param page The Confluence page identifier
 * @param source The source attachment identifier
 * @param language The target language tag
 * @param status The current status
 */
async function publishPolicyUpdated(
	page: string, source: string, language: undefined | string, status: Status<null | Document>
): Promise<void> {

	if ( isActivity(status) ) {

		await report(policyConvertKey(page, source, language), status);

	} else {

		await deleteValue(policyConvertKey(page, source, language));

		if ( status === null ) {
			await deleteValue(policyKey(page, source, language));
		} else if ( isContent(status) ) {
			await setValue<Document>(policyKey(page, source, language), status);
		}

	}

	await publish(page, { type: "policy-updated", page, source, language, status });
}

/**
 * Publishes an {@link IssuesUpdated} event, reactively caching the issues on success.
 *
 * When the status is an issue array, writes each issue to KVS before publishing the event.
 * {@link Activity} and {@link Trace} statuses are published without modifying the store.
 *
 * @param page The Confluence page identifier
 * @param status The current status
 */
async function publishIssuesUpdated(
	page: string, status: Status<ReadonlyArray<Issue>>
): Promise<void> {

	if ( isActivity(status) ) {

		await report(issuesAnalyseKey(page), status);

	} else {

		await deleteValue(issuesAnalyseKey(page));

		if ( isContent(status) ) {

			// write new issues first (overwrites existing keys in place)

			await Promise.all(status.map(issue =>
				setValue<Issue>(issueKey(page, issue.id), issue)
			));

			// then delete stale keys not present in the new set

			const fresh = new Set(status.map(issue => issueKey(page, issue.id)));

			await deleteMatches(issuesKey(page), result => !fresh.has(result.key));

		}

	}

	await publish(page, { type: "issues-updated", page, status });
}


/**
 * Publishes a {@link PageEvent} on the page channel.
 *
 * Best-effort — failures are logged but do not propagate to the caller.
 *
 * @param page The Confluence page identifier
 * @param event The event to publish
 */
async function publish(page: string, event: PageEvent): Promise<void> {
	try {

		console.debug([event.type, target(event), status(event)].filter(Boolean).join(" > "));

		await publishGlobal(pageKey(page), event);


		function target(event: PageEvent): undefined | string {
			return event.type === "policy-updated" ? event.language ? `${event.source}/${event.language}`
				: event.source : undefined;
		}

		function status(event: PageEvent): string {
			return on(event.status, {
				state: state => Activity[state].toLowerCase(),
				trace: trace => `error: ${trace}`,
				value: "done"
			});
		}

	} catch ( error ) {

		console.error(`event publish failed on channel ${pageKey(page)}:`, error);

	}
}


//// Job Scheduling ////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Checks whether the current worker is still the active job for the given resource.
 *
 * Computes the resource-scoped job key from the {@link Task} descriptor, reads the stored {@link JobState},
 * and compares its `id` against the worker's own `jobId`. Returns `true` if the worker should proceed.
 *
 * @param page The Confluence page identifier
 * @param jobId The current worker's job identifier
 * @param task The task descriptor identifying the resource-scoped job key
 *
 * @returns `true` if this job is active and should execute; `false` if superseded by a newer job
 */
async function isActive(page: string, jobId: string, task: Task): Promise<boolean> {

	switch ( task.type ) {

		case "convert":
			return check(policyConvertKey(page, task.source, task.language), jobId);

		case "analyse":
			return check(issuesAnalyseKey(page), jobId);

		default:
			return true;

	}

	async function check(jobKey: string, jobId: string): Promise<boolean> {

		const running = await getValue<JobState>(jobKey);

		if ( !running || running.id === jobId ) { return true; } else {
			try {

				const response = await queue.getJob(running.id).getStats();
				const stats = await response.json();

				return stats.inProgress === 0;

			} catch ( error ) {

				if ( error instanceof JobDoesNotExistError ) {
					return true; // stored job expired — safe to proceed
				} else {
					throw error;
				}

			}
		}

	}

}


/**
 * Queues a job unless one is already running for the given key.
 *
 * Checks KVS for an existing {@link JobState}, queries the queue for its status, and skips queuing if the job is
 * still in progress — returning the current {@link Activity} stored in the job state. Stale entries (completed,
 * failed, or expired jobs) are cleared before re-queuing.
 *
 * @param jobKey The KVS key tracking the active job
 * @param payload The event payload to push to the queue
 *
 * @returns The current {@link Activity} — either the stored progress of an existing job, or
 *   {@link Activity.Scheduling} for a newly queued job
 */
async function schedule(jobKey: string, payload: unknown): Promise<Activity> {

	const running = await getValue<JobState>(jobKey);

	if ( running ) {
		try {

			const response = await queue.getJob(running.id).getStats();
			const stats = await response.json();

			if ( stats.inProgress > 0 ) {
				return running.activity; // already running — return current progress
			}

			// completed or failed — clear stale state, fall through to re-queue

		} catch ( error ) {

			if ( !(error instanceof JobDoesNotExistError) ) {
				throw error;
			}

			// expired — clear stale state, fall through to re-queue

		}

		await deleteValue(jobKey);
	}

	const jobId = await queue.push(payload as any);

	await setValue<JobState>(jobKey, { id: jobId, activity: Activity.Scheduling });

	return Activity.Scheduling;
}

/**
 * Updates the current {@link Activity} in the job-tracking KVS key.
 *
 * Called by workers as they progress through stages, so that resolvers can return the actual current activity
 * when a duplicate request arrives. No-op if no {@link JobState} exists for the key.
 *
 * @param jobKey The KVS key tracking the active job
 * @param activity The current activity stage
 */
async function report(jobKey: string, activity: Activity): Promise<void> {

	const running = await getValue<JobState>(jobKey);

	if ( running ) {
		await setValue<JobState>(jobKey, { ...running, activity });
	}

}


//// Background Maintenance ////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Purges cache entries for deleted Confluence pages from Forge KVS.
 *
 * Performs a global scan of all cache entries, groups them by page, checks which pages still exist, and deletes
 * entries for deleted pages. Rate-limited to once per 24-hour period via {@link dirty}.
 */
async function purge(): Promise<void> {

	// rate-limit to one purge per 24-hour period

	const last = await getValue<string>(purgeKey);
	const next = Date.now();

	if ( !last || (next-parseInt(last)) > purgePeriod ) {

		await setValue<string>(purgeKey, next.toString());

		// collect distinct page IDs from non-system entries

		const pages = new Set(
			(await getMatches(undefined, result => !result.key.startsWith(prefixKey(systemKey))))
				.map(result => result.key.split(":")[0])
		);

		// delete all entries for pages that no longer exist

		await Promise.all(Array.from(pages, async (pageId) => {

			if ( !await checkPage(pageId) ) {

				console.info(`purging cache entries for deleted page <${pageId}>`);

				await deleteMatches(pageId);
			}

		}));

	}

}



//// Raw Data Access ///////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Reads all compliance issues from KVS for the given page.
 *
 * Performs a prefix scan on the page's issue entries and normalizes each result to handle legacy KVS entries missing
 * `state` or `severity` fields.
 *
 * @param page The Confluence page identifier
 *
 * @returns The raw issue array from KVS
 */
export async function readIssues(page: string): Promise<ReadonlyArray<Issue>> {
	return (await getMatches(issuesKey(page))).map(result => normalizeIssue(result.value as Issue));
}
