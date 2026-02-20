import { readFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";

const key = process.env.GEMINI_API_KEY;
const client = new GoogleGenAI({ apiKey: key });


// mirrors matches() from src/server/tools/gemini.ts

function matches(value, schema) {

	if ( schema.nullable && value === null ) {
		return true;
	} else if ( schema.anyOf ) {
		return schema.anyOf.some(sub => matches(value, sub));
	} else {

		switch ( schema.type ) {

			case "STRING":
				return typeof value === "string" && (!schema.enum || schema.enum.includes(value));

			case "NUMBER":
				return Number.isFinite(value);

			case "INTEGER":
				return Number.isFinite(value) && Number.isInteger(value);

			case "BOOLEAN":
				return typeof value === "boolean";

			case "NULL":
				return value === null;

			case "ARRAY":
				return Array.isArray(value) && (!schema.items || value.every(item => matches(item, schema.items)));

			case "OBJECT":
				return typeof value === "object" && value !== null && !Array.isArray(value)
					&& (!schema.required || schema.required.every(key => key in value))
					&& (!schema.properties || Object.entries(schema.properties).every(([key, sub]) =>
						!(key in value) || matches(value[key], sub)
					));

			default:
				return false;

		}

	}

}


// Step 1: extract with low maxOutputTokens to force truncation

const extractSchema = {
	type: "OBJECT",
	properties: {
		title: { type: "STRING" },
		language: { type: "STRING" },
		markdownContent: { type: "STRING" }
	},
	required: ["title", "language", "markdownContent"]
};

const pdf = readFileSync(new URL("sample.pdf", import.meta.url));

console.log(`uploading PDF (${pdf.length} bytes)…`);

const file = await client.files.upload({
	file: new Blob([new Uint8Array(pdf)], { type: "application/pdf" }),
	config: { displayName: "sample.pdf", mimeType: "application/pdf" }
});

console.log(`uploaded: ${file.name}`);
console.log("extracting (maxOutputTokens: 65536)…");

const extractResult = await client.models.generateContent({
	model: "gemini-2.5-flash",
	contents: [{
		role: "user",
		parts: [{ fileData: { mimeType: file.mimeType, fileUri: file.uri } }]
	}],
	config: {
		seed: 42, temperature: 0, topP: 0, topK: 1, candidateCount: 1,
		maxOutputTokens: 65536,
		responseMimeType: "application/json",
		responseSchema: extractSchema,
		systemInstruction: {
			parts: [{
				text: readFileSync(
					new URL("../src/server/tasks/async/policy-extract.sys.md", import.meta.url), "utf-8"
				)
			}]
		}
	}
});

const responseText = extractResult.text || "";
console.log(`response: ${responseText.length} chars`);

// exercise matches() safeguard

try {

	const parsed = responseText.trim() ? JSON.parse(responseText) : {};

	if ( matches(parsed, extractSchema) ) {
		console.log("PASS: response matches schema");
		console.log(`  title: ${parsed.title}`);
		console.log(`  language: ${parsed.language}`);
		console.log(`  markdownContent: ${parsed.markdownContent?.length} chars`);
	} else {
		console.error(`CAUGHT: invalid gemini response <${responseText.substring(0, 500)}…>`);
	}

} catch ( error ) {
	console.error(`CAUGHT: ${error.message}`);
	console.error(`  response preview: <${responseText.substring(0, 200)}…>`);
}
