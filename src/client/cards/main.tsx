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

import ForgeReconciler, { Box, Button, ButtonGroup, Code, EmptyState, Icon, Text, xcss } from "@forge/react";
import React, { type ReactNode, useCallback, useState } from "react";
import { Activity, isActivity, isTrace } from "../../shared/store";
import { useAgreement } from "../hooks/agreement";
import { usePolicies } from "../hooks/policies";
import { ToolStore } from "../hooks/store";
import { Rule } from "../views/index";
import { ToolBar } from "../views/layouts/bar";
import { ToolActivity } from "../views/lenses/activity";
import { ToolDashboard } from "../views/lenses/dashboard";
import { ToolIssues } from "../views/lenses/issues";
import { ToolPolicies } from "../views/lenses/policies";


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
 * Main macro providing tabbed navigation and data loading orchestration.
 */
function ToolMain() {

	const agreement = useAgreement();
	const policies = usePolicies();

	const [tab, setTab] = useState(Tab.Agreement);
	const [actions, setActions] = useState<ReactNode>();


	const showActions = useCallback((node: ReactNode) => {

		setActions(node);

		return () => setActions(undefined);

	}, []);


	const loading = isActivity(agreement) || isActivity(policies);
	const stocked = !loading && Object.keys(policies).length > 0;
	const active = loading || !stocked || tab !== Tab.Agreement;


	function button(value: Tab, disabled?: boolean) {
		return <Button

			isSelected={tab === value}
			isDisabled={disabled}

			onClick={() => setTab(value)}

		>{value}</Button>;
	}


	return <Box xcss={xcss({

		...(active ? Rule : {})

	})}>

		<ToolBar

			menu={<ButtonGroup>

				{button(Tab.Agreement)}
				{button(Tab.Policies, loading)}
				{button(Tab.Issues, loading)}
				{button(Tab.Dashboard, loading)}

			</ButtonGroup>}

			more={actions}

		/>

		{loading ? (

			<ToolActivity activity={Activity.Fetching}/>

		) : isTrace(agreement) ? (

			<EmptyState
				header={"Agreement Unavailable"}
				description={"Failed to retrieve the agreement content.\n"+
					"Try reloading the page or contact support if the problem persists."
				}
				primaryAction={<Icon label={""} glyph={"error"} size={"large"} color={"color.icon.danger"}/>}
			/>

		) : isTrace(policies) ? (

			<EmptyState
				header={"Policies Unavailable"}
				description={"Failed to retrieve the policy catalogue.\n"+
					"Try reloading the page or contact support if the problem persists."
				}
				primaryAction={<Icon label={""} glyph={"error"} size={"large"} color={"color.icon.danger"}/>}
			/>

		) :agreement === null ? (

			<EmptyState
				header={"Corrupted Document"}
				description={"The expected document structure was corrupted.\n"+
					"Save content and attachments and recreate from scratch."
				}
				primaryAction={<Icon label={""} glyph={"error"} size={"large"} color={"color.icon.warning"}/>}
			/>

		) : !agreement.content ? (

			<EmptyState
				header={"No Agreement Text"}
				description={<Text>Enter Confluence <Code>Edit</Code> mode to update.</Text>}
			/>

		) : !stocked ? (

			<EmptyState header={"No Policy Documents"}
				description={<Text>Upload PDF documents to the <Code>Attachments</Code> area below.</Text>}
			/>

		) : tab === Tab.Policies ? (

			<ToolPolicies onActions={showActions}/>

		) : tab === Tab.Issues ? (

			<ToolIssues onActions={showActions}/>

		) : tab === Tab.Dashboard ? (

			<ToolDashboard onActions={showActions}/>

		) : null}

	</Box>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

ForgeReconciler.render(
	<React.StrictMode>

		<ToolStore>
			<ToolMain/>
		</ToolStore>

	</React.StrictMode>
);
