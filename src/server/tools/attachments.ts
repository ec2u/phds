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
 * Confluence attachment management via the REST API.
 *
 * Provides CRUD operations for Confluence page attachments, including listing, fetching content, uploading, and
 * deleting attachments through the Forge app API.
 *
 * @module
 */

import api, { route } from "@forge/api";
import { asTrace } from "../../shared";
import { Document } from "../../shared/items/documents";
import { query } from "../index";


/**
 * A Confluence page attachment with its metadata.
 */
export interface Attachment {

	/**
	 * The attachment identifier.
	 */
	readonly id: string;

	/**
	 * The attachment status.
	 */
	readonly status: string;

	/**
	 * The attachment file name.
	 */
	readonly title: string;

	/**
	 * The creation timestamp in ISO UTC format.
	 */
	readonly createdAt: string;

	/**
	 * The parent page identifier, if attached to a page.
	 */
	readonly pageId?: string;

	/**
	 * The parent blog post identifier, if attached to a blog post.
	 */
	readonly blogPostId?: string;

	/**
	 * The parent custom content identifier, if attached to custom content.
	 */
	readonly customContentId?: string;

	/**
	 * The MIME type of the attachment.
	 */
	readonly mediaType: string;

	/**
	 * The human-readable description of the MIME type.
	 */
	readonly mediaTypeDescription: string;

	/**
	 * The attachment comment.
	 */
	readonly comment: string;

	/**
	 * The internal file identifier.
	 */
	readonly fileId: string;

	/**
	 * The file size in bytes.
	 */
	readonly fileSize: number;

	/**
	 * The web UI link for viewing the attachment.
	 */
	readonly webuiLink: string;

	/**
	 * The direct download link.
	 */
	readonly downloadLink: string;

	/**
	 * The version metadata.
	 */
	readonly version: AttachmentVersion;

	/**
	 * The navigational links.
	 */
	readonly _links: AttachmentLinks;

}

/**
 * Version metadata for a Confluence attachment.
 */
export interface AttachmentVersion {

	/**
	 * The version creation timestamp.
	 */
	readonly createdAt: string;

	/**
	 * The version commit message.
	 */
	readonly message: string;

	/**
	 * The version number.
	 */
	readonly number: number;

	/**
	 * Whether this version is a minor edit.
	 */
	readonly minorEdit: boolean;

	/**
	 * The Atlassian account identifier of the version author.
	 */
	readonly authorId: string;

}

/**
 * Navigational links for a Confluence attachment.
 */
export interface AttachmentLinks {

	/**
	 * The web UI link.
	 */
	readonly webui: string;

	/**
	 * The download link.
	 */
	readonly download: string;

}


/**
 * Paginated response from the Confluence attachments API.
 */
interface AttachmentsResponse {
	readonly results: Attachment[];
	readonly _links: {
		readonly next?: string;
		readonly base: string;
	};
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Lists attachments for a Confluence page, optionally filtered by MIME type.
 *
 * @param page the Confluence page identifier
 * @param mime optional MIME type filter
 *
 * @return the matching attachments
 */
export async function listAttachments(page: string, mime?: string): Promise<Attachment[]> {

	const response = await api.asApp().requestConfluence(route`/wiki/api/v2/pages/${page}/attachments?${query({

		status: "current"

	})}`, {

		headers: { "Accept": "application/json" }

	});

	if ( response.ok ) {

		const data: AttachmentsResponse = await response.json();

		return data.results.filter(attachment =>
			!mime || attachment.mediaType === mime
		);

	} else {

		console.error(response);

		throw asTrace({
			code: response.status,
			text: response.statusText
		});

	}

}

/**
 * Retrieves metadata for a specific attachment.
 *
 * @param page the Confluence page identifier
 * @param id the attachment identifier
 *
 * @return the attachment metadata
 */
export async function getAttachment(page: string, id: string): Promise<Attachment> {

	const url = route`/wiki/api/v2/attachments/${id}`;

	const response = await api.asApp().requestConfluence(url, {

		headers: { "Accept": "application/json" }

	});

	if ( response.ok ) {

		return await response.json();

	} else {

		console.error(response);

		throw asTrace({
			code: response.status,
			text: response.statusText
		});

	}
}

/**
 * Downloads the binary content of an attachment.
 *
 * @param page the Confluence page identifier
 * @param id the attachment identifier
 *
 * @return the attachment content as a buffer
 */
export async function fetchAttachment(page: string, id: string): Promise<Buffer> {

	const url = route`/wiki/rest/api/content/${page}/child/attachment/${id}/download`;

	const response = await api.asApp().requestConfluence(url, {

		headers: { Accept: "*/*" }

	});

	if ( response.ok ) {

		return Buffer.from(await response.arrayBuffer());

	} else {

		console.error(response);

		throw asTrace({
			code: response.status,
			text: response.statusText
		});

	}
}

/**
 * Uploads a document as a JSON attachment to a Confluence page.
 *
 * @param page the Confluence page identifier
 * @param document the document to upload
 *
 * @return the created attachment metadata
 */
export async function uploadAttachment(page: string, document: Document): Promise<Attachment> {

	const { body, boundary } = multipart("test.json", document);

	const response = await api.asApp().requestConfluence(
		route`/rest/api/content/${page}/child/attachment`,
		{
			method: "POST",
			headers: {
				"Content-Type": `multipart/form-data; boundary=${boundary}`,
				"X-Atlassian-Token": "no-check"
			},
			body
		}
	);

	if ( response.ok ) {

		return response.json();

	} else {

		console.error(response);

		throw asTrace({
			code: response.status,
			text: response.statusText
		});

	}


	function multipart(name: string, json: object) {

		const boundary = "----ForgeBoundary"+Math.random().toString(36).slice(2);

		const parts = [
			`--${boundary}`,
			`Content-Disposition: form-data; name="file"; filename="${name}"`,
			`Content-Type: application/json`,
			``,
			JSON.stringify(json),
			`--${boundary}--`,
			``
		];

		const body = parts.join("\r\n");

		return { body, boundary };
	}

}

/**
 * Deletes an attachment from a Confluence page.
 *
 * @param page the Confluence page identifier
 * @param id the attachment identifier
 */
export async function deleteAttachment(page: string, id: string): Promise<void> {

	const url = route`/wiki/rest/api/content/${page}/child/attachment/${id}`;

	const response = await api.asApp().requestConfluence(url, {

		method: "DELETE",
		headers: { "Accept": "application/json" }

	});

	if ( !response.ok ) {

		console.error(response);

		throw asTrace({
			code: response.status,
			text: response.statusText
		});

	}
}
