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

import { Box, Button, Heading, Inline, Stack, Text, xcss } from "@forge/react";
import React, { useState } from "react";
import { isArray, isString } from "../../../shared";
import { Issue } from "../../../shared/issues";
import { isActivity, Status } from "../../../shared/tasks";
import { execute } from "../../hooks";
import { useCache } from "../../hooks/cache";
import { ToolReference } from "./reference";


export default function ToolIssue({

	issue

}: {

	issue: Issue

}) {

	const { getCache, setCache }=useCache();
	const [resolving, setResolving]=useState<Status<void>>();

	const active=isActivity(resolving);

	function resolve() { // !!! factor
		execute(setResolving, { type: "resolve", issues: [issue.id] }).then(() => {
			// Remove resolved issue from cache using the same key as useIssues
			const cached=getCache<ReadonlyArray<Issue>>("issues");
			if ( isArray(cached) ) {
				const updatedIssues=cached.filter(cachedIssue => cachedIssue.id !== issue.id);
				setCache("issues", updatedIssues);
			}
		});
	}

	return <Box xcss={xcss({

		padding: "space.200",

		borderStyle: "solid",
		borderWidth: "border.width",
		borderRadius: "border.radius",
		borderColor: "color.border.accent.gray",

		backgroundColor: "color.background.accent.blue.subtlest",

		opacity: active ? "opacity.disabled" : undefined

	})}>

		<Stack space={"space.100"}>

			<Inline>
				<Box xcss={{ flexGrow: 1 }}><Heading size={"small"}>{issue.title}</Heading></Box>
				<Button isDisabled={active} appearance={"default"} iconBefore={"check"}
					onClick={resolve}>Resolve</Button>
			</Inline>

			<Text>{issue.description.map((item, index) => isString(item)
				? <React.Fragment key={index}>{item} </React.Fragment>
				: <ToolReference key={`${item.source}:${item.offset}`} reference={item}/>
			)}</Text>

		</Stack>

	</Box>;
}
