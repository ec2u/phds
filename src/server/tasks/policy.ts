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
import { SchemaType } from "@google/generative-ai";
import { Document } from "../../shared/documents";
import { Activity, PolicyTask } from "../../shared/tasks";
import { setStatus } from "../async";
import { pdf, retrieveAttachment } from "../tools/attachments";
import { process, upload } from "../tools/gemini";
import { retrievePrompt } from "../tools/langfuse";


export async function policy(job: string, page: string, { source, language }: PolicyTask) {

	// !!! is the required translation already available? is it current?
	// !!! is the required content already available? is it current?

	await setStatus(job, Activity.Fetching);

	const buffer=await retrieveAttachment(page, source);


	await setStatus(job, Activity.Prompting);

	const prompt=await retrievePrompt({ name: "PDF_TO_MD" });


	await setStatus(job, Activity.Extracting);

	const document=await extract({ prompt, source, buffer });

	// !!! translate
	// !!! refine

	// !!! upload translation

	await setStatus(job, document);

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function extract({

	prompt,
	source,
	buffer

}: {

	prompt: string
	source: string
	buffer: Buffer

}): Promise<Document> {

	const file=await upload({

		name: source,
		mime: pdf,
		data: buffer

	});

	const { title, language, markdownContent }=await process({
		file, prompt, schema: {
			type: SchemaType.OBJECT,
			properties: {
				title: { type: SchemaType.STRING },
				language: { type: SchemaType.STRING },
				markdownContent: { type: SchemaType.STRING }
			},
			required: [
				"title",
				"language",
				"markdownContent"
			]
		}
	});


	return {

		original: true,
		language,

		source,

		title: title,
		content: markdownContent

	};

}

async function translate({}: {}) {}

async function refine({}: {}) {}
