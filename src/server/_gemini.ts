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
import { FileMetadataResponse, GoogleAIFileManager } from "@google/generative-ai/server";
import fs from "fs";
import mime from "mime-types";
import path from "path";

const apiKey=process.env.GEMINI_API_KEY ?? "";
const genAI=new GoogleGenerativeAI(apiKey);
const fileManager=new GoogleAIFileManager(apiKey);

const sourceDir="../../Samples/Jena-Turku\ Case\ Study";
const targetDir=".";


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const model="gemini-2.5-flash-preview-04-17";

const prompt=`
- convert the provided PDF document to GFM markdown
- focus on preserving the semantic structure of the document in terms of elements such as section headings,
  tables and bullet lists, rather than trying to reproduce the exact visual formatting
- where present, emit title and subtitle in a front matter element
- use '#' for first-level sections
- preserve section and subsection numbering as in the original document
- omit TOCs
- omit page numbers
- omit page headers and footers
- make absolutely sure to retain all textual content verbatim; this is vital: do not remove anything
- reply with the source markdown code, without wrapping it within a markdown
`;


const generationConfig={
	seed: 0,
	temperature: 0,
	responseMimeType: "text/plain"
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function uploadToGemini(filePath: string, mimeType: string) {

	const uploadResult=await fileManager.uploadFile(filePath, {
		mimeType,
		displayName: path.basename(filePath)
	});

	return uploadResult.file;
}

async function waitForFilesActive(files: FileMetadataResponse[]) {
	for (const file of files) {
		let f=await fileManager.getFile(file.name);
		while ( f.state === "PROCESSING" ) {
			await new Promise(resolve => setTimeout(resolve, 10_000));
			f= await fileManager.getFile(file.name);
		}
		if ( f.state !== "ACTIVE" ) {
			throw new Error(`File ${file.name} failed to process`);
		}
	}
}

async function processFile(filePath: string) {

	const mimeType=mime.lookup(filePath);

	if ( !mimeType || mimeType !== "application/pdf" ) {
		return;
	}

	const file=await uploadToGemini(filePath, mimeType);
	await waitForFilesActive([file]);

	const chatSession=genAI.getGenerativeModel({

		model: model,
		systemInstruction: prompt

	}).startChat({
		generationConfig,
		history: [
			{
				role: "user",
				parts: [{
					fileData: {
						mimeType,
						fileUri: file.uri
					}
				}]
			}
		]
	});

	const result=await chatSession.sendMessage("Convert the attached PDF to Markdown");
	const text=result.response.text();
	const baseName=path.basename(filePath, ".pdf");
	const outputFile=path.join(targetDir, `${baseName}.md`);

	fs.writeFileSync(outputFile, text);

	console.log(`Generated markdown: ${outputFile}`);

}

async function run() {

	if ( !fs.existsSync(targetDir) ) {
		fs.mkdirSync(targetDir);
	}

	const files=fs.readdirSync(sourceDir)
		.filter(file => path.extname(file).toLowerCase() === ".pdf")
		.map(file => path.join(sourceDir, file));

	for (const filePath of files) {
		try {
			await processFile(filePath);
		} catch ( err: any ) {
			console.error(`Failed to process ${filePath}:`, err.message);
		}
	}

}

run();