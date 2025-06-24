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

import { DocNode } from "@atlaskit/adf-schema";
import { useProductContext } from "@forge/react";
import { createContext, createElement, ReactNode, useContext, useEffect, useState } from "react";
import { asTrace, immutable, Observer } from "../../shared";
import { Catalog, Document, Source } from "../../shared/documents";
import { defaultLanguage, Language } from "../../shared/languages";
import { Activity } from "../../shared/tasks";
import { listAttachments } from "../ports/_attachments";
import { markdown } from "../tools/text";


export interface _archives {

	list(observer: Observer<Catalog>): void;

	lookup(observer: Observer<Document>, source: Source, language: Language): void;

}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const Context=createContext<_archives>(immutable({

	list(): void {
		throw new Error("outside <ToolArchive/> context");
	},

	lookup(): void {
		throw new Error("outside <ToolArchive/> context");
	},

}));


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function useArchives(): _archives {
	return useContext(Context);
}

export function ToolArchive({

	children

}: {

	children: ReactNode

}) {

	const context=useProductContext();

	console.log("!!! %o", context);

	const [catalog, setCatalog]=useState<Catalog>();
	const [documents, setDocuments]=useState<ReadonlyArray<Document>>();


	useEffect(() => {

		const body: DocNode=context?.extension?.macro?.body;

		if ( body ) {
			setDocuments([{

				original: true,
				language: defaultLanguage, // !!!
				source: "",

				title: "", // !!!
				content: markdown(body)

			}]);
		}

	}, [context]);


	return createElement(Context.Provider, {

		value: immutable({

			list(observer: Observer<Catalog>): void {
				try { list(observer); } catch ( error ) { observer(asTrace(error)); }
			},

			lookup(observer: Observer<Document>, source: Source, language: Language): void {
				try { lookup(observer, source, language); } catch ( error ) { observer(asTrace(error)); }
			},

		}),

		children

	});


	async function list(observer: Observer<Catalog>) {
		if ( catalog === undefined ) {

			observer(Activity.Scanning);

			// !!! remove stale documents
			// !!! create index
			// !!! upload missing documents

			return await listAttachments()
				.then(attachments => {

					// !!! build index
					// !!! remove stale documents
					// !!! create and upload missing documents

					return attachments
						.filter(attachmment => attachmment.title.endsWith(".pdf"))
						.reduce((catalog, attachment) => {


							return { ...catalog, [attachment.id]: attachment.title.replace(/\.pdf$/, "") };

						}, {});

				})
				.then(immutable)
				.then(catalog => {

					setCatalog(catalog);
					observer(catalog);

				});

		} else {

			observer(catalog);

		}
	}

	async function lookup(observer: Observer<Document>, source: Source, language: Language) {
		observer(documents?.[0] ? documents[0] : Activity.Waiting); // !!!
	}

}
