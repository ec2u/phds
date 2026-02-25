/*
 * Copyright © 2025-2026 EC2U Alliance
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

/**
 * Agreement content extraction from Confluence page body.
 *
 * Extracts markdown content from the right column of the last two-column layout section of a Confluence page,
 * returning it as a {@link Document} with an empty {@link Source}.
 *
 * @module
 */

import type { DocNode, LayoutSectionDefinition, ParagraphDefinition } from "@atlaskit/adf-schema";
import type { Document } from "../../shared/items/documents";
import { type AdfBlock, adf as toAdf, markdown } from "../../shared/tools/text";
import { fetchPage, storePage } from "./pages";


/**
 * Extracts agreement content from a Confluence page.
 *
 * Fetches the page ADF, locates the right column of the last two-column layout section, converts its content to
 * markdown, and returns it as a {@link Document} with an empty {@link Source}.
 *
 * @param page The Confluence page identifier
 *
 * @returns The agreement document, or `null` if no two-column layout is found
 *
 * @throws {Error} If the page cannot be fetched
 */
export async function fetchAgreement(page: string): Promise<null | Document> {

	const { title, content: adf } = await fetchPage(page);

	const extracted = extractContent(adf);

	return extracted == null ? null : {
		original: true,
		language: "",
		source: "",
		created: new Date().toISOString(),
		title,
		content: markdown(extracted)
	};

}

/**
 * Updates the agreement content on a Confluence page.
 *
 * Fetches the current page ADF, replaces the right column of the last two-column layout section with the new markdown
 * content converted to ADF, and writes the updated document back to Confluence.
 *
 * @param page The Confluence page identifier
 * @param text The new agreement content in markdown
 *
 * @returns The updated agreement document
 *
 * @throws {Error} If the page cannot be fetched or updated, or if no layout section is found
 */
export async function storeAgreement(page: string, text: string): Promise<Document> {

	const { content: adf } = await fetchPage(page);

	const updatedAdf = replaceContent(adf, toAdf(text).content);

	const { title, content: resultAdf } = await storePage(page, updatedAdf);

	const extracted = extractContent(resultAdf as DocNode);

	return {
		original: true,
		language: "",
		source: "",
		created: new Date().toISOString(),
		title,
		content: extracted ? markdown(extracted) : text
	};

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Extracts content from the right column of the last two-column layout section.
 *
 * Searches backwards through the document's top-level elements, skipping trailing empty paragraphs, and returns the
 * content of the right column if the last meaningful element is a two-column layout section.
 *
 * @param adf The ADF document
 *
 * @returns The extracted content document, or `null` if no layout section is found
 */
function extractContent(adf: DocNode): DocNode | null {

	const elements = (adf.content ?? []) as AdfBlock[];

	const [, lastElement] = findLastElement(elements);

	if ( !lastElement || lastElement.type !== "layoutSection" ) {
		return null;
	}

	const layout = lastElement as LayoutSectionDefinition;

	if ( layout.content?.length !== 2 || layout.content[1]?.type !== "layoutColumn" ) {
		return null;
	}

	return {
		type: "doc",
		version: 1,
		content: layout.content[1].content || []
	};

}

/**
 * Replaces content in the right column of the last two-column layout section, or creates one.
 *
 * @param adf The ADF document
 * @param content The new content blocks to insert
 *
 * @returns The updated ADF document
 */
function replaceContent(adf: DocNode, content: DocNode["content"]): DocNode {

	const elements = (adf.content ?? []) as AdfBlock[];

	const [lastIndex, lastElement] = findLastElement(elements);

	const found = lastElement && lastElement.type === "layoutSection"
		&& (lastElement as LayoutSectionDefinition).content?.length === 2
		&& (lastElement as LayoutSectionDefinition).content[1]?.type === "layoutColumn";

	if ( found ) {

		// update existing layout

		const layout = lastElement as LayoutSectionDefinition;

		const updatedLayoutSection = {
			...layout,
			content: [
				layout.content![0],
				{
					...layout.content![1],
					content
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
					content
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

/**
 * Finds the last meaningful top-level element, skipping trailing empty paragraphs.
 *
 * @param elements The top-level ADF elements
 *
 * @returns A tuple of `[index, element]`, or `[-1, undefined]` if all elements are empty paragraphs
 */
function findLastElement(elements: AdfBlock[]): [number, AdfBlock | undefined] {

	for ( let i = elements.length - 1; i >= 0; i-- ) {

		const element = elements[i];

		if ( element.type !== "paragraph"
			|| ((element as ParagraphDefinition).content ?? []).some(node =>
				node.type !== "text" || node.text.trim()
			)
		) {
			return [i, element];
		}

	}

	return [-1, undefined];

}
