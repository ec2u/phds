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
	Button,
	ButtonGroup,
	EmptyState,
	Inline,
	Modal,
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
	Select,
	Stack,
	Text
} from "@forge/react";
import React, { type ReactNode, useEffect, useState } from "react";
import { Issue, Severities, Severity, State, States } from "../../../shared/items/issues";
import { isContent, on, type Status } from "../../../shared/store";
import { type IssuesActions, useIssues } from "../../hooks/issues";
import { useStorage } from "../../hooks/storage";
import ToolSplit from "../layouts/split";
import { ToolActivity } from "./activity";
import ToolIssue, { severityLabel, stateLabel } from "./issue";
import { ToolTrace } from "./trace";

/**
 * Issue state ordering for the catalogue view: blocked < active < pending < resolved.
 */
const CatalogStateOrder: Record<State, number> = {
	blocked: 0,
	active: 1,
	pending: 2,
	resolved: 3
};


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

	const [state, setState] = useStorage<readonly State[]>("issues-states", []);
	const [severity, setSeverity] = useStorage<readonly Severity[]>("issues-severities", []);


	useEffect(() => onActions(
		<ToolIssuesActions items={items} actions={actions}/>
	), [items, actions, onActions]);


	function select(issues: readonly Issue[]): readonly Issue[] {
		return [...issues]
			.filter(issue => includes(state, issue.state))
			.filter(issue => includes(severity, issue.severity))
			.sort((x, y) => {

				const xOrder = CatalogStateOrder[x.state] ?? -1;
				const yOrder = CatalogStateOrder[y.state] ?? -1;

				return xOrder !== yOrder ? xOrder-yOrder
					: x.severity !== y.severity ? y.severity-x.severity
						: x.title.localeCompare(y.title);

			});
	}

	function includes<T>(values: readonly T[], value: T) {
		return values.length === 0 || values.includes(value);
	}


	function clear() {
		setState([]);
		setSeverity([]);
	}


	return <ToolSplit

		side={on(items, {

			state: () => <Sidebar disabled={true}/>,
			trace: () => <Sidebar disabled={true}/>,
			value: issues => <Sidebar disabled={false} issues={issues}/>

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


	function Sidebar({ disabled, issues = [] }: { disabled: boolean, issues?: readonly Issue[] }) {

		const sorted = select(issues);

		const count = sorted.length;
		const total = issues.length;

		const states = States.map(value => ({
			value,
			label: stateLabel(value),
			isDisabled: disabled || !issues
				.filter(issue => includes(severity, issue.severity))
				.some(({ state }) => value === state)
		}));

		const severities = Severities.map(value => ({
			value,
			label: severityLabel(value),
			isDisabled: disabled || !issues
				.filter(issue => includes(state, issue.state))
				.some(({ severity }) => value === severity)
		}));

		return <Stack space={"space.200"}>

			<Select

				isMulti={true}
				isClearable={false}
				isDisabled={disabled || total === 0}

				spacing={"compact"}
				placeholder={"State"}

				value={state?.map(value => states.find(option => option.value === value))}
				options={states}

				onChange={(options: undefined | typeof states[number][]) =>
					setState(options?.map(option => option.value) ?? [])
				}

			/>

			<Select

				isMulti={true}
				isClearable={false}
				isDisabled={disabled || total === 0}

				spacing="compact"
				placeholder={"Severity"}

				value={severity?.map(value => severities.find(option => option.value === value))}
				options={severities}

				onChange={(options: undefined | typeof severities[number][]) =>
					setSeverity(options?.map(option => option.value) ?? [])
				}

			/>

			{!disabled && total > 0 && <Inline space={"space.050"} spread={"space-between"}>

                <Text weight={"bold"}>{
					state?.length || severity?.length ? `${count}/${total} Issue${total === 1 ? "" : "s"}`
						: `${total} Issue${total === 1 ? "" : "s"}`
				}</Text>

                <Button

                    isDisabled={!(state.length > 0 || severity.length > 0)}

                    appearance={"subtle"}
                    iconAfter="cross-circle"

                    onClick={clear}

                >Clear</Button>

            </Inline>}

		</Stack>;

	}

}

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
