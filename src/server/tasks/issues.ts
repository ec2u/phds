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
import { Issue, Reference } from "../../shared/issues";
import { Activity, IssuesTask } from "../../shared/tasks";
import { setStatus } from "../async";
import { fetchAttachment, listAttachments, pdf } from "../tools/attachments";
import { issueKey } from "../tools/cache";
import { process, upload } from "../tools/gemini";
import { retrievePrompt } from "../tools/langfuse";


export async function issues(job: string, page: string, { refresh=false, agreement }: IssuesTask) {

	// query for existing issues for this page

	await setStatus(job, Activity.Fetching);

	const { results }=await storage
		.query().where("key", { condition: "STARTS_WITH", value: `${page}:issue:` })
		.getMany();


	// check cache first if not refreshing

	if ( !refresh && results.length > 0 ) {

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

	const allIssues=results.map(result => result.value as Issue);

	console.log("Issues Report:\n", report(allIssues)); // !!! include report into prompt



	// process agreement/policy pairs

	const responses=await Promise.all(policyFiles.map(policyFile => process<{

		reason_title: string;
		reason_description: string;

		policy_clash_section: string;
		document_clash_section: string;

	}>({

		prompt: prompt,

		variables: {
			document_name: "agreement",
			policy_name: policyFile.displayName!
		},

		files: [

			policyFile,
			agreementFile

		],

		schema: {
			type: SchemaType.OBJECT,
			properties: {
				reason_title: {
					type: SchemaType.STRING,
					description: "A short title explaining why the sections are incompatible"
				},
				reason_description: {
					type: SchemaType.STRING,
					description: "A more verbose description explaining why the sections are incompatible"
				},
				policy_clash_section: {
					type: SchemaType.STRING,
					description: "The full text of the section of the policy that clashes with the document"
				},
				document_clash_section: {
					type: SchemaType.STRING,
					description: "The full text of the section of the document that clashes with the policy"
				}
			},
			required: [
				"reason_title",
				"reason_description",
				"policy_clash_section",
				"document_clash_section"
			]
		}

	})));

	const issues=responses.map((response, index) => ({

		id: crypto.randomUUID(),
		created: new Date().toISOString(),
		priority: 1, // !!!

		title: response.reason_title,
		description: [
			response.reason_description,
			{
				source: "",
				title: "Agreement",
				excerpt: response.document_clash_section,
				offset: 0, // !!!
				length: response.document_clash_section.length // !!!
			} as Reference,
			{
				source: policies[index].id,
				title: policies[index].title,
				excerpt: response.policy_clash_section,
				offset: 0, // !!!
				length: response.policy_clash_section.length // !!!
			} as Reference
		]

	}));


	// cache results

	await setStatus(job, Activity.Caching);

	// clear existing issues for this page first

	for (const result of results) {
		await storage.delete(result.key);
	}

	// store new issues

	for (const issue of issues) {
		await storage.set(issueKey(page, issue.id), issue);
	}

	console.log("Issues Report:\n", report(issues));
	await setStatus(job, issues);

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function report(issues: ReadonlyArray<Issue>): string {

	const openIssues=issues.filter(issue => !issue.resolved);
	const resolvedIssues=issues.filter(issue => issue.resolved);

	let markdown="# Issues Report\n\n";

	// summary
	markdown+="## Summary\n\n";
	markdown+=`- **Total Issues**: ${issues.length}\n`;
	markdown+=`- **Open Issues**: ${openIssues.length}\n`;
	markdown+=`- **Resolved Issues**: ${resolvedIssues.length}\n\n`;

	// open issues
	if ( openIssues.length > 0 ) {
		markdown+="## Open Issues\n\n";
		openIssues.forEach((issue, index) => {
			const priority="⭐".repeat(issue.priority);
			markdown+=`### ${index + 1}. ${issue.title} ${priority}\n\n`;
			markdown+=`**Status**: Open\n`;
			markdown+=`**Created**: ${new Date(issue.created).toLocaleDateString()}\n`;
			markdown+=`**Priority**: ${issue.priority}/3\n\n`;

			// description
			markdown+="**Description**:\n";
			issue.description.forEach(item => {
				if ( typeof item === "string" ) {
					markdown+=`${item}\n\n`;
				} else {
					markdown+=`> **${item.title}**: ${item.excerpt}\n\n`;
				}
			});

			// annotations if present
			if ( issue.annotations ) {
				markdown+=`**Annotations**:\n${issue.annotations}\n\n`;
			}

			markdown+="---\n\n";
		});
	}

	// resolved issues
	if ( resolvedIssues.length > 0 ) {
		markdown+="## Resolved Issues\n\n";
		resolvedIssues.forEach((issue, index) => {
			const priority="⭐".repeat(issue.priority);
			markdown+=`### ${index + 1}. ${issue.title} ${priority}\n\n`;
			markdown+=`**Status**: ✅ Resolved\n`;
			markdown+=`**Created**: ${new Date(issue.created).toLocaleDateString()}\n`;
			markdown+=`**Resolved**: ${new Date(issue.resolved!).toLocaleDateString()}\n`;
			markdown+=`**Priority**: ${issue.priority}/3\n\n`;

			// description
			markdown+="**Description**:\n";
			issue.description.forEach(item => {
				if ( typeof item === "string" ) {
					markdown+=`${item}\n\n`;
				} else {
					markdown+=`> **${item.title}**: ${item.excerpt}\n\n`;
				}
			});

			// annotations if present
			if ( issue.annotations ) {
				markdown+=`**Annotations**:\n${issue.annotations}\n\n`;
			}

			markdown+="---\n\n";
		});
	}

	return markdown;
}
