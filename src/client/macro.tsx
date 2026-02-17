/*
 * Copyright © 2025-2026 EC2U Alliance
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

import ForgeReconciler, {
	Box,
	Button,
	ButtonGroup,
	Code,
	EmptyState,
	Icon,
	Text,
	useProductContext,
	xcss
} from "@forge/react";
import React, { useState } from "react";
import { Activity } from "../shared/index";
import { useAttachments } from "./hooks/attachments";
import { ToolCache } from "./hooks/cache";
import { useContent } from "./hooks/content";
import { Rule } from "./views/index";
import { ToolBar } from "./views/layouts/bar";
import { ToolActivity } from "./views/lenses/activity";
import { ToolDashboard } from "./views/lenses/dashboard";
import { ToolIssues, ToolIssuesActions } from "./views/lenses/issues";
import { ToolPolicies, ToolPoliciesActions } from "./views/lenses/policies";


/**
 * Main Confluence macro entry point.
 *
 * Renders the PhD Agreements Tool macro with tabbed navigation between agreement content, policy documents,
 * compliance issues, and the dashboard views.
 *
 * @module
 */


/**
 * Navigation tabs for the macro UI.
 */
enum Tab {
	Agreement = "Agreement",
	Policies = "Policies",
	Issues = "Issues",
	Dashboard = "Dashboard"
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Root macro component providing tabbed navigation and data loading orchestration.
 */
function ToolMacro() {

	const context = useProductContext();
	const page: string = context?.extension?.content?.id ?? "";

	const [agreement] = useContent();
	const attachments = useAttachments();

	const [selected, setSelected] = useState(Tab.Agreement);


	const ready = !!context && !!agreement && attachments !== undefined;
	const stocked = !!attachments && Object.keys(attachments).length > 0;
	const active = !ready || !stocked || selected !== Tab.Agreement;


	function button(tab: Tab, disabled?: boolean) {
		return <Button

			isSelected={selected === tab}
			isDisabled={disabled}

			onClick={() => setSelected(tab)}

		>{tab}</Button>;
	}


	return <Box xcss={xcss({

		...(active ? Rule : {})

	})}>

		<ToolBar

			menu={<ButtonGroup>

				{button(Tab.Agreement)}
				{button(Tab.Policies, !ready)}
				{button(Tab.Issues, !ready)}
				{button(Tab.Dashboard, !ready)}

			</ButtonGroup>}

			more={<>

				{selected === Tab.Policies && <ToolPoliciesActions/>}
				{selected === Tab.Issues && <ToolIssuesActions/>}
				{selected === Tab.Dashboard && <ToolIssuesActions/>}

			</>}

		/>

		{!ready ? (

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

		) : !stocked ? (

			<EmptyState header={"No Policy Documents"}
				description={<Text>Upload PDF documents to the <Code>Attachments</Code> area below.</Text>}
			/>

		) : selected === Tab.Policies ? (

			<ToolPolicies page={page}/>

		) : selected === Tab.Issues ? (

			<ToolIssues page={page}/>

		) : selected === Tab.Dashboard ? (

			<ToolDashboard page={page}/>

		) : null}

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
