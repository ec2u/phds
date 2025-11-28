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

import type {DocNode} from "@atlaskit/adf-schema";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import {unified} from "unified";


export function markdown(docNode: DocNode): string {

    if (!docNode || !docNode.content) {
        return "";
    }

    return docNode.content.map(node => nodeToMarkdown(node)).join("\n\n");


    function nodeToMarkdown(node: any): string {
        switch (node.type) {

            case "paragraph":
                return node.content ? node.content.map((inline: any) => inlineToMarkdown(inline)).join("") : "";

            case "heading":
                const level = node.attrs?.level || 1;
                const headingText = node.content ?
                    node.content.map((inline: any) => inlineToMarkdown(inline)).join("") : "";
                return "#".repeat(level) + " " + headingText;

            case "bulletList":
                return node.content ? node.content.map((item: any) => "- " + nodeToMarkdown(item)).join("\n") : "";

            case "orderedList":
                return node.content ?
                    node.content.map((item: any, index: number) => `${index + 1}. ${nodeToMarkdown(item)}`).join("\n") : "";

            case "listItem":
                return node.content ? node.content.map((content: any) => nodeToMarkdown(content)).join("") : "";

            case "codeBlock":
                const language = node.attrs?.language || "";
                const code = node.content ? node.content.map((inline: any) => inlineToMarkdown(inline)).join("") : "";
                return `\`\`\`${language}\n${code}\n\`\`\``;

            case "blockquote":
                return node.content ? node.content.map((content: any) => "> " + nodeToMarkdown(content)).join("\n") : "";

            case "rule":
                return "---";

            default:
                return node.content ? node.content.map((content: any) => nodeToMarkdown(content)).join("") : "";

        }
    }

    function inlineToMarkdown(inline: any): string {

        if (inline.type === "text") {

            let text = inline.text || "";

            if (inline.marks) {
                inline.marks.forEach((mark: any) => {
                    switch (mark.type) {
                        case "strong":
                            text = `**${text}**`;
                            break;
                        case "em":
                            text = `*${text}*`;
                            break;
                        case "code":
                            text = `\`${text}\``;
                            break;
                        case "link":
                            text = `[${text}](${mark.attrs?.href || ""})`;
                            break;
                    }
                });
            }

            return text;
        }

        if (inline.type === "hardBreak") {
            return "\n";
        }

        return "";
    }

}

export function adf(markdown: string): DocNode {

    const processor = unified()
        .use(remarkParse)
        .use(remarkGfm);

    const tree = processor.parse(markdown);

    return {
        version: 1,
        type: "doc",
        content: tree.children.map(remarkNodeToAdf)
    };


    function remarkNodeToAdf(node: any): any {
        switch (node.type) {
            case "paragraph":
                return {
                    type: "paragraph",
                    content: node.children ? node.children.map((child: any) => remarkInlineToAdf(child)) : []
                };

            case "heading":
                return {
                    type: "heading",
                    attrs: {level: node.depth},
                    content: node.children ? node.children.map((child: any) => remarkInlineToAdf(child)) : []
                };

            case "list":
                return {
                    type: node.ordered ? "orderedList" : "bulletList",
                    content: node.children ? node.children.map((item: any) => ({
                        type: "listItem",
                        content: item.children ? item.children.map((child: any) => remarkNodeToAdf(child)) : []
                    })) : []
                };

            case "code":
                return {
                    type: "codeBlock",
                    attrs: {language: node.lang || ""},
                    content: [{type: "text", text: node.value || ""}]
                };

            case "blockquote":
                return {
                    type: "blockquote",
                    content: node.children ? node.children.map((child: any) => remarkNodeToAdf(child)) : []
                };

            case "thematicBreak":
                return {type: "rule"};

            default:
                return {
                    type: "paragraph",
                    content: [{type: "text", text: ""}]
                };
        }
    }

    function remarkInlineToAdf(node: any): any {
        switch (node.type) {
            case "text":
                return {type: "text", text: node.value};

            case "strong":
                return {
                    type: "text",
                    text: node.children ? node.children.map((child: any) => child.value || "").join("") : "",
                    marks: [{type: "strong"}]
                };

            case "emphasis":
                return {
                    type: "text",
                    text: node.children ? node.children.map((child: any) => child.value || "").join("") : "",
                    marks: [{type: "em"}]
                };

            case "inlineCode":
                return {
                    type: "text",
                    text: node.value,
                    marks: [{type: "code"}]
                };

            case "link":
                return {
                    type: "text",
                    text: node.children ? node.children.map((child: any) => child.value || "").join("") : "",
                    marks: [{type: "link", attrs: {href: node.url}}]
                };

            case "break":
                return {type: "hardBreak"};

            default:
                return {type: "text", text: node.value || ""};
        }
    }

}
