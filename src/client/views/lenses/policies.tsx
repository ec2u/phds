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

import {EmptyState, List, ListItem, Pressable, xcss} from "@forge/react";
import React from "react";
import {isTrace} from "../../../shared";
import {isActivity} from "../../../shared/tasks";
import {usePolicies} from "../../hooks/policies";
import {ToolActivity} from "./activity";
import {ToolTrace} from "./trace";

export function ToolPolicies() {

	const policies=usePolicies();

	if ( isActivity(policies) ) {

		return <ToolActivity activity={policies}/>;

	} else if ( isTrace(policies) ) {

		return <ToolTrace trace={policies}/>;

	} else if ( !Object.keys(policies).length ) {

		return <EmptyState header={"No Policy Documents"}
			description={"Upload PDF documents to the page \"Attachments\" area."}
		/>;

	} else {

		return <List type={"unordered"}>{Object.entries(policies)
			.sort(([, x], [, y]) => x.localeCompare(y))
			.map(([source, title]) => <>

				<ListItem key={source}>

					<Pressable xcss={xcss({

						color: "color.link",
						backgroundColor: "color.background.neutral.subtle"

					})}

						//  !!! onClick={() => select?.(source)}

					>{

						title

					}</Pressable>

				</ListItem>

			</>)
		}</List>;

	}

}
