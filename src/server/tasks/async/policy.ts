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
 * Policy document extraction and translation task.
 *
 * Handles fetching policy PDF attachments from Confluence, extracting content via Gemini, translating to the
 * target language, and caching results in Forge KVS with staleness checking.
 *
 * @module
 */

import { kvs } from "@forge/kvs";
import { Type } from "@google/genai";
import { isUndefined } from "../../../shared/index";
import { Document } from "../../../shared/items/documents";
import { Language } from "../../../shared/items/languages";
import { Activity, Payload, PolicyTask } from "../../../shared/tasks";
import { setStatus } from "../../async";
import { fetchAttachment, getAttachment } from "../../tools/attachments";
import { lock, policyKey } from "../../tools/cache";
import { process, upload } from "../../tools/gemini";
import { retrievePrompt } from "../../tools/langfuse";
import { pdf } from "../../tools/mime";

/**
 * Executes a policy document retrieval and translation task.
 *
 * Returns a cached document if available and current, otherwise extracts the content from the PDF attachment using
 * Gemini and translates it to the target language if needed.
 *
 * @param job the background job identifier for status reporting and locking
 * @param page the Confluence page identifier
 * @param payload the task payload containing source and target language
 *
 * @return the policy document in the requested language
 */
export async function policy(job: string, page: string, {

	source,
	language

}: Payload<PolicyTask>): Promise<Document> {

	const key = policyKey(page, source, language);

	return await lock(job, key, async () => {

		const cached = await fetchPolicy(job, page, source, language);

		if ( cached ) {

			await setStatus(job, cached);

			return cached;

		} else {

			const original = await fetchPolicy(job, page, source);
			const document = original || await extract(job, page, source);

			// translate the document if needed

			const translation = (document.language === language)
				? document
				: await translate(job, page, source, document, language);

			await setStatus(job, translation);

			return translation;
		}

	});

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Extracts content from a PDF attachment using Gemini.
 *
 * Uploads the PDF to Gemini, processes it with the PDF-to-markdown prompt, and caches the extracted document.
 *
 * @param job the background job identifier
 * @param page the Confluence page identifier
 * @param source the attachment identifier
 *
 * @return the extracted document
 */
async function extract(job: string, page: string, source: string): Promise<Document> {

	await setStatus(job, Activity.Fetching);

	const buffer = await fetchAttachment(page, source);


	await setStatus(job, Activity.Prompting);

	const prompt = await retrievePrompt("PDF_TO_MD");


	await setStatus(job, Activity.Extracting);

	const file = await upload({
		name: source,
		mime: pdf,
		data: buffer
	});

	const {

		title,
		language,
		markdownContent

	} = await process<{

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

/**
 * Translates a policy document to the target language using Gemini.
 *
 * @param job the background job identifier
 * @param page the Confluence page identifier
 * @param source the attachment identifier
 * @param document the original document to translate
 * @param language the target language code
 *
 * @return the translated document
 */
async function translate(job: string, page: string, source: string, document: Document, language: Language): Promise<Document> {

	await setStatus(job, Activity.Prompting);

	const translate = await retrievePrompt("TRANSLATION");


	await setStatus(job, Activity.Translating);

	const translated: {

		target_language: string;
		translated_title: string;
		translated_content: string;

	} = await process({

		prompt: translate,

		variables: {
			target_language: language
		},

		input: document.content,

		schema: {
			type: Type.OBJECT,
			properties: {
				target_language: { type: Type.STRING },
				translated_title: { type: Type.STRING },
				translated_content: { type: Type.STRING }
			},
			required: [
				"target_language",
				"translated_title",
				"translated_content"
			]
		}

	});


	await setStatus(job, Activity.Caching);

	return await cachePolicy(job, page, source, {

		original: false,
		language: language,
		source: document.source,
		created: new Date().toISOString(),

		title: translated.translated_title,
		content: translated.translated_content

	});
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Retrieves a cached policy document, checking for staleness against the source attachment.
 *
 * Returns `undefined` if no cached version exists or if the cached version is stale (older than the source
 * attachment).
 *
 * @param job the background job identifier
 * @param page the Confluence page identifier
 * @param source the attachment identifier
 * @param language optional language code for translated versions
 *
 * @return the cached document, or `undefined` if not available or stale
 */
async function fetchPolicy(job: string, page: string, source: string, language?: Language): Promise<undefined | Document> {

	await setStatus(job, Activity.Fetching);

	const key = policyKey(page, source, language);
	const cached = await kvs.get<Document>(key);

	if ( isUndefined(cached) ) {

		return undefined;

	} else {

		// get attachment metadata to check if cache is current

		await setStatus(job, Activity.Scanning);

		const attachment = await getAttachment(page, source);
		const attachmentCreated = new Date(attachment.createdAt).getTime();
		const cachedCreated = new Date(cached.created).getTime();

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

/**
 * Stores a policy document in the Forge KVS cache.
 *
 * @param job the background job identifier
 * @param page the Confluence page identifier
 * @param source the attachment identifier
 * @param document the document to cache
 *
 * @return the cached document
 */
async function cachePolicy(job: string, page: string, source: string, document: Document): Promise<Document> {

	await setStatus(job, Activity.Caching);

	const key = policyKey(page, source, document.original ? undefined : document.language);

	await kvs.set<Document>(key, document);

	return document;
}
