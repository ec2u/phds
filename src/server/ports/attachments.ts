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
import { Attachment } from "../../shared/attachments";
import { Document } from "../../shared/documents";
import { query, Request } from "../index";


interface AttachmentsResponse {
	readonly results: Attachment[];
	readonly _links: {
		readonly next?: string;
		readonly base: string;
	};
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export async function listAttachments({ context }: Request<{}>): Promise<Attachment[]> {

	const id: string=context.extension.content.id;

	const response=await api.asApp().requestConfluence(route`/wiki/api/v2/pages/${id}/attachments?${query({

		status: "current"

	})}`, {

		headers: { "Accept": "application/json" }

	});

	if ( response.ok ) {

		const data: AttachmentsResponse=await response.json();

		return data.results;

	} else {

		console.error(response);

		throw asTrace({
			code: response.status,
			text: response.statusText
		});

	}
}


export async function retrieveAttachment({ payload: attachment }: Request<Attachment>): Promise<string> {

	const id=attachment.id;
	const page=attachment.pageId ?? "";

	const url=route`/wiki/rest/api/content/${page}/child/attachment/${id}/download`;

	const response=await api.asApp().requestConfluence(url, {

		headers: { Accept: "*/*" }

	});

	if ( response.ok ) {

		return Buffer.from(await response.arrayBuffer()).toString("base64");

	} else {

		console.error(response);

		throw asTrace({
			code: response.status,
			text: response.statusText
		});

	}
}

export async function uploadAttachment({ context, payload: document }: Request<Document>): Promise<Attachment> {

	const id: string=context.extension.content.id;

	const { body, boundary }=multipart("test.json", document);

	const response=await api.asApp().requestConfluence(
		route`/rest/api/content/${id}/child/attachment`,
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
