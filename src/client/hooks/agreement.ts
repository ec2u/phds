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

import { useProductContext } from "@forge/react";
import { Document } from "../../shared/documents";
import { defaultLanguage, Language } from "../../shared/languages";
import { Status } from "../../shared/tasks";
import { markdown } from "../tools/text";

export function useAgreement(language: Language): Status<Document> {

	const context=useProductContext();

	const content=markdown(context?.extension?.macro?.body);

	return {

		original: true,
		language: defaultLanguage, // !!! translation
		source: "",
		created: new Date().toISOString(),

		title: "",
		content

	};

}
