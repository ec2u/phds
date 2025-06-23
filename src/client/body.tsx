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
import { ToolArchive } from "./hooks/archives";
import { ToolBar } from "./views/layouts/bar";
import { ToolAgreement } from "./views/lenses/agreement";
import { ToolChat } from "./views/lenses/chat";
import { ToolIssues } from "./views/lenses/issues";
import { ToolLanguage } from "./views/lenses/language";
import { ToolReference } from "./views/lenses/reference";
import { ToolReferences } from "./views/lenses/references";
import { ToolWork } from "./views/lenses/work";


const enum Tab {
	Agreement,
	References,
	Issues,
	Chat,
	Work
}

const tabs=[
	{ tab: Tab.Agreement, label: "Agreement" },
	{ tab: Tab.References, label: "References" },
	{ tab: Tab.Issues, label: "Issues", disabled: true },
	{ tab: Tab.Chat, label: "Chat", disabled: true },
	{ tab: Tab.Work, label: "Work" }
];


function ToolBody() {

	const context=useProductContext();
	const config=useConfig();

	const body=context?.extension?.macro?.body;


	const [tab, setTab]=useState<Tab | Source>(Tab.Agreement); // !!!
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
				: tab === Tab.References ? <ToolReferences onClick={setTab}/>
					: tab === Tab.Issues ? <ToolIssues/>
						: tab === Tab.Chat ? <ToolChat/>
							: tab === Tab.Work ? <ToolWork/>
								: <ToolReference source={tab} language={language}/>

		}

	</>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

ForgeReconciler.render(
	<React.StrictMode>

		<ToolArchive>
			<ToolBody/>
		</ToolArchive>

	</React.StrictMode>
);
