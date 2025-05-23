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

import Resolver from "@forge/resolver";

export const handler=new Resolver()

	.define("getText", (req) => {

		return "ciao!!!";

	})

	.getDefinitions();


//// Read Attachments /////////////////////////////////////////////////////////////////////////////////////////////////

// import { route } from '@forge/api';
//
// resolver.define('getAttachments', async ({ context }) => {
// 	const contentId = context.contentId;
//
// 	const response = await route.get(`/wiki/rest/api/content/${contentId}/child/attachment`);
// 	const data = await response.json();
//
// 	return data.results.map((attachment) => ({
// 		id: attachment.id,
// 		title: attachment.title,
// 		mediaType: attachment.metadata.mediaType,
// 		downloadLink: attachment._links.download,
// 	}));
// });


//// Add Attachments //////////////////////////////////////////////////////////////////////////////////////////////////

// import FormData from 'form-data';
//
// resolver.define('uploadAttachment', async ({ context, payload }) => {
// 	const contentId = context.contentId;
// 	const { fileName, fileContent, contentType } = payload;
//
// 	const form = new FormData();
// 	form.append('file', Buffer.from(fileContent, 'base64'), {
// 		filename: fileName,
// 		contentType,
// 	});
//
// 	const response = await route.fetch(`/wiki/rest/api/content/${contentId}/child/attachment`, {
// 		method: 'POST',
// 		headers: {
// 			'X-Atlassian-Token': 'no-check',
// 			...form.getHeaders(),
// 		},
// 		body: form,
// 	});
//
// 	return await response.json();
//
// });