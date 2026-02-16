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

import { kvs, WhereConditions } from "@forge/kvs";
import { File, Schema, Type } from "@google/genai";
import { Activity, asTrace, isString } from "../../../shared/index";
import type { Reference } from "../../../shared/items/documents";
import { Issue, normalizeIssue } from "../../../shared/items/issues";
import { defaultLanguage } from "../../../shared/items/languages";
import { markdown as adfToMarkdown } from "../../../shared/tools/text";
import { Attachment, fetchAttachment, listAttachments } from "../../tools/attachments";
import { issueKey, keyPrefix, lock } from "../../tools/cache";
import { file as read } from "../../tools/files";
import { process, upload } from "../../tools/gemini";
import { markdown, pdf } from "../../tools/mime";
import { fetchPage } from "../../tools/pages";
import type { AnalyzeTask, Payload } from "../_index";
import type { Report } from "../async/index";

/**
 * AI-powered compliance analysis task.
 *
 * Analyses a Confluence page agreement against attached policy documents using Gemini, detecting inconsistencies
 * through multiple parallel analysis rounds with result merging and deduplication.
 *
 * @module
 */


/**
 * The Gemini model used for compliance analysis.
 */
const model = "gemini-2.5-pro";

/**
 * The number of parallel detection rounds per policy document.
 */
const iterations = 5;

/**
 * The display name used for the agreement document in Gemini prompts.
 */
const agreementName = "agreement";


/**
 * The structured response type from the Gemini analysis prompt.
 */
type Response = ReadonlyArray<{

	severity: string
	reason_title: string
	reason_analysis: string

	policy_clash_excerpt: string
	document_clash_excerpt: string

}>;

/**
 * The JSON schema for structured Gemini analysis responses.
 */
const ResponseSchema: Schema = {
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
 * Executes a compliance analysis task.
 *
 * Fetches the agreement page content and attached policy documents, runs multiple parallel Gemini analysis rounds,
 * merges detected issues, and caches the results.
 *
 * @param owner the lock owner identifier
 * @param key the resource key for status reporting and locking
 * @param report the progress reporting callback
 * @param page the Confluence page identifier
 *
 * @return all compliance issues (existing and newly detected)
 */
export async function analyze(owner: string, key: string, report: Report, page: string, {}: Payload<AnalyzeTask>): Promise<void> {
	try {

	await lock(owner, key, async () => {

		// query for existing issues for this page

		await report(Activity.Fetching);

		const results: Array<{ key: string; value: any }> = [];

		let cursor: string | undefined;

		do {

			const query = kvs.query()
				.where("key", WhereConditions.beginsWith(keyPrefix(key)))
				.limit(100);

			const batch = await (cursor ? query.cursor(cursor) : query).getMany();

			results.push(...batch.results);
			cursor = batch.nextCursor;

		} while ( cursor );

		// normalize retrieved issues to ensure state defaults to "pending"

		const normalized = results.map(result => ({
			...result,
			value: normalizeIssue(result.value as Issue)
		}));


		// fetch page content and convert to markdown

		const pageContent = await fetchPage(page);
		const agreement = adfToMarkdown(pageContent.content);

		if ( agreement.trim() === "" ) {

			await report(undefined);

			return [];

		}


		// analyse agreement text

		await report(Activity.Analyzing);


		// retrieve prompts

		const detectPrompt = await read("analyze-detect.sys.md", __dirname);

		const detectVariables = {
			document_name: agreementName,
			target_language: defaultLanguage
		};

		const detectConfig = {
			temperature: 0,
			seed: 42,
			topP: 0,
			topK: 1,
			candidateCount: 1
		};


		const mergePrompt = await read("analyze-merge.sys.md", __dirname);


		// upload agreement text
		const agreementFile = await upload({
			name: agreementName,
			mime: markdown,
			data: Buffer.from(agreement, "utf-8")
		});


		// upload policies

		const policies = await listAttachments(page, pdf);

		const policyFiles = await Promise.all(policies.map(async (attachment) => {

			// fetch the attachment content

			const content = await fetchAttachment(page, attachment.id);

			// upload to Gemini

			return await upload({
				name: attachment.title,
				mime: attachment.mediaType,
				data: content
			});

		}));


		// generate a report detailing all existing issues

		const history = format(normalized.map(result => result.value));


		// process agreement/policy pairs with multiple parallel analysis rounds

		const issues = await analyse();


		async function analyse(): Promise<Issue[]> {

			// for each agreement/policy pair


			// !!! disable iterations/merge: return directly detect() results

			const issues = await Promise.all(
				policyFiles.map(async (file, index) => {

					// do multiple parallel rounds of detection for this policy

					const detected = await Promise.all(
						Array.from({ length: iterations }, () => detect(file, policies[index]))
					);

					// merge all detected issues for this policy

					return await merge(detected.flat(), policies[index]); // !!! disable

					// !!! return detect(file, policies[index])

				})
			);

			// merge all issues

			return issues.flat();
		}

		async function detect(file: File, policy: Attachment): Promise<Issue[]> {

			const response = await process<Response>({
				model,
				prompt: detectPrompt,
				config: detectConfig,
				variables: {
					...detectVariables,
					policy_name: file.displayName!
				},
				input: history,
				files: [file, agreementFile],
				schema: ResponseSchema
			});

			return response.map(entry => convert(entry, policy));
		}

		async function merge(issues: ReadonlyArray<Issue>, policy: Attachment): Promise<Issue[]> {

			const response = await process<Response>({
				model,
				prompt: mergePrompt,
				input: format(issues),
				schema: ResponseSchema
			});

			return response.map((entry) => convert(entry, policy));
		}


		function convert(entry: Response[number], policy: Attachment): Issue {
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
						excerpt: entry.document_clash_excerpt,
						offset: 0, // !!!
						length: entry.document_clash_excerpt.length // !!!
					} as Reference,
					{
						source: policy.id,
						title: policy.title.replace(/\.\w+$/, ""), // remove filename extension
						excerpt: entry.policy_clash_excerpt,
						offset: 0, // !!!
						length: entry.policy_clash_excerpt.length // !!!
					} as Reference
				]

			};
		}


		// cache results

		await report(Activity.Caching);

		for (const issue of issues) {
			await kvs.set<Issue>(issueKey(page, issue.id), issue);
		}


		// return all issues (existing + new)

		const result = [
			...(normalized.map(result => result.value as Issue)),
			...issues
		];

		await report(undefined);

		return result;

	});

	} catch ( error ) {

		await report(asTrace(error));

		throw error;

	}

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Formats a list of issues as a text report for use as Gemini input context.
 *
 * @param issues the issues to format
 *
 * @return the formatted text report
 */
function format(issues: ReadonlyArray<Issue>): string {
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
