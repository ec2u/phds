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

import { Button, EmptyState, Inline, Select, Stack, Text } from "@forge/react";
import React from "react";
import { Issue, Severities, Severity, State, States } from "../../../shared/items/issues";
import { on } from "../../../shared/tasks";
import { IssuesActions } from "../../hooks/issues";
import { useStorage } from "../../hooks/storage";
import { AnalysisNotPerformedPrompt } from "../elements/analyze";
import ToolSplit from "../layouts/split";
import { ToolActivity } from "./activity";
import ToolIssue, { severityLabel, stateLabel } from "./issue";
import { ToolTrace } from "./trace";

export function ToolIssues({

	page,
	issues: [items, actions]

}: {

	page: string,
	issues: [ReadonlyArray<Issue>, IssuesActions]

}) {

	const [state, setState] = useStorage<readonly State[]>(page, "issues-states", []);
	const [severity, setSeverity] = useStorage<readonly Severity[]>(page, "issues-severities", []);


	function select(issues: readonly Issue[]): readonly Issue[] {
		return [...issues]
			.filter(issue => includes(state, issue.state))
			.filter(issue => includes(severity, issue.severity))
			.sort((x, y) => {

				const xOrder = States.indexOf(x.state);
				const yOrder = States.indexOf(y.state);

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

			state: undefined,
			trace: undefined,

			value: issues => {

				const sorted = select(issues);

				const count = sorted.length;
				const total = issues.length;

				const states = States.map(value => ({
					value,
					label: stateLabel(value),
					isDisabled: !issues
						.filter(issue => includes(severity, issue.severity))
						.some(({ state }) => value === state)
				}));

				const severities = Severities.map(value => ({
					value,
					label: severityLabel(value),
					isDisabled: !issues
						.filter(issue => includes(state, issue.state))
						.some(({ severity }) => value === severity)
				}));

				return <Stack space={"space.200"}>

					<Select

						isMulti={true}
						isClearable={false}
						isDisabled={total === 0}

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
						isDisabled={total === 0}

						spacing="compact"
						placeholder={"Severity"}

						value={severity?.map(value => severities.find(option => option.value === value))}
						options={severities}

						onChange={(options: undefined | typeof severities[number][]) =>
							setSeverity(options?.map(option => option.value) ?? [])
						}

					/>

					{total > 0 && <Inline space={"space.050"} spread={"space-between"}>

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

		})}

	>{on(items, {

		state: activity => <ToolActivity activity={activity}/>,
		trace: trace => <ToolTrace trace={trace}/>,

		value: issues => {

			const sorted = select(issues);
			const total = issues.length;

			return total === 0 ? (

				<AnalysisNotPerformedPrompt onAnalyze={actions.refresh}/>

			) : sorted.length === 0 ? (

				<EmptyState
					header={"No Matching Issues"}
					description={<Text>All issues are hidden by current filters.</Text>}
					primaryAction={<Button appearance={"primary"} onClick={clear}>Clear</Button>}
				/>

			) : (

				<Stack space="space.200">{sorted.map(issue => <ToolIssue
					key={`${issue.id}-${issue.state}-${issue.severity}`} /* ;( dom not reordered w/out state/severity */
					issue={issue} actions={actions}/>)
				}</Stack>

			);
		}

	})}</ToolSplit>;

}
