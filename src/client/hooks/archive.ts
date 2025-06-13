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
import { asTrace, immutable, Trace } from "../../shared";
import { Attachment } from "../../shared/attachments";
import { Document } from "../../shared/documents";
import { Language } from "../../shared/languages";
import { listAttachments } from "../ports/attachments";
import { createAsyncEmitter, Emitter } from "../shims/emitters";


const Context=createContext<Archive>(immutable({

	list(monitor: (content: Status<ReadonlyArray<Attachment>>) => void): void {
		throw new Error("undefined archive");
	},

	lookup(monitor: (content: Status<Document>) => void, id: string, locale: Language): void {
		throw new Error("undefined archive");
	}

}));


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export type Status<T>=Update | T | Trace;

export const enum Update {
	Initializing,
	Scanning,
	Fetching,
	Extracting,
	Translating
}

export interface Archive {

	list(monitor: (content: Status<ReadonlyArray<Attachment>>) => void): void;

	lookup(monitor: (content: Status<Document>) => void, id: string, locale: Language): void;

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

			list(monitor: (content: Status<ReadonlyArray<Attachment>>) => void) {
				list(createAsyncEmitter(monitor));
			},

			lookup(monitor: (content: Status<Document>) => void, id: string, locale: Language) {
				lookup(createAsyncEmitter(monitor), id, locale);
			}

		}),

		children

	});

	async function list(emitter: Emitter<Status<ReadonlyArray<Attachment>>>) {
		try {

			await scan(emitter);

			if ( attachments ) { emitter.emit(attachments);}

		} catch ( error ) {

			emitter.emit(asTrace(error));

		} finally {

			emitter.close();

		}
	}

	async function lookup(emitter: Emitter<Status<Document>>, id: string, locale: Language) {
		try {

			await scan(emitter);

			emitter.emit(Update.Fetching);
			await delay(500);

			emitter.emit(Update.Extracting);
			await delay(800);

			emitter.emit(Update.Translating);
			await delay(700);

			emitter.emit({ id, language: locale, content: "" });

		} catch ( error ) {

			emitter.emit(asTrace(error));

		} finally {

			emitter.close();

		}
	}


	async function scan(emitter: Emitter<Status<any>>): Promise<ReadonlyArray<Attachment>> {
		if ( attachments === undefined ) {

			emitter.emit(Update.Scanning);

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


}

export function useArchive(): Archive {
	return useContext(Context);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
