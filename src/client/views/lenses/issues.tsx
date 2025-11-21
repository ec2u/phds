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
import { State } from "../../../shared/issues";
import { Language } from "../../../shared/languages";
import { isActivity, Status } from "../../../shared/tasks";
import { useAgreement } from "../../hooks/agreement";
import { useIssues } from "../../hooks/issues";
import { ToolActivity } from "./activity";
import ToolIssue from "./issue";
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

	const agreement=useAgreement(language);
	const [issues, actions]=useIssues(isContent(agreement) ? agreement.content : "");

	const [stateFilter, setStateFilter] = useState<State | "open" | "all">("open");
	const [severityFilter, setSeverityFilter] = useState<1 | 2 | 3 | "all">("all");

	const sorted=useMemo(() => {

		if ( Array.isArray(issues) ) {

			return issues
				.filter(issue => {

					// filter by state

					if ( stateFilter === "open" && issue.state === State.Resolved ) {
						return false;
					} else if ( stateFilter !== "all" && stateFilter !== "open" && issue.state !== stateFilter ) {
						return false;
					}

					// filter by severity

					if ( severityFilter !== "all" && issue.severity !== severityFilter ) {
						return false;
					}

					return true;

				})
				.sort((x, y) => {

				// first: open issues before resolved issues

				const xIsOpen = x.state !== State.Resolved;
				const yIsOpen = y.state !== State.Resolved;

				if ( xIsOpen !== yIsOpen ) { return xIsOpen ? -1 : 1; }

				// second: for resolved issues, sort by updated timestamp (desc)

				if ( x.state === State.Resolved && y.state === State.Resolved && x.updated && y.updated ) {

					const xUpdated=new Date(x.updated).getTime();
					const yUpdated=new Date(y.updated).getTime();

					if ( xUpdated !== yUpdated ) { return yUpdated - xUpdated; }

				}

				// third: priority (desc)

				if ( x.severity !== y.severity ) { return y.severity - x.severity; }

				// fourth: title (asc)

				return x.title.localeCompare(y.title);

			});

		} else {

			return [];

		}

	}, [issues, stateFilter, severityFilter]);


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

		return <Stack space="space.200">

			<Inline spread={"space-between"} alignBlock="center">

				<Inline space="space.100" alignBlock="center">

					<Button
						appearance="subtle"
						onClick={() => {
							setStateFilter("open");
							setSeverityFilter("all");
						}}
					>
						Reset Filters
					</Button>


					<Select
						appearance="default"
						spacing="compact"
						value={{
							value: stateFilter,
							label: stateFilter === "all"
								? "All States"
								: stateFilter === "open"
									? "Open Issues"
									: stateFilter.charAt(0).toUpperCase()+stateFilter.slice(1)
						}}
						onChange={(option) => setStateFilter(option.value as State | "open" | "all")}
						options={[
							{ value: "open", label: "Open Issues" },
							{ value: "all", label: "All States" },
							{ value: State.Pending, label: "Pending" },
							{ value: State.Active, label: "Active" },
							{ value: State.Blocked, label: "Blocked" },
							{ value: State.Resolved, label: "Resolved" }
						]}
					/>

					<Select
						appearance="default"
						spacing="compact"
						value={{
							value: severityFilter,
							label: severityFilter === "all"
								? "All Severities"
								: `${"★".repeat(severityFilter)}${"☆".repeat(3-severityFilter)}`
						}}
						onChange={(option) => setSeverityFilter(option.value as 1 | 2 | 3 | "all")}
						options={[
							{ value: "all", label: "All Severities" },
							{ value: 1, label: "★☆☆" },
							{ value: 2, label: "★★☆" },
							{ value: 3, label: "★★★" }
						]}
					/>

					<Text>
						Showing {count} of {total} issue{total === 1 ? "" : "s"}
					</Text>

				</Inline>

				<Button appearance={"discovery"} onClick={actions.refresh}>Refresh Analysis</Button>

			</Inline>

			{sorted.map(issue => <ToolIssue key={issue.id} issue={issue} actions={actions}/>)}

		</Stack>;

	}

}
