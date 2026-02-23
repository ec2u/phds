/*
 * Copyright © 2025-2026 EC2U Alliance
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

/**
 * Issue detail view component with inline editing capabilities.
 *
 * Provides the full issue detail card with state/severity selectors, annotation editing, expandable source
 * references, and action buttons for managing individual compliance issues.
 *
 * @module
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
	Popup,
	Pressable,
	Select,
	Stack,
	Text,
	TextArea,
	Tooltip,
	xcss
} from "@forge/react";
import React, { useRef, useState } from "react";
import type { Reference } from "../../../shared/items/documents";
import type { IssueUpdate } from "../../../shared/items/issues";
import { Issue, Severities, State, States } from "../../../shared/items/issues";
import { isString } from "../../../shared/tools/core";
import { adf } from "../../../shared/tools/text";
import { ToolToggle } from "../elements/toggle";
import { type SafeXCSS, toColors } from "../index";


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Red accent colour pair.
 */
export const RedColors = toColors("red");

/**
 * Blue accent colour pair.
 */
export const BlueColors = toColors("blue");

/**
 * Grey accent colour pair.
 */
export const GrayColors = toColors("gray");


/**
 * Colour mapping for issue workflow states.
 */
export const StateColors = {
	pending: toColors("red"),
	active: toColors("yellow"),
	blocked: toColors("purple"),
	resolved: toColors("lime")
} as const;

/**
 * Colour mapping for issue severity levels.
 */
export const SeverityColors = {
	3: toColors("purple"),
	2: toColors("red"),
	1: toColors("yellow")
} as const;


/**
 * Formats a workflow state value as a capitalised display label.
 *
 * @param value the state value
 *
 * @return the display label
 */
export function stateLabel(value: string) {
	return value.charAt(0).toUpperCase()+value.slice(1);
}

/**
 * Formats a severity level as a star rating display label.
 *
 * @param value the severity level (1-3)
 *
 * @return the star rating string
 */
export function severityLabel(value: number) {
	return "★".repeat(value)+"☆".repeat(3-value);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Renders a detailed issue card with state/severity controls, description, reference excerpts, and annotation editing.
 *
 * @param issue The compliance issue to display
 * @param onUpdate Callback for persisting field changes
 */
export default function ToolIssue({

	issue,

	onUpdate

}: {

	issue: Issue;

	onUpdate: (update: IssueUpdate) => Promise<void>;

}) {

	const [mode, setMode] = useState<"reading" | "annotating" | "updating">("reading");
	const [expanded, setExpanded] = useState(false);
	const notes = useRef("");

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
		onUpdate({ state }).then(() => setMode("reading")).then(() => setExpanded(false));
		setMode("updating");
	}

	function classify(severity: Issue["severity"]) {
		onUpdate({ severity }).then(() => setMode("reading")).then(() => setExpanded(false));
		setMode("updating");
	}

	function annotate() {
		notes.current = issue.annotations || "";
		setMode("annotating");
	}

	function cancel() {
		notes.current = issue.annotations || "";
		setMode("reading");
	}

	function save() {
		onUpdate({ annotations: notes.current }).then(() => setMode("reading"));
		setMode("updating");
	}


	return <Box xcss={xcss({

		padding: "space.200",

		borderStyle: "solid",
		borderWidth: "border.width",
		borderRadius: "radius.small",

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
							borderRadius: "radius.small",

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
							borderRadius: "radius.small",

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

			{expanded && <ToolExcerpts references={references}/>}

			<Text>{issue.description.map((item, index) => isString(item)
				? <React.Fragment key={index}>{item} </React.Fragment>
				: <ToolReference key={item.excerpt.slice(0, 50)} reference={item}/>
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

/**
 * Renders a two-column table of agreement and policy source references.
 */
function ToolExcerpts({

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

/**
 * Renders an inline info icon that opens a popup showing the source reference title and excerpt.
 *
 * @param props the component props
 * @param props.reference the source reference to display
 */
function ToolReference({

	reference

}: {

	reference: Reference

}) {

	const [open, setOpen] = useState<boolean>(false);

	return <Popup

		isOpen={open}

		role={"menu"}
		placement="bottom-end"

		onClose={() => setOpen(false)}

		trigger={() => <Pressable

			onClick={() => setOpen(!open)}

			xcss={xcss({

				paddingInline: "space.025",
				marginInline: "space.025",

				borderRadius: "radius.small",
				backgroundColor: "color.background.neutral"

			}) as SafeXCSS}

		>

			<Icon glyph={"info"} label={reference.title}
				size={"small"} color={"color.icon.accent.blue"}
			/>

		</Pressable>}

		content={() => <Box xcss={xcss({

			padding: "space.200",
			maxWidth: "30em"

		})}>

			<Stack space={"space.100"}>

				<Heading size={"small"}>{reference.title}</Heading>
				<Text>{reference.excerpt}</Text>

			</Stack>

		</Box>}

	/>;

}
