/*
 * Copyright © 2025-2026 EC2U Alliance
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

/**
 * Shared types and utilities for the compliance analysis task.
 *
 * Defines the structured {@link Response} type, the corresponding {@link ResponseSchema} for Gemini output, and
 * shared helpers used by detection and merge workers.
 *
 * @module
 */

import { type Schema, Type } from "@google/genai";
import type { Reference } from "../../../shared/items/documents";
import type { Issue } from "../../../shared/items/issues";
import { isString } from "../../../shared/tools/core";
import type { Attachment } from "../../tools/attachments";


/**
 * The display name used for the agreement document in Gemini prompts.
 */
export const agreementName = "agreement";


/**
 * The JSON schema for structured Gemini analysis responses.
 */
export const ResponseSchema: Schema = {
	type: Type.ARRAY,
	items: {
		type: Type.OBJECT,
		properties: {
			severity: {
				type: Type.STRING,
				description: "A severity assessment of the clash",
				enum: ["high", "medium", "low"]
			},
			reason_title: {
				type: Type.STRING,
				description: "A short title explaining why the sections are incompatible"
			},
			reason_analysis: {
				type: Type.STRING,
				description: "A more verbose description explaining why the sections are incompatible"
			},
			policy_clash_excerpt: {
				type: Type.STRING,
				description: "The full text of the excerpt of the policy that clashes with the document"
			},
			document_clash_excerpt: {
				type: Type.STRING,
				description: "The full text of the excerpt of the document that clashes with the policy"
			}
		},
		required: [
			"severity",
			"reason_title",
			"reason_analysis",
			"policy_clash_excerpt",
			"document_clash_excerpt"
		]
	}
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * The structured response type from the Gemini analysis prompts.
 */
export type Response = ReadonlyArray<{

	severity: string
	reason_title: string
	reason_analysis: string

	policy_clash_excerpt: string
	document_clash_excerpt: string

}>;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Formats existing issues as a text report for use as Gemini detection context.
 *
 * @param issues The existing issues to format
 *
 * @returns The formatted text report
 */
export function report(issues: ReadonlyArray<Issue>): string {
	return issues

		.map(issue => [

			`Title: ${issue.title}`,
			`Severity: ${issue.severity === 3 ? "high" : issue.severity === 2 ? "medium" : "low"}`,

			...(issue.description.map(item =>
				isString(item) ? `Analysis: ${item}`
					: item.source ? `Agreement Excerpt: ${item.excerpt}`
						: `Policy Excerpt: ${item.excerpt}`
			))

		].join("\n"))

		.join("\n\n");
}

/**
 * Converts a Gemini analysis response entry to an {@link Issue}.
 *
 * @param entry The structured response entry
 * @param policy The source policy attachment
 *
 * @returns The converted issue
 */
export function convert(entry: Response[number], policy: Attachment): Issue {
	return {

		id: crypto.randomUUID(),
		created: new Date().toISOString(),
		severity: entry.severity === "high" ? 3 : entry.severity === "medium" ? 2 : 1,
		state: "pending",

		title: entry.reason_title,
		description: [
			entry.reason_analysis,
			{
				source: "",
				title: "Agreement",
				excerpt: entry.document_clash_excerpt
			} as Reference,
			{
				source: policy.id,
				title: policy.title.replace(/\.\w+$/, ""), // remove filename extension
				excerpt: entry.policy_clash_excerpt
			} as Reference
		]

	};
}
