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
 * Gemini-powered compliance issue detection.
 *
 * Runs a single detection round comparing an agreement against a policy document, returning detected issues.
 *
 * @module
 */

import type { File } from "@google/genai";
import type { Issue } from "../../../shared/items/issues";
import type { Attachment } from "../../tools/attachments";
import { file as read } from "../../tools/files";
import { process } from "../../tools/gemini";
import { agreementName, convert, type Response, ResponseSchema } from "./index.core";


/**
 * The Gemini model used for compliance analysis.
 */
const model = "gemini-2.5-pro";

/**
 * The system prompt for the detection round.
 */
const prompt = read("detect.sys.md", __dirname);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Runs a single detection round comparing an agreement against a policy document.
 *
 * @param agreementFile The uploaded agreement file
 * @param policyFile The uploaded policy file
 * @param policy The source policy attachment metadata
 * @param history A text report of existing issues for context
 *
 * @returns The detected compliance issues
 */
export async function detect(
	agreementFile: File,
	policyFile: File,
	policy: Attachment,
	history: string
): Promise<Issue[]> {

	const response = await process<Response>({

		model,

		prompt,

		config: {
			temperature: 0,
			seed: 42,
			topP: 0,
			topK: 1,
			candidateCount: 1
		},

		variables: {
			document_name: agreementName,
			target_language: "en",
			policy_name: policyFile.displayName!
		},

		input: history,
		files: [policyFile, agreementFile],
		schema: ResponseSchema

	});

	return response
		.filter(entry => entry.reason_title?.trim())
		.map(entry => convert(entry, policy));

}
