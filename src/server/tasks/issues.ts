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

import {kvs, WhereConditions} from "@forge/kvs";
import {File, Schema, Type} from "@google/genai";
import {isString} from "../../shared";
import {Issue, Reference} from "../../shared/issues";
import {defaultLanguage} from "../../shared/languages";
import {Activity, IssuesTask, Payload} from "../../shared/tasks";
import {markdown as adfToMarkdown} from "../../shared/tools/text";
import {setStatus} from "../async";
import {Attachment, fetchAttachment, listAttachments} from "../tools/attachments";
import {issueKey, issuesKey, keyPrefix, lock} from "../tools/cache";
import {process, upload} from "../tools/gemini";
import {retrievePrompt} from "../tools/langfuse";
import {markdown, pdf} from "../tools/mime";
import {fetchPage} from "../tools/pages";

const model = "gemini-2.5-pro";
const iterations = 5;

type Response = ReadonlyArray<{

    severity: string
    reason_title: string
    reason_analysis: string

    policy_clash_excerpt: string
    document_clash_excerpt: string

}>;

const ResponseSchema: Schema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            severity: {
                type: Type.STRING,
                description: "A severity assessment of the clash",
                enum: ["high", "medium", "low"]
            },
            reason_title: {
                type: Type.STRING,
                description: "A short title explaining why the sections are incompatible"
            },
            reason_analysis: {
                type: Type.STRING,
                description: "A more verbose description explaining why the sections are incompatible"
            },
            policy_clash_excerpt: {
                type: Type.STRING,
                description: "The full text of the excerpt of the policy that clashes with the document"
            },
            document_clash_excerpt: {
                type: Type.STRING,
                description: "The full text of the excerpt of the document that clashes with the policy"
            }
        },
        required: [
            "severity",
            "reason_title",
            "reason_analysis",
            "policy_clash_excerpt",
            "document_clash_excerpt"
        ]
    }
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export async function issues(job: string, page: string, {

    refresh = false

}: Payload<IssuesTask>): Promise<void> {

    await lock(job, issuesKey(page), async () => {

        // query for existing issues for this page

        await setStatus(job, Activity.Fetching);

        const results: Array<{ key: string; value: any }> = [];

        let cursor: string | undefined;

        do {

            const query = kvs.query()
                .where("key", WhereConditions.beginsWith(keyPrefix(issuesKey(page))))
                .limit(100);

            const batch = await (cursor ? query.cursor(cursor) : query).getMany();

            results.push(...batch.results);
            cursor = batch.nextCursor;

        } while (cursor);

        // normalize retrieved issues to ensure state defaults to "pending"

        const normalized = results.map(result => ({
            ...result,
            value: normalize(result.value as Issue)
        }));


        // if not refreshing, return cached values (even if empty)

        if (!refresh) {

            return await setStatus(job, normalized.map(result => result.value as Issue));

        }


        // fetch page content and convert to markdown

        const pageContent = await fetchPage(page);
        const agreement = adfToMarkdown(pageContent.content);

        if (agreement.trim() === "") {

            return await setStatus(job, []);

        }


        // analyse agreement text

        await setStatus(job, Activity.Analyzing);


        // retrieve prompts

        const detection = await retrievePrompt("INCONSISTENCY_DETECTION");
        const merging = await retrievePrompt("INCONSISTENCY_MERGING");


        // upload agreement text

        const agreementName = "agreement";
        const agreementFile = await upload({
            name: agreementName,
            mime: markdown,
            data: Buffer.from(agreement, "utf-8")
        });


        // upload policies

        const policies = await listAttachments(page, pdf);

        const policyFiles = await Promise.all(policies.map(async (attachment) => {

            // fetch the attachment content

            const content = await fetchAttachment(page, attachment.id);

            // upload to Gemini

            return await upload({
                name: attachment.title,
                mime: attachment.mediaType,
                data: content
            });

        }));


        // generate a report detailing all existing issues

        const history = report(normalized.map(result => result.value as Issue));


        // process agreement/policy pairs with multiple parallel analysis rounds

        const issues = await analyse();


        async function analyse(): Promise<Issue[]> {

            // for each agreement/policy pair


            // !!! disable iterations/merge: return directly detect() results

            const issues = await Promise.all(
                policyFiles.map(async (file, index) => {

                    // do multiple parallel rounds of detection for this policy

                    const detected = await Promise.all(
                        Array.from({length: iterations}, () => detect(file, policies[index]))
                    );

                    // merge all detected issues for this policy

                    return await merge(detected.flat(), policies[index]); // !!! disable

                    // !!! return detect(file, policies[index])

                })
            );

            // merge all issues

            return issues.flat();
        }

        async function detect(file: File, policy: Attachment): Promise<Issue[]> {

            const response = await process<Response>({
                model,
                prompt: detection,
                variables: {
                    document_name: agreementName,
                    policy_name: file.displayName!,
                    target_language: defaultLanguage
                },
                input: history,
                files: [file, agreementFile],
                schema: ResponseSchema
            });

            return response.map(entry => convert(entry, policy));
        }

        async function merge(issues: ReadonlyArray<Issue>, policy: Attachment): Promise<Issue[]> {

            const response = await process<Response>({
                model,
                prompt: merging,
                input: report(issues),
                schema: ResponseSchema
            });

            return response.map((entry) => convert(entry, policy));
        }


        function convert(entry: Response[number], policy: Attachment): Issue {
            return {

                id: crypto.randomUUID(),
                created: new Date().toISOString(),
                severity: entry.severity === "high" ? 3 : entry.severity === "medium" ? 2 : 1,
                state: "pending",

                title: entry.reason_title,
                description: [
                    entry.reason_analysis,
                    {
                        source: "",
                        title: "Agreement",
                        excerpt: entry.document_clash_excerpt,
                        offset: 0, // !!!
                        length: entry.document_clash_excerpt.length // !!!
                    } as Reference,
                    {
                        source: policy.id,
                        title: policy.title.replace(/\.\w+$/, ""), // remove filename extension
                        excerpt: entry.policy_clash_excerpt,
                        offset: 0, // !!!
                        length: entry.policy_clash_excerpt.length // !!!
                    } as Reference
                ]

            };
        }


        // cache results

        await setStatus(job, Activity.Caching);

        for (const issue of issues) {
            await kvs.set<Issue>(issueKey(page, issue.id), issue);
        }


        // return all issues (existing + new)

        await setStatus(job, [
            ...(normalized.map(result => result.value as Issue)),
            ...issues
        ]);

    });

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function normalize(issue: Issue): Issue {
    return {
        ...issue,
        state: issue.state || "pending"
    };
}

function report(issues: ReadonlyArray<Issue>): string {
    return issues

        .map(issue => [

            `Title: ${issue.title}`,
            `Severity: ${issue.severity === 3 ? "high" : issue.severity === 2 ? "medium" : "low"}`,

            ...(issue.description.map(item =>
                isString(item) ? `Analysis: ${item}`
                    : item.source ? `Agreement Excerpt: ${item.excerpt}`
                        : `Policy Excerpt: ${item.excerpt}`
            ))

        ].join("\n"))

        .join("\n\n");
}
