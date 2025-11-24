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
import React, { useMemo, useState } from "react";
import { isTrace } from "../../../shared";
import { Document } from "../../../shared/documents";
import { Issue, Severities, Severity, State, States } from "../../../shared/issues";
import { Language } from "../../../shared/languages";
import { isActivity, Status } from "../../../shared/tasks";
import { useAgreement } from "../../hooks/agreement";
import { useIssues } from "../../hooks/issues";
import { ToolActivity } from "./activity";
import ToolIssue, { severityLabel, stateLabel } from "./issue";
import { ToolTrace } from "./trace";


function isContent(value: Status<Document>): value is Document {
	return !isActivity(value) && !isTrace(value);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function ToolIssues({

	language

}: {

	language: Language

}) {

	const agreement = useAgreement(language);
	const [issues, actions] = useIssues(isContent(agreement) ? agreement.content : "");

	const [state, setState] = useState<readonly State[]>();
	const [severity, setSeverity] = useState<readonly Severity[]>();


	function hasSeverity(issue: Issue) { return !severity?.length || severity.includes(issue.severity); }

	function hasState(issue: Issue) { return !state?.length || state.includes(issue.state); }


	const sorted = useMemo(() => {

		if ( Array.isArray(issues) ) {

			return (issues as readonly Issue[])
				.filter(hasState)
				.filter(hasSeverity)
				.sort((x, y) => {

					const xOrder = States.indexOf(x.state);
					const yOrder = States.indexOf(y.state);

					return xOrder !== yOrder ? xOrder-yOrder
						: x.severity !== y.severity ? y.severity-x.severity
							: x.title.localeCompare(y.title);

				});

		} else {

			return [];

		}

	}, [issues, state, severity]);


	if ( isActivity(agreement) ) {

		return <ToolActivity activity={agreement}/>;

	} else if ( isTrace(agreement) ) {

		return <ToolTrace trace={agreement}/>;

	} else if ( isActivity(issues) ) {

		return <ToolActivity activity={issues}/>;

	} else if ( isTrace(issues) ) {

		return <ToolTrace trace={issues}/>;

	} else if ( !agreement.content.trim() ) {

		return <EmptyState header={"No Agreement Text"}
			description={"Enter Confluence \"Edit\" mode to modify."}
		/>;

	} else {

		const count = sorted.length;
		const total = issues.length;

		const states = States.map(value => ({
			value,
			label: stateLabel(value),
			isDisabled: !issues.filter(hasSeverity).some(({ state }) => value === state)
		}));

		const severities = Severities.map(value => ({
			value,
			label: severityLabel(value),
			isDisabled: !issues.filter(hasState).some(({ severity }) => value === severity)
		}));


		return <Stack space="space.200">

			<Inline space={"space.200"} alignBlock="center" shouldWrap={false}>

				<Inline space={"space.150"} grow={"fill"}>

					<Select

						isMulti={true}
						isSearchable={true}
						isClearable={true}

						spacing={"compact"}
						placeholder={"State"}

						value={state?.map(s => states.find(st => st.value === s))}
						options={states}

						onChange={(options: undefined | typeof states[number][]) =>
							setState(options?.map(option => option.value))
						}

					/>

					<Select id={"severity"}

						isMulti={true}
						isSearchable={true}
						isClearable={true}

						spacing="compact"
						placeholder={"Severity"}

						value={severity?.map(s => severities.find(sev => sev.value === s))}
						options={severities}

						onChange={(options: undefined | typeof severities[number][]) =>
							setSeverity(options?.map(option => option.value))
						}

					/>

					<Text weight={"bold"}>{
						total === 0 ? "No Issues"
							: state?.length || severity?.length ? `${count}/${total} Issue${total === 1 ? "" : "s"}`
								: `${total} Issue${total === 1 ? "" : "s"}`
					}</Text>

				</Inline>

				<Button appearance={"discovery"} onClick={actions.refresh}>Refresh Analysis</Button>

			</Inline>

			{sorted.map(issue => <ToolIssue key={issue.id} issue={issue} actions={actions}/>)}

		</Stack>;

	}

}
