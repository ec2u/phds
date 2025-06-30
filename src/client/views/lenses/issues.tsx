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


import { Button, EmptyState, Stack } from "@forge/react";
import React from "react";
import { isTrace } from "../../../shared";
import { isActivity } from "../../../shared/tasks";
import { useIssues } from "../../hooks/issues";
import { ToolActivity } from "./activity";
import ToolIssue from "./issue";
import { ToolTrace } from "./trace";

export function ToolIssues() {

	const issues=useIssues();


	function analyze() {

	}


	if ( isActivity(issues) ) {

		return <ToolActivity activity={issues}/>;

	} else if ( isTrace(issues) ) {

		return <ToolTrace trace={issues}/>;

	} else if ( !issues.length ) {

		return <EmptyState
			header={"No Open Issues"}
			primaryAction={<Button appearance={"discovery"} iconBefore={"lightbulb"}
				onClick={analyze}
			>Analyse Agreement</Button>}
		/>;

	} else {

		return <Stack space="space.200">{[...issues]
			.sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title))
			.map(issue => <ToolIssue key={issue.id} issue={issue}/>)}</Stack>;

	}

}
