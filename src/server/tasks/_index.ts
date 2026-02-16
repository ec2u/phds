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

import { Source } from "../../shared/items/documents";
import { Issue } from "../../shared/items/issues";
import { Language } from "../../shared/items/languages";

/**
 * Base interface for all asynchronous task types.
 *
 * @typeParam T the type of the task result value
 */
export interface Task<T = unknown> {

	readonly type:

		| "policy"
		| "analyze";

}

/**
 * Extracts the payload fields from a task type, excluding the discriminator.
 *
 * @typeParam T the task type to extract payload from
 */
export type Payload<T extends Task> = Omit<T, "type">

/**
 * Task for fetching and translating a single policy document.
 */
export interface PolicyTask extends Task<Document> {

	readonly type: "policy";

	/**
	 * The source attachment identifier.
	 */
	readonly source: Source;

	/**
	 * The target language for translation.
	 */
	readonly language: Language;

}

/**
 * Task for performing AI-powered compliance analysis.
 */
export interface AnalyzeTask extends Task<ReadonlyArray<Issue>> {

	readonly type: "analyze";

}
