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

import { GoogleGenerativeAI, ResponseSchema } from "@google/generative-ai";
import { FileMetadataResponse, GoogleAIFileManager } from "@google/generative-ai/server";
import { asTrace, isUndefined } from "../../shared";
import { secret } from "../index";
import { json, text } from "./attachments";


const model="gemini-2.5-flash-preview-04-17";
const timeout=10_000;

const setup={
	seed: 0,
	temperature: 0
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
			await new Promise(resolve => setTimeout(resolve, timeout));
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

export async function process({
	prompt,
	file
}: {
	prompt: string
	file?: FileMetadataResponse
}): Promise<string>;

export async function process({
	prompt,
	schema,
	file
}: {
	prompt: string
	schema: ResponseSchema
	file?: FileMetadataResponse
}): Promise<Record<string, any>>;

export async function process({
	prompt,
	schema,
	file
}: {
	prompt: string
	schema?: ResponseSchema
	file?: FileMetadataResponse
}): Promise<string | Record<string, any>> {

	try {

		const session=client.getGenerativeModel({

			model: model,
			systemInstruction: prompt

		}).startChat({

			generationConfig: {

				...setup,

				responseMimeType: schema ? json : text,
				responseSchema: schema
			}

		});

		const result=await (isUndefined(file) ? session.sendMessage("") : session.sendMessage([{

			fileData: {
				mimeType: file.mimeType,
				fileUri: file.uri
			}

		}]));

		return schema ? JSON.parse(result.response.text()) : result.response.text();

	} catch ( error ) {

		console.error(error);

		throw asTrace(error);

	}

}
