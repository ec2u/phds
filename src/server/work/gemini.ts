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

import { GoogleGenerativeAI, ResponseSchema, SchemaType } from "@google/generative-ai";
import { FileMetadataResponse, GoogleAIFileManager } from "@google/generative-ai/server";
import { asTrace } from "../../shared";
import { Document } from "../../shared/documents";
import { Language } from "../../shared/languages";
import { secret } from "../index";


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


const markdown="text/markdown";
const pdf="application/pdf";
const json="application/json";


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


export async function extract({

	prompt,
	source,
	buffer

}: {

	prompt: string
	source: string
	buffer: Buffer

}): Promise<Document> {

	const file=await upload({

		name: source,
		type: pdf,
		data: buffer

	});

	const { title, language, markdownContent }=await process({
		file, prompt, schema: {
			type: SchemaType.OBJECT,
			properties: {
				title: { type: SchemaType.STRING },
				language: { type: SchemaType.STRING },
				markdownContent: { type: SchemaType.STRING }
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

		title: title,
		content: markdownContent

	};

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function upload({

	name,
	type,
	data

}: {

	name: string,
	type: string,
	data: Buffer

}): Promise<FileMetadataResponse> {
	try {

		const response=await manager.uploadFile(data, {
			displayName: name,
			mimeType: type
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


async function process({

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


// export async function translate({ payload: { source, target } }: Request<Translation>): Promise<Document> {
//
// 	const key=secret("GEMINI_KEY");
//
// 	const client=new GoogleGenerativeAI(key);
// 	const manager=new GoogleAIFileManager(key);
//
// 	try {
//
// 		// uploads are deleted after 48 hours (https://ai.google.dev/gemini-api/docs/files#delete-uploaded)
//
// 		const file=await upload(source);
//
// 		const session=client.getGenerativeModel({
//
// 			model: model,
// 			systemInstruction: `
// 				- translate the provided Markdown document from ${source} to ${target}
// 				- make sure to preserve the semantic structure of the document in terms of elements such as section
// 				  headings, tables and bullet lists
// 				- make absolutely sure to retain all textual content; this is vital: do not remove anything
// 				- reply with the source markdown code, without wrapping it within a markdown code block
// 				`
//
// 		}).startChat({
// 			generationConfig: setup
// 		});
//
// 		const result=await session.sendMessage([{
// 			fileData: {
// 				mimeType: file.mimeType,
// 				fileUri: file.uri
// 			}
// 		}]);
//
// 		return {
//
// 			original: false,
// 			language: target,
//
// 			source: source.source,
//
// 			title: source.title, // !!! translate
// 			content: result.response.text()
//
// 		};
//
// 	} catch ( error ) {
//
// 		console.error(error);
//
// 		throw asTrace(error);
//
// 	}
//
//
// 	async function upload(document: Document) {
// 		try {
//
// 			const buffer=Buffer.from(document.content ?? "", "utf8"); // !!!
//
// 			const response=await manager.uploadFile(buffer, {
// 				mimeType: markdown,
// 				displayName: document.title
// 			});
//
// 			const meta=response.file;
//
// 			let f=await manager.getFile(meta.name);
//
// 			while ( f.state === "PROCESSING" ) {
// 				await new Promise(resolve => setTimeout(resolve, timeout));
// 				f= await manager.getFile(meta.name);
// 			}
//
// 			if ( f.state !== "ACTIVE" ) {
// 				throw new Error(`unable to process file <${meta.name}>`);
// 			}
//
// 			return meta;
//
// 		} catch ( error ) {
//
// 			console.error(error);
//
// 			throw asTrace(error);
//
// 		}
// 	}
//
// }
