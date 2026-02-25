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
 * Client-side observable store with local caching and event-driven cache invalidation.
 *
 * Wraps the shared {@link PageStore} with a local cache layer and an observer-based change notification system.
 * Incoming {@link PageEvent} notifications update the cache and notify observers with server-confirmed state,
 * enabling reactive UI updates without additional server roundtrips.
 *
 * **Important**: Observers are hierarchical. Clear operations (e.g. {@link PageStore.clearPolicy clearPolicy},
 * {@link PageStore.clearIssues clearIssues}) only affect individual items (translated documents, analysed issues),
 * never the catalogue itself.
 *
 * **Issue catalogue as source of truth**: The issues catalogue at `issuesKey` is the single source of truth for issue
 * data. Individual `issueKey` entries only hold activity/trace status during mutations
 * (e.g. {@link Activity.Submitting}
 * while an update is in flight). On success, individual entries are removed — the catalogue is updated by the
 * `issueUpdated` event. The policies catalogue is NOT unpacked — it is a
 * standalone resource listing page attachments.
 *
 * @module
 */

import type { Catalogue, Document } from "../shared/items/documents";
import type { Issue, IssueUpdate } from "../shared/items/issues";
import {
	Activity,
	agreementKey,
	isActivity,
	isTrace,
	issueKey,
	issuesKey,
	type PageEvent,
	type PageStore,
	policiesKey,
	policyKey,
	type Status,
	type StatusObserver
} from "../shared/store";
import { immutable, message } from "../shared/tools/core";
import { createCache } from "./store.core";


/**
 * Client-side page store extending {@link PageStore} with change observation.
 *
 * Adds methods for watching resources for changes. Observers receive the current {@link Status} directly,
 * avoiding round-trips through the corresponding read methods.
 */
export interface ClientStore extends PageStore {

	/**
	 * Resets the agreement cache entry, triggering a re-fetch from the server.
	 */
	resetAgreement(): void;

	/**
	 * Resets the policies catalogue cache entry, triggering a re-fetch from the server.
	 */
	resetPolicies(): void;

	/**
	 * Resets a policy document cache entry, triggering a re-fetch from the server.
	 *
	 * @param source The source attachment identifier
	 * @param language The target language tag
	 */
	resetPolicy(source: string, language?: string): void;

	/**
	 * Resets the issues catalogue cache entry, triggering a re-fetch from the server.
	 */
	resetIssues(): void;


	/**
	 * Observes changes to the agreement document.
	 *
	 * Notifies on each state change. The observer remains active until the returned cleanup function is called.
	 *
	 * @param observer The handler notified on changes
	 *
	 * @returns A cleanup function that stops observing
	 */
	observeAgreement(observer: StatusObserver<null | Document>): () => void;

	/**
	 * Observes changes to the policies catalogue.
	 *
	 * Notifies on each state change, including changes to individual policy documents.
	 * The observer remains active until the returned cleanup function is called.
	 *
	 * @param observer The handler notified on changes
	 *
	 * @returns A cleanup function that stops observing
	 */
	observePolicies(observer: StatusObserver<Catalogue>): () => void;

	/**
	 * Observes changes to a policy document being extracted or translated.
	 *
	 * Notifies on each state change. The observer remains active until the returned cleanup function is called.
	 *
	 * @param source The source attachment identifier
	 * @param language The target language tag
	 * @param observer The handler notified on changes
	 *
	 * @returns A cleanup function that stops observing
	 */
	observePolicy(source: string, language: undefined | string, observer: StatusObserver<Document>): () => void;

	/**
	 * Observes changes to the issues list.
	 *
	 * Notifies on each state change, including changes to individual issues. The observer remains active until
	 * the returned cleanup function is called.
	 *
	 * @param observer The handler notified on changes
	 *
	 * @returns A cleanup function that stops observing
	 */
	observeIssues(observer: StatusObserver<ReadonlyArray<Issue>>): () => void;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a {@link ClientStore} wrapping a base {@link PageStore} with local caching and event dispatch.
 *
 * Returns the observable store and a dispatcher. The dispatcher receives {@link PageEvent} notifications, updates the
 * local cache, and notifies registered observers.
 *
 * @param page The Confluence page identifier
 * @param store The base {@link PageStore} to wrap
 *
 * @returns The `observable` store and `dispatcher` callback
 */
export function createClientStore(page: string, store: PageStore): {

	observable: ClientStore;
	dispatcher: (event: PageEvent) => void;

} {

	const cache = createCache();


	return immutable({

		observable: {

			page,

			getAgreement,

			getPolicies,
			getPolicy,
			clearPolicy,

			getIssues,
			analyseIssues,
			clearIssues,
			updateIssues,

			resetAgreement,
			resetPolicies,
			resetPolicy,
			resetIssues,

			observeAgreement,
			observePolicies,
			observePolicy,
			observeIssues

		},

		dispatcher(event: PageEvent): void {

			if ( event.type === "agreement-updated" ) {

				cache.insert(agreementKey(page), event.status);

			} else if ( event.type === "policy-updated" ) {

				const key = policyKey(page, event.source, event.language);

				if ( event.status === null ) {
					cache.remove(key);
				} else {
					cache.insert(key, event.status);
				}

			} else if ( event.type === "issues-updated" ) {

				cache.insert(issuesKey(page), event.status);

			}

		}

	});


	async function getAgreement(): Promise<Status<null | Document>> {
		return cache.lookup(agreementKey(page), () =>
			store.getAgreement().catch(message)
		) ?? Activity.Submitting;
	}


	async function getPolicies(): Promise<Status<Catalogue>> {
		return cache.lookup(policiesKey(page), () =>
			store.getPolicies().catch(message)
		) ?? Activity.Submitting;
	}

	async function getPolicy(source: string, language?: string): Promise<Status<Document>> {
		return cache.lookup(policyKey(page, source, language), () =>
			store.getPolicy(source, language).catch(message)
		) ?? Activity.Submitting;
	}

	async function clearPolicy(source: string, language?: string): Promise<Status<void>> {
		return store.clearPolicy(source, language).catch(message);
	}


	async function getIssues(): Promise<Status<ReadonlyArray<Issue>>> {
		return cache.lookup(issuesKey(page), () =>
			store.getIssues().catch(message)
		) ?? Activity.Submitting;
	}

	async function analyseIssues(): Promise<Status<void>> {

		const key = issuesKey(page);
		const cached = cache.lookup(key);

		if ( isActivity(cached) ) { return cached; } else {

			cache.insert(key, Activity.Submitting);

			return store.analyseIssues().catch(message).then(status => {
				if ( isTrace(status) ) { cache.insert(key, status); }
			});

		}

	}

	async function clearIssues(): Promise<Status<void>> {

		const key = issuesKey(page);
		const cached = cache.lookup(key);

		if ( isActivity(cached) ) { return cached; } else {

			cache.insert(key, Activity.Submitting);

			return store.clearIssues().catch(message).then(status => {
				if ( isTrace(status) ) { cache.insert(key, status); }
			});

		}

	}

	async function updateIssues(issue: string, update: IssueUpdate): Promise<Status<void>> {

		const key = issueKey(page, issue);
		const cached = cache.lookup(key);

		if ( isActivity(cached) ) { return cached; } else {

			cache.insert(key, Activity.Submitting);

			// escalate errors to catalogue key so catalogue observers see the trace;
			// on success the server publishes `issues-updated` which inserts at the catalogue key directly

			return store.updateIssues(issue, update).catch(message).then(status => {
				if ( isTrace(status) ) { cache.insert(issuesKey(page), status); }
			});

		}

	}


	function resetAgreement(): void {
		cache.remove(agreementKey(page));
	}

	function resetPolicies(): void {
		cache.remove(policiesKey(page));
	}

	function resetPolicy(source: string, language?: string): void {
		cache.remove(policyKey(page, source, language));
	}

	function resetIssues(): void {
		cache.remove(issuesKey(page));
	}


	function observeAgreement(observer: StatusObserver<null | Document>): () => void {
		return cache.observe(agreementKey(page), () =>
			getAgreement().then(observer)
		);
	}

	function observePolicies(observer: StatusObserver<Catalogue>): () => void {
		return cache.observe(policiesKey(page), () =>
			getPolicies().then(observer)
		);
	}

	function observePolicy(source: string, language: undefined | string, observer: StatusObserver<Document>): () => void {
		return cache.observe(policyKey(page, source, language), () =>
			getPolicy(source, language).then(observer)
		);
	}

	function observeIssues(observer: StatusObserver<ReadonlyArray<Issue>>): () => void {
		return cache.observe(issuesKey(page), () =>
			getIssues().then(observer)
		);
	}

}
