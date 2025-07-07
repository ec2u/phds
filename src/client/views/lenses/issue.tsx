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

import { Box, Button, Heading, Icon, Inline, Stack, Text, xcss } from "@forge/react";
import React, { useState } from "react";
import { isString, isTrace } from "../../../shared";
import { Issue } from "../../../shared/issues";
import { Activity, isActivity, Status } from "../../../shared/tasks";
import { ToolReference } from "./reference";
import { ToolTrace } from "./trace";


export default function ToolIssue({

	issue,
	resolve

}: {

	issue: Issue;
	resolve: (issueIds: ReadonlyArray<string>) => Promise<void>

}) {

	const [resolving, setResolving]=useState<Status<void>>();

	const active=isActivity(resolving);


	function doResolve() {
		setResolving(Activity.Submitting);
		resolve([issue.id]).then(setResolving).catch(setResolving);
	}


	return <Box xcss={xcss({

		padding: "space.200",

		borderStyle: "solid",
		borderWidth: "border.width",
		borderRadius: "border.radius",
		borderColor: "color.border.accent.gray",

		backgroundColor: "color.background.accent.blue.subtlest",

		opacity: active ? "opacity.disabled" : undefined

	})}>{

		isTrace(resolving) ? <ToolTrace trace={resolving}/> : <Stack space={"space.100"}>

			<Inline alignBlock={"center"} space={"space.100"}>

				<Inline>{Array.from({ length: 3 }, (_, i) => (
					<Icon key={i}
						glyph={i < issue.priority ? "star-filled" : "star"}
						label={`Priority ${issue.priority}/3`}
						size={"small"}
					/>
				))}</Inline>

				<Box xcss={{ flexGrow: 1 }}><Heading size={"small"}>{issue.title}</Heading></Box>

				<Button isDisabled={active} appearance={"default"} iconBefore={"check"}
					onClick={doResolve}>Resolve</Button>
			</Inline>

			<Text>{issue.description.map((item, index) => isString(item)
				? <React.Fragment key={index}>{item} </React.Fragment>
				: <ToolReference key={`${item.source}:${item.offset}`} reference={item}/>
			)}</Text>

		</Stack>

	}</Box>;
}
