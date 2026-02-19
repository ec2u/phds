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

import { Type } from "@google/genai";
import { Document, type Language } from "../../../shared/items/documents";
import { file as read } from "../../tools/files";
import { process } from "../../tools/gemini";


/**
 * The system prompt for document translation.
 */
const prompt = read("translate.sys.md", __dirname);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Translates a policy document to the target language using Gemini.
 *
 * @param document The original document to translate
 * @param language The target language code
 *
 * @returns The translated document
 */
export async function translate(document: Document, language: Language): Promise<Document> {

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


	return {

		original: false,
		language: language,
		source: document.source,
		created: new Date().toISOString(),

		title: translated.translated_title,
		content: translated.translated_content

	};
}
