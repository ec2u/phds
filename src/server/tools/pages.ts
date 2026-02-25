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
 * Confluence page access utilities.
 *
 * @module
 */

import api, { route } from "@forge/api";

/**
 * Checks whether a Confluence page still exists.
 *
 * Only treats HTTP 404 as "page deleted"; all other responses and errors are treated as "page exists but
 * inaccessible" to avoid false deletions.
 *
 * @param page the Confluence page identifier
 *
 * @return true if the page exists or is inaccessible; false if deleted
 */
export async function checkPage(page: string): Promise<boolean> {

	const url = route`/wiki/api/v2/pages/${page}`;

	try {

		const response = await api.asApp().requestConfluence(url, {

			headers: { "Accept": "application/json" }

		});

		// only treat 404 as "page deleted", all other responses should be treated as "page exists but inaccessible"

		return response.status !== 404;

	} catch ( error ) {

		return true; // treat API errors as "page still exists" to avoid false deletions

	}
}

/**
 * Fetches a Confluence page's title and body content in Atlassian Document Format.
 *
 * @param page the Confluence page identifier
 *
 * @return the page title and ADF content
 *
 * @throws {Error} if the page cannot be fetched
 */
export async function fetchPage(page: string): Promise<{ title: string; content: any }> {

	const url = route`/wiki/api/v2/pages/${page}?body-format=atlas_doc_format`;

	const response = await api.asApp().requestConfluence(url, {

		headers: { "Accept": "application/json" }

	});

	if ( !response.ok ) {
		throw new Error(`failed to fetch page: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	const content = data.body?.atlas_doc_format?.value;

	return {
		title: data.title || "",
		content: content ? JSON.parse(content) : {}
	};
}

/**
 * Updates a Confluence page's body content in Atlassian Document Format.
 *
 * Fetches the current page version, then performs a PUT with the new ADF content and an incremented version number.
 *
 * @param page The Confluence page identifier
 * @param content The new ADF content to write
 *
 * @returns The updated page title and ADF content
 *
 * @throws {Error} If the page cannot be updated
 */
export async function storePage(page: string, content: unknown): Promise<{ title: string; content: unknown }> {

	// fetch current version

	const versionUrl = route`/wiki/api/v2/pages/${page}`;

	const versionResponse = await api.asApp().requestConfluence(versionUrl, {
		headers: { "Accept": "application/json" }
	});

	if ( !versionResponse.ok ) {
		throw new Error(`failed to fetch page version: ${versionResponse.status} ${versionResponse.statusText}`);
	}

	const version = await versionResponse.json();

	// update page

	const updateUrl = route`/wiki/api/v2/pages/${page}`;

	const response = await api.asApp().requestConfluence(updateUrl, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			id: page,
			status: "current",
			title: version.title,
			body: {
				representation: "atlas_doc_format",
				value: JSON.stringify(content)
			},
			version: {
				number: version.version.number + 1,
				message: "Updated via macro"
			}
		})
	});

	if ( !response.ok ) {
		throw new Error(`failed to update page: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	const body = data.body?.atlas_doc_format?.value;

	return {
		title: data.title || "",
		content: body ? JSON.parse(body) : {}
	};

}
