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
import { ToolClear } from "./views/lenses/clear";
import { ToolDashboard } from "./views/lenses/dashboard";
import { ToolIssues } from "./views/lenses/issues";
import { ToolPolicies } from "./views/lenses/policies";
import { ToolPolicy } from "./views/lenses/policy";


function ToolBody() {

	const context = useProductContext();
	const config = useConfig();
	const body = context?.extension?.macro?.body;


	const modes = {

		"Dashboard": () => <ToolDashboard language={language}/>,
		"Agreement": () => <ToolAgreement language={language}/>,
		"Policies": () => <ToolPolicies onClick={setMode}/>,
		"Issues": () => <ToolIssues language={language}/>

	};

	const [mode, setMode] = useState<keyof typeof modes | Source>(Object.keys(modes)[0]);
	const [language, setLanguage] = useState<Language>(defaultLanguage);


	return <>

		<ToolBar

			menu={<ButtonGroup>{Object.keys(modes).map((name) =>
				<Button key={name} isSelected={mode === name}

					onClick={() => setMode(name)}

				>{name}</Button>
			)}</ButtonGroup>}


			more={<ButtonGroup>

				{/* <ToolLanguage locale={language} onChange={setLanguage}/> */}
				<ToolClear/>

			</ButtonGroup>}

		/>


		{

			mode in modes
				? modes[mode as keyof typeof modes]()
				: <ToolPolicy source={mode} language={language}/>

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
