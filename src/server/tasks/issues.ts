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
import { SchemaType } from "@google/generative-ai";
import { isString } from "../../shared";
import { Issue, Reference } from "../../shared/issues";
import { defaultLanguage } from "../../shared/languages";
import { Activity, IssuesTask } from "../../shared/tasks";
import { setStatus } from "../async";
import { fetchAttachment, listAttachments, pdf } from "../tools/attachments";
import { issueKey } from "../tools/cache";
import { process, upload } from "../tools/gemini";
import { retrievePrompt } from "../tools/langfuse";


const model="gemini-2.5-pro";


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

	const prompt=await retrievePrompt("INCONSISTENCY_DETECTION");


	// upload the agreement text

	const agreementFile=await upload({
		name: "agreement",
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


	// generate report for all existing issues

	const history=report(results.map(result => result.value as Issue));


	// process agreement/policy pairs

	const responses=await Promise.all(policyFiles.map(policyFile => process<{

		severity: string
		reason_title: string
		reason_analysis: string

		policy_clash_excerpt: string
		document_clash_excerpt: string


	}>({

		model,
		prompt,

		variables: {
			document_name: "agreement",
			policy_name: policyFile.displayName!,
			target_language: defaultLanguage, // !!!
			known_issues: history
		},

		files: [

			policyFile,
			agreementFile

		],

		schema: {
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

	})));

	const issues=responses.map((response, index) => ({

		id: crypto.randomUUID(),
		created: new Date().toISOString(),
		severity: response.severity === "high" ? 3 : response.severity === "medium" ? 2 : 1,

		title: response.reason_title,
		description: [
			response.reason_analysis,
			{
				source: "",
				title: "Agreement",
				excerpt: response.document_clash_excerpt,
				offset: 0, // !!!
				length: response.document_clash_excerpt.length // !!!
			} as Reference,
			{
				source: policies[index].id,
				title: policies[index].title,
				excerpt: response.policy_clash_excerpt,
				offset: 0, // !!!
				length: response.policy_clash_excerpt.length // !!!
			} as Reference
		]

	}));


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
