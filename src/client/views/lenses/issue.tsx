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
	DynamicTable,
	Heading,
	Icon,
	Inline,
	Pressable,
	Select,
	Stack,
	Text,
	TextArea,
	Tooltip,
	xcss
} from "@forge/react";
import React, { useState } from "react";
import { isString } from "../../../shared";
import { Issue, Reference, State } from "../../../shared/issues";
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

	const [mode, setMode] = useState<"reading" | "annotating" | "updating">("reading");
	const [expanded, setExpanded] = useState<boolean>(false);
	const [notes, setNotes] = useState<string>(issue.annotations || "");

	const active = mode === "updating";
	const resolved = issue.state === State.Resolved;
	const references = issue.description.filter((entry): entry is Reference => !isString(entry));


	function toggle() {
		setExpanded(!expanded);
	}

	function transition(state: State) {
		setMode("updating");
		actions.transition(issue.id, state).then(() => setMode("reading")).then(() => setExpanded(false));
	}

	function classify(severity: Issue["severity"]) {
		setMode("updating");
		actions.classify(issue.id, severity).then(() => setMode("reading")).then(() => setExpanded(false));
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

			<Inline alignBlock={"center"} space={"space.050"}>

				<Heading size={"small"}>{issue.title}</Heading>

				<Pressable onClick={toggle} xcss={xcss({

					padding: "space.025",
					margin: "space.0",

					backgroundColor: "color.background.neutral.subtle"

				})}>

					<Tooltip content={`${expanded ? "Hide" : "Show"} references`}>

						<Icon size={"medium"}
							label={`${expanded ? "Hide" : "Show"} references`}
							glyph={expanded ? "chevron-up" : "chevron-down"}
						/>

					</Tooltip>

				</Pressable>

				<Box xcss={xcss({ flexGrow: 1 })}/>

				{issue.updated && <Text size="small" color="color.text.subtlest">
                    Updated on {new Date(issue.updated).toLocaleString(undefined, {
					year: "numeric",
					month: "numeric",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit"
				})}
                </Text>}

				{mode !== "annotating" && <Tooltip content="Change issue state">
                    <Select isDisabled={active}

                        appearance={"subtle"}
                        spacing="compact"

                        value={(() => {
							const state = issue.state || State.Pending;
							return {
								value: state,
								label: state.charAt(0).toUpperCase()+state.slice(1)
							};
						})()}

                        options={[
							{ value: State.Pending, label: "Pending" },
							{ value: State.Active, label: "Active" },
							{ value: State.Blocked, label: "Blocked" },
							{ value: State.Resolved, label: "Resolved" }
						]}

                        onChange={option => transition(option.value)}

                    />
                </Tooltip>}

				{mode !== "annotating" && <Tooltip content="Change issue severity">
                    <Select isDisabled={active || resolved}

                        appearance={"subtle"}
                        spacing="compact"

                        value={{
							value: issue.severity,
							label: `${"★".repeat(issue.severity)}${"☆".repeat(3-issue.severity)}`
						}}

                        options={[
							{ value: 1, label: "★☆☆" },
							{ value: 2, label: "★★☆" },
							{ value: 3, label: "★★★" }
						]}

                        onChange={option => classify(option.value)}

                    />
                </Tooltip>}

				<ButtonGroup>

					{mode === "annotating" ? <>
						<Tooltip content="Cancel editing annotations">
							<Button appearance="subtle" onClick={cancel}>Cancel</Button>
						</Tooltip>
						<Tooltip content="Save annotations">
							<Button appearance={"primary"} onClick={save}>Save</Button>
						</Tooltip>
					</> : <>
						<Tooltip content="Add or edit annotations">
							<Button isDisabled={active} onClick={annotate}>Annotate</Button>
						</Tooltip>
					</>}

				</ButtonGroup>

			</Inline>

			{expanded && <ToolReferences references={references}/>}

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


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function ToolReferences({

	references

}: {

	references: ReadonlyArray<Reference>

}) {

	const agreementReferences = references.filter(reference => !reference.source);
	const policyReferences = references.filter(reference => reference.source);

	const agreementCount = agreementReferences.length;
	const policyCount = policyReferences.length;

	return <DynamicTable

		head={{ cells: [{ key: "agreement", width: 50 }, { key: "policy", width: 50 }] }}

		rows={Array.from({ length: Math.max(agreementCount, policyCount) }).flatMap((_, i) => {

			const agreementReference = agreementReferences[i];
			const policyReference = policyReferences[i];

			return [

				// title row

				{
					key: `title-${i}`,
					cells: [agreementReference, policyReference].map(reference => ({
						content: reference ? <Heading size={"small"}>{reference.title}</Heading> : null
					}))
				},

				// text row

				{
					key: `text-${i}`,
					cells: [agreementReference, policyReference].map(reference => ({
						content: reference ? <Text>{reference.excerpt}</Text> : null
					}))
				}

			];

		})}/>;

}
