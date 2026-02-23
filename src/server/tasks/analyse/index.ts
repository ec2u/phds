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
 * AI-powered compliance analysis task.
 *
 * Orchestrates agreement fetching, parallel Gemini detection rounds, result merging, and event publishing.
 *
 * @module
 */

import { Activity } from "../../../shared/store";
import { message } from "../../../shared/tools/core";
import { markdown as toMarkdown } from "../../../shared/tools/text";
import { createServerStore, readIssues } from "../../store";
import { fetchAttachment, listAttachments } from "../../tools/attachments";
import { upload } from "../../tools/gemini";
import { markdown, pdf } from "../../tools/mime";
import { fetchPage } from "../../tools/pages";
import { detect } from "./detect";
import { agreementName, convert, report } from "./index.core";
import { merge } from "./merge";


/**
 * The number of parallel detection rounds per policy document.
 */
const iterations = 5;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Task for performing AI-powered compliance analysis.
 */
export interface AnalyseTask {

	readonly type: "analyse";

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Executes a compliance analysis task.
 *
 * Fetches existing issues and agreement content, uploads documents to Gemini, runs parallel detection and merge
 * rounds per policy, and publishes the combined results.
 *
 * @param page The Confluence page identifier
 */
export async function analyse(page: string, {}: AnalyseTask): Promise<void> {

	const store = createServerStore(page);

	try {

		// fetch existing issues directly from KVS — bypasses the public API's job-detection safeguard

		await store.publishIssuesUpdated(Activity.Fetching);

		const issues = await readIssues(page);

		// fetch agreement content

		const pageContent = await fetchPage(page);
		const agreement = toMarkdown(pageContent.content);

		if ( agreement.trim() === "" ) {

			await store.publishIssuesUpdated([]);

		} else {

			// upload agreement and policies to Gemini

			await store.publishIssuesUpdated(Activity.Uploading);

			const agreementFile = await upload({
				name: agreementName,
				mime: markdown,
				data: Buffer.from(agreement, "utf-8")
			});

			const policies = await listAttachments(page, pdf);

			const policyFiles = await Promise.all(policies.map(async (attachment) => {

				const content = await fetchAttachment(page, attachment.id);

				return await upload({
					name: attachment.title,
					mime: attachment.mediaType,
					data: content
				});

			}));


			// analyse compliance

			await store.publishIssuesUpdated(Activity.Analyzing);


			// generate a report detailing all existing issues

			const history = report(issues);

			// detect and merge issues for each policy

			const detected = await Promise.all(
				policyFiles.map(async (file, index) => {

					const rounds = await Promise.all(
						Array.from({ length: iterations }, () =>
							detect(agreementFile, file, policies[index], history)
						)
					);

					const merged = await merge(rounds.flat());

					return merged.map(entry => convert(entry, policies[index]));

				})
			);

			// publish all issues (existing + new) — KVS caching handled reactively by the store

			await store.publishIssuesUpdated([...issues, ...detected.flat()]);

		}

	} catch ( error ) {

		await store.publishIssuesUpdated(message(error));

		throw error;

	}

}
