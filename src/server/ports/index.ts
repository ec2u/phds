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

import Resolver, { ResolverFunction } from "@forge/resolver";
import { extract, translate } from "../work/gemini";
import { retrievePrompt } from "../work/langfuse";
import { listAttachments, retrieveAttachment, uploadAttachment } from "./_attachments";
import { monitorTask, submitTask } from "./tasks";

export const handler=new Resolver()

	.define(submitTask.name, submitTask as any)
	.define(monitorTask.name, monitorTask as any)

	// !!! remove

	.define(listAttachments.name, listAttachments as any)
	.define(retrieveAttachment.name, retrieveAttachment as any)
	.define(uploadAttachment.name, uploadAttachment as any)

	.define(retrievePrompt.name, retrievePrompt as ResolverFunction)

	.define(extract.name, extract as any)
	.define(translate.name, translate as any)

	.getDefinitions();
