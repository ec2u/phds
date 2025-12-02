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

import type {
	BlockQuoteDefinition,
	BodiedExtensionDefinition,
	BulletListDefinition,
	CodeBlockDefinition,
	CodeDefinition,
	DecisionListDefinition,
	DocNode,
	EmDefinition,
	ExpandDefinition,
	HeadingDefinition,
	Inline,
	InlineExtensionDefinition,
	LayoutColumnDefinition,
	LayoutSectionDefinition,
	LinkDefinition,
	ListItemDefinition,
	OrderedListDefinition,
	PanelDefinition,
	ParagraphDefinition,
	StrikeDefinition,
	StrongDefinition,
	TableDefinition,
	TaskListDefinition,
	UnderlineDefinition
} from "@atlaskit/adf-schema";
import type { Nodes as MdastNode, Root as MdastRoot } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { Root } from "remark-parse/lib";
import { unified } from "unified";


export type AdfBlock =
	| DocNode["content"][number];

export type AdfMark =
	| LinkDefinition
	| StrongDefinition
	| EmDefinition
	| CodeDefinition
	| StrikeDefinition
	| UnderlineDefinition;


/**
 * Extracts a specific variant from a discriminated union by type discriminator.
 *
 * @typeParam K - The specific type discriminator value to extract
 * @typeParam T - The discriminated union type with a `type` property
 */
type Variant<T extends { type: string }, K extends T["type"] = T["type"]> = Extract<T, {

	type: K

}>;

/**
 * Maps each type discriminator to either a handler function receiving the narrowed variant or a constant string.
 *
 * @typeParam T - The discriminated union type with a `type` property
 */
type Handlers<T extends { type: string }> = {

	[K in T["type"]]: Handler<Variant<T, K>>

};

/**
 * Handler map with partial coverage and a default case for unhandled types.
 *
 * @typeParam T - The discriminated union type with a `type` property
 */
type Fallback<T extends { type: string }> = Partial<Handlers<T>> & {

	default: Handler<T>

};

/**
 * Handler that can be either a constant string or a function transforming a node to string.
 *
 * @typeParam T - The node type
 */
type Handler<T extends { type: string }> =
	| string
	| ((node: T) => string);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function markdown(doc: DocNode): string {

	return doc.content
		.map(node => blockToMarkdown(node))
		.join("\n\n");


	function blockToMarkdown(node: AdfBlock): string {
		return nodeToMarkdown(node, {

			heading: headingToMarkdown,
			paragraph: paragraphToMarkdown,

			bulletList: bulletListToMarkdown,
			orderedList: orderedListToMarkdown,
			taskList: taskListToMarkdown,
			decisionList: decisionListToMarkdown,

			blockquote: blockquoteToMarkdown,
			codeBlock: codeBlockToMarkdown,

			layoutSection: layoutSectionToMarkdown,
			panel: panelToMarkdown,
			expand: expandToMarkdown,
			table: tableToMarkdown,
			rule: ruleToMarkdown,

			extension: "", // no extractable text content
			bodiedExtension: bodiedExtensionToMarkdown, // rich text content to be recursively processed

			default: (node: AdfBlock) => {

				console.warn(`unknown ADF block type <${node.type}>`);

				return `[${node.type}]`;
			}

		});
	}

	function headingToMarkdown(node: HeadingDefinition): string {
		return `${"#".repeat(node.attrs.level)} ${node.content
			?.map(inline => inlineToMarkdown(inline))
			.join("") ?? ""
		}`;
	}

	function paragraphToMarkdown(node: ParagraphDefinition): string {
		return node.content
			?.map(inline => inlineToMarkdown(inline))
			.join("") ?? "";
	}

	function bulletListToMarkdown(node: BulletListDefinition): string {
		return node.content
			.map(item => `- ${listItemToMarkdown(item)}`)
			.join("\n");
	}

	function orderedListToMarkdown(node: OrderedListDefinition): string {
		return node.content
			.map((item, index) => `${index+1}. ${listItemToMarkdown(item)}`)
			.join("\n");
	}

	function listItemToMarkdown(node: ListItemDefinition): string {
		return node.content
			.map(item => nodeToMarkdown(item, {
				paragraph: paragraphToMarkdown,
				bulletList: bulletListToMarkdown,
				orderedList: orderedListToMarkdown,
				codeBlock: codeBlockToMarkdown,
				default: ""
			}))
			.join("");
	}

	function taskListToMarkdown(node: TaskListDefinition): string {
		return node.content
			.map(item => {
				if ( item.type === "taskItem" ) {
					const checkbox = item.attrs.state === "DONE" ? "[x]" : "[ ]";
					const text = item.content
						?.map(inline => inlineToMarkdown(inline))
						.join("") ?? "";
					return `- ${checkbox} ${text}`;
				} else {
					// nested taskList
					return taskListToMarkdown(item as TaskListDefinition);
				}
			})
			.join("\n");
	}

	function decisionListToMarkdown(node: DecisionListDefinition): string {
		return node.content
			.map(item => {
				if ( item.type === "decisionItem" ) {
					const text = item.content
						?.map(inline => inlineToMarkdown(inline))
						.join("") ?? "";
					return `- ${text}`;
				}
				return "";
			})
			.join("\n");
	}

	function blockquoteToMarkdown(node: BlockQuoteDefinition): string {
		return node.content
			.map(item => nodeToMarkdown(item, {
					paragraph: paragraphToMarkdown,
					bulletList: bulletListToMarkdown,
					orderedList: orderedListToMarkdown,
					codeBlock: codeBlockToMarkdown,
					default: ""
				})
					.split("\n")
					.map(line => `> ${line}`)
					.join("\n")
			)
			.join("\n");
	}

	function codeBlockToMarkdown(node: CodeBlockDefinition): string {
		return `\`\`\`${node.attrs?.language || ""}\n${node.content
			?.map(textNode => textNode.text)
			.join("") ?? ""
		}\n\`\`\``;
	}

	function layoutSectionToMarkdown(node: LayoutSectionDefinition): string {
		return node.content
			.map(column => layoutColumnToMarkdown(column))
			.join("\n\n---\n\n");
	}

	function layoutColumnToMarkdown(node: LayoutColumnDefinition): string {
		return node.content
			.map(item => blockToMarkdown(item))
			.join("\n\n");
	}

	function panelToMarkdown(node: PanelDefinition): string {
		const content = node.content
			.map(item => blockToMarkdown(item))
			.join("\n\n");
		return `> **Panel**\n> \n${content.split("\n").map(line => `> ${line}`).join("\n")}`;
	}

	function expandToMarkdown(node: ExpandDefinition): string {
		const title = node.attrs.title || "Details";
		const content = node.content
			.map(item => "type" in item ? blockToMarkdown(item as AdfBlock) : "")
			.join("\n\n");
		return `**${title}**\n\n${content}`;
	}

	function bodiedExtensionToMarkdown(node: BodiedExtensionDefinition): string {
		return node.content
			?.map(item => blockToMarkdown(item))
			.join("\n\n") ?? "";
	}

	function ruleToMarkdown(): string {
		return "---";
	}

	function tableToMarkdown(node: TableDefinition): string {

		console.warn("table structure not preserved - extracting text content only");

		return node.content
			.map(row => "content" in row ? row.content.map(cell =>
				"content" in cell ? cell.content.map(p =>
					"content" in p && p.content ? p.content.map(inline =>
						inline && "text" in inline ? inline.text : ""
					).join("") : ""
				).join(" ") : ""
			).join(" | ") : "")
			.join("\n");
	}


	function inlineToMarkdown(inline: Inline): string {
		return inline.type === "inlineExtension" ? inlineExtensionToMarkdown(inline)
			: inline.type === "hardBreak" ? "\n"
				: inline.type === "text" ? textToMarkdown(inline)
					: ""; // other inline types (emoji, mention, status) return empty
	}

	function inlineExtensionToMarkdown(node: InlineExtensionDefinition): string {

		// inline macros have no extractable text content

		return "";
	}

	function textToMarkdown(inline: { text: string, marks?: Array<AdfMark> }): string {
		return (inline.marks ?? []).reduce((text, mark) => nodeToMarkdown(mark, {

			link: (node: LinkDefinition) => `[${text}](${node.attrs.href})`,
			strong: `**${text}**`,
			em: `*${text}*`,
			code: `\`${text}\``,
			strike: `~~${text}~~`,
			underline: text,
			default: text

		}), inline.text);
	}

	function nodeToMarkdown<T extends { type: string }>(node: T, handlers: Handlers<T> | Fallback<T>): string {

		const handler: Handler<Variant<T>> = handlers[node.type as T["type"]]
			?? ("default" in handlers ? handlers.default : () => ""); // unexpected

		return typeof handler === "string" ? handler : handler(node as Variant<T>);
	}

}

export function adf(markdown: string, as: "text" | "toc" = "text"): DocNode {

	const processor = unified()
		.use(remarkParse)
		.use(remarkGfm);

	const root = processor.parse(markdown);

	const content = as === "text" ? rootToText(root)
		: as === "toc" ? rootToTOC(root)
			: [];

	return {
		version: 1,
		type: "doc",
		content
	};


	function rootToText(tree: Root) {
		return tree.children.map(nodeToAdf) as DocNode["content"];
	}

	function rootToTOC(tree: MdastRoot): DocNode["content"] {

		type TocItem = { text: string, id: string, level: number };

		const headings: TocItem[] = tree.children
			.filter(node => node.type === "heading")
			.map(node => {
				const text = "children" in node && node.children ?
					node.children.map((child: MdastNode) => "value" in child ? child.value : "").join("") : "";
				const level = "depth" in node ? node.depth : 1;
				const id = text.replace(/\s+/g, "-");
				return { text, id, level };
			});

		if ( headings.length === 0 ) {
			return [];
		}

		const minLevel = Math.min(...headings.map(h => h.level));

		function buildList(items: TocItem[], currentLevel: number): unknown {

			const result: unknown[] = [];
			let i = 0;

			while ( i < items.length ) {

				const item = items[i];

				if ( item.level < currentLevel ) {
					break;
				}

				if ( item.level === currentLevel ) {

					const listItemContent: unknown[] = [{
						type: "paragraph",
						content: [{
							type: "text",
							text: item.text,
							marks: [{
								type: "link",
								attrs: { href: `#${item.id}` }
							}]
						}]
					}];

					i++;

					const nestedItems: TocItem[] = [];
					while ( i < items.length && items[i].level > currentLevel ) {
						nestedItems.push(items[i]);
						i++;
					}

					if ( nestedItems.length > 0 ) {
						listItemContent.push(buildList(nestedItems, currentLevel+1));
					}

					result.push({
						type: "listItem",
						content: listItemContent
					});

				} else {

					i++;

				}
			}

			return {
				type: "bulletList",
				content: result
			};
		}

		return [buildList(headings, minLevel)] as DocNode["content"];
	}


	function nodeToAdf(node: MdastNode): unknown {

		switch ( node.type ) {
			case "heading":
				return {
					type: "heading",
					attrs: { level: "depth" in node ? node.depth : 1 },
					content: "children" in node && node.children ?
						node.children.map((child: MdastNode) => inlineToAdf(child)) : []
				};

			case "paragraph":
				return {
					type: "paragraph",
					content: "children" in node && node.children ?
						node.children.map((child: MdastNode) => inlineToAdf(child)) : []
				};

			case "list":

				// detect task list (GFM extension)

				const hasCheckedProperty = "children" in node && node.children
					&& node.children.length > 0
					&& "checked" in node.children[0]
					&& node.children[0].checked !== null
					&& node.children[0].checked !== undefined;

				if ( hasCheckedProperty ) {
					return {
						type: "taskList",
						attrs: { localId: localId() },
						content: "children" in node && node.children ?
							node.children.map((item: MdastNode) => ({
								type: "taskItem",
								attrs: {
									localId: localId(),
									state: "checked" in item && item.checked ? "DONE" : "TODO"
								},
								content: "children" in item && item.children ?
									item.children.flatMap((child: MdastNode) =>
										child.type === "paragraph" && "children" in child && child.children ?
											child.children.map((inline: MdastNode) => inlineToAdf(inline))
											: [inlineToAdf(child)]
									) : []
							})) : []
					};
				}

				return {
					type: "ordered" in node && node.ordered ? "orderedList" : "bulletList",
					content: "children" in node && node.children ?
						node.children.map((item: MdastNode) => ({
							type: "listItem",
							content: "children" in item && item.children ?
								item.children.map((child: MdastNode) => nodeToAdf(child)) : []
						})) : []
				};

			case "code":

				return {
					type: "codeBlock",
					attrs: { language: ("lang" in node ? node.lang : null) || "" },
					content: [{ type: "text", text: ("value" in node ? node.value : null) || "" }]
				};

			case "blockquote":

				return {
					type: "blockquote",
					content: "children" in node && node.children ?
						node.children.map((child: MdastNode) => nodeToAdf(child)) : []
				};

			case "image":

				return {
					type: "mediaSingle",
					attrs: { layout: "center" },
					content: [{
						type: "media",
						attrs: {
							type: "external",
							url: "url" in node ? node.url : "",
							alt: "alt" in node ? node.alt : ""
						}
					}]
				};

			case "table":

				return {
					type: "table",
					content: "children" in node && node.children ?
						node.children.map((row: MdastNode, rowIndex: number) => ({
							type: "tableRow",
							content: "children" in row && row.children ?
								row.children.map((cell: MdastNode) => ({
									type: rowIndex === 0 ? "tableHeader" : "tableCell",
									content: [{
										type: "paragraph",
										content: "children" in cell && cell.children ?
											cell.children.map((child: MdastNode) => inlineToAdf(child)) : []
									}]
								})) : []
						})) : []
				};

			case "thematicBreak":

				return {
					type: "rule"
				};

			default:

				return {
					type: "paragraph",
					content: [{ type: "text", text: "" }]
				};

		}
	}

	function inlineToAdf(node: MdastNode): unknown {

		switch ( node.type ) {

			case "text":

				return { type: "text", text: "value" in node ? node.value : "" };

			case "strong":

				return {
					type: "text",
					text: "children" in node && node.children ?
						node.children.map((child: MdastNode) => "value" in child ? child.value : "").join("") : "",
					marks: [{ type: "strong" }]
				};

			case "emphasis":

				return {
					type: "text",
					text: "children" in node && node.children ?
						node.children.map((child: MdastNode) => "value" in child ? child.value : "").join("") : "",
					marks: [{ type: "em" }]
				};

			case "delete":

				return {
					type: "text",
					text: "children" in node && node.children ?
						node.children.map((child: MdastNode) => "value" in child ? child.value : "").join("") : "",
					marks: [{ type: "strike" }]
				};

			case "inlineCode":

				return {
					type: "text",
					text: "value" in node ? node.value : "",
					marks: [{ type: "code" }]
				};

			case "link":

				return {
					type: "text",
					text: "children" in node && node.children ?
						node.children.map((child: MdastNode) => "value" in child ? child.value : "").join("") : "",
					marks: [{ type: "link", attrs: { href: "url" in node ? node.url : "" } }]
				};

			case "break":

				return {
					type: "hardBreak"
				};

			default:

				return {
					type: "text",
					text: "value" in node ? node.value : ""
				};

		}
	}


	function localId(): string {
		return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
	}

}
