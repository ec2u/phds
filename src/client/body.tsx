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
import { execute } from "./hooks";
import { ToolCache, useCache } from "./hooks/cache";
import { ToolBar } from "./views/layouts/bar";
import { ToolAgreement } from "./views/lenses/agreement";
import { ToolChat } from "./views/lenses/chat";
import { ToolIssues } from "./views/lenses/issues";
import { ToolLanguage } from "./views/lenses/language";
import { ToolMenu } from "./views/lenses/menu";
import { ToolPolicies } from "./views/lenses/policies";
import { ToolPolicy } from "./views/lenses/policy";


const modes={
	"Agreement": false,
	"Policies": false,
	"Issues": false,
	"Chat": true
} as const;


function ToolBody() {

	const context=useProductContext();
	const config=useConfig();

	const body=context?.extension?.macro?.body;

	const { clearCache }=useCache();


	const [tab, setTab]=useState<keyof typeof modes | Source>("Issues");
	const [language, setLanguage]=useState<Language>(defaultLanguage);


	return <>

		<ToolBar

			menu={<ButtonGroup>{Object.entries(modes).map(([name, disabled]) =>
				<Button key={name} isSelected={tab === name} isDisabled={disabled}

					onClick={() => setTab(name)}

				>{name}</Button>
			)}</ButtonGroup>}


			more={<ButtonGroup>

				<ToolLanguage locale={language} onChange={setLanguage}/>

				<ToolMenu actions={{
					"Analyse Agreement": observer => {},
					"Clear All": observer => execute(observer, { type: "clear" }).then(clearCache)
				}}/>

			</ButtonGroup>}

		/>


		{

			tab === "Agreement" ? <ToolAgreement language={language}/>
				: tab === "Policies" ? <ToolPolicies onClick={setTab}/>
					: tab === "Issues" ? <ToolIssues/>
						: tab === "Chat" ? <ToolChat/>
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
