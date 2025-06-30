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
import { Issue, Reference } from "../../shared/issues";
import { Activity, IssuesTask } from "../../shared/tasks";
import { setStatus } from "../async";
import { issueKey } from "../tools/cache";

export async function issues(job: string, page: string, { refresh=false }: IssuesTask): Promise<ReadonlyArray<Issue>> {

	// check cache first if not refreshing

	if ( !refresh ) {
		await setStatus(job, Activity.Fetching);

		// query for existing issues for this page

		const query=storage.query().where("key", { condition: "STARTS_WITH", value: `${page}:issue:` });
		const { results }=await query.getMany();

		const cachedIssues=results.map(result => result.value as Issue);
		await setStatus(job, cachedIssues);
		return cachedIssues;
	}

	const result=await (async (): Promise<Issue[]> => {
		await setStatus(job, Activity.Analyzing);

	// TODO: Implement issues analysis logic

	// Policy IDs mapped to names (for reference)
	// att840597541: Area Policy Turku EN - Attachment III UTU-Doctoral_training_in_the_Faculty_of_Science
	// att840761388: General Policy Jena DE - Attachment I General Provisions for Doctoral Candidates UJ
	// att840761393: Area Policy Jena DE - Attachment II Provisions for Doctoral Candidates of the Faculty UJ  
	// att840925189: General Policy Turku EN - Attachment IV UTU-regulation-on-studies-2022

	const dummyIssues: Issue[]=[
		{
			id: "issue-001-supervisor-qualifications",
			priority: 0.9,
			title: "Missing supervisor qualification requirements",
			description: [
				"The cotutelle agreement lacks comprehensive supervisor qualification criteria, creating potential ambiguity in supervisor selection and appointment processes. While some basic requirements are mentioned in institutional policies, the specific qualifications, experience levels, and academic standing required for supervisors in joint doctoral programs are not clearly defined.",
				{
					source: "att840761393",
					offset: 150,
					length: 45,
					title: "Area Policy Jena DE - Attachment II Provisions for Doctoral Candidates of the Faculty UJ",
					excerpt: "Supervisors must hold a doctoral degree and demonstrate research expertise in the relevant field"
				} as Reference,
				"However, this general requirement does not address the complexities of international supervision, language proficiency requirements, or the coordination mechanisms between supervisors from different institutions. Clear qualification standards should be established to ensure quality supervision across both partner universities."
			]
		},
		{
			id: "issue-002-duration-inconsistency",
			priority: 0.8,
			title: "Inconsistent duration specifications",
			description: [
				"Significant discrepancies exist in doctoral program duration requirements between partner institutions, " +
				"which could lead to confusion and potential conflicts in program planning. The varying time frames " +
				"create uncertainty for students regarding expected completion timelines and may complicate " +
				"administrative processes related to enrollment, funding, and degree completion across institutions.",
				{
					source: "att840597541",
					offset: 320,
					length: 38,
					title: "Area Policy Turku EN - Attachment III UTU-Doctoral_training_in_the_Faculty_of_Science",
					excerpt: "Doctoral studies duration: 3-4 years with possibility of extension"
				} as Reference,
				"This conflicts directly with the requirements stated in the partner institution's regulations:",
				{
					source: "att840761388",
					offset: 180,
					length: 42,
					title: "General Policy Jena DE - Attachment I General Provisions for Doctoral Candidates UJ",
					excerpt: "Maximum duration shall not exceed 6 years from initial enrollment"
				} as Reference,
				"These inconsistent timeframes need to be reconciled to establish clear, unified expectations."
			]
		},
		{
			id: "issue-003-language-requirements",
			priority: 0.6,
			title: "Language proficiency requirements unclear",
			description: [
				"The current agreement lacks precise language proficiency requirements for international doctoral " +
				"students, creating potential barriers to successful program completion. Without clear standards, " +
				"students may struggle with coursework, research communication, and thesis writing. The vague " +
				"language requirements also make it difficult for admissions committees to evaluate applicants " +
				"consistently and may lead to academic difficulties later in the program.",
				{
					source: "att840925189",
					offset: 420,
					length: 55,
					title: "General Policy Turku EN - Attachment IV UTU-regulation-on-studies-2022",
					excerpt: "Students must demonstrate adequate language skills in English or local language"
				} as Reference,
				"However, 'adequate' is not defined with specific proficiency levels, standardized test scores, " +
				"or alternative assessment methods. Clear CEFR levels or equivalent standards should be established."
			]
		},
		{
			id: "issue-004-examination-procedures",
			priority: 0.7,
			title: "Conflicting examination and defense procedures",
			description: [
				"Fundamental differences in examination and thesis defense procedures between partner institutions " +
				"create significant organizational challenges and potential confusion for students and faculty. " +
				"The conflicting formats may lead to inequitable assessment standards and complicate the " +
				"coordination of joint defense committees. Students may be unclear about which procedures to " +
				"follow, and faculty may struggle to align their expectations and evaluation criteria.",
				{
					source: "att840761393",
					offset: 890,
					length: 62,
					title: "Area Policy Jena DE - Attachment II Provisions for Doctoral Candidates of the Faculty UJ",
					excerpt: "Final examination consists of thesis defense and oral exam with written component"
				} as Reference,
				{
					source: "att840597541",
					offset: 720,
					length: 48,
					title: "Area Policy Turku EN - Attachment III UTU-Doctoral_training_in_the_Faculty_of_Science",
					excerpt: "Public thesis presentation followed by closed committee discussion"
				} as Reference,
				"These procedural differences require harmonization to ensure fair and consistent evaluation."
			]
		},
		{
			id: "issue-005-residence-mobility",
			priority: 0.4,
			title: "Residence and mobility requirements inconsistent",
			description: [
				"Conflicting residence and mobility requirements between partner institutions create substantial " +
				"logistical challenges for cotutelle students and complicate program planning. The inconsistent " +
				"minimum residence periods may make it impossible for students to satisfy both institutions' " +
				"requirements simultaneously, potentially affecting their eligibility for degree completion. " +
				"These discrepancies also impact visa applications, housing arrangements, and research continuity.",
				"The home institution mandates",
				{
					source: "att840761388",
					offset: 540,
					length: 35,
					title: "General Policy Jena DE - Attachment I General Provisions for Doctoral Candidates UJ",
					excerpt: "minimum 18 months consecutive residence at home institution"
				} as Reference,
				"while the partner university requires",
				{
					source: "att840925189",
					offset: 280,
					length: 41,
					title: "General Policy Turku EN - Attachment IV UTU-regulation-on-studies-2022",
					excerpt: "at least 12 months continuous presence at partner university"
				} as Reference,
				"These overlapping requirements need coordination to ensure feasible mobility plans for students."
			]
		}
	];

		// cache the results
		
		await setStatus(job, Activity.Caching);

		// store individual issues

		for (const issue of dummyIssues) {
			await storage.set(issueKey(page, issue.id), issue);
		}

		return dummyIssues;
	})();

	await setStatus(job, result);

	return result;

}
