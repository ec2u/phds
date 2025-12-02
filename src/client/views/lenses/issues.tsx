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

import { Button, Code, EmptyState, Icon, Inline, Select, Stack, Text } from "@forge/react";
import React, { useState } from "react";
import { Issue, Severities, Severity, State, States } from "../../../shared/items/issues";
import { Activity, on } from "../../../shared/tasks";
import { useContent } from "../../hooks/content";
import { useIssues } from "../../hooks/issues";
import ToolSplit from "../layouts/split";
import { ToolActivity } from "./activity";
import ToolIssue, { severityLabel, stateLabel } from "./issue";
import { ToolTrace } from "./trace";


export function ToolIssues() {

	const [agreement] = useContent();
	const [issues, actions] = useIssues();

	const [state, setState] = useState<readonly State[]>([]);
	const [severity, setSeverity] = useState<readonly Severity[]>([]);


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

		side={on(issues, {

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
						isClearable={true}
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
						isClearable={true}
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

                        <Button onClick={actions.refresh}>Refresh Analysis</Button>

                    </Inline>}

				</Stack>;

			}

		})}

	>{on(issues, {

		state: activity => <ToolActivity activity={activity}/>,
		trace: trace => <ToolTrace trace={trace}/>,

		value: issues => {

			const sorted = select(issues);
			const total = issues.length;

			return agreement === undefined ? (

				<ToolActivity activity={Activity.Fetching}/>

			) : agreement === null ? (

				<EmptyState
					header={"Corrupted Document"}
					description={"The expected document structure was corrupted.\n"+
						"Save your content and attachments and recreate it from scratch"
					}
					primaryAction={<Icon label={""} glyph={"error"} size={"large"} color={"color.icon.warning"}/>}
				/>

			) : total === 0 && !agreement ? (

				<EmptyState
					header={"No Agreement Text"}
					description={<Text>Enter Confluence <Code>Edit</Code> mode to update.</Text>}
				/>

			) : total === 0 ? (

				<EmptyState
					header={"Analysis Not Performed"}
					description={<Text>Check the agreement for compliance with policies.</Text>}
					primaryAction={<Button appearance={"discovery"} onClick={actions.refresh}>Analyze</Button>}
				/>

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
