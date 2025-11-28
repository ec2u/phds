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
	DocNode,
	EmDefinition,
	ExtensionDefinition,
	HeadingDefinition,
	Inline,
	LinkDefinition,
	ListItemDefinition,
	OrderedListDefinition,
	ParagraphDefinition,
	StrikeDefinition,
	StrongDefinition,
	UnderlineDefinition
} from "@atlaskit/adf-schema";
import type { Nodes as MdastNode, Root as MdastRoot } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";


type AdfBlock =
    | DocNode["content"][number];

type AdfMark =
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
        .filter(node => !isExtension(node))
        .map(node => blockToMarkdown(node))
        .join("\n\n");


    function isExtension(node: AdfBlock): node is ExtensionDefinition | BodiedExtensionDefinition {
        return node.type === "extension" || node.type === "bodiedExtension";
    }


    function blockToMarkdown(node: AdfBlock): string {
        return nodeToMarkdown(node, {
            paragraph: paragraphToMarkdown,
            heading: headingToMarkdown,
            bulletList: bulletListToMarkdown,
            orderedList: orderedListToMarkdown,
            codeBlock: codeBlockToMarkdown,
            blockquote: blockquoteToMarkdown,
            rule: "---",
            default: ""
        });
    }


    function paragraphToMarkdown(node: ParagraphDefinition): string {
        return node.content
            ?.map(inline => inlineToMarkdown(inline))
            .join("") ?? "";
    }


    function headingToMarkdown(node: HeadingDefinition): string {
        return `${"#".repeat(node.attrs.level)} ${node.content
            ?.map(inline => inlineToMarkdown(inline))
            .join("") ?? ""
        }`;
    }


    function bulletListToMarkdown(node: BulletListDefinition): string {
        return node.content
            .map(item => `- ${listItemToMarkdown(item)}`)
            .join("\n");
    }


    function orderedListToMarkdown(node: OrderedListDefinition): string {
        return node.content
            .map((item, index) => `${index + 1}. ${listItemToMarkdown(item)}`)
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


    function codeBlockToMarkdown(node: CodeBlockDefinition): string {
        return `\`\`\`${node.attrs?.language || ""}\n${node.content
            ?.map(textNode => textNode.text)
            .join("") ?? ""
        }\n\`\`\``;
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


    function inlineToMarkdown(inline: Inline): string {
        return inline.type === "inlineExtension" ? ""
            : inline.type === "hardBreak" ? "\n"
                : inline.type === "text" ? textToMarkdown(inline)
                    : ""; // other inline types (emoji, mention, status) return empty
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

export function adf(markdown: string): DocNode {

    const processor = unified()
        .use(remarkParse)
        .use(remarkGfm);

    const tree = processor.parse(markdown) as MdastRoot;

    return {
        version: 1,
        type: "doc",
        content: tree.children.map(remarkNodeToAdf) as DocNode["content"]
    };


    function remarkNodeToAdf(node: MdastNode): unknown {

        switch (node.type) {
            case "paragraph":

                return {
                    type: "paragraph",
                    content: "children" in node && node.children ?
                        node.children.map((child: MdastNode) => remarkInlineToAdf(child)) : []
                };


            case "heading":
                return {
                    type: "heading",
                    attrs: {level: "depth" in node ? node.depth : 1},
                    content: "children" in node && node.children ?
                        node.children.map((child: MdastNode) => remarkInlineToAdf(child)) : []
                };

            case "list":

                return {
                    type: "ordered" in node && node.ordered ? "orderedList" : "bulletList",
                    content: "children" in node && node.children ?
                        node.children.map((item: MdastNode) => ({
                            type: "listItem",
                            content: "children" in item && item.children ?
                                item.children.map((child: MdastNode) => remarkNodeToAdf(child)) : []
                        })) : []
                };

            case "code":

                return {
                    type: "codeBlock",
                    attrs: {language: ("lang" in node ? node.lang : null) || ""},
                    content: [{type: "text", text: ("value" in node ? node.value : null) || ""}]
                };

            case "blockquote":

                return {
                    type: "blockquote",
                    content: "children" in node && node.children ?
                        node.children.map((child: MdastNode) => remarkNodeToAdf(child)) : []
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
											cell.children.map((child: MdastNode) => remarkInlineToAdf(child)) : []
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
                    content: [{type: "text", text: ""}]
                };

        }
    }

    function remarkInlineToAdf(node: MdastNode): unknown {

        switch (node.type) {

            case "text":

                return {type: "text", text: "value" in node ? node.value : ""};

            case "strong":

                return {
                    type: "text",
                    text: "children" in node && node.children ?
                        node.children.map((child: MdastNode) => "value" in child ? child.value : "").join("") : "",
                    marks: [{type: "strong"}]
                };

            case "emphasis":

                return {
                    type: "text",
                    text: "children" in node && node.children ?
                        node.children.map((child: MdastNode) => "value" in child ? child.value : "").join("") : "",
                    marks: [{type: "em"}]
                };

            case "inlineCode":

                return {
                    type: "text",
                    text: "value" in node ? node.value : "",
                    marks: [{type: "code"}]
                };

            case "link":

                return {
                    type: "text",
                    text: "children" in node && node.children ?
                        node.children.map((child: MdastNode) => "value" in child ? child.value : "").join("") : "",
                    marks: [{type: "link", attrs: {href: "url" in node ? node.url : ""}}]
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

}
