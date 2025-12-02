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

import { Box, Popup, Pressable, Text, xcss } from "@forge/react";
import React, { useState } from "react";
import { Issue, Severities, Severity, State, States } from "../../../shared/items/issues";
import { on } from "../../../shared/tasks";
import { IssuesActions } from "../../hooks/issues";
import { useStorage } from "../../hooks/storage";
import { AnalysisNotPerformedPrompt } from "../elements/analyze";
import ToolKanban, { Lane, toggle } from "../layouts/kanban";
import { ToolActivity } from "./activity";
import ToolIssue, { BlueColors, RedColors, SeverityColors, severityLabel, StateColors, stateLabel } from "./issue";
import { ToolTrace } from "./trace";


/**
 * Initial lane configurations for dashboard kanban board states and severities.
 *
 * @remark **CRITICAL** / initial values must be defined outside the component as constants.
 * If defined inside, they would be recreated on every render, causing useStorage's
 * useEffect (which has 'initial' in its dependency array) to run repeatedly,
 * interfering with the render cycle and preventing proper UI updates.
 */
const initial = {

	states: States.map(state => ({
		value: state,
		collapsed: state === "resolved",
		label: stateLabel(state),
		colors: StateColors[state]
	})),

	severities: Severities.map(severity => ({
		value: severity,
		collapsed: false,
		label: severityLabel(severity),
		colors: SeverityColors[severity]
	}))

} as const;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function ToolDashboard({

	issues: [items, actions]

}: {

	issues: [ReadonlyArray<Issue>, IssuesActions]

}) {

	const [states, setStates] = useStorage<readonly Lane<State>[]>("dashboard-states", {
		initial: initial.states
	});

	const [severities, setSeverities] = useStorage<readonly Lane<Severity>[]>("dashboard-severities", {
		initial: initial.severities
	});


	function toggleState(state: State) {
		setStates(current => toggle(current, state));
	}

	function toggleSeverity(severity: Severity) {
		setSeverities(current => toggle(current, severity));
	}


	return on(items, {

		state: activity => <ToolActivity activity={activity}/>,
		trace: trace => <ToolTrace trace={trace}/>,

		value: issues => {

			return issues.length === 0 ? (

				<AnalysisNotPerformedPrompt onAnalyze={actions.refresh}/>

			) : (

				<ToolKanban

					cols={states}
					rows={severities}
					items={[...issues].sort((x, y) => x.title.localeCompare(y.title))}

					toCol={(issue) => issue.state}
					toRow={(issue) => issue.severity}

					toCard={(item: Issue) => <Card key={item.id}

						issue={item}
						actions={actions}

					/>}

					onToggleRow={toggleSeverity}
					onToggleCol={toggleState}

				/>

			);
		}

	});

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function Card({

	issue,
	actions

}: {

	issue: Issue;
	actions: IssuesActions;

}) {

	const [isOpen, setIsOpen] = useState(false);


	function close() {
		return setIsOpen(false);
	}


	return <Popup

		isOpen={isOpen}
		shouldReturnFocus={false}

		placement="bottom-start"

		trigger={() => <Pressable

			xcss={xcss({

				paddingBlock: "space.050",
				paddingInline: "space.100",

				borderRadius: "border.radius",
				borderWidth: "border.width",
				borderStyle: "solid",

				...(isOpen ? RedColors : BlueColors)

			})}

			onClick={() => setIsOpen(true)}

		>

			<Text align="start" size="small" weight="medium">{issue.title}</Text>

		</Pressable>}

		content={() => <Box xcss={xcss({ maxWidth: "75em" })}>
			<ToolIssue issue={issue} actions={actions}/>
		</Box>}

		onClose={close}

	/>;

}
