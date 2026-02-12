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
 * Browser localStorage persistence hook with cross-tab synchronisation.
 *
 * @module
 */

import { useEffect, useState } from "react";
import { State } from "./index";


/**
 * Manages state persisted to browser localStorage with automatic cross-tab synchronisation.
 *
 * Values are stored as JSON under a namespaced key incorporating the page identifier. Changes in other browser tabs
 * are automatically synchronised via the `storage` event.
 *
 * @typeParam T the type of the stored value
 *
 * @param page the Confluence page identifier for key namespacing
 * @param name the storage key name
 * @param initial the default value when no stored entry exists
 *
 * @return a React state tuple for the persisted value
 */
export function useStorage<T>(page: string, name: string, initial: T): State<T> {

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

	useEffect(() => { // save to storage when value changes

		try {

			localStorage.setItem(key, JSON.stringify(value));

		} catch ( error ) {

			console.error(`Failed to update storage for key <${key}>:`, error);
		}

	}, [key, value]);

	useEffect(() => { // sync changes from other tabs

		function handler(event: StorageEvent) {

			if ( event.key === key && event.storageArea === localStorage ) {

				try {

					setValue(event.newValue ? JSON.parse(event.newValue) : initial);

				} catch ( error ) {

					console.error(`failed to sync storage for key <${key}>:`, error);

					setValue(initial);
				}

			}
		}

		window.addEventListener("storage", handler);

		return () => window.removeEventListener("storage", handler);

	}, [key, initial]);

	return [value, setValue];
}
