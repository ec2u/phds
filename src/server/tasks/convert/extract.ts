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

import type { File } from "@google/genai";
import { Type } from "@google/genai";
import { Document, type Language } from "../../../shared/items/documents";
import { file as read } from "../../tools/files";
import { process } from "../../tools/gemini";


/**
 * The system prompt for PDF content extraction.
 */
const prompt = read("extract.sys.md", __dirname);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Extracts content from an uploaded PDF file using Gemini.
 *
 * Processes the previously uploaded file with the PDF-to-markdown prompt.
 *
 * @param source The attachment identifier
 * @param file The uploaded Gemini file
 *
 * @returns The extracted document
 */
export async function extract(source: string, file: File): Promise<Document> {

	const config = {
		temperature: 0,
		seed: 42,
		topP: 0,
		topK: 1,
		candidateCount: 1
	};

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

	return {
		original: true,
		language,
		source,
		created: new Date().toISOString(),
		title: title,
		content: markdownContent.replace(/\\+n/g, "\n") // !!! remove patch
	};
}
