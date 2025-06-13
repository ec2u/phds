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

import ForgeReconciler, { Button, ButtonGroup, EmptyState, useConfig, useProductContext } from "@forge/react";
import React, { useState } from "react";
import { Attachment } from "../shared/attachments";
import { defaultLocale, Locale } from "../shared/languages";
import { ToolBar } from "./views/layouts/bar";
import { ToolLanguage } from "./views/lenses/language";
import { ToolReference } from "./views/lenses/reference";
import { ToolReferences } from "./views/lenses/references";
import { ToolText } from "./views/lenses/text";


const enum Mode {
	Agreement,
	References,
	Issues,
	Chat
}

const tabs=[
	{ mode: Mode.Agreement, label: "Agreement", disabled: false },
	{ mode: Mode.References, label: "References", disabled: false },
	{ mode: Mode.Issues, label: "Issues", disabled: true },
	{ mode: Mode.Chat, label: "Chat", disabled: true }
];


function ToolMacro() {

	const context=useProductContext();
	const config=useConfig();

	const macroBody=context?.extension?.macro?.body;


	const [mode, setMode]=useState<Mode | Attachment>(Mode.References); // !!!
	const [locale, setLocale]=useState<Locale>(defaultLocale);

	return <>

		<ToolBar

			menu={<ButtonGroup>{tabs.map(({ mode: tab, label, disabled }) =>
					<Button key={tab} isSelected={mode === tab} isDisabled={disabled}

						onClick={() => setMode(tab)}

					>{label}</Button>
			)}</ButtonGroup>}


			more={<ToolLanguage locale={locale} onChange={setLocale}/>}

		/>


		{

			mode === Mode.Agreement ? <ToolText>{macroBody}</ToolText>
				: mode === Mode.References ? <ToolReferences onClick={setMode}/>
					: mode === Mode.Issues ? <EmptyState header={"Work in progress…"}/>
						: mode === Mode.Chat ? <EmptyState header={"Work in progress…"}/>
							: <ToolReference locale={locale}>{mode}</ToolReference>

		}

	</>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

ForgeReconciler.render(
	<React.StrictMode>
		<ToolMacro/>
	</React.StrictMode>
);
