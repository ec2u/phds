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

import ForgeReconciler, { Button, ButtonGroup, useConfig, useProductContext } from "@forge/react";
import React, { useState } from "react";
import { Source } from "../shared/documents";
import { defaultLanguage, Language } from "../shared/languages";
import { ToolCache } from "./hooks/cache";
import { ToolBar } from "./views/layouts/bar";
import { ToolAgreement } from "./views/lenses/agreement";
import { ToolChat } from "./views/lenses/chat";
import { ToolIssues } from "./views/lenses/issues";
import { ToolLanguage } from "./views/lenses/language";
import { ToolPolicies } from "./views/lenses/policies";
import { ToolPolicy } from "./views/lenses/policy";


const enum Tab {
	Agreement,
	Policies,
	Issues,
	Chat,
}

const tabs=[
	{ tab: Tab.Agreement, label: "Agreement" },
	{ tab: Tab.Policies, label: "Policies" },
	{ tab: Tab.Issues, label: "Issues", disabled: true },
	{ tab: Tab.Chat, label: "Chat", disabled: true }
];


function ToolBody() {

	const context=useProductContext();
	const config=useConfig();

	const body=context?.extension?.macro?.body;


	const [tab, setTab]=useState<Tab | Source>(Tab.Policies); // !!!
	const [language, setLanguage]=useState<Language>(defaultLanguage);


	return <>

		<ToolBar

			menu={<ButtonGroup>{tabs.map(({ tab: selected, label, disabled }) =>
				<Button key={selected} isSelected={tab === selected} isDisabled={disabled}

					onClick={() => setTab(selected)}

				>{label}</Button>
			)}</ButtonGroup>}


			more={<ToolLanguage locale={language} onChange={setLanguage}/>}

		/>


		{

			tab === Tab.Agreement ? <ToolAgreement language={language}/>
				: tab === Tab.Policies ? <ToolPolicies onClick={setTab}/>
					: tab === Tab.Issues ? <ToolIssues/>
						: tab === Tab.Chat ? <ToolChat/>
							: <ToolPolicy source={tab} language={language}/>

		}

	</>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

ForgeReconciler.render(
	<React.StrictMode>

		<ToolCache>
			<ToolBody/>
		</ToolCache>

	</React.StrictMode>
);
