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
 * Google Gemini AI integration for prompt processing.
 *
 * Provides file upload and prompt processing capabilities using the Gemini API, supporting both plain text and
 * structured JSON output modes with configurable models.
 *
 * @module
 */

import { File, GenerationConfig, GoogleGenAI, Schema } from "@google/genai";

import { message } from "../../shared/tools/core";

import { matches, trace } from "./gemini.core";
import { json } from "./mime";
import { secret } from "./secrets";


/**
 * Default model and generation configuration.
 */
const defaults: {

	model: string,
	config: GenerationConfig

} = {

	model: "gemini-2.5-flash",

	config: {
		seed: 0,
		temperature: 0
	}

};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * The Gemini API key.
 */
const key = secret("GEMINI_KEY");

/**
 * The Gemini API client instance.
 */
const client = new GoogleGenAI({ apiKey: key });


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Uploads a file to the Gemini API for use in prompt processing.
 *
 * Uploaded files are automatically deleted after 48 hours.
 *
 * @param options the upload options
 *
 * @return the uploaded file metadata
 *
 * @see {@link https://ai.google.dev/gemini-api/docs/files#delete-uploaded Gemini File API}
 */
export async function upload({

	name,
	mime,
	data

}: {

	name: string,
	mime: string,
	data: Buffer

}): Promise<File> {

	try {

		return await client.files.upload({
			file: new Blob([new Uint8Array(data)], { type: mime }),
			config: {
				displayName: name,
				mimeType: mime
			}
		});

	} catch ( error ) {

		console.error(error);

		throw trace(error);

	}

}

/**
 * Processes a prompt with Gemini and returns the response as plain text.
 *
 * @param options the processing options
 *
 * @return the response text
 */
export async function process({
	model,
	config,
	prompt,
	variables,
	input,
	files
}: {
	model?: string
	config?: GenerationConfig
	prompt: string
	variables?: Record<string, string>
	input?: string | readonly string[]
	files?: File | readonly File[]
}): Promise<string>;

/**
 * Processes a prompt with Gemini using structured output and returns a typed response.
 *
 * @typeParam T the expected response type matching the schema
 *
 * @param options the processing options including a JSON schema for structured output
 *
 * @return the parsed response object
 */
export async function process<T>({
	model,
	config,
	prompt,
	variables,
	input,
	files,
	schema
}: {
	model?: string
	config?: GenerationConfig
	prompt: string
	variables?: Record<string, string>
	input?: string | readonly string[]
	files?: File | readonly File[]
	schema: Schema
}): Promise<T>;

/**
 * Processes a prompt with Gemini.
 */
export async function process({
	model,
	config: custom,
	prompt,
	variables,
	input,
	files,
	schema
}: {
	model?: string
	config?: GenerationConfig
	prompt: string
	schema?: Schema
	variables?: Record<string, string>
	input?: string | readonly string[]
	files?: File | readonly File[]
}): Promise<string | any> {

	try {


		function compile(prompt: string, variables: Record<string, string>) {
			return prompt.replace(/{{(\w+)}}/g, (_, variable) => {

				const value = variables[variable];

				if ( value === undefined ) {
					throw new Error(`undefined variable <${variable}>`);
				}

				return value;

			});
		}


		const systemInstruction = compile(prompt, variables ?? {});

		const inputArray = input ? (Array.isArray(input) ? input : [input]) : undefined;
		const filesArray = files ? (Array.isArray(files) ? files : [files]) : undefined;
		const modelName = model ?? defaults.model;

		console.info(`gemini request: (${modelName})`);

		const config = {
			...(defaults.config),
			...(custom ?? {}),
			...(schema && {
				responseMimeType: json,
				responseSchema: schema
			}),
			systemInstruction: { parts: [{ text: systemInstruction }] }
		};

		const contents = [
			...(inputArray && inputArray.length > 0
					? [{
						role: "user" as const,
						parts: inputArray.map(text => ({ text }))
					}]
					: []
			),
			...(filesArray && filesArray.length > 0
					? [{
						role: "user" as const,
						parts: filesArray.map(file => ({
							fileData: {
								mimeType: file.mimeType,
								fileUri: file.uri || file.name
							}
						}))
					}]
					: []
			)
		];

		const result = await client.models.generateContent({
			model: model ?? defaults.model,
			contents,
			config
		});

		const responseText = result.text || "";

		console.info(`gemini response: (${responseText.length} chars)`);

		if ( schema ) {

			const parsed = responseText.trim() ? JSON.parse(responseText) : {};

			if ( matches(parsed, schema) ) {

				return parsed;

			} else {

				throw message(new Error(`invalid gemini response <${responseText.substring(0, 500)}>`));

			}

		} else {

			return responseText;

		}

	} catch ( error ) {

		console.error(error);

		throw trace(error);

	}

}
