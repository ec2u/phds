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


import { asTrace, Trace } from "../../shared";
import { Document } from "../../shared/documents";
import { createAsyncEmitter } from "../../shared/emitters";
import { Language } from "../../shared/languages";

export type Status=Update | Document | Trace;


export const enum Update {
	Initializing,
	Scanning,
	Fetching,
	Extracting,
	Translating
}


export function lookup(id: string, locale: Language, consumer: (content: Status) => void) {

	async function consume(consumer: (update: Status) => void) {
		for await (const update of emitter) {consumer(update);}
	}

	const emitter=createAsyncEmitter<Status>();

	consume(consumer); // for await must run inside an async function

	process(id, locale, emitter);

	return () => emitter.close();
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function process(id: string, language: Language, emitter: ReturnType<typeof createAsyncEmitter<Status>>) {
	try {

		emitter.emit(Update.Scanning);
		await delay(500);

		emitter.emit(Update.Fetching);
		await delay(500);

		emitter.emit(Update.Extracting);
		await delay(800);

		emitter.emit(Update.Translating);
		await delay(700);

		const document={ id, language, content: "" };
		emitter.emit(document);

	} catch ( error ) {

		emitter.emit(asTrace(error));

	} finally {

		emitter.close();

	}
}

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
