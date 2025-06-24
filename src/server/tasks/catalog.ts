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
import { Activity, CatalogTask } from "../../shared/tasks";
import { setStatus } from "../async";
import { query } from "../index";


interface AttachmentsResponse {
	readonly results: Attachment[];
	readonly _links: {
		readonly next?: string;
		readonly base: string;
	};
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export async function catalog(job: string, page: string, task: CatalogTask) {

	await setStatus(job, Activity.Scanning);

	const attachments=await listAttachments(page);

	await setStatus(job, attachments.reduce((catalog, attachment) => {

		return { ...catalog, [attachment.id]: attachment.title };

	}, {}));

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function listAttachments(page: string): Promise<Attachment[]> {

	const response=await api.asApp().requestConfluence(route`/wiki/api/v2/pages/${page}/attachments?${query({

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
