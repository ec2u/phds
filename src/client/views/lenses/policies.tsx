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
import { isTrace } from "../../../shared";
import { Source } from "../../../shared/documents";
import { Language } from "../../../shared/languages";
import { isActivity } from "../../../shared/tasks";
import { usePolicies } from "../../hooks/policies";
import { ToolActivity } from "./activity";
import { ToolTrace } from "./trace";

export function ToolPolicies({

	language,

	onClick

}: {

	language: Language

	onClick?: (source: Source) => void

}) {

	const catalog=usePolicies(language);

	if ( isActivity(catalog) ) {

		return <ToolActivity activity={catalog}/>;

	} else if ( isTrace(catalog) ) {

		return <ToolTrace trace={catalog}/>;

	} else {

		return <List type={"unordered"}>{Object.entries(catalog)
			.sort(([, x], [, y]) => x.localeCompare(y))
			.map(([source, title]) => <>

				<ListItem key={source}>

					<Pressable xcss={{

						color: "color.link",
						backgroundColor: "color.background.neutral.subtle"

					}}

						onClick={() => onClick?.(source)}

					>{

						title

					}</Pressable>

				</ListItem>

			</>)
		}</List>;

	}

}
