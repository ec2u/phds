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
import { Activity, CatalogTask } from "../../shared/tasks";
import { setStatus } from "../async";
import { listAttachments } from "../work/attachments";


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export async function catalog(job: string, page: string, task: CatalogTask) {

	await setStatus(job, Activity.Scanning);

	const attachments=await listAttachments(page);


	const policies=attachments
		.filter(attachmment => attachmment.title.endsWith(".pdf"));

	const documents=attachments
		.filter(attachment => attachment.title.endsWith(".json"));

	// !!! text extraction / uploading
	// !!! purging

	await setStatus(job, policies.reduce((catalog, attachment) => {

		return { ...catalog, [attachment.id]: attachment.title };

	}, {}));

}
