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


import { Button, EmptyState, Inline, Select, Stack } from "@forge/react";
import React, { useState } from "react";
import { isTrace } from "../../../shared";
import { Document } from "../../../shared/documents";
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

	const [filter, setFilter]=useState<"open" | "resolved" | "all">("open");


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
			description={"Activate \"Edit (E)\" mode to modify."}
		/>;

	} else if ( !issues.length ) {

		return <EmptyState header={"No Open Issues"}
			primaryAction={<Button appearance={"discovery"} onClick={actions.refresh}>Analyse Agreement</Button>}
		/>;

	} else {

		const open=issues.filter(issue => !issue.resolved);
		const resolved=issues.filter(issue => issue.resolved);

		const options={
			open: {

				label: `${open.length === 0 ? "No" : open.length} open ${issue(open.length)}`,
				value: "open" as const,
				isDisabled: open.length === 0

			},
			resolved: {

				label: `${resolved.length === 0 ? "No" : resolved.length} resolved ${issue(resolved.length)}`,
				value: "resolved" as const,
				isDisabled: resolved.length === 0

			},
			all: {

				label: `${issues.length === 0 ? "No" : issues.length} total ${issue(issues.length)}`,
				value: "all" as const,
				isDisabled: issues.length === 0

			}
		};


		function issue(count: number) {
			return `issue${count === 1 ? "" : "s"}`;
		}


		return <Stack space="space.200">

			<Inline spread={"space-between"}>

				<Select

					appearance="default"
					spacing={"compact"}

					value={options[filter]}
					onChange={(option) => setFilter(option.value as "open" | "resolved" | "all")}

					options={Object.values(options)}

				/>

				<Button appearance={"discovery"} onClick={actions.refresh}>Refresh Analysis</Button>

			</Inline>

			{[...(filter === "open" ? open : filter === "resolved" ? resolved : issues)]
				.sort((x, y) => {

					// first: open issues before resolved issues

					const xIsOpen=!x.resolved;
					const yIsOpen=!y.resolved;

					if ( xIsOpen !== yIsOpen ) { return xIsOpen ? -1 : 1; }

					// second: for resolved issues, sort by resolution timestamp (desc)

					if ( x.resolved && y.resolved ) {

						const xResolved=new Date(x.resolved).getTime();
						const yResolved=new Date(y.resolved).getTime();

						if ( xResolved !== yResolved ) { return yResolved - xResolved; }

					}

					// third: priority (desc)

					if ( x.priority !== y.priority ) { return y.priority - x.priority; }

					// fourth: title (asc)

					return x.title.localeCompare(y.title);

				})
				.map(issue => <ToolIssue key={issue.id} issue={issue} actions={actions}/>)
			}

		</Stack>;

	}

}
