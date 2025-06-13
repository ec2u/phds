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

	lookup(id: string, locale: Language): Promise<string> {
		throw new Error("undefined archive");
	}

}));


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export type Status=Update | Document | Trace;

export const enum Update {
	Initializing,
	Scanning,
	Fetching,
	Extracting,
	Translating
}

export interface Archive {

	lookup(id: string, locale: Language, consumer: (content: Status) => void): void;

}


export function ToolArchive({

	children

}: {

	children: ReactNode

}) {

	const context=useProductContext(); // !!! read macro body as a virtual attachment

	const [attachments, setAttachments]=useState<Attachment[]>();


	return createElement(Context.Provider, {

		value: immutable({

			lookup(id: string, locale: Language, consumer: (content: Status) => void) {
				lookup(id, locale, createAsyncEmitter(consumer));
			}

		}),

		children

	});


	async function lookup(id: string, locale: Language, emitter: Emitter<Update | Document | Trace>) {
		try {

			if ( attachments === undefined ) {

				emitter.emit(Update.Scanning);

				await listAttachments().then(setAttachments);

			}

			emitter.emit(Update.Fetching);
			await delay(500);

			emitter.emit(Update.Extracting);
			await delay(800);

			emitter.emit(Update.Translating);
			await delay(700);

			const document={ id, language: locale, content: "" };

			emitter.emit(document);

		} catch ( error ) {

			emitter.emit(asTrace(error));

		} finally {

			emitter.close();

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
