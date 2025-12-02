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

import ForgeReconciler, { Box, Button, ButtonGroup, Code, EmptyState, Icon, Text, xcss } from "@forge/react";
import React, { useState } from "react";
import { Activity, on } from "../shared/tasks";
import { ToolCache } from "./hooks/cache";
import { useContent } from "./hooks/content";
import { useIssues } from "./hooks/issues";
import { usePolicies } from "./hooks/policies";
import { Rule } from "./views/index";
import { ToolBar } from "./views/layouts/bar";
import { ToolActivity } from "./views/lenses/activity";
import { ToolClear } from "./views/lenses/clear";
import { ToolDashboard } from "./views/lenses/dashboard";
import { ToolIssues } from "./views/lenses/issues";
import { ToolPolicies } from "./views/lenses/policies";
import { ToolTrace } from "./views/lenses/trace";


enum Tab {
	Agreement = "Agreement",
	Policies = "Policies",
	Issues = "Issues",
	Dashboard = "Dashboard"
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function ToolMacro() {

	const [agreement] = useContent();

	const policies = usePolicies();
	const [issues, actions] = useIssues();

	const [selected, setSelected] = useState(Tab.Agreement);


	const ready = !!agreement && on(policies, {

		state: false,
		trace: false,
		value: true

	}) && on(issues, {

		state: false,
		trace: false,
		value: true

	});


	function button(tab: Tab, disabled?: boolean) {
		return <Button

			isSelected={selected === tab}
			isDisabled={disabled}

			onClick={() => setSelected(tab)}

		>{tab}</Button>;
	}


	return <Box xcss={xcss({

		...(ready && selected === Tab.Agreement ? {} : Rule)

	})}>

		<ToolBar

			menu={<ButtonGroup>

				{button(Tab.Agreement)}
				{button(Tab.Policies, !ready)}
				{button(Tab.Issues, !ready)}
				{button(Tab.Dashboard, !ready)}

			</ButtonGroup>}

			more={<ButtonGroup>

				<ToolClear isDisabled={!ready || selected === Tab.Agreement}/>

			</ButtonGroup>}

		/>

		{agreement === undefined ? (

			<ToolActivity activity={Activity.Fetching}/>

		) : agreement === null ? (

			<EmptyState
				header={"Corrupted Document"}
				description={"The expected document structure was corrupted.\n"+
					"Save content and attachments and recreate from scratch."
				}
				primaryAction={<Icon label={""} glyph={"error"} size={"large"} color={"color.icon.warning"}/>}
			/>

		) : !agreement ? (

			<EmptyState
				header={"No Agreement Text"}
				description={<Text>Enter Confluence <Code>Edit</Code> mode to update.</Text>}
			/>

		) : on(policies, {

			state: activity => <ToolActivity activity={activity}/>,
			trace: trace => <ToolTrace trace={trace}/>,

			value: policies => on(issues, {

				state: activity => <ToolActivity activity={activity}/>,
				trace: trace => <ToolTrace trace={trace}/>,

				value: issues => {

					return Object.keys(policies).length === 0 ? (

						<EmptyState header={"No Policy Documents"}
							description={<Text>Upload PDF documents to the <Code>Attachments</Code> area below.</Text>}
						/>

					) : selected === Tab.Policies ? (

						<ToolPolicies policies={policies}/>

					) : selected === Tab.Issues ? (

						<ToolIssues issues={[issues, actions]}/>

					) : selected === Tab.Dashboard ? (

						<ToolDashboard issues={[issues, actions]}/>

					) : null;

				}

			})
		})}

	</Box>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

ForgeReconciler.render(
	<React.StrictMode>

		<ToolCache>
			<ToolMacro/>
		</ToolCache>

	</React.StrictMode>
);
