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
 * Filterable issues catalogue view with sidebar controls.
 *
 * @module
 */

import {
	Box,
	Button,
	ButtonGroup,
	EmptyState,
	Icon,
	Inline,
	Modal,
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
	Pressable,
	Select,
	Stack,
	Text,
	Textfield,
	Tooltip,
	xcss
} from "@forge/react";
import React, { type ReactNode, useEffect, useState } from "react";
import { Issue, Severities, Severity, State, States } from "../../../shared/items/issues";
import { isContent, on, type Status } from "../../../shared/store";
import { type IssuesActions, useIssues } from "../../hooks/issues";
import { useStorage } from "../../hooks/storage";
import type { SafeXCSS } from "../index";
import ToolSplit from "../layouts/split";
import { ToolActivity } from "./activity";
import ToolIssue, { severityLabel, stateLabel } from "./issue";
import { ToolTrace } from "./trace";

/**
 * Issue state ordering for the catalogue criteria: blocked < active < pending < resolved.
 */
const CatalogStateOrder: Record<State, number> = {
	blocked: 0,
	active: 1,
	pending: 2,
	resolved: 3
};

/**
 * Composite comparators for each sort mode, in ascending order.
 */
const SortComparators: Record<SortMode, (x: Issue, y: Issue) => number> = {
	title: (x, y) => byTitle(x, y) || bySeverity(x, y) || byState(x, y),
	severity: (x, y) => bySeverity(x, y) || byState(x, y) || byTitle(x, y),
	state: (x, y) => byState(x, y) || bySeverity(x, y) || byTitle(x, y)
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Sort mode for the issues catalogue: determines the primary, secondary, and tertiary sort keys.
 *
 * - `"title"` — title > severity > state
 * - `"severity"` — severity > state > title
 * - `"state"` — state > severity > title
 */
type SortMode =
	| "title"
	| "severity"
	| "state";

/**
 * Sort direction for the issues catalogue.
 *
 * - `"asc"` — ascending (A→Z, low→high)
 * - `"desc"` — descending (Z→A, high→low)
 */
type SortOrder =
	| "asc"
	| "desc";

/**
 * Persisted criteria state for the issues catalogue.
 */
interface Criteria {

	readonly sort: SortMode;
	readonly order: SortOrder;

	readonly title: string;
	readonly severity: readonly Severity[];
	readonly state: readonly State[];

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Renders a filterable list of compliance issues with state and severity filter controls in a sidebar.
 *
 * Uses {@link useIssues} internally for data and actions. Persists filter selections to browser localStorage for the
 * current page.
 *
 */
export function ToolIssues({

	onActions

}: {

	onActions: (actions: ReactNode) => () => void;

}) {

	const [items, actions] = useIssues();

	const [criteria, setCriteria] = useStorage<Criteria>("issues-criteria", {

		sort: "state",
		order: "asc",

		title: "",
		severity: [],
		state: []

	});


	useEffect(() => onActions(
		<ToolIssuesActions items={items} actions={actions}/>
	), [items, actions, onActions]);


	function select(issues: readonly Issue[]): readonly Issue[] {

		const dir = criteria.order === "asc" ? 1 : -1;
		const compare = SortComparators[criteria.sort];

		return [...issues]
			.filter(issue => matches(issue.title, criteria.title))
			.filter(issue => includes(criteria.severity, issue.severity))
			.filter(issue => includes(criteria.state, issue.state))
			.sort((x, y) => compare(x, y)*dir);
	}


	function patch(update: Partial<Criteria>) {
		setCriteria(current => ({ ...current, ...update }));
	}

	function clear() {
		patch({ title: "", severity: [], state: [] });
	}


	return <ToolSplit

		side={on(items, {

			state: () => <ToolIssuesSidebar disabled={true}
				criteria={criteria} onChange={patch} onClear={clear}
			/>,

			trace: () => <ToolIssuesSidebar disabled={true}
				criteria={criteria} onChange={patch} onClear={clear}
			/>,

			value: issues => <ToolIssuesSidebar disabled={false}
				issues={issues}
				criteria={criteria} onChange={patch} onClear={clear}
			/>

		})}

	>{on(items, {

		state: activity => <ToolActivity activity={activity}/>,
		trace: trace => <ToolTrace trace={trace} onDismiss={actions.reset}/>,

		value: issues => {

			const sorted = select(issues);
			const total = issues.length;

			return total === 0 ? (

				<AnalysisNotPerformedPrompt onAnalyse={actions.analyse}/>

			) : sorted.length === 0 ? (

				<EmptyState
					header={"No Matching Issues"}
					description={<Text>All issues are hidden by current filters.</Text>}
					primaryAction={<Button appearance={"primary"} onClick={clear}>Clear</Button>}
				/>

			) : (

				<Stack space="space.200">{sorted.map(issue => <ToolIssue
					key={`${issue.id}-${issue.state}-${issue.severity}`} /* ;( dom not reordered w/out state/severity */
					issue={issue}
					onUpdate={update => actions.update(issue.id, update)}/>)
				}</Stack>

			);
		}

	})}</ToolSplit>;


}


function byTitle(x: Issue, y: Issue): number {
	return x.title.localeCompare(y.title);
}

function bySeverity(x: Issue, y: Issue): number {
	return x.severity-y.severity;
}

function byState(x: Issue, y: Issue): number {
	return (CatalogStateOrder[x.state] ?? -1)-(CatalogStateOrder[y.state] ?? -1);
}


function matches(value: string, query: string) {

	const words = query.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0);
	const lower = value.trim().toLowerCase();

	return words.length === 0 || words.every(word => new RegExp(`\\b${word}`).test(lower));
}

function includes<T>(values: readonly T[], value: T) {
	return values.length === 0 || values.includes(value);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Renders the issues toolbar action group with "Update Analysis" and "Clear Analysis" buttons.
 *
 * Automatically disabled when issues are loading, in error state, or empty. The "Clear Issues" button prompts for
 * confirmation before purging all cached issue data for the current page.
 */
export function ToolIssuesActions({ items: issues, actions: { analyse, clear } }: {

	items: Status<ReadonlyArray<Issue>>;
	actions: IssuesActions;

}) {

	const [confirming, setConfirming] = useState(false);

	function cancel() {
		setConfirming(false);
	}

	function confirm() {
		setConfirming(false);
		clear();
	}


	return <ButtonGroup>

		<Button

			isDisabled={!isContent(issues) || issues.length === 0}

			onClick={analyse}

		>Update Analysis</Button>

		<Button

			isDisabled={!isContent(issues) || issues.length === 0}

			onClick={() => setConfirming(true)}

		>Clear Issues</Button>

		{confirming && <Modal onClose={() => setConfirming(false)}>

            <ModalHeader>
                <ModalTitle>Confirm Clear Issues</ModalTitle>
            </ModalHeader>

            <ModalBody>
                Are you sure you want to clear all issues? Compliance analysis history for this page
                will be permanently removed.
            </ModalBody>

            <ModalFooter>
                <Button appearance="subtle" autoFocus={true} onClick={cancel}>Cancel</Button>
                <Button appearance="danger" onClick={confirm}>Clear Issues</Button>
            </ModalFooter>

        </Modal>}

	</ButtonGroup>;
}

/**
 * Renders an empty state prompting the user to run compliance analysis.
 *
 * @param props the component props
 * @param props.onAnalyse the callback to trigger analysis
 */
export function AnalysisNotPerformedPrompt({ onAnalyse }: { onAnalyse: () => void }) {

	return <EmptyState
		header={"Analysis Not Performed"}
		description={<Text>Check the agreement for compliance with policies.</Text>}
		primaryAction={<Button appearance={"discovery"} onClick={onAnalyse}>Analyse</Button>}
	/>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Sidebar filter controls for the issues catalogue: title text field, severity and state multi-selects, and issue
 * count.
 */
function ToolIssuesSidebar({

	disabled,

	criteria,
	issues = [],

	onChange,
	onClear

}: {

	disabled: boolean

	criteria: Criteria
	issues?: readonly Issue[]

	onChange: (update: Partial<Criteria>) => void
	onClear: () => void

}) {

	const { title, severity, state } = criteria;

	const total = issues.length;

	const filtered = title !== ""
		|| severity.length > 0
		|| state.length > 0;

	const matched = issues.filter(issue => matches(issue.title, title));

	const count = matched
		.filter(issue => includes(severity, issue.severity))
		.filter(issue => includes(state, issue.state))
		.length;

	const severities = Severities.map(value => ({
		value,
		label: severityLabel(value),
		isDisabled: disabled || !matched
			.filter(issue => includes(state, issue.state))
			.some(({ severity }) => value === severity)
	}));

	const states = States.map(value => ({
		value,
		label: stateLabel(value),
		isDisabled: disabled || !matched
			.filter(issue => includes(severity, issue.severity))
			.some(({ state }) => value === state)
	}));


	function sort(mode: SortMode) {
		onChange(criteria.sort === mode
			? { order: criteria.order === "asc" ? "desc" : "asc" }
			: { sort: mode, order: "asc" }
		);
	}

	return <Stack space={"space.200"}>

		<Inline grow={"fill"} alignBlock={"stretch"} space={"space.075"}>

			<ToolSorting disabled={disabled || total === 0}

				mode={"title"}
				criteria={criteria}

				onSort={sort}

			/>

			<Box xcss={xcss({ flexGrow: 1 })}><Textfield

				isCompact={true}
				isDisabled={disabled || total === 0}

				placeholder={"Title"}

				value={title}

				elemAfterInput={title ? <Pressable

					xcss={xcss({
						paddingBlock: "space.025",
						paddingInline: "space.100",
						backgroundColor: "color.background.neutral.subtle"
					}) as SafeXCSS}

					onClick={() => onChange({ title: "" })}

				>

					<Icon

						glyph={"cross-circle"}
						label={"Clear"}

						size={"small"}
						color={"color.icon.subtlest"}

					/>

				</Pressable> : undefined}

				onChange={e => onChange({ title: e.target.value ?? "" })}

			/></Box>

		</Inline>

		<Inline grow={"fill"} alignBlock={"stretch"} space={"space.075"}>

			<ToolSorting disabled={disabled || total === 0}

				mode={"severity"}
				criteria={criteria}

				onSort={sort}

			/>

			<Box xcss={xcss({ flexGrow: 1 })}><Select

				isMulti={true}
				isClearable={false}
				isDisabled={disabled || total === 0}

				spacing="compact"
				placeholder={"Severity"}

				value={severity?.map(value => severities.find(option => option.value === value))}
				options={severities}

				onChange={(options: undefined | typeof severities[number][]) =>
					onChange({ severity: options?.map(option => option.value) ?? [] })
				}

			/></Box>

		</Inline>

		<Inline grow={"fill"} alignBlock={"stretch"} space={"space.075"}>

			<ToolSorting disabled={disabled || total === 0}

				mode={"state"}
				criteria={criteria}

				onSort={sort}

			/>

			<Box xcss={xcss({ flexGrow: 1 })}><Select

				isMulti={true}
				isClearable={false}
				isDisabled={disabled || total === 0}

				spacing={"compact"}
				placeholder={"State"}

				value={state?.map(value => states.find(option => option.value === value))}
				options={states}

				onChange={(options: undefined | typeof states[number][]) =>
					onChange({ state: options?.map(option => option.value) ?? [] })
				}

			/></Box>

		</Inline>

		{!disabled && total > 0 && <Inline space={"space.050"} spread={"space-between"}>

            <Text weight={"bold"}>{
				filtered ? `${count}/${total} Issue${total === 1 ? "" : "s"}`
					: `${total} Issue${total === 1 ? "" : "s"}`
			}</Text>

            {filtered && <Pressable

                xcss={xcss({
					paddingBlock: "space.050",
					paddingInline: "space.075",
					backgroundColor: "color.background.neutral.subtle"
				}) as SafeXCSS}

                onClick={onClear}

            ><Inline alignBlock={"center"} space={"space.050"}>
                <Text color={"color.text.subtlest"}>Clear All</Text>
                <Icon glyph={"cross-circle"} label={"Clear"} size={"medium"} color={"color.icon.subtlest"}/>
            </Inline></Pressable>}

        </Inline>}

	</Stack>;

}


/**
 * Sort control button for a single sort mode facet.
 *
 * Shows a directional chevron when the facet is the active sort mode, or a neutral up-down indicator when inactive.
 * Clicking an inactive control activates it with ascending order; clicking the active control toggles the direction.
 */
function ToolSorting({

	disabled,

	mode,
	criteria,

	onSort

}: {

	disabled: boolean

	mode: SortMode
	criteria: Criteria

	onSort: (mode: SortMode) => void

}) {

	const active = criteria.sort === mode;

	const glyph = active
		? criteria.order === "asc" ? "arrow-down-right" : "arrow-up-right"
		: "grow-diagonal";

	const label = active
		? `Sorting by ${mode} ${criteria.order === "asc" ? "ascending" : "descending"}`
		: `Sort by ${mode}`;

	const color = active
		? "color.icon.selected"
		: "color.icon.disabled"; // ;( color.icon.subtlest still too heavy

	return <Pressable

		isDisabled={disabled}

		xcss={xcss({

			paddingBlock: "space.025",
			paddingInline: "space.050",

			borderRadius: "radius.small",

			...(disabled ? {

				backgroundColor: "color.background.disabled"

			} : {

				borderStyle: "solid",
				borderWidth: "border.width",
				borderColor: "color.border.input",

				backgroundColor: "color.background.neutral.subtle"

			})

		}) as SafeXCSS}

		onClick={() => onSort(mode)}

	>{disabled

		? <Icon

			glyph={glyph}
			label={label}

			size={"medium"}
			color={"color.icon.disabled"}

		/>

		: <Tooltip content={label}>

			<Icon

				glyph={glyph}
				label={label}

				size={"medium"}
				color={color}

			/>

		</Tooltip>

	}</Pressable>;

}
