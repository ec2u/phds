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

import { createContext, createElement, ReactNode, useCallback, useContext, useState } from "react";

interface Cache {

	setCache<V>(key: string, value: V): void;

	getCache<V>(key: string): undefined | V;

	clearCache(): void;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const CacheContext=createContext<undefined | Cache>(undefined);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const useCache=() => {

	const context=useContext(CacheContext);

	if ( !context ) {
		throw new Error("useCacheContext must be used within <ToolCache/>");
	}

	return context;
};

export function ToolCache({ children }: { children: ReactNode }) {

	const [cache, setCacheState]=useState<Map<string, any>>(new Map());

	const setCache=useCallback((key: string, value: any) => {
		setCacheState(prev => new Map(prev).set(key, value));
	}, []);

	const getCache=useCallback((key: string) => {
		return cache.get(key);
	}, [cache]);

	const clearCache=useCallback(() => {
		setCacheState(new Map());
	}, []);


	return createElement(CacheContext.Provider, {

		value: { setCache, getCache, clearCache },
		children

	});

}
