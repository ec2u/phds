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
import { asTrace } from "../../shared";
import { Language } from "../../shared/languages";
import { secret } from "../index";
import { json } from "./attachments";


const model="gemini-2.5-flash-preview-04-17";
const timeout=10_000;

const setup={
	seed: 0,
	temperature: 0,
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const key=secret("GEMINI_KEY");

const client=new GoogleGenerativeAI(key);
const manager=new GoogleAIFileManager(key);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

	file,
	prompt,
	schema

}: {

	file: FileMetadataResponse
	prompt: string
	schema: ResponseSchema

}): Promise<{
	title: string
	language: Language
	markdownContent: string
}> {

	try {

		const session=client.getGenerativeModel({

			model: model,
			systemInstruction: prompt

		}).startChat({

			generationConfig: {

				...setup,

				responseMimeType: json,
				responseSchema: schema
			}

		});

		const result=await session.sendMessage([{
			fileData: {
				mimeType: file.mimeType,
				fileUri: file.uri
			}
		}]);


		// uploads are deleted after 48 hours (https://ai.google.dev/gemini-api/docs/files#delete-uploaded)

		const text=result.response.text();

		console.log(text);

		return JSON.parse(text);

	} catch ( error ) {

		console.error(error);

		throw asTrace(error);

	}

}
