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
	Inline,
	Select,
	Stack,
	Text,
	TextArea,
	Tooltip,
	xcss
} from "@forge/react";
import React, { useRef, useState } from "react";
import { isString } from "../../../shared";
import { Issue, Reference, Severities, State, States } from "../../../shared/items/issues";
import { adf } from "../../../shared/tools/text";
import { IssuesActions } from "../../hooks/issues";
import { ToolToggle } from "../elements/toggle";
import { toColors } from "../index";
import { ToolReference } from "./reference";


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const RedColors = toColors("red");
export const BlueColors = toColors("blue");
export const GrayColors = toColors("gray");


export const StateColors = {
	pending: toColors("red"),
	active: toColors("yellow"),
	blocked: toColors("purple"),
	resolved: toColors("lime")
} as const;

export const SeverityColors = {
	3: toColors("purple"),
	2: toColors("red"),
	1: toColors("yellow")
} as const;


export function stateLabel(value: string) {
	return value.charAt(0).toUpperCase()+value.slice(1);
}

export function severityLabel(value: number) {
	return "★".repeat(value)+"☆".repeat(3-value);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export default function ToolIssue({

	issue,
	actions

}: {

	issue: Issue;
	actions: IssuesActions

}) {

	const [mode, setMode] = useState<"reading" | "annotating" | "updating">("reading");
	const [expanded, setExpanded] = useState<boolean>(false);
	const notes = useRef<string>(issue.annotations || "");

	const active = mode === "updating";
	const references = issue.description.filter((entry): entry is Reference => !isString(entry));


	const states = States.map(value => ({
		value,
		label: stateLabel(value)
	}));

	const severities = Severities.map(value => ({
		value,
		label: severityLabel(value)
	}));


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
		setMode("reading");
		notes.current = issue.annotations || "";
	}

	function save() {
		setMode("updating");
		actions.annotate(issue.id, notes.current).then(() => setMode("reading"));
	}


	return <Box xcss={xcss({

		padding: "space.200",

		borderStyle: "solid",
		borderWidth: "border.width",
		borderRadius: "border.radius",

		...(issue.state === "resolved" ? GrayColors : BlueColors),

		opacity: active ? "opacity.disabled" : undefined

	})}>{

		<Stack space={"space.100"}>

			<Inline alignBlock={"center"} space={"space.100"} spread={"space-between"}>

				<Inline alignBlock={"center"}>

					<Heading size={"small"}>{issue.title}</Heading>

					<ToolToggle

						expanded={expanded}
						label="references"

						onToggle={toggle}

					/>

				</Inline>

				<Box xcss={xcss({ minWidth: "25em" /* ;( prevent selects from shrinking */ })}>

					<Inline alignBlock={"center"} alignInline={"end"} space={"space.050"}>

						{mode !== "annotating" && <Box xcss={xcss({

							borderStyle: "solid",
							borderWidth: "border.width",
							borderRadius: "border.radius",

							...(StateColors[issue.state])

						})}>

                            <Select isDisabled={active}

                                appearance={"subtle"}
                                spacing={"compact"}

                                value={states.find(option => option.value === issue.state)}
                                options={states}

                                onChange={(option: typeof states[number]) => transition(option?.value)}

                            />

                        </Box>}

						{mode !== "annotating" && <Box xcss={xcss({

							borderStyle: "solid",
							borderWidth: "border.width",
							borderRadius: "border.radius",

							...(SeverityColors[issue.severity])

						})}>

                            <Select isDisabled={active}

                                appearance={"subtle"}
                                spacing={"compact"}

                                value={severities.find(option => option.value === issue.severity)}
                                options={severities}

                                onChange={(option: typeof severities[number]) => classify(option.value)}

                            />

                        </Box>}

						<ButtonGroup>

							{mode === "annotating"

								? <>
									<Tooltip content="Cancel editing annotations">
										<Button appearance="subtle" onClick={cancel}>Cancel</Button>
									</Tooltip>
									<Tooltip content="Save annotations">
										<Button appearance={"primary"} onClick={save}>Save</Button>
									</Tooltip>
								</>

								: <Box xcss={xcss({ backgroundColor: "color.background.neutral" })}>
									<Tooltip content="Add or edit annotations">
										<Button isDisabled={active} onClick={annotate}>Annotate</Button>
									</Tooltip>
								</Box>

							}

						</ButtonGroup>

					</Inline>


				</Box>

			</Inline>

			{expanded && <ToolReferences references={references}/>}

			<Text>{issue.description.map((item, index) => isString(item)
				? <React.Fragment key={index}>{item} </React.Fragment>
				: <ToolReference key={`${item.source}:${item.offset}`} reference={item}/>
			)}</Text>

			{mode === "annotating" ? (

				<TextArea

					minimumRows={3}
					resize="vertical"

					defaultValue={notes.current}

					onChange={(event) => { notes.current = event.target.value; }}

				/>

			) : issue.annotations ? (

				<Box xcss={xcss({
					borderWidth: "border.width",
					borderColor: "color.border.accent.gray",
					borderTopStyle: "solid",
					marginTop: "space.100",
					paddingTop: "space.100"
				})}>

					<AdfRenderer document={adf(issue.annotations)}/>

				</Box>

			) : (

				<></>

			)}

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
