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

import { useEffect, useState } from "react";
import { Document, Source } from "../../shared/documents";
import { Language } from "../../shared/languages";
import { Activity, Status } from "../../shared/tasks";
import { useArchives } from "./_archives";

export function useDocument(source: Source, language: Language): Status<Document> {

	const { lookup }=useArchives();

	const [document, setDocument]=useState<Status<Document>>(Activity.Initializing);

	useEffect(() => {

		return lookup(setDocument, source, language);

	}, [lookup, source, language]);

	return document;
}
