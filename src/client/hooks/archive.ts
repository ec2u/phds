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
import { asTrace, immutable, Status, Update } from "../../shared";
import { Attachment } from "../../shared/attachments";
import { Document } from "../../shared/documents";
import { defaultLanguage, Language } from "../../shared/languages";
import { listAttachments, retrieveAttachment } from "../ports/attachments";
import { translate } from "../ports/gemini";
import { createAsyncEmitter, Emitter } from "../shims/emitters";


const Context=createContext<Archive>(immutable({

	list(monitor: (status: Status<ReadonlyArray<Attachment>>) => void): void {
		throw new Error("undefined archive");
	},

	lookup(monitor: (status: Status<Document>) => void, attachment: Attachment, language: Language): void {
		throw new Error("undefined archive");
	}

}));


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface Archive {

	list(monitor: (status: Status<ReadonlyArray<Attachment>>) => void): void;

	lookup(monitor: (status: Status<Document>) => void, attachment: Attachment, language: Language): void;

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

			list(monitor: (status: Status<ReadonlyArray<Attachment>>) => void) {
				list(createAsyncEmitter(monitor));
			},

			lookup(monitor: (status: Status<Document>) => void, attachment: Attachment, language: Language) {
				lookup(createAsyncEmitter(monitor), attachment, language);
			}

		}),

		children

	});

	async function list(emitter: Emitter<Status<ReadonlyArray<Attachment>>>) {
		try {

			emitter.emit(await scan(emitter));

		} catch ( error ) {

			emitter.emit(asTrace(error));

		} finally {

			emitter.close();

		}
	}

	async function lookup(emitter: Emitter<Status<Document>>, attachment: Attachment, language: Language) {
		try {

			const attachments=await scan(emitter);
			const content=await fetch(emitter, attachment);

			// !!! await extract(emitter);

			const document={
				title: attachment.title,
				language: defaultLanguage, // !!!
				content
			};

			const xlation=await xlate(emitter, document, language);

			emitter.emit({ title: attachment.title, language: language, content: xlation });

		} catch ( error ) {

			emitter.emit(asTrace(error));

		} finally {

			emitter.close();

		}
	}


	async function scan(emitter: Emitter<Status<any>>): Promise<ReadonlyArray<Attachment>> {
		if ( attachments === undefined ) {

			emitter.emit(Update.Scanning);

			// !!! remove stale documents
			// !!! create index

			return await listAttachments()
				.then(immutable)
				.then(attachments => {

					setAttachments(attachments);

					return attachments;

				});

		} else {

			return attachments;

		}
	}

	async function fetch(emitter: Emitter<Status<Document>>, attachment: Attachment): Promise<string> {

		emitter.emit(Update.Fetching);

		return await retrieveAttachment(attachment);
	}

	async function extract(emitter: Emitter<Status<Document>>) {

		emitter.emit(Update.Extracting);

		// !!! check if updated full text is available
		// !!! extract full text
		// !!! save full text and remove stale versions

		await delay(800);
	}

	async function xlate(emitter: Emitter<Status<Document>>, source: Document, target: Language): Promise<string> {

		emitter.emit(Update.Translating);

		// !!! check if updated translation is available
		// !!! translate from native language (which one?)
		// !!! save translation and remove stale versions

		return await translate({
			source,
			target
		});
	}

}

export function useArchive(): Archive {
	return useContext(Context);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
