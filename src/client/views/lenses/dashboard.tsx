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

import {Box, Popup, Pressable, Text, xcss} from "@forge/react";
import React, {useState} from "react";
import {isTrace} from "../../../shared";
import {Document} from "../../../shared/items/documents";
import {Issue, Severities, Severity, State, States} from "../../../shared/items/issues";
import {isActivity, Status} from "../../../shared/tasks";
import {IssuesActions, useIssues} from "../../hooks/issues";
import ToolKanban, {Lane, toggle} from "../layouts/kanban";
import {ToolActivity} from "./activity";
import ToolIssue, {BlueColors, RedColors, SeverityColors, severityLabel, StateColors, stateLabel} from "./issue";
import {ToolTrace} from "./trace";


function isContent(value: Status<Document>): value is Document {
	return !isActivity(value) && !isTrace(value);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function ToolDashboard() {

	// !!! sorting
	// !!! empty swimlanes
	// !!! instable focus on annotation textarea

	const [issues, actions] = useIssues();

	const [states, setStates] = useState<readonly Lane<State>[]>(States.map(state => ({
		value: state,
		collapsed: state === "resolved",
		label: stateLabel(state),
		colors: StateColors[state]
	})));

	const [severities, setSeverities] = useState<readonly Lane<Severity>[]>(Severities.map(severity => ({
		value: severity,
		collapsed: false,
		label: severityLabel(severity),
		colors: SeverityColors[severity]
	})));


	function toggleState(state: State) {
		setStates(current => toggle(current, state));
	}

	function toggleSeverity(severity: Severity) {
		setSeverities(current => toggle(current, severity));
	}


	if (isActivity(issues)) {

		return <ToolActivity activity={issues}/>;

	} else if ( isTrace(issues) ) {

		return <ToolTrace trace={issues}/>;

	} else {

		return <ToolKanban

			cols={states}
			rows={severities}
			items={issues}

			toCol={(issue) => issue.state}
			toRow={(issue) => issue.severity}

			toCard={(item: Issue) => <Card key={item.id}

				issue={item}
				actions={actions}

			/>}

			onToggleRow={toggleSeverity}
			onToggleCol={toggleState}

		/>;

	}

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

		placement="bottom-start"
		shouldReturnFocus={true}

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
