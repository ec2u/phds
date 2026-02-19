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
 * Policy document extraction and translation task.
 *
 * Handles fetching policy PDF attachments from Confluence, extracting content via Gemini, translating to the
 * target language, and caching results in Forge KVS with staleness checking.
 *
 * @module
 */

import { type Language, type Source } from "../../../shared/items/documents";
import { Activity } from "../../../shared/store";
import { message } from "../../../shared/tools/core";
import { createServerStore } from "../../store";
import { fetchAttachment } from "../../tools/attachments";
import { upload } from "../../tools/gemini";
import { pdf } from "../../tools/mime";
import { extract } from "./extract";
import { translate } from "./translate";


/**
 * Task for extracting and translating a single policy document.
 */
export interface ConvertTask {

	readonly type: "convert";

	/**
	 * The source attachment identifier.
	 */
	readonly source: Source;

	/**
	 * The target language for translation.
	 */
	readonly language: Language;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Executes a policy document extraction and translation task.
 *
 * Fetches the PDF attachment from Confluence, extracts content via Gemini, and translates to the target language if
 * needed. Publishes {@link Activity} progress and the final result as {@link PolicyConverted} events.
 *
 * @param page The Confluence page identifier
 * @param payload The task payload containing `source` and `language`
 */
export async function convert(page: string, {

	source,
	language

}: ConvertTask): Promise<void> {

	const store = createServerStore(page);

	try {

		await store.publishPolicyConverted(source, language, Activity.Fetching);

		const buffer = await fetchAttachment(page, source);


		await store.publishPolicyConverted(source, language, Activity.Uploading);

		const file = await upload({ name: source, mime: pdf, data: buffer });


		await store.publishPolicyConverted(source, language, Activity.Extracting);

		const extracted = await extract(source, file);

		if ( extracted.language === language ) {

			await store.publishPolicyConverted(source, language, extracted);

		} else {

			await store.publishPolicyConverted(source, language, Activity.Translating);

			const translated = await translate(extracted, language);

			await store.publishPolicyConverted(source, language, translated);

		}

	} catch ( error ) {

		await store.publishPolicyConverted(source, language, message(error));

		throw error;

	}

}
