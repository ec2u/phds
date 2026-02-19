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
import { kvs, WhereConditions } from "@forge/kvs";
import { publishGlobal } from "@forge/realtime";
import type { Catalog, Document } from "../shared/items/documents";
import type { Issue, IssueUpdate } from "../shared/items/issues";
import { normalizeIssue } from "../shared/items/issues";
import {
	Activity,
	channel,
	isActivity,
	isTrace,
	on,
	type PageEvent,
	type PageStore,
	type Status
} from "../shared/store";
import { immutable, message } from "../shared/tools/core";
import type { Task } from "./tasks";
import { getAttachment, listAttachments } from "./tools/attachments";
import { pdf } from "./tools/mime";
import { checkPage } from "./tools/pages";


/**
 * The KVS key for tracking the last global purge timestamp.
 */
const purgeKey = "system:purged";

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

purge(); // background maintenance on cold start


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
	 * Publishes a {@link PolicyConverted} event on the page channel.
	 *
	 * @param source The source attachment identifier
	 * @param language The target language tag
	 * @param status The current status
	 */
	publishPolicyConverted(source: string, language: string | undefined, status: Status<Document>): Promise<void>;

	/**
	 * Publishes an {@link IssuesAnalysed} event on the page channel.
	 *
	 * @param status The current status
	 */
	publishIssuesAnalysed(status: Status<ReadonlyArray<Issue>>): Promise<void>;

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

		getPolicies: () => getPolicies(page),
		clearPolicies: () => clearPolicies(page),
		getPolicy: (source, language) => getPolicy(page, source, language),

		getIssues: () => getIssues(page),
		analyseIssues: () => analyseIssues(page),
		clearIssues: () => clearIssues(page),

		getIssue: (issue) => getIssue(page, issue),
		updateIssue: (issue, update) => updateIssue(page, issue, update),

		isActive: (jobId, task) => isActive(page, jobId, task),

		publishPolicyConverted: (source, language, status) => publishPolicyConverted(page, source, language, status),
		publishIssuesAnalysed: (status) => publishIssuesAnalysed(page, status)

	});
}


//// KVS Keys //////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Builds the KVS key for the policies catalogue.
 *
 * > [!IMPORTANT]
 * > Job tracking keys (e.g. {@link policyConvertKey}) MUST be placed outside the `{page}:policies:*` prefix,
 * > as {@link getPolicies} uses a `beginsWith` query on that prefix to scan cached documents.
 *
 * @param page The Confluence page identifier
 *
 * @returns The colon-separated KVS key
 */
function policiesKey(page: string): string {
	return `${page}:policies`;
}

/**
 * Builds the KVS key for an individual policy document.
 *
 * Placed under the `{page}:policies:*` prefix to be reachable by the {@link getPolicies} scan.
 *
 * @param page The Confluence page identifier
 * @param source The source attachment identifier
 * @param language The target language tag for translated documents
 *
 * @returns The colon-separated KVS key
 */
function policyKey(page: string, source: string, language?: string): string {
	return language ? `${policiesKey(page)}:${source}:${language}` : `${policiesKey(page)}:${source}`;
}

/**
 * Builds the KVS key for tracking the active convert job.
 *
 * Placed outside the `{page}:policies:*` prefix to avoid colliding with the {@link getPolicies} scan.
 *
 * @param page The Confluence page identifier
 * @param source The source attachment identifier
 * @param language The target language tag
 *
 * @returns The colon-separated KVS key
 */
function policyConvertKey(page: string, source: string, language?: string): string {
	return language ? `${page}:convert:${source}:${language}` : `${page}:convert:${source}`;
}


/**
 * Builds the KVS key for the issues catalogue.
 *
 * > [!IMPORTANT]
 * > Job tracking keys (e.g. {@link issuesAnalyseKey}) MUST be placed outside the `{page}:issues:*` prefix,
 * > as {@link getIssues} uses a `beginsWith` query on that prefix to scan individual issue entries.
 *
 * @param page The Confluence page identifier
 *
 * @returns The colon-separated KVS key
 */
function issuesKey(page: string): string {
	return `${page}:issues`;
}

/**
 * Builds the KVS key for tracking the active analyse job.
 *
 * Placed outside the `{page}:issues:*` prefix to avoid colliding with the {@link getIssues} scan.
 *
 * @param page The Confluence page identifier
 *
 * @returns The colon-separated KVS key
 */
function issuesAnalyseKey(page: string): string {
	return `${page}:analyse`;
}

/**
 * Builds the KVS key for an individual issue.
 *
 * Placed under the `{page}:issues:*` prefix to be reachable by the {@link getIssues} scan.
 *
 * @param page The Confluence page identifier
 * @param issue The issue identifier
 *
 * @returns The colon-separated KVS key
 */
function issueKey(page: string, issue: string): string {
	return `${page}:issues:${issue}`;
}


//// Store Operations //////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Retrieves the catalogue of available policy documents for the current page.
 *
 * Lists PDF attachments, purges stale cache entries for removed or updated attachments, and returns a mapping from
 * source identifiers to display titles.
 *
 * @param page The Confluence page identifier
 *
 * @returns The catalogue mapping, or an error trace on failure
 */
async function getPolicies(page: string): Promise<Status<Catalog>> {
	try {

		const attachments = await listAttachments(page, pdf);

		const cached = await kvs.query()
			.where("key", WhereConditions.beginsWith(`${policiesKey(page)}:`))
			.limit(100)
			.getMany();

		// purge entries for removed or updated attachments

		await Promise.all(cached.results
			.filter(result => {

				const source = result.key.split(":")[2];
				const attachment = attachments.find(a => source === a.id);

				if ( attachment === undefined ) {
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

	} catch ( error ) {

		return message(error);

	}
}

/**
 * Clears all cached policy data for the current page.
 *
 * Deletes all policy cache entries for the page, then publishes a {@link PageEvent} to notify connected clients.
 *
 * @param page The Confluence page identifier
 *
 * @returns Void on success, or an error trace on failure
 */
async function clearPolicies(page: string): Promise<Status<void>> {
	try {

		const cached = await kvs.query()
			.where("key", WhereConditions.beginsWith(`${policiesKey(page)}:`))
			.limit(100)
			.getMany();

		await Promise.all(cached.results.map(result => kvs.delete(result.key)));

		await publish(page, { type: "policies-cleared", page, status: undefined });

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
		const cached: undefined | Document = await kvs.get(key);

		if ( cached != null ) {

			const attachment = await getAttachment(page, source);

			if ( new Date((cached).created).getTime() >= new Date(attachment.createdAt).getTime() ) {
				return cached;
			} else {
				await kvs.delete(key);
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

		const results: Array<{ key: string; value: unknown }> = [];

		let cursor: string | undefined;

		do {

			const query = kvs.query()
				.where("key", WhereConditions.beginsWith(`${issuesKey(page)}:`))
				.limit(100);

			const batch = await (cursor ? query.cursor(cursor) : query).getMany();

			results.push(...batch.results);
			cursor = batch.nextCursor;

		} while ( cursor );

		return results.map(result => normalizeIssue(result.value as Issue));

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
 * Deletes the issues collection sentinel and all individual issue cache entries for the page, then publishes a
 * {@link PageEvent} to notify connected clients.
 *
 * @param page The Confluence page identifier
 *
 * @returns Void on success, or an error trace on failure
 */
async function clearIssues(page: string): Promise<Status<void>> {
	try {

		const key = issuesKey(page);

		await kvs.delete(key);

		const cached = await kvs.query()
			.where("key", WhereConditions.beginsWith(`${key}:`))
			.limit(100)
			.getMany();

		await Promise.all(cached.results.map(result => kvs.delete(result.key)));

		await publish(page, { type: "issues-cleared", page, status: undefined });

	} catch ( error ) {

		return message(error);

	}
}

/**
 * Retrieves a single compliance issue by identifier.
 *
 * @param page The Confluence page identifier
 * @param issue The unique issue identifier
 *
 * @returns The issue, or an error trace if not found or on failure
 */
async function getIssue(page: string, issue: string): Promise<Status<Issue>> {
	try {

		const cached = await kvs.get<Issue>(issueKey(page, issue));

		if ( cached === undefined ) {
			return message(new Error(`issue not found: ${issue}`));
		} else {
			return normalizeIssue(cached);
		}

	} catch ( error ) {

		return message(error);

	}
}

/**
 * Updates mutable fields of a compliance issue.
 *
 * Reads the current value, merges the changes with an updated timestamp, writes back, and publishes a
 * {@link PageEvent} with the full updated issue to notify connected clients.
 *
 * @param page The Confluence page identifier
 * @param issue The unique issue identifier
 * @param update The partial {@link IssueUpdate} with fields to modify
 *
 * @returns Void on success, or an error trace on failure
 */
async function updateIssue(page: string, issue: string, update: IssueUpdate): Promise<Status<void>> {
	try {

		const key = issueKey(page, issue);
		const current = await kvs.get<Issue>(key);

		if ( current ) {

			const updated: Issue = { ...current, ...update, updated: new Date().toISOString() };

			await kvs.set<Issue>(key, updated);

			await publish(page, { type: "issue-updated", page, issue, status: normalizeIssue(updated) });

		}

	} catch ( error ) {

		return message(error);

	}
}


//// Event Publishing //////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Publishes a {@link PolicyConverted} event, reactively caching the document on success.
 *
 * When the status is a {@link Document}, writes it to KVS before publishing the event.
 * {@link Activity} and {@link Trace} statuses are published without modifying the store.
 *
 * @param page The Confluence page identifier
 * @param source The source attachment identifier
 * @param language The target language tag
 * @param status The current status
 */
async function publishPolicyConverted(page: string, source: string, language: undefined | string, status: Status<Document>): Promise<void> {

	if ( isActivity(status) ) {

		await report(policyConvertKey(page, source, language), status);

	} else if ( !isTrace(status) ) {

		await kvs.set<Document>(policyKey(page, source, language), status);

	}

	await publish(page, { type: "policy-converted", page, source, language, status });
}

/**
 * Publishes an {@link IssuesAnalysed} event, reactively caching the issues on success.
 *
 * When the status is an issue array, writes each issue to KVS before publishing the event.
 * {@link Activity} and {@link Trace} statuses are published without modifying the store.
 *
 * @param page The Confluence page identifier
 * @param status The current status
 */
async function publishIssuesAnalysed(page: string, status: Status<ReadonlyArray<Issue>>): Promise<void> {

	if ( isActivity(status) ) {

		await report(issuesAnalyseKey(page), status);

	} else if ( !isTrace(status) ) {

		// clear old issue entries before writing the new set to avoid stale/bogus issues

		const cached = await kvs.query()
			.where("key", WhereConditions.beginsWith(`${issuesKey(page)}:`))
			.limit(100)
			.getMany();

		await Promise.all(cached.results.map(result => kvs.delete(result.key)));

		await Promise.all(status.map(issue => kvs.set<Issue>(issueKey(page, issue.id), issue)));

	}

	await publish(page, { type: "issues-analysed", page, status });
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

		await publishGlobal(channel(page), event);


		function target(event: PageEvent): undefined | string {
			return event.type === "policy-converted" ? event.language ? `${event.source}/${event.language}`
				: event.source : event.type === "issue-updated" ? event.issue
				: undefined;
		}

		function status(event: PageEvent): string {
			return on(event.status, {
				state: state => Activity[state].toLowerCase(),
				trace: trace => `error: ${trace}`,
				value: "done"
			});
		}

	} catch ( error ) {

		console.error(`event publish failed on channel ${channel(page)}:`, error);

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

		const running = await kvs.get<JobState>(jobKey);

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

	const running = await kvs.get<JobState>(jobKey);

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

		await kvs.delete(jobKey);
	}

	const jobId = await queue.push(payload as any);

	await kvs.set<JobState>(jobKey, { id: jobId, activity: Activity.Scheduling });

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

	const running = await kvs.get<JobState>(jobKey);

	if ( running ) {
		await kvs.set<JobState>(jobKey, { ...running, activity });
	}

}


//// Background Maintenance ////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Purges cache entries for deleted Confluence pages from Forge KVS.
 *
 * Performs a global scan of all cache entries, groups them by page, checks which pages still exist, and deletes
 * entries for deleted pages. Rate-limited to once per 24-hour period via {@link dirty}.
 */
function purge(): void {
	dirty().then(async (needed) => {

		if ( needed ) {

			const results = await scan();

			// group cache entries by page

			const entriesByPage = results.reduce((entries, result) => {

				const page = result.key.split(":")[0];

				return { ...entries, [page]: [...(entries[page] || []), result] };

			}, {} as Record<string, Array<{ key: string; value: unknown }>>);

			// check which pages still exist and delete entries for deleted pages

			await Promise.all(Object.entries(entriesByPage).map(async ([pageId, entries]) => {

				if ( !await checkPage(pageId) ) {
					await Promise.all(entries.map(result => {

						console.info(`deleting cache key <${result.key}> for deleted page <${pageId}>`);

						return kvs.delete(result.key);

					}));
				}

			}));
		}

	}).catch(error => {

		console.error("background purge failed:", error);

	});
}

/**
 * Checks if a global purge is needed and claims the purge period atomically.
 *
 * Uses a check-and-set pattern to prevent multiple concurrent global purges. Only one process per 24-hour period
 * can successfully claim the purge.
 *
 * @returns true if this process should proceed with the purge; false otherwise
 */
async function dirty(): Promise<boolean> {

	const last = await kvs.get<string>(purgeKey);
	const next = Date.now();

	if ( !last || (next-parseInt(last)) > purgePeriod ) {

		await kvs.set<string>(purgeKey, next.toString());

		return true;

	} else {

		return false;

	}
}

/**
 * Scans the KVS for all non-system cache entries with pagination.
 *
 * @returns All user cache entries
 */
async function scan(): Promise<Array<{ key: string; value: unknown }>> {

	const results: Array<{ key: string; value: unknown }> = [];

	let cursor: string | undefined;

	do {

		const query = kvs.query().limit(100);

		const batch = await (cursor ? query.cursor(cursor) : query).getMany();

		results.push(...batch.results.filter(result => !result.key.startsWith("system:")));

		cursor = batch.nextCursor;

	} while ( cursor );

	return results;
}
