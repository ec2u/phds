import { readFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";

const key = process.env.GEMINI_API_KEY;
const client = new GoogleGenAI({ apiKey: key });

const pdf = readFileSync(new URL("sample.pdf", import.meta.url));

console.log(`uploading PDF (${pdf.length} bytes)…`);

const file = await client.files.upload({
	file: new Blob([new Uint8Array(pdf)], { type: "application/pdf" }),
	config: { displayName: "sample.pdf", mimeType: "application/pdf" }
});

console.log(`uploaded: ${file.name}`);
console.log("extracting…");

const result = await client.models.generateContent({
	model: "gemini-2.5-flash",
	contents: [{
		role: "user",
		parts: [{ fileData: { mimeType: file.mimeType, fileUri: file.uri } }]
	}],
	config: {
		seed: 42, temperature: 0,
		maxOutputTokens: 65536,
		responseMimeType: "application/json",
		responseSchema: {
			type: "OBJECT",
			properties: {
				title: { type: "STRING" },
				language: { type: "STRING" },
				markdownContent: { type: "STRING" }
			},
			required: ["title", "language", "markdownContent"]
		},
		systemInstruction: {
			parts: [{
				text: readFileSync(
					new URL("../src/server/tasks/async/policy-extract.sys.md", import.meta.url), "utf-8"
				)
			}]
		}
	}
});

// inspect the full response metadata

const candidate = result.candidates?.[0];

console.log("\n=== Response Metadata ===");
console.log("finishReason:", candidate?.finishReason);
console.log("finishMessage:", candidate?.finishMessage);
console.log("tokenCount:", JSON.stringify(result.usageMetadata, null, 2));
console.log("safetyRatings:", JSON.stringify(candidate?.safetyRatings, null, 2));

const text = result.text || "";
console.log("\nresponse length:", text.length, "chars");
console.log("response ends with:", JSON.stringify(text.slice(-100)));
