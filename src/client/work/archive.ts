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


import { createAsyncEmitter } from "../../shared/emitters";
import { Language } from "../../shared/languages";

export type Update=
	| { type: "progress"; stage: string; message?: string }
	| { type: "result"; data: any }
	| { type: "error"; error: Error }
	| { type: "done" };


export function lookup(id: string, locale: Language, consumer: (update: Update) => void) {

	async function consume(consumer: (update: Update) => void) {
		for await (const update of emitter) {consumer(update);}
	}

	const emitter=createAsyncEmitter<Update>();

	consume(consumer); // for await must run inside an async function

	process(id, locale, emitter);

	return () => emitter.close();
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function process(id: string, locale: Language, emitter: ReturnType<typeof createAsyncEmitter<Update>>) {
	try {

		emitter.emit({ type: "progress", stage: "retrieval", message: "Fetching document" });
		await delay(500);

		emitter.emit({ type: "progress", stage: "extraction", message: "Extracting text" });
		await delay(800);

		emitter.emit({ type: "progress", stage: "translation", message: "Translating content" });
		await delay(700);

		emitter.emit({ type: "progress", stage: "analysis", message: "Analyzing content" });
		await delay(600);

		emitter.emit({ type: "result", data: { summary: "Sample analysis result" } });
		emitter.emit({ type: "done" });

	} catch ( err ) {

		emitter.emit({ type: "error", error: err instanceof Error ? err : new Error(String(err)) });

	} finally {

		emitter.close();

	}
}

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
