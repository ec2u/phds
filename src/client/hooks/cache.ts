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
 * In-memory cache context for sharing data between hooks and components.
 *
 * Provides a React context-based key-value cache that persists across re-renders within the same component tree,
 * enabling hooks to share fetched data without redundant server requests.
 *
 * @module
 */

import { createContext, createElement, ReactNode, useCallback, useContext, useState } from "react";

/**
 * Key-value cache operations interface.
 */
interface Cache {

	/**
	 * Stores a value in the cache.
	 *
	 * @typeParam V the value type
	 *
	 * @param key the cache key
	 * @param value the value to store
	 */
	setCache<V>(key: string, value: V): void;

	/**
	 * Retrieves a value from the cache.
	 *
	 * @typeParam V the expected value type
	 *
	 * @param key the cache key
	 *
	 * @return the cached value, or `undefined` if not found
	 */
	getCache<V>(key: string): undefined | V;

	/**
	 * Clears all cached entries.
	 */
	clearCache(): void;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * The React context for the in-memory cache.
 */
const CacheContext = createContext<undefined | Cache>(undefined);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Accesses the in-memory cache context.
 *
 * Must be used within a {@link ToolCache} provider component.
 *
 * @return the cache operations
 *
 * @throws {Error} if used outside a `ToolCache` provider
 */
export const useCache = () => {

	const context = useContext(CacheContext);

	if ( !context ) {
		throw new Error("useCacheContext must be used within <ToolCache/>");
	}

	return context;
};

/**
 * Cache provider component that makes the in-memory cache available to descendant components.
 *
 * @param props the component props
 * @param props.children the child elements
 *
 * @return the cache context provider element
 */
export function ToolCache({ children }: { children: ReactNode }) {

	const [cache, setCacheState] = useState<Map<string, any>>(new Map());

	const setCache = useCallback((key: string, value: any) => {
		setCacheState(prev => new Map(prev).set(key, value));
	}, []);

	const getCache = useCallback((key: string) => {
		return cache.get(key);
	}, [cache]);

	const clearCache = useCallback(() => {
		setCacheState(new Map());
	}, []);


	return createElement(CacheContext.Provider, {

		value: { setCache, getCache, clearCache },
		children

	});

}
