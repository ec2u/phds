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

export interface Attachment {
	readonly id: string;
	readonly status: string;
	readonly title: string;
	readonly createdAt: string; // ISO UTC timestamp (e.g. "2025-06-03T13:19:04.077Z")
	readonly pageId?: string;
	readonly blogPostId?: string;
	readonly customContentId?: string;
	readonly mediaType: string;
	readonly mediaTypeDescription: string;
	readonly comment: string;
	readonly fileId: string;
	readonly fileSize: number;
	readonly webuiLink: string;
	readonly downloadLink: string;
	readonly version: AttachmentVersion;
	readonly _links: AttachmentLinks;
}

export interface AttachmentVersion {
	readonly createdAt: string;
	readonly message: string;
	readonly number: number;
	readonly minorEdit: boolean;
	readonly authorId: string;
}

export interface AttachmentLinks {
	readonly webui: string;
	readonly download: string;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function compareAttachments(x: Attachment, y: Attachment) {
	return x.title.localeCompare(y.title);
}
