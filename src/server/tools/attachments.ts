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

import api, { route } from "@forge/api";
import { asTrace } from "../../shared";
import { Document } from "../../shared/documents";
import { query } from "../index";


export interface Attachment {
	readonly id: string;
	readonly status: string;
	readonly title: string;
	readonly createdAt: string; // ISO UTC timestamp (e.g. "2025-06-03T13:19:04.077Z")
	readonly pageId?: string;
	readonly blogPostId?: string;
	readonly customContentId?: string;
	readonly mediaType: string;
	readonly mediaTypeDescription: string;
	readonly comment: string;
	readonly fileId: string;
	readonly fileSize: number;
	readonly webuiLink: string;
	readonly downloadLink: string;
	readonly version: AttachmentVersion;
	readonly _links: AttachmentLinks;
}

export interface AttachmentVersion {
	readonly createdAt: string;
	readonly message: string;
	readonly number: number;
	readonly minorEdit: boolean;
	readonly authorId: string;
}

export interface AttachmentLinks {
	readonly webui: string;
	readonly download: string;
}


interface AttachmentsResponse {
	readonly results: Attachment[];
	readonly _links: {
		readonly next?: string;
		readonly base: string;
	};
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export async function listAttachments(page: string, mime?: string): Promise<Attachment[]> {

	const response=await api.asApp().requestConfluence(route`/wiki/api/v2/pages/${page}/attachments?${query({

		status: "current"

	})}`, {

		headers: { "Accept": "application/json" }

	});

	if ( response.ok ) {

		const data: AttachmentsResponse=await response.json();

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

export async function getAttachment(page: string, id: string): Promise<Attachment> {

	const url=route`/wiki/api/v2/attachments/${id}`;

	const response=await api.asApp().requestConfluence(url, {

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

export async function fetchAttachment(page: string, id: string): Promise<Buffer> {

	const url=route`/wiki/rest/api/content/${page}/child/attachment/${id}/download`;

	const response=await api.asApp().requestConfluence(url, {

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

export async function uploadAttachment(page: string, document: Document): Promise<Attachment> {

	const { body, boundary }=multipart("test.json", document);

	const response=await api.asApp().requestConfluence(
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

		const boundary="----ForgeBoundary" + Math.random().toString(36).slice(2);

		const parts=[
			`--${boundary}`,
			`Content-Disposition: form-data; name="file"; filename="${name}"`,
			`Content-Type: application/json`,
			``,
			JSON.stringify(json),
			`--${boundary}--`,
			``
		];

		const body=parts.join("\r\n");

		return { body, boundary };
	}

}

export async function deleteAttachment(page: string, id: string): Promise<void> {

	const url=route`/wiki/rest/api/content/${page}/child/attachment/${id}`;

	const response=await api.asApp().requestConfluence(url, {

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
