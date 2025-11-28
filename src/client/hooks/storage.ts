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

import { useProductContext } from "@forge/react";
import { useEffect, useState } from "react";

export function useStorage<T>(name: string, {

	initial,

	scope = "page",
	store = "local"

}: {

	readonly initial?: T;

	readonly scope?: "page" | "macro";
	readonly store?: "local" | "session";

} = {}): [T | undefined, (value: T | undefined) => void] {

	const context = useProductContext();
	const storage = store === "session" ? sessionStorage : localStorage;

	const id = context?.extension?.content?.id;
	const key = scope === "macro" ? name : id ? `ec2u-phds-${id}-${name}` : null;

	const [value, setValue] = useState<T | undefined>(initial);


	useEffect(() => { // load from storage once context is ready

		if ( key ) {

			const value = storage.getItem(key);

			try {

				setValue(value ? JSON.parse(value) : initial);

			} catch ( error ) {

				console.error(`Failed to parse storage for key <${key}>:`, error);

				setValue(undefined);

				storage.removeItem(key);
			}

		}

	}, [key, storage, initial]);

	useEffect(() => { // save to storage when value changes

		if ( key ) {

			try {

				if ( value === undefined ) {
					storage.removeItem(key);
				} else {
					storage.setItem(key, JSON.stringify(value));
				}

			} catch ( error ) {
				console.error(`Failed to update storage for key <${key}>:`, error);
			}

		}

	}, [value, storage]); // key not in deps - transitions only once from null to final value

	useEffect(() => { // sync changes from other tabs

		function handler(event: StorageEvent) {

			if ( key && event.key === key && event.storageArea === storage ) {

				try {

					setValue(event.newValue ? JSON.parse(event.newValue) : initial);

				} catch ( error ) {

					console.error(`failed to sync storage for key <${key}>:`, error);

					setValue(undefined);
				}

			}
		}

		window.addEventListener("storage", handler);

		return () => window.removeEventListener("storage", handler);

	}, [key, storage, initial]);

	return [value, setValue];
}
