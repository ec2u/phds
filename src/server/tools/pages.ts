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

import api, {route} from "@forge/api";

export async function checkPage(page: string): Promise<boolean> {

	const url=route`/wiki/api/v2/pages/${page}`;

	try {

		const response=await api.asApp().requestConfluence(url, {

			headers: { "Accept": "application/json" }

		});

		// only treat 404 as "page deleted", all other responses should be treated as "page exists but inaccessible"

		return response.status !== 404;

	} catch ( error ) {

		return true; // treat API errors as "page still exists" to avoid false deletions

	}
}

export async function fetchPage(page: string): Promise<{ title: string; content: any }> {

	const url = route`/wiki/api/v2/pages/${page}?body-format=atlas_doc_format`;

	const response = await api.asApp().requestConfluence(url, {

		headers: {"Accept": "application/json"}

	});

	if (!response.ok) {
		throw new Error(`Failed to fetch page: ${response.status}`);
	}

	const data = await response.json();

	return {
		title: data.title || "",
		content: data.body?.atlas_doc_format?.value || {}
	};
}
