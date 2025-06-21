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
import { createContext, createElement, ReactNode, useContext, useState } from "react";
import { asTrace, immutable } from "../../shared";
import { Attachment } from "../../shared/attachments";
import { Document } from "../../shared/documents";
import { Language } from "../../shared/languages";
import { Activity } from "../../shared/tasks";
import { extract, translate } from "../ports/_gemini";
import { listAttachments } from "../ports/attachments";
import { Observer } from "./index";


const Context=createContext<Archives>(immutable({

	list(): void {
		throw new Error("undefined archive");
	},

	lookup(): void {
		throw new Error("undefined archive");
	},

	analyze(): void {
		throw new Error("undefined archive");
	}

}));


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface Archives {

	list(observer: Observer<ReadonlyArray<Attachment>>): void;

	lookup(observer: Observer<Document>, attachment: Attachment, language: Language): void;

	analyze(observer: Observer<string>, title: string): void;

}


export function useArchive(): Archives {
	return useContext(Context);
}

export function ToolArchive({

	children

}: {

	children: ReactNode

}) {

	const context=useProductContext(); // !!! read macro body as a virtual attachment

	const [attachments, setAttachments]=useState<ReadonlyArray<Attachment>>();


	return createElement(Context.Provider, {

		value: immutable({

			list(observer: Observer<ReadonlyArray<Attachment>>): void {
				try { list(observer); } catch ( error ) { observer(asTrace(error)); }
			},

			lookup(observer: Observer<Document>, attachment: Attachment, language: Language): void {
				try { lookup(observer, attachment, language); } catch ( error ) { observer(asTrace(error)); }
			},

			analyze(observer: Observer<string>, title: string): void {
				try { analyze(observer, title); } catch ( error ) { observer(asTrace(error)); }
			}

		}),

		children

	});


	async function list(observer: Observer<ReadonlyArray<Attachment>>) {
		if ( attachments === undefined ) {

			observer(Activity.Scanning);

			// !!! remove stale documents
			// !!! create index

			return await listAttachments()
				.then(immutable)
				.then(attachments => {

					setAttachments(attachments);
					observer(attachments);

				});

		} else {

			observer(attachments);

		}
	}

	async function lookup(observer: Observer<Document>, attachment: Attachment, language: Language) {

		const document=await extracting(observer, attachment);
		const xlation=await xlating(observer, document, language);

		observer(xlation);

	}

	async function analyze(observer: Observer<string>, title: string) {

		observer(Activity.Analyzing);

		observer(title);

	}


	async function extracting(observer: Observer<Document>, attachment: Attachment): Promise<Document> {

		observer(Activity.Extracting);

		// !!! check if updated full text is available
		// !!! extract full text
		// !!! save full text and remove stale versions

		return await extract({ attachment });
	}

	async function xlating(observer: Observer<Document>, source: Document, target: Language): Promise<Document> {

		observer(Activity.Translating);

		// !!! check if updated translation is available
		// !!! translate from native language (which one?)
		// !!! save translation and remove stale versions

		return await translate({
			source,
			target
		});
	}

}
