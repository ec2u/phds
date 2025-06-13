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
import { Attachment } from "../shared/attachments";
import { defaultLocale, Locale } from "../shared/languages";
import { ToolBar } from "./views/layouts/bar";
import { ToolChat } from "./views/lenses/chat";
import { ToolIssues } from "./views/lenses/issues";
import { ToolLanguage } from "./views/lenses/language";
import { ToolReference } from "./views/lenses/reference";
import { ToolReferences } from "./views/lenses/references";
import { ToolText } from "./views/lenses/text";


const enum Tab {
	Agreement,
	References,
	Issues,
	Chat
}

const tabs=[
	{ tab: Tab.Agreement, label: "Agreement", disabled: false },
	{ tab: Tab.References, label: "References", disabled: false },
	{ tab: Tab.Issues, label: "Issues", disabled: false },
	{ tab: Tab.Chat, label: "Chat", disabled: true }
];


function ToolMacro() {

	const context=useProductContext();
	const config=useConfig();

	const body=context?.extension?.macro?.body;


	const [tab, setTab]=useState<Tab | Attachment>(Tab.Issues); // !!!
	const [locale, setLocale]=useState<Locale>(defaultLocale);


	return <>

		<ToolBar

			menu={<ButtonGroup>{tabs.map(({ tab: selected, label, disabled }) =>
				<Button key={selected} isSelected={tab === selected} isDisabled={disabled}

					onClick={() => setTab(selected)}

				>{label}</Button>
			)}</ButtonGroup>}


			more={<ToolLanguage locale={locale} onChange={setLocale}/>}

		/>


		{

			tab === Tab.Agreement ? <ToolText>{body}</ToolText>
				: tab === Tab.References ? <ToolReferences onClick={setTab}/>
					: tab === Tab.Issues ? <ToolIssues/>
						: tab === Tab.Chat ? <ToolChat/>
							: <ToolReference locale={locale}>{tab}</ToolReference>

		}

	</>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

ForgeReconciler.render(
	<React.StrictMode>
		<ToolMacro/>
	</React.StrictMode>
);
