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

import { GenerationConfig, GoogleGenerativeAI, ResponseSchema } from "@google/generative-ai";
import { FileMetadataResponse, GoogleAIFileManager } from "@google/generative-ai/server";
import { TextPromptClient } from "langfuse";
import { asTrace, isObject, isString, isUndefined } from "../../shared";
import { secret } from "../index";
import { json, text } from "./attachments";


const defaults: {

	model: string,
	config: GenerationConfig,
	timeout: number

}={

	model: "gemini-2.5-flash",

	config: {
		// !!! seed: 0, ;( unable to configure
		temperature: 0
	},

	timeout: 10_000

};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const key=secret("GEMINI_KEY");

const client=new GoogleGenerativeAI(key);
const manager=new GoogleAIFileManager(key);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * uploads are deleted after 48 hours (https://ai.google.dev/gemini-api/docs/files#delete-uploaded)
 */
export async function upload({

	name,
	mime,
	data

}: {

	name: string,
	mime: string,
	data: Buffer

}): Promise<FileMetadataResponse> {
	try {

		const response=await manager.uploadFile(data, {
			displayName: name,
			mimeType: mime
		});

		const meta=response.file;

		let f=await manager.getFile(meta.name);

		while ( f.state === "PROCESSING" ) {
			await new Promise(resolve => setTimeout(resolve, defaults.timeout));
			f= await manager.getFile(meta.name);
		}

		if ( f.state !== "ACTIVE" ) {
			throw new Error(`unable to process file <${meta.name}>`);
		}

		return meta;

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
	files
}: {
	model?: string
	prompt: string | TextPromptClient
	variables?: Record<string, string>
	files?: ReadonlyArray<FileMetadataResponse>
}): Promise<string>;

/**
 * processes a prompt with Gemini using structured output and returns typed response
 */
export async function process<T>({
	model,
	prompt,
	variables,
	files,
	schema
}: {
	model?: string
	prompt: string | TextPromptClient
	variables?: Record<string, string>
	files?: ReadonlyArray<FileMetadataResponse>
	schema: ResponseSchema
}): Promise<T>;

export async function process({
	model,
	prompt,
	variables,
	files,
	schema
}: {
	model?: string
	prompt: string | TextPromptClient
	schema?: ResponseSchema
	files?: ReadonlyArray<FileMetadataResponse>
	variables?: Record<string, string>
}): Promise<string | any> {

	try {


		function compile(prompt: string, variables: Record<string, string>) {
			return prompt.replace(/{{(\w+)}}/g, (_, variable) => {

				const value=variables[variable];

				if ( value === undefined ) {
					throw new Error(`undefined variable <${variable}>`);
				}

				return value;

			});
		}


		const session=client.getGenerativeModel({

			model: model ?? defaults.model,

			systemInstruction: isString(prompt)
				? compile(prompt, variables ?? {})
				: prompt.compile(variables)

		}).startChat({

			generationConfig: {

				...(defaults.config),
				...(!isString(prompt) && isObject(prompt.config) ? Object.fromEntries(
					Object.entries(prompt.config).filter(([, value]) => isString(value))
				) : {}),

				responseMimeType: schema ? json : text,
				responseSchema: schema
			}

		});

		const result=await (isUndefined(files) || !files.length
			? session.sendMessage("")
			: session.sendMessage(files.map(file => ({

				fileData: {
					mimeType: file.mimeType,
					fileUri: file.uri
				}

			}))));

		return schema ? JSON.parse(result.response.text()) : result.response.text();

	} catch ( error ) {

		console.error(error);

		throw asTrace(error);

	}

}
