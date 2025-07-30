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

import ForgeReconciler, { Box, Button, ButtonGroup, Inline, useConfig, xcss } from "@forge/react";
import React, { useState } from "react";
import { Source } from "../shared/documents";
import { defaultLanguage, Language } from "../shared/languages";
import { ToolCache } from "./hooks/cache";
import { ToolBar } from "./views/layouts/bar";
import ToolPanel from "./views/layouts/panel";
import { ToolAgreement } from "./views/lenses/agreement";
import { ToolClear } from "./views/lenses/clear";
import { ToolIssues } from "./views/lenses/issues";
import { ToolLanguage } from "./views/lenses/language";
import { ToolPolicies } from "./views/lenses/policies";
import { ToolPolicy } from "./views/lenses/policy";


const modes={
	"agreement": "Agreement",
	"references": "References"
} as const;


// const useSubmit=() => {
//
// 	const [error, setError]=useState<boolean>();
// 	const [message, setMessage]=useState("");
//
// 	const submit=async (fields: any) => { // !!! fields type
//
// 		const payload={ config: fields };
//
// 		try {
//
// 			await view.submit(payload);
//
// 			setError(false);
// 			setMessage(`Submitted successfully.`);
//
// 		} catch ( error: any ) { // !!! error type
//
// 			setError(true);
// 			setMessage(`${error.code}: ${error.message}`);
// 		}
//
// 	};
//
// 	return {
// 		error,
// 		message,
// 		submit
// 	};
//
// };


function ToolTool() {

	const config=useConfig();

	const [mode, setMode]=useState<keyof typeof modes | Source>("agreement");
	const [language, setLanguage]=useState<Language>(defaultLanguage);


	return <Inline shouldWrap={false} alignBlock={"stretch"} grow={"fill"} space={"space.500"}>

		<Box xcss={xcss({ width: "50%" })}>

			<ToolPanel header={<ToolBar


				menu={<>

					<ButtonGroup>{Object.entries(modes).map(([name, label]) =>
						<Button key={name} isSelected={mode === name}

							onClick={() => setMode(name as keyof typeof modes)}

						>{label}</Button>
					)}</ButtonGroup>

				</>}

				more={<ToolLanguage locale={language} onChange={setLanguage}/>}

			/>}>{

				mode === "agreement" ? <ToolAgreement language={language}/>
					: mode === "references" ? <ToolPolicies onClick={setMode}/>
						: <ToolPolicy language={language} source={mode}/>

			}</ToolPanel>

		</Box>

		<Box xcss={xcss({ width: "50%" })}>

			<ToolPanel header={<ToolBar

				menu={
					<ButtonGroup>
						<Button>Issues</Button>
						<Button isDisabled={true}>Chat</Button>
					</ButtonGroup>
				}

				more={<ToolClear/>}

			/>}>

				<ToolIssues language={language}/>

			</ToolPanel>

		</Box>

	</Inline>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

ForgeReconciler.render(
	<React.StrictMode>

		<ToolCache>
			<ToolTool/>
		</ToolCache>

	</React.StrictMode>
);
