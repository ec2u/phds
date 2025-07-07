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

import { AdfRenderer, EmptyState } from "@forge/react";
import React from "react";
import { isTrace } from "../../../shared";
import { Language } from "../../../shared/languages";
import { isActivity } from "../../../shared/tasks";
import { useAgreement } from "../../hooks/agreement";
import { adf } from "../../tools/text";
import { ToolActivity } from "./activity";
import { ToolTrace } from "./trace";

export function ToolAgreement({

	language

}: {

	language: Language

}) {

	const document=useAgreement(language);

	if ( isActivity(document) ) {

		return <ToolActivity activity={document}/>;

	} else if ( isTrace(document) ) {

		return <ToolTrace trace={document}/>;

	} else if ( !document.content.trim() ) {

		return <EmptyState header={"No Agreement Text"}
			description={"Activate \"Edit (E)\" mode to modify."}
		/>;

	} else {

		return <AdfRenderer document={adf(document.content)}/>;

	}

}
