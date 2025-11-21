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
	const [severity, setSeverity] = useState<Severity>();

	const sorted = useMemo(() => {

		if ( Array.isArray(issues) ) {

			return (issues as readonly Issue[])
				.filter(issue =>
					(!state?.length || state.includes(issue.state))
					&& (!severity || severity === issue.severity)
				)
				.sort((x, y) => {

					// first: open issues before resolved issues

					const xIsOpen = x.state !== "resolved";
					const yIsOpen = y.state !== "resolved";

					if ( xIsOpen !== yIsOpen ) { return xIsOpen ? -1 : 1; }

					// second: for resolved issues, sort by updated timestamp (desc)

					if ( x.state === "resolved" && y.state === "resolved" && x.updated && y.updated ) {

						const xUpdated = new Date(x.updated).getTime();
						const yUpdated = new Date(y.updated).getTime();

						if ( xUpdated !== yUpdated ) { return yUpdated-xUpdated; }

					}

					// third: priority (desc)

					if ( x.severity !== y.severity ) { return y.severity-x.severity; }

					// fourth: title (asc)

					return x.title.localeCompare(y.title);

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

		const states = Object.fromEntries(States.map(value => [value, {
			value,
			label: stateLabel(value),
			isDisabled: !sorted.some(({ state }) => value === state)
		}]));

		const severities = Object.fromEntries(Severities.map(value => [value, {
			value,
			label: severityLabel(value),
			isDisabled: !sorted.some(({ severity }) => value === severity)
		}]));


		return <Stack space="space.200">

			<Inline spread={"space-between"} alignBlock="center">

				<Inline space="space.100" alignBlock="center">

					<Select

						isMulti={true}
						isSearchable={true}
						isClearable={true}

						spacing={"compact"}
						placeholder={"State"}

						value={state?.map(s => states[s])}
						options={Object.values(states)}

						onChange={(options: undefined | typeof states[State][]) =>
							setState(options?.map(option => option.value))
						}


					/>

					<Select id={"severity"}

						isSearchable={true}
						isClearable={true}

						spacing="compact"
						placeholder={"Severity"}

						value={severity ? severities[severity] : undefined}
						options={Object.values(severities)}

						onChange={(option: undefined | typeof severities[Severity]) =>
							setSeverity(option?.value)
						}

					/>

					<Text>
						{count}/{total} Issue{total === 1 ? "" : "s"}
					</Text>

				</Inline>

				<Button appearance={"discovery"} onClick={actions.refresh}>Refresh Analysis</Button>

			</Inline>

			{sorted.map(issue => <ToolIssue key={issue.id} issue={issue} actions={actions}/>)}

		</Stack>;

	}

}
