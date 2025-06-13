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

import { List, ListItem, Pressable } from "@forge/react";
import React from "react";
import { isTrace, isUpdate } from "../../../shared";
import { Attachment, compareAttachments } from "../../../shared/attachments";
import { useAttachments } from "../../hooks/attachments";
import { ToolTrace } from "./trace";
import { ToolUpdate } from "./update";

export function ToolReferences({

	onClick,

}: {

	onClick?: (attachment: Attachment) => void

}) {

	const attachments=useAttachments();

	if ( isUpdate(attachments) ) {

		return <ToolUpdate>{attachments}</ToolUpdate>;

	} else if ( isTrace(attachments) ) {

		return <ToolTrace>{attachments}</ToolTrace>;

	} else {

		return <List type={"unordered"}>{[...attachments].sort(compareAttachments).map(attachment => <>

			<ListItem key={attachment.id}>

				<Pressable xcss={{

					color: "color.link",
					backgroundColor: "color.background.neutral.subtle"

				}}

					onClick={() => onClick?.(attachment)}

				>{

					attachment.title.replace(/\.pdf$/, "")

				}</Pressable>

			</ListItem>

		</>)}</List>;

	}

}
