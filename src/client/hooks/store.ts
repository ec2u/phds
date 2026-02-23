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
 * Client-side page state extending the shared contract with change observation.
 *
 * Adds reactive observation for tracking resource changes. Observers receive a notification signal; hooks then
 * retrieve fresh state through the base {@link PageStore} API.
 *
 * @module
 */

import { realtime } from "@forge/bridge";
import { useProductContext } from "@forge/react";
import { createContext, createElement, type ReactNode, useContext, useEffect, useMemo } from "react";
import { type PageEvent, pageKey } from "../../shared/store";
import { isObject } from "../../shared/tools/core";
import { analyseIssues, clearIssues, getIssues, updateIssues } from "../ports/issues";
import { clearPolicy, getPolicies, getPolicy } from "../ports/policies";
import { type ClientStore, createClientStore } from "../store";


/**
 * The React context for the client store.
 */
const StoreContext = createContext<undefined | ClientStore>(undefined);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Accesses the client store context.
 *
 * Must be used within a {@link ToolStore} provider component.
 *
 * @returns The client store operations
 *
 * @throws {Error} If used outside a `ToolState` provider
 */
export function useStore(): ClientStore {

	const context = useContext(StoreContext);

	if ( !context ) {
		throw new Error("useStore must be used within <ToolStore/>");
	}

	return context;

}

/**
 * Store provider component that creates and manages the {@link ClientStore} for descendant components.
 *
 * Owns the store lifecycle: resolves the Confluence page identifier from the Forge product context, creates
 * the {@link ClientStore} implementation, subscribes to the page event channel via Forge Realtime on mount, and
 * provides the store to the component tree via context. All hooks and components access the same store instance as a
 * client-side single source of truth via {@link useStore}.
 *
 * Renders `null` and defers children until the product context provides a valid page identifier, preventing store
 * creation with incomplete state. Unsubscribes from the channel on unmount.
 *
 * @param props The component props
 * @param props.children The child elements
 *
 * @returns The store context provider element, or `null` while the page identifier is unavailable
 */
export function ToolStore({ children }: { children: ReactNode }) {

	const context = useProductContext();
	const page = context?.extension?.content?.id;

	const store = useMemo(() => page ? createClientStore(page, {

		page,

		getPolicies: () => getPolicies(page),

		getPolicy: (source, language) => getPolicy(page, source, language),
		clearPolicy: (source, language) => clearPolicy(page, source, language),

		getIssues: () => getIssues(page),
		analyseIssues: () => analyseIssues(page),
		clearIssues: () => clearIssues(page),

		updateIssues: (issue, update) => updateIssues(page, issue, update)

	}) : undefined, [page]);


	useEffect(() => {

		if ( store ) {

			const subscription = realtime.subscribeGlobal(pageKey(page), payload => {

				if ( isPageEvent(payload) ) {
					store.dispatcher(payload);
				}

				function isPageEvent(value: unknown): value is PageEvent {
					return isObject(value)
						&& "type" in value
						&& "page" in value;
				}

			});

			return () => {
				subscription.then(s => s.unsubscribe());
			};
		} else {

			return undefined;
		}

	}, [page, store]);


	return store
		? createElement(StoreContext.Provider, { value: store.observable, children })
		: null;

}
