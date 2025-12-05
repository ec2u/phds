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

import { File, GenerationConfig, GoogleGenAI, Schema } from "@google/genai";
import { TextPromptClient } from "langfuse";
import { asTrace, isObject, isString } from "../../shared";
import { secret } from "../index";

import { json } from "./mime";


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

const key = secret("GEMINI_KEY");

const client = new GoogleGenAI({ apiKey: key });


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Uploads are deleted after 48 hours (https://ai.google.dev/gemini-api/docs/files#delete-uploaded)
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

		throw asTrace(error);

	}

}

/**
 * processes a prompt with Gemini and returns the response as plain text
 */
export async function process({
	model,
	prompt,
	variables,
	input,
	files
}: {
	model?: string
	prompt: string | TextPromptClient
	variables?: Record<string, string>
	input?: string | readonly string[]
	files?: File | readonly File[]
}): Promise<string>;

/**
 * processes a prompt with Gemini using structured output and returns typed response
 */
export async function process<T>({
	model,
	prompt,
	variables,
	input,
	files,
	schema
}: {
	model?: string
	prompt: string | TextPromptClient
	variables?: Record<string, string>
	input?: string | readonly string[]
	files?: File | readonly File[]
	schema: Schema
}): Promise<T>;

export async function process({
	model,
	prompt,
	variables,
	input,
	files,
	schema
}: {
	model?: string
	prompt: string | TextPromptClient
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


		const systemInstruction = isString(prompt)
			? compile(prompt, variables ?? {})
			: prompt.compile(variables);

		const inputArray = input ? (Array.isArray(input) ? input : [input]) : undefined;
		const filesArray = files ? (Array.isArray(files) ? files : [files]) : undefined;

		const promptName = isString(prompt) ? "inline" : prompt.name;
		const modelName = model ?? defaults.model;

		console.info(`gemini request: ${promptName} (${modelName})`);

		const config = {
			...(defaults.config),
			...(isObject(prompt) && isObject(prompt.config) ? prompt.config : {}),
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

		console.info(`gemini response: ${promptName} (${responseText.length} chars)`);

		if ( schema ) {

			try {

				return responseText.trim() ? JSON.parse(responseText) : {};

			} catch ( parseError ) {

				console.warn(`malformed JSON response <${responseText}>`);

				return {};

			}

		} else {

			return responseText;

		}

	} catch ( error ) {

		console.error(error);

		throw asTrace(error);

	}

}
