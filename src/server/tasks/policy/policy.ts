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
import { Activity, asTrace, isActivity, isTrace } from "../../../shared/index";
import { Document } from "../../../shared/items/documents";
import { Language } from "../../../shared/items/languages";
import { fetchAttachment, getAttachment } from "../../tools/attachments";
import { lock, policyKey } from "../../tools/cache";
import { file as read } from "../../tools/files";
import { process, upload } from "../../tools/gemini";
import { pdf } from "../../tools/mime";
import type { Payload, PolicyTask } from "../_index";
import type { Report } from "../async/index";

/**
 * Executes a policy document retrieval and translation task.
 *
 * Returns a cached document if available and current, otherwise extracts the content from the PDF attachment using
 * Gemini and translates it to the target language if needed.
 *
 * @param owner The lock owner identifier
 * @param key The resource key for status reporting and locking
 * @param report The progress reporting callback
 * @param page The Confluence page identifier
 * @param payload The task payload containing source and target language
 *
 * @returns The policy document in the requested language
 */
export async function policy(owner: string, key: string, report: Report, page: string, {

	source,
	language

}: Payload<PolicyTask>): Promise<void> {
	try {

		await lock(owner, key, async () => {

			const cached = await fetchPolicy(report, page, source, language);

			if ( cached ) {

				return cached;

			} else {

				const original = await fetchPolicy(report, page, source);
				const document = original || await extract(report, page, source);

				// translate the document if needed

				const translation = (document.language === language)
					? document
					: await translate(report, page, source, document, language);

				await report(translation);

				return translation;
			}

		});

	} catch ( error ) {

		await report(asTrace(error));

		throw error;

	}

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Extracts content from a PDF attachment using Gemini.
 *
 * Uploads the PDF to Gemini, processes it with the PDF-to-markdown prompt, and caches the extracted document.
 *
 * @param report The progress reporting callback
 * @param page The Confluence page identifier
 * @param source The attachment identifier
 *
 * @returns The extracted document
 */
async function extract(report: Report, page: string, source: string): Promise<Document> {

	await report(Activity.Fetching);

	const buffer = await fetchAttachment(page, source);


	await report(Activity.Extracting);

	const prompt = await read("policy-extract.sys.md", __dirname);

	const config = {
		temperature: 0,
		seed: 42,
		topP: 0,
		topK: 1,
		candidateCount: 1
	};

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
		config: config,

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

	return await cachePolicy(report, page, source, {
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
 * @param report The progress reporting callback
 * @param page The Confluence page identifier
 * @param source The attachment identifier
 * @param document The original document to translate
 * @param language The target language code
 *
 * @returns The translated document
 */
async function translate(report: Report, page: string, source: string, document: Document, language: Language): Promise<Document> {

	await report(Activity.Translating);

	const prompt = await read("policy-translate.sys.md", __dirname);

	const variables = {
		target_language: language
	};

	const config = {
		temperature: 0,
		seed: 42,
		topP: 0,
		topK: 1,
		candidateCount: 1
	};

	const translated: {

		target_language: string;
		translated_title: string;
		translated_content: string;

	} = await process({

		prompt,
		variables,
		config,

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


	await report(Activity.Caching);

	return await cachePolicy(report, page, source, {

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
 * @param report The progress reporting callback
 * @param page The Confluence page identifier
 * @param source The attachment identifier
 * @param language Optional language code for translated versions
 *
 * @returns The cached document, or `undefined` if not available or stale
 */
async function fetchPolicy(report: Report, page: string, source: string, language?: Language): Promise<undefined | Document> {

	await report(Activity.Fetching);

	const key = policyKey(page, source, language);
	const entry = await kvs.get(key);

	if ( entry == null || isActivity(entry) || isTrace(entry) ) {

		return undefined;

	} else {

		const cached = entry as Document;

		// get attachment metadata to check if cache is current

		await report(Activity.Scanning);

		const attachment = await getAttachment(page, source);
		const attachmentCreated = new Date(attachment.createdAt).getTime();
		const cachedCreated = new Date(cached.created).getTime();

		// check if cached document is current (cached before attachment was modified)

		if ( cachedCreated < attachmentCreated ) {

			await report(Activity.Purging);

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
 * @param report The progress reporting callback
 * @param page The Confluence page identifier
 * @param source The attachment identifier
 * @param document The document to cache
 *
 * @returns The cached document
 */
async function cachePolicy(report: Report, page: string, source: string, document: Document): Promise<Document> {

	await report(Activity.Caching);

	const key = policyKey(page, source, document.original ? undefined : document.language);

	await kvs.set<Document>(key, document);

	return document;
}
