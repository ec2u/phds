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

import api, { route } from "@forge/api";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FileMetadataResponse, GoogleAIFileManager } from "@google/generative-ai/server";
import { asTrace } from "../../shared";
import { Document } from "../../shared/documents";
import { defaultLanguage } from "../../shared/languages";
import { Extraction, Translation } from "../../shared/work/gemini";
import { Request, secret } from "../index";

const markdown="text/markdown";

const model="gemini-2.5-flash-preview-04-17";
const timeout=10_000;

const setup={
	seed: 0,
	temperature: 0,
	responseMimeType: "text/plain"
};


const prompt=`
You are an expert AI assistant specializing in converting complex documents like academic and legal agreements into
high-quality, information-focused GitHub Flavored Markdown (GFM).

Your task is to process the attached document and generate a clean Markdown file that captures the core substantive
information of the agreement.

### Core Principles

1. **Focus on Substance:** Your primary goal is to extract the binding terms, definitions, and structural components of
   the agreement. Omit purely procedural or administrative content that does not define the rights and obligations of
   the parties, as detailed in the "Omissions" section below.
2. **Semantic Structure:** Prioritize the document's logical structure (headings, lists, tables) over its exact visual
   layout.
3. **Content Integrity:** Retain all *substantive* text from the document's main body. Correct obvious OCR errors (e.g.,
   \`_\` instead of \`-\` for a bullet point). Do not summarize the retained content.
4. **Strict GFM:** Adhere strictly to the formatting rules below without deviation.

### Detailed Formatting Rules

1. Headings

- **Level 1 (\`#\`):** Use only for the main document title (e.g., "JOINT DOCTORAL SUPERVISION AGREEMENT").
- **Level 2 (\`##\`):** Use for major sections, both numbered and unnumbered (e.g., \`## 1. Administrative details\`,
  \`## Preamble\`).
- **Level 3 (\`###\`):** Use for subsections (e.g., \`### 1.1 Supervision\`, \`### 2.3 Doctoral committee\`).
- **Numbering:** Retain the original numbering exactly as it appears in the heading text. Do not re-number or correct
  any gaps in the sequence.

2. Content & Inline Formatting

- **Lists:**
    - Use \`-\` for all unordered (bulleted) lists.
    - Use \`1.\` for all ordered (numbered) lists, even if they use letters or Roman numerals in the source.
    - Infer list structure from indentation when explicit markers are missing.
    - **Spacing Rule:** **Crucially, add a single blank line after the end of every list** (both ordered and unordered)
      to ensure proper rendering and readability.
- **Tables:**
    - Convert all grids and tables containing substantive data into GFM table format.
    - **Do not** create tables for content that is to be excluded (e.g., signature blocks).
- **Inline Styles:**
    - Use \`**bold text**\` for emphasis, names, and titles (e.g., **Friedrich-Schiller-Universität Jena**).
    - Use \`*italic text*\` for emphasis or defined terms (e.g., *Working title*).

3. Omissions & Placeholders

- **Omit Completely:**
    - Decorative elements (logos, letterheads, borders).
    - All repeating page headers, footers, and page numbers.
    - Any automatically generated Table of Contents.
    - **Signature Blocks:** All sections dedicated to signatures, including names, titles, dates, locations, and
      signature lines.
    - **Official Stamps & Seals:** Any text or representation of official seals, stamps, or notarizations.
    - **Ancillary Bureaucratic Details:** Sections containing only internal office routing codes, document version
      footers, or simple contact lists for administrative staff (unless part of a formal "Notices" clause which should
      be retained).
- **Placeholders:**
    - If a meaningful chart or figure appears in the document body, represent it with a descriptive placeholder, like
      this: \`![A bar chart showing research funding sources]\`.

4. Final Output

- Provide **only** the raw Markdown source code in your response.
- **Do not** wrap the output in a markdown code block (i.e., do not use \`\`\`markdown).
- **Do not** include any commentary, introduction, or closing remarks. Your response must begin with the first line of
  Markdown and end with the last.
`;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export async function extract({ payload: { attachment } }: Request<Extraction>): Promise<Document> {

	const key=secret("GEMINI_KEY");

	const client=new GoogleGenerativeAI(key);
	const manager=new GoogleAIFileManager(key);

	const data=await retrieve();
	const file=await upload(attachment.title, data);
	const text=await process(file);


	return {

		original: true,
		language: defaultLanguage, // !!!

		source: attachment.id,

		title: attachment.title,
		content: text

	};


	async function retrieve(): Promise<Buffer> {

		const id=attachment.id;
		const page=attachment.pageId ?? "";

		const url=route`/wiki/rest/api/content/${page}/child/attachment/${id}/download`;

		const response=await api.asApp().requestConfluence(url, {

			headers: { Accept: "*/*" }

		});

		if ( response.ok ) {

			return Buffer.from(await response.arrayBuffer());

		} else {

			console.error(response);

			throw asTrace({
				code: response.status,
				text: response.statusText
			});

		}
	}

	async function upload(name: string, data: Buffer): Promise<FileMetadataResponse> {
		try {

			const response=await manager.uploadFile(data, {
				mimeType: markdown,
				displayName: name
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

	async function process(file: FileMetadataResponse): Promise<string> {
		try {

			const session=client.getGenerativeModel({

				model: model,
				systemInstruction: prompt

			}).startChat({
				generationConfig: setup
			});

			const result=await session.sendMessage([{
				fileData: {
					mimeType: file.mimeType,
					fileUri: file.uri
				}
			}]);

			// uploads are deleted after 48 hours (https://ai.google.dev/gemini-api/docs/files#delete-uploaded)

			return result.response.text();

		} catch ( error ) {

			console.error(error);

			throw asTrace(error);

		}
	}

}

export async function translate({ payload: { source, target } }: Request<Translation>): Promise<Document> {

	const key=secret("GEMINI_KEY");

	const client=new GoogleGenerativeAI(key);
	const manager=new GoogleAIFileManager(key);

	try {

		// uploads are deleted after 48 hours (https://ai.google.dev/gemini-api/docs/files#delete-uploaded)

		const file=await upload(source);

		const session=client.getGenerativeModel({

			model: model,
			systemInstruction: `
				- translate the provided Markdown document from ${source} to ${target}
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

		return {

			original: false,
			language: target,

			source: source.source,

			title: source.title, // !!! translate
			content: result.response.text()

		};

	} catch ( error ) {

		console.error(error);

		throw asTrace(error);

	}


	async function upload(document: Document) {
		try {

			const buffer=Buffer.from(document.content ?? "", "utf8"); // !!!

			const response=await manager.uploadFile(buffer, {
				mimeType: markdown,
				displayName: document.title
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

}
