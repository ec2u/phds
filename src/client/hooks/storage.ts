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
 * Browser localStorage persistence hook.
 *
 * @module
 */

import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { useStore } from "./store";


/**
 * A React state tuple containing the current value and its setter function.
 *
 * @typeParam T the type of the state value
 */
export type State<T> = [T, Dispatch<SetStateAction<T>>];


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Manages state persisted to browser localStorage.
 *
 * Values are stored as JSON under a namespaced key incorporating the page identifier.
 *
 * @typeParam T the type of the stored value
 *
 * @param name the storage key name
 * @param initial the default value when no stored entry exists
 *
 * @return a React state tuple for the persisted value
 */
export function useStorage<T>(name: string, initial: T): State<T> {

	const { page } = useStore();

	const key = `ec2u-phds-${page}-${name}`;

	const [value, setValue] = useState<T>(() => {

		const stored = localStorage.getItem(key);

		if ( !stored ) {
			return initial;
		}

		try {

			return JSON.parse(stored);

		} catch ( error ) {

			console.error(`Failed to parse storage for key <${key}>:`, error);

			localStorage.removeItem(key);

			return initial;
		}

	});

	useEffect(() => {

		try {

			const serialized = JSON.stringify(value) ?? null;

			if ( serialized === null ) {
				localStorage.removeItem(key);
			} else {
				localStorage.setItem(key, serialized);
			}

		} catch ( error ) {

			console.error(`Failed to update storage for key <${key}>:`, error);
		}

	}, [key, value]);

	return [value, setValue];
}
