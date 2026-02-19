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
 * Mutation methods synchronously notify registered observers before delegating to the underlying store, providing
 * immediate optimistic feedback. Incoming {@link PageEvent} notifications further update the cache and notify
 * observers with server-confirmed state, enabling reactive UI updates without additional server roundtrips.
 *
 * **Important**: Observers are hierarchical. Clear operations (e.g. {@link PageStore.clearPolicies clearPolicies},
 * {@link PageStore.clearIssues clearIssues}) only affect individual items (translated documents, analysed issues),
 * never the catalogue itself. They MUST notify catalogue observers with the current cached catalogue value — not an
 * activity marker — so that catalogue views can re-render using their own cache entries. The catalogue cache value
 * MUST NOT be cleared or reset by clear operations.
 *
 * @module
 */

import type { Catalog, Document } from "../shared/items/documents";
import type { Issue, IssueUpdate } from "../shared/items/issues";
import { Activity, isActivity, on, type PageEvent, type PageStore, type Status } from "../shared/store";
import { immutable, isArray, message } from "../shared/tools/core";

/**
 * Client-side page store extending {@link PageStore} with change observation.
 *
 * Adds methods for watching resources for changes. Observers receive the current {@link Status} directly,
 * avoiding round-trips through the corresponding read methods.
 */
export interface ClientStore extends PageStore {

	/**
	 * The Confluence page identifier.
	 */
	readonly page: string;


	/**
	 * Observes changes to the policies catalogue.
	 *
	 * Delivers the current {@link Status} on each state change, including changes to individual policy documents.
	 * The observer remains active until the returned cleanup function is called.
	 *
	 * @param observer The handler receiving the current catalogue status on each change
	 *
	 * @returns A cleanup function that stops observing
	 */
	observePolicies(observer: (status: Status<Catalog>) => void): () => void;

	/**
	 * Observes changes to a policy document being extracted or translated.
	 *
	 * Delivers the current {@link Status} on each state change. The observer remains active until the returned
	 * cleanup function is called.
	 *
	 * @param source The source attachment identifier
	 * @param language The target language tag
	 * @param observer The handler receiving the current document status on each change
	 *
	 * @returns A cleanup function that stops observing
	 */
	observePolicy(source: string, language: string, observer: (status: Status<Document>) => void): () => void;


	/**
	 * Observes changes to the issues list.
	 *
	 * Delivers the current {@link Status} on each state change, including changes to individual issues. The observer
	 * remains active until the returned cleanup function is called.
	 *
	 * @param observer The handler receiving the current issues status on each change
	 *
	 * @returns A cleanup function that stops observing
	 */
	observeIssues(observer: (status: Status<ReadonlyArray<Issue>>) => void): () => void;

	/**
	 * Observes changes to a specific compliance issue.
	 *
	 * Delivers the current {@link Status} on each state change. The observer remains active until the returned
	 * cleanup function is called.
	 *
	 * @param issue The unique issue identifier
	 * @param observer The handler receiving the current issue status on each change
	 *
	 * @returns A cleanup function that stops observing
	 */
	observeIssue(issue: string, observer: (status: Status<Issue>) => void): () => void;

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

	const policies = cached<Catalog, Document>();
	const issues = cached<ReadonlyArray<Issue>, Issue>();


	return immutable({

		observable: {

			page,


			async getPolicies(): Promise<Status<Catalog>> {

				if ( policies.catalogue !== undefined ) {
					return policies.catalogue;
				} else {

					policies.catalogue = Activity.Submitting;

					return on(await store.getPolicies().catch(message), {
						trace: trace => {
							policies.catalogue = undefined;
							return trace;
						},
						other: status => policies.catalogue = status
					});

				}

			},

			async getPolicy(source: string, language?: string): Promise<Status<Document>> {

				const key = policyKey(source, language);
				const item = policies.items.get(key);
				const status = policies.catalogue;

				if ( item !== undefined ) {
					return item;
				} else if ( isActivity(status) ) {
					return status;
				} else {

					policies.items.set(key, Activity.Submitting);

					return on(await store.getPolicy(source, language).catch(message), {
						trace: trace => {
							policies.items.delete(key);
							return trace;
						},
						other: status => {
							policies.items.set(key, status);
							return status;
						}
					});

				}

			},

			async clearPolicies(): Promise<Status<void>> {

				// clearing only affects translated documents (items), not the source catalogue;
				// notify catalogue observers with the current cached value so views can update themselves

				policies.items.clear();
				policies.notifyCatalogue(policies.catalogue ?? {});
				policies.notifyItems(Activity.Submitting);

				return store.clearPolicies().catch(error => {

					const trace = message(error);

					policies.notifyCatalogue(trace);

					return trace;

				});

			},


			async getIssues(): Promise<Status<ReadonlyArray<Issue>>> {

				if ( issues.catalogue !== undefined ) {
					return issues.catalogue;
				} else {

					issues.catalogue = Activity.Submitting;

					return on(await store.getIssues().catch(message), {
						trace: trace => {
							issues.catalogue = undefined;
							return trace;
						},
						other: status => issues.catalogue = status
					});

				}

			},

			async analyseIssues(): Promise<Status<void>> {

				issues.purge();
				issues.catalogue = Activity.Submitting;
				issues.notifyCatalogue(Activity.Submitting);
				issues.notifyItems(Activity.Submitting);

				return store.analyseIssues().catch(error => {

					const trace = message(error);

					issues.catalogue = trace;
					issues.notifyCatalogue(trace);

					return trace;

				});

			},

			async clearIssues(): Promise<Status<void>> {

				// unlike policies (where the catalogue of sources is preserved), clearing issues
				// empties the list itself — reset the catalogue to an empty array

				issues.purge();
				issues.catalogue = [];
				issues.notifyCatalogue([]);
				issues.notifyItems(Activity.Submitting);

				return store.clearIssues().catch(error => {

					const trace = message(error);

					issues.notifyCatalogue(trace);

					return trace;

				});

			},

			async getIssue(issue: string): Promise<Status<Issue>> {

				const key = issueKey(issue);
				const item = issues.items.get(key);
				const catalogue = issues.catalogue;

				if ( item !== undefined ) {
					return item;
				} else if ( isActivity(catalogue) ) {
					return catalogue;
				} else {

					const found = isArray<Issue>(catalogue) ? catalogue.find(i => i.id === issue) : undefined;

					if ( found === undefined ) {

						issues.items.set(key, Activity.Submitting);

						return on(await store.getIssue(issue).catch(message), {
							trace: trace => {
								issues.items.delete(key);
								return trace;
							},
							other: status => {
								issues.items.set(key, status);
								return status;
							}
						});

					} else {

						issues.items.set(key, found);
						return found;

					}

				}

			},

			async updateIssue(issue: string, update: IssueUpdate): Promise<Status<void>> {

				const key = issueKey(issue);
				const cached = issues.items.get(key)
					?? (isArray<Issue>(issues.catalogue) ? issues.catalogue.find(i => i.id === issue) : undefined);
				const optimistic: Status<Issue> = cached !== undefined && typeof cached === "object"
					? { ...cached, ...update }
					: Activity.Submitting;

				issues.items.set(key, optimistic);
				issues.notifyItem(key, optimistic);

				// optimistically update the catalogue entry so list views re-sort

				if ( isArray<Issue>(issues.catalogue) && typeof optimistic === "object" ) {

					issues.catalogue = issues.catalogue.map(i =>
						i.id === issue ? optimistic as Issue : i
					);

					issues.notifyCatalogue(issues.catalogue);

				}

				return store.updateIssue(issue, update).catch(error => {

					const trace = message(error);

					issues.items.set(key, trace);
					issues.notifyItem(key, trace);

					return trace;

				});

			},


			observePolicies(observer: (status: Status<Catalog>) => void): () => void {

				if ( policies.catalogue !== undefined ) {
					observer(policies.catalogue);
				} else {

					policies.catalogue = Activity.Submitting;
					observer(Activity.Submitting);

					store.getPolicies().catch(message).then(status => {

						on(status, {
							trace: () => { policies.catalogue = undefined; },
							other: () => { policies.catalogue = status; }
						});

						policies.notifyCatalogue(status);

					});

				}

				return policies.observeCatalogue(observer);

			},

			observePolicy(source: string, language: string, observer: (status: Status<Document>) => void): () => void {

				const key = policyKey(source, language);
				const item = policies.items.get(key);

				if ( item !== undefined ) {
					observer(item);
				} else if ( isActivity(policies.catalogue) ) {
					observer(policies.catalogue);
				} else {

					policies.items.set(key, Activity.Submitting);
					observer(Activity.Submitting);

					store.getPolicy(source, language).catch(message).then(status => {

						on(status, {
							trace: () => { policies.items.delete(key); },
							other: () => { policies.items.set(key, status); }
						});

						policies.notifyItem(key, status);

					});

				}

				return policies.observeItem(key, observer);

			},


			observeIssues(observer: (status: Status<ReadonlyArray<Issue>>) => void): () => void {

				if ( issues.catalogue !== undefined ) {
					observer(issues.catalogue);
				} else {

					issues.catalogue = Activity.Submitting;
					observer(Activity.Submitting);

					store.getIssues().catch(message).then(status => {

						on(status, {
							trace: () => { issues.catalogue = undefined; },
							other: () => { issues.catalogue = status; }
						});

						issues.notifyCatalogue(status);

					});

				}

				return issues.observeCatalogue(observer);

			},

			observeIssue(issue: string, observer: (status: Status<Issue>) => void): () => void {

				const key = issueKey(issue);
				const item = issues.items.get(key);

				if ( item !== undefined ) {
					observer(item);
				} else if ( isActivity(issues.catalogue) ) {
					observer(issues.catalogue);
				} else {

					issues.items.set(key, Activity.Submitting);
					observer(Activity.Submitting);

					store.getIssue(issue).catch(message).then(status => {

						on(status, {
							trace: () => { issues.items.delete(key); },
							other: () => { issues.items.set(key, status); }
						});

						issues.notifyItem(key, status);

					});

				}

				return issues.observeItem(key, observer);

			}

		},

		dispatcher(event: PageEvent): void {

			if ( event.type === "policies-cleared" ) {

				policies.items.clear();
				policies.notifyCatalogue(policies.catalogue ?? {});
				policies.notifyItems(Activity.Submitting);

			} else if ( event.type === "policy-converted" ) {

				const key = policyKey(event.source, event.language);

				policies.items.set(key, event.status);
				policies.notifyItem(key, event.status);

				if ( policies.catalogue !== undefined ) {
					policies.notifyCatalogue(policies.catalogue);
				}

			} else if ( event.type === "issues-analysed" ) {

				issues.catalogue = event.status;
				issues.notifyCatalogue(event.status);
				issues.notifyItems(Activity.Submitting);

			} else if ( event.type === "issues-cleared" ) {

				issues.purge();
				issues.catalogue = [];
				issues.notifyCatalogue([]);
				issues.notifyItems(Activity.Submitting);

			} else if ( event.type === "issue-updated" ) {

				const key = issueKey(event.issue);

				issues.items.set(key, event.status);
				issues.notifyItem(key, event.status);

				// update the catalogue entry so list views re-sort

				if ( isArray<Issue>(issues.catalogue) && typeof event.status === "object" ) {

					issues.catalogue = issues.catalogue.map(i =>
						i.id === event.issue ? event.status as Issue : i
					);

					issues.notifyCatalogue(issues.catalogue);

				}

			}

		}

	});

}


//// Cache Keys
// /////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Builds the cache key for an individual policy document.
 *
 * @param source The source attachment identifier
 * @param language The target language tag
 *
 * @returns The colon-separated cache key
 */
function policyKey(source: string, language?: string): string {
	return language !== undefined ? `${source}:${language}` : source;
}

/**
 * Builds the cache key for an individual compliance issue.
 *
 * @param issue The unique issue identifier
 *
 * @returns The cache key
 */
function issueKey(issue: string): string {
	return issue;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a local cache with observer-based change notification.
 *
 * Manages a two-level cache (catalogue and keyed items) with independent observer sets. Catalogue observers receive
 * the current catalogue {@link Status} on each change. Item observers receive the current item {@link Status} for
 * their specific key.
 *
 * @typeParam C The catalogue value type
 * @typeParam I The individual item value type
 */
function cached<C, I>() {

	const cache = {

		catalogue: undefined as Status<C> | undefined,
		items: new Map<string, Status<I>>(),

		catalogueObservers: new Set<(status: Status<C>) => void>(),
		itemObservers: new Map<string, Set<(status: Status<I>) => void>>(),


		purge(): void {
			cache.catalogue = undefined;
			cache.items.clear();
		},

		observeCatalogue(observer: (status: Status<C>) => void): () => void {
			cache.catalogueObservers.add(observer);
			return () => {
				cache.catalogueObservers.delete(observer);
			};
		},

		observeItem(key: string, observer: (status: Status<I>) => void): () => void {

			if ( !cache.itemObservers.has(key) ) {
				cache.itemObservers.set(key, new Set());
			}

			cache.itemObservers.get(key)!.add(observer);

			return () => {
				cache.itemObservers.get(key)?.delete(observer);
			};

		},

		notifyCatalogue(status: Status<C>): void {
			cache.catalogueObservers.forEach(o => o(status));
		},

		notifyItems(status: Status<I>): void {
			cache.itemObservers.forEach(set => set.forEach(o => o(status)));
		},

		notifyItem(key: string, status: Status<I>): void {
			cache.itemObservers.get(key)?.forEach(o => o(status));
		}

	};

	return cache;

}
