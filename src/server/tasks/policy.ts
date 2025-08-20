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

import { kvs } from "@forge/kvs";
import { Type } from "@google/genai";
import { isUndefined } from "../../shared";
import { Document } from "../../shared/documents";
import { Language } from "../../shared/languages";
import { Activity, Payload, PolicyTask } from "../../shared/tasks";
import { setStatus } from "../async";
import { fetchAttachment, getAttachment } from "../tools/attachments";
import { lock, policyKey } from "../tools/cache";
import { process, upload } from "../tools/gemini";
import { retrievePrompt } from "../tools/langfuse";
import { pdf } from "../tools/mime";

export async function policy(job: string, page: string, {

	source,
	language

}: Payload<PolicyTask>): Promise<Document> {

	const key=policyKey(page, source, language);

	return await lock(job, key, async () => {

		const cached=await fetchPolicy(job, page, source, language);

		if ( cached ) {

			await setStatus(job, cached);

			return cached;

		} else {

			const original=await fetchPolicy(job, page, source);
			const document=original || await extract(job, page, source);

			// translate the document if needed

			const translation=(document.language === language)
				? document
				: await translate(job, page, source, document, language);

			await setStatus(job, translation);

			return translation;
		}

	});

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function extract(job: string, page: string, source: string): Promise<Document> {

	await setStatus(job, Activity.Fetching);

	const buffer=await fetchAttachment(page, source);


	await setStatus(job, Activity.Prompting);

	const prompt=await retrievePrompt("PDF_TO_MD");


	await setStatus(job, Activity.Extracting);

	const file=await upload({
		name: source,
		mime: pdf,
		data: buffer
	});

	const {

		title,
		language,
		markdownContent

	}=await process<{

		title: string;
		language: Language;
		markdownContent: string;

	}>({

		prompt: prompt,
		files: [file],

		schema: {
			type: Type.OBJECT,
			properties: {
				title: { type: Type.STRING },
				language: { type: Type.STRING },
				markdownContent: { type: Type.STRING }
			},
			required: [
				"title",
				"language",
				"markdownContent"
			]
		}

	});

	return await cachePolicy(job, page, source, {
		original: true,
		language,
		source,
		created: new Date().toISOString(),
		title: title,
		content: markdownContent.replace(/\\+n/g, "\n") // !!! remove patch
	});
}

async function translate(job: string, page: string, source: string, document: Document, language: Language): Promise<Document> {

	await setStatus(job, Activity.Prompting);

	const translate=await retrievePrompt("TRANSLATION");

	await setStatus(job, Activity.Translating);

	const translated=await process({

		prompt: translate,

		variables: {

			target_language: language,
			source_content: document.content

		}

	});


	await setStatus(job, Activity.Prompting);

	const refine=await retrievePrompt("TRANSLATION_IMPROVEMENT");


	await setStatus(job, Activity.Refining);

	const refined: {

		target_language: string;
		translated_content: string;
		translated_title: string;

	}=await process({

		prompt: refine,

		variables: {
			target_language: language,
			source_content: document.content,
			target_content: translated
		},

		schema: {
			type: Type.OBJECT,
			properties: {
				target_language: { type: Type.STRING },
				translated_content: { type: Type.STRING },
				translated_title: { type: Type.STRING }
			},
			required: [
				"target_language",
				"translated_content",
				"translated_title"
			]
		}

	});


	await setStatus(job, Activity.Caching);

	return await cachePolicy(job, page, source, {

		original: false,
		language: language,
		source: document.source,
		created: new Date().toISOString(),

		title: refined.translated_title,
		content: refined.translated_content

	});
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function fetchPolicy(job: string, page: string, source: string, language?: Language): Promise<undefined | Document> {

	await setStatus(job, Activity.Fetching);

	const key=policyKey(page, source, language);
	const cached=await kvs.get<Document>(key);

	if ( isUndefined(cached) ) {

		return undefined;

	} else {

		// get attachment metadata to check if cache is current

		await setStatus(job, Activity.Scanning);

		const attachment=await getAttachment(page, source);
		const attachmentCreated=new Date(attachment.createdAt).getTime();
		const cachedCreated=new Date(cached.created).getTime();

		// check if cached document is current (cached before attachment was modified)

		if ( cachedCreated < attachmentCreated ) {

			await setStatus(job, Activity.Purging);

			await kvs.delete(key); // stale entry, purge it

			return undefined;

		} else {

			return cached;

		}

	}
}

async function cachePolicy(job: string, page: string, source: string, document: Document): Promise<Document> {

	await setStatus(job, Activity.Caching);

	const key=policyKey(page, source, document.original ? undefined : document.language);

	await kvs.set<Document>(key, document);

	return document;
}
