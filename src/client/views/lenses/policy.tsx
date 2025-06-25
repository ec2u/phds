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
import { Source } from "../../../shared/documents";
import { Language } from "../../../shared/languages";
import { isActivity } from "../../../shared/tasks";
import { usePolicy } from "../../hooks/policy";
import { adf } from "../../tools/text";
import { ToolActivity } from "./activity";
import { ToolTrace } from "./trace";

export function ToolPolicy({

	source,
	language

}: {

	source: Source
	language: Language

}) {

	const policy=usePolicy(source, language);

	if ( isActivity(policy) ) {

		return <ToolActivity activity={policy}/>;

	} else if ( isTrace(policy) ) {

		return <ToolTrace trace={policy}/>;

	} else {

		return <AdfRenderer document={adf(policy.content)}/>;

	}

}
