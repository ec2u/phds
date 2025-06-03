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

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { Document } from "../shared/documents";
import { Translation } from "../shared/gemini";
import { Request, secret } from "./utils";


const markdown="text/markdown";

const model="gemini-2.5-flash-preview-04-17";

const setup={
	seed: 0,
	temperature: 0,
	responseMimeType: "text/plain"
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export async function translate({ payload: { source, target } }: Request<Translation>): Promise<string> {

	const key=secret("GEMINI_KEY");

	const client=new GoogleGenerativeAI(key);
	const manager=new GoogleAIFileManager(key);

	const file=await upload(source);

	const session=client.getGenerativeModel({

		model: model,
		systemInstruction: `
			- translate the provided markdown document from ${source.locale} to ${target}
			- make sure to preserve the semantic structure of the document in terms of elements such as section
			  headings, tables and bullet lists
			- make absolutely sure to retain all textual content; this is vital: do not remove anything
			- reply with the source markdown code, without wrapping it within a markdown code block
			`

	}).startChat({
		generationConfig: setup
	});

	const result=await session.sendMessage([{
		fileData: {
			mimeType: file.mimeType,
			fileUri: file.uri
		}
	}]);

	return result.response.text();


	async function upload(document: Document) {

		const buffer=Buffer.from(document.content, "utf8");

		const response=await manager.uploadFile(buffer, {
			mimeType: markdown,
			displayName: document.title
		});

		const meta=response.file;

		let f=await manager.getFile(meta.name);

		while ( f.state === "PROCESSING" ) {
			await new Promise(resolve => setTimeout(resolve, 10_000));
			f= await manager.getFile(meta.name);
		}

		if ( f.state !== "ACTIVE" ) {
			throw new Error(`File ${meta.name} failed to process`);
		}

		return meta;
	}

}
