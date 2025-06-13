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
import { asTrace } from "../shared";
import { Attachment, AttachmentsResponse } from "../shared/attachments";
import { Content } from "../shared/documents";
import { query, Request } from "./utils";


const textuals=[".txt", ".md"];


export async function listAttachments({ context }: Request<{}>) {

	const id: string=context.extension.content.id;

	const response=await api.asApp().requestConfluence(route`/wiki/api/v2/pages/${id}/attachments?${query({

		status: "current"
		// !!! mediaType: "application/pdf"

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


export async function retrieveAttachment({ payload: attachment }: Request<Attachment>): Promise<Content> {

	const id=attachment.id;
	const page=attachment.pageId ?? "";

	// !!! handle missing page id

	const url=route`/wiki/rest/api/content/${page}/child/attachment/${id}/download`;

	const response=await api.asApp().requestConfluence(url, {

		headers: { Accept: "*/*" }

	});

	if ( response.ok ) {

		const title=attachment.title.toLowerCase();
		const textual=textuals.some(extension => title.endsWith(extension));

		return textual
			? await response.text()
			: await response.arrayBuffer();

	} else {

		console.error(response);

		throw asTrace({
			code: response.status,
			text: response.statusText
		});

	}
}
