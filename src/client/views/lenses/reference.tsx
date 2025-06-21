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

import { AdfRenderer } from "@forge/react";
import React from "react";
import { isTrace } from "../../../shared";
import { Attachment } from "../../../shared/attachments";
import { Language } from "../../../shared/languages";
import { isActivity } from "../../../shared/tasks";
import { adf } from "../../hooks";
import { useDocument } from "../../hooks/document";
import { ToolTrace } from "./trace";
import { ToolActivity } from "./update";

export function ToolReference({

	language,

	children: attachment

}: {

	language: Language

	children: Attachment

}) {

	const document=useDocument(attachment, language);

	if ( isActivity(document) ) {

		return <ToolActivity>{document}</ToolActivity>;

	} else if ( isTrace(document) ) {

		return <ToolTrace>{document}</ToolTrace>;

	} else {

		return <AdfRenderer document={adf(document.content)}/>;

	}

}
