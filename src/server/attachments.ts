import api, { route } from "@forge/api";
import { Request } from "@forge/resolver";

export async function listAttachments({ context }: Request) {

	const pageId=context.contentId;

	const response=await api.asApp().requestConfluence(route`/wiki/api/v2/pages/${pageId}/attachments`, {
		method: "GET"
	});

	if ( !response.ok ) {
		throw new Error(`Failed to fetch attachments: ${response.status} ${response.statusText}`);
	}

	const data=await response.json();

	return data.results; // Array of attachment objects

}


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