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

import { storage } from "@forge/api";
import { Schema, SchemaType } from "@google/generative-ai";
import { FileMetadataResponse } from "@google/generative-ai/server";
import { isString } from "../../shared";
import { Issue, Reference } from "../../shared/issues";
import { defaultLanguage } from "../../shared/languages";
import { Activity, IssuesTask } from "../../shared/tasks";
import { setStatus } from "../async";
import { Attachment, fetchAttachment, listAttachments, pdf } from "../tools/attachments";
import { issueKey } from "../tools/cache";
import { process, upload } from "../tools/gemini";
import { retrievePrompt } from "../tools/langfuse";


const model="gemini-2.5-pro";
const iterations=5;

type Response=ReadonlyArray<{

	severity: string
	reason_title: string
	reason_analysis: string

	policy_clash_excerpt: string
	document_clash_excerpt: string

}>;

const ResponseSchema: Schema={
	type: SchemaType.ARRAY,
	items: {
		type: SchemaType.OBJECT,
		properties: {
			severity: {
				type: SchemaType.STRING,
				description: "A severity assessment of the clash (high/medium/low)"
			},
			reason_title: {
				type: SchemaType.STRING,
				description: "A short title explaining why the sections are incompatible"
			},
			reason_analysis: {
				type: SchemaType.STRING,
				description: "A more verbose description explaining why the sections are incompatible"
			},
			policy_clash_excerpt: {
				type: SchemaType.STRING,
				description: "The full text of the excerpt of the policy that clashes with the document"
			},
			document_clash_excerpt: {
				type: SchemaType.STRING,
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


export async function issues(job: string, page: string, { refresh=false, agreement }: IssuesTask) {

	// query for existing issues for this page

	await setStatus(job, Activity.Fetching);

	const { results }=await storage
		.query().where("key", { condition: "STARTS_WITH", value: `${page}:issue:` })
		.getMany();


	// if not refreshing, return cached values (even if empty)

	if ( !refresh ) {

		await setStatus(job, results.map(result => result.value as Issue));

		return;

	}


	await setStatus(job, Activity.Analyzing);


	// retrieve prompts

	const detection=await retrievePrompt("INCONSISTENCY_DETECTION");
	const merging=await retrievePrompt("INCONSISTENCY_MERGING");


	// generate a report including all existing issues

	const history=report(results.map(result => result.value as Issue));


	// upload agreement text

	const agreementName="agreement";
	const agreementFile=await upload({
		name: agreementName,
		mime: "text/plain",
		data: Buffer.from(agreement, "utf-8")
	});


	// upload policies

	const policies=(await listAttachments(page)).filter(attachment =>
		attachment.mediaType === pdf
	);

	const policyFiles=await Promise.all(policies.map(async (attachment) => {

		// fetch the attachment content

		const content=await fetchAttachment(page, attachment.id);

		// upload to Gemini

		return await upload({
			name: attachment.title,
			mime: attachment.mediaType,
			data: content
		});

	}));


	// process agreement/policy pairs with multiple parallel analysis rounds

	const issues=await analyse();


	async function analyse(): Promise<Issue[]> {

		// for each agreement/policy pair

		const issues=await Promise.all(
			policyFiles.map(async (file, index) => {

				// do multiple parallel rounds of detection for this policy

				const detected=await Promise.all(
					Array.from({ length: iterations }, () => detect(file, policies[index]))
				);

				// merge all detected issues for this policy

				return await merge(detected.flat(), policies[index]);

			})
		);

		// merge all issues

		return issues.flat();
	}

	async function detect(file: FileMetadataResponse, policy: Attachment): Promise<Issue[]> {

		const response=await process<Response>({
			model,
			prompt: detection,
			variables: {
				document_name: agreementName,
				policy_name: file.displayName!,
				target_language: defaultLanguage, // !!!
				known_issues: history
			},
			files: [file, agreementFile],
			schema: ResponseSchema
		});

		return response.map(entry => convert(entry, policy));
	}

	async function merge(issues: ReadonlyArray<Issue>, policy: Attachment): Promise<Issue[]> {

		const response=await process<Response>({
			model,
			prompt: merging,
			variables: {
				inconsistencies: report(issues)
			},
			schema: ResponseSchema
		});

		return response.map((entry, index) => convert(entry, policy));
	}


	function convert(entry: Response[number], policy: Attachment): Issue {
		return {

			id: crypto.randomUUID(),
			created: new Date().toISOString(),
			severity: entry.severity === "high" ? 3 : entry.severity === "medium" ? 2 : 1,

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
					title: policy.title,
					excerpt: entry.policy_clash_excerpt,
					offset: 0, // !!!
					length: entry.policy_clash_excerpt.length // !!!
				} as Reference
			]

		};
	}


	// cache results

	await setStatus(job, Activity.Caching);

	for (const issue of issues) {
		await storage.set(issueKey(page, issue.id), issue);
	}


	// return all issues (existing + new)

	await setStatus(job, [...(results.map(result => result.value as Issue)), ...issues]);

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function report(issues: ReadonlyArray<Issue>): string {
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
