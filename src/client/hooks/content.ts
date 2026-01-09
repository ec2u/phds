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

import type { DocNode, LayoutSectionDefinition } from "@atlaskit/adf-schema";
import { ParagraphDefinition as Paragraph } from "@atlaskit/adf-schema/dist/types/schema/nodes/paragraph.js";
import { requestConfluence } from "@forge/bridge";
import { useProductContext } from "@forge/react";
import { useEffect, useState } from "react";
import { adf as toAdf, AdfBlock, markdown } from "../../shared/tools/text";

export function useContent(): [undefined | null | string, (value: string) => Promise<void>] {

	const [adf, setAdf] = useState<undefined | null | DocNode>();

	const context = useProductContext();
	const pageId = context?.extension?.content?.id;


	function parse(data: any): DocNode {
		return JSON.parse(data.body?.atlas_doc_format?.value || "{}");
	}


	useEffect(() => {

		if ( pageId ) {
			requestConfluence(`/wiki/api/v2/pages/${pageId}?body-format=atlas_doc_format`, {
				headers: { "Accept": "application/json" }
			})
				.then(response => response.json())
				.then(data => setAdf(parse(data)))
				.catch(() => setAdf(null));
		}

	}, [pageId]);

	const extracted = adf ? content(adf) : null;
	const text = adf === undefined ? undefined : extracted ? markdown(extracted) : null;

	return [text, async (text: string) => {

		if ( !pageId ) {
			throw new Error("page id not available");
		}

		if ( !adf ) {
			throw new Error("page content not available");
		}

		const updatedAdf = content(adf, toAdf(text).content);

		const version = await requestConfluence(`/wiki/api/v2/pages/${pageId}`).then(r => r.json());

		const response = await requestConfluence(`/wiki/api/v2/pages/${pageId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				id: pageId,
				status: "current",
				title: version.title,
				body: {
					representation: "atlas_doc_format",
					value: JSON.stringify(updatedAdf)
				},
				version: {
					number: version.version.number+1,
					message: "Updated via macro"
				}
			})
		});

		if ( !response.ok ) {
			throw new Error(`failed to update page: ${response.status}`);
		}

		setAdf(parse(await response.json()));

	}];
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function content(adf: DocNode): DocNode | null;
function content(adf: DocNode, content: DocNode["content"]): DocNode;
function content(adf: DocNode, content?: DocNode["content"]): DocNode | null {

	// find last meaningful element, ignoring trailing empty paragraphs

	function findLastElement(elements: AdfBlock[]): [number, AdfBlock | undefined] {

		for (let i = elements.length-1; i >= 0; i--) {

			const element = elements[i];

			if ( element.type !== "paragraph" || ((element as Paragraph).content ?? []).some(node =>
				node.type !== "text" || node.text.trim()
			) ) {
				return [i, element];
			}

		}

		return [-1, undefined];

	}


	const [lastIndex, lastElement] = findLastElement((adf.content ?? []) as AdfBlock[]);

	const found = lastElement && lastElement?.type === "layoutSection"
		&& (lastElement as LayoutSectionDefinition)?.content?.length === 2
		&& (lastElement as LayoutSectionDefinition)?.content[1]?.type === "layoutColumn";


	if ( content === undefined ) {

		// extract content from right column of last 2-column layout

		if ( found ) {

			const layout = lastElement as LayoutSectionDefinition;

			return {
				type: "doc",
				version: 1,
				content: layout.content![1].content || []
			};

		} else {
			return null;
		}

	} else if ( found ) {

		// update existing layout

		const layout = lastElement as LayoutSectionDefinition;

		const updatedLayoutSection = {
			...layout,
			content: [
				layout.content![0],
				{
					...layout.content![1],
					content: content
				}
			]
		};

		return {
			...adf,
			content: [
				...adf.content.slice(0, lastIndex),
				updatedLayoutSection as AdfBlock
			]
		};

	} else {

		// create new 2-column layout and append

		const newLayoutSection = {
			type: "layoutSection" as const,
			content: [
				{
					type: "layoutColumn" as const,
					attrs: { width: 50 },
					content: []
				},
				{
					type: "layoutColumn" as const,
					attrs: { width: 50 },
					content: content
				}
			]
		};

		return {
			...adf,
			content: [
				...(adf.content || []),
				newLayoutSection as AdfBlock
			]
		};
	}
}
