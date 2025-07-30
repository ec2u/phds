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

import {
	AdfRenderer,
	Box,
	Button,
	ButtonGroup,
	Heading,
	Inline,
	Select,
	Stack,
	Text,
	TextArea,
	xcss
} from "@forge/react";
import React, { useState } from "react";
import { isString } from "../../../shared";
import { Issue } from "../../../shared/issues";
import { IssuesActions } from "../../hooks/issues";
import { adf } from "../../tools/text";
import { ToolReference } from "./reference";


export default function ToolIssue({

	issue,
	actions

}: {

	issue: Issue;
	actions: IssuesActions

}) {

	const [mode, setMode]=useState<"reading" | "annotating" | "updating">("reading");
	const [notes, setNotes]=useState<string>(issue.annotations || "");

	const active=mode === "updating";
	const resolved=issue.resolved !== undefined;


	function classify(severity: Issue["severity"]) {
		setMode("updating");
		actions.classify(issue.id, severity).then(() => setMode("reading"));
	}

	function annotate() {
		setMode("annotating");
	}

	function cancel() {
		setNotes(issue.annotations || "");
		setMode("reading");
	}

	function save() {
		setMode("updating");
		actions.annotate(issue.id, notes).then(() => setMode("reading"));
	}

	function resolve() {
		setMode("updating");
		actions.resolve([issue.id], resolved).then(() => setMode("reading"));
	}


	return <Box xcss={xcss({

		padding: "space.200",

		borderStyle: "solid",
		borderWidth: "border.width",
		borderRadius: "border.radius",
		borderColor: "color.border.accent.gray",

		backgroundColor: resolved
			? "color.background.disabled"
			: "color.background.accent.blue.subtlest",

		opacity: active ? "opacity.disabled" : undefined

	})}>{

		<Stack space={"space.100"}>

			<Inline alignBlock={"center"} space={"space.100"}>

				<Box xcss={{ flexGrow: 1 }}><Heading size={"small"}>{issue.title}</Heading></Box>

				{resolved && <Text size="small" color="color.text.subtlest">
                    Resolved on {new Date(issue.resolved).toLocaleString(undefined, {
					year: "numeric",
					month: "numeric",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit"
				})}
                </Text>}

				{mode !== "annotating" && <Select isDisabled={active || resolved}

                    appearance={"subtle"}
                    spacing="compact"

                    value={{
						value: issue.severity,
						label: `${"★".repeat(issue.severity)}${"☆".repeat(3 - issue.severity)}`
					}}

                    options={[
						{ value: 1, label: "★☆☆" },
						{ value: 2, label: "★★☆" },
						{ value: 3, label: "★★★" }
					]}

                    onChange={option => classify(option.value)}

                />}

				<ButtonGroup>

					{mode === "annotating" ? <>
						<Button appearance="subtle" onClick={cancel}>Cancel</Button>
						<Button appearance={"primary"} onClick={save}>Save</Button>
					</> : <>
						<Button isDisabled={active} onClick={annotate}>Annotate</Button>
						<Button isDisabled={active} onClick={resolve}>{resolved ? "Reopen" : "Resolve"}</Button>
					</>}

				</ButtonGroup>

			</Inline>

			<Text>{issue.description.map((item, index) => isString(item)
				? <React.Fragment key={index}>{item} </React.Fragment>
				: <ToolReference key={`${item.source}:${item.offset}`} reference={item}/>
			)}</Text>

			{mode === "annotating" ?

				<TextArea
					minimumRows={3}
					resize="vertical"
					value={notes}
					onChange={(event) => setNotes(event.target.value)}
				/>

				: issue.annotations ?

					<Box xcss={xcss({
						borderWidth: "border.width",
						borderColor: "color.border.accent.gray",
						borderTopStyle: "solid",
						marginTop: "space.100",
						paddingTop: "space.100"
					})}>

						<AdfRenderer document={adf(issue.annotations)}/>

					</Box>

					: null

			}

		</Stack>

	}</Box>;
}
