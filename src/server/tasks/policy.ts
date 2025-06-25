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
import { Activity, PolicyTask } from "../../shared/tasks";
import { setStatus } from "../async";
import { retrieveAttachment } from "../work/attachments";
import { extract } from "../work/gemini";
import { retrievePrompt } from "../work/langfuse";


export async function policy(job: string, page: string, { source, language }: PolicyTask) {

	await setStatus(job, Activity.Fetching);

	const buffer=await retrieveAttachment(page, source);


	await setStatus(job, Activity.Prompting);

	const prompt=await retrievePrompt({ name: "PDF_TO_MD" });


	await setStatus(job, Activity.Extracting);

	const document=await extract({ prompt, source, buffer });

	await setStatus(job, document);

}
