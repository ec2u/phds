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

import ForgeReconciler, { Box, Button, ButtonGroup, Inline, Stack, useConfig, useProductContext } from "@forge/react";
import React, { useState } from "react";
import { Attachment } from "../shared/attachments";
import { defaultLanguage, Language } from "../shared/languages";
import { ToolArchive } from "./hooks/archives";
import { ToolBar } from "./views/layouts/bar";
import ToolPanel from "./views/layouts/panel";
import ToolIssue from "./views/lenses/issue";
import { ToolLanguage } from "./views/lenses/language";
import { ToolReference } from "./views/lenses/reference";
import { ToolReferences } from "./views/lenses/references";
import { ToolText } from "./views/lenses/text";


const modes={
	"agreement": "Agreement",
	"references": "References"
};


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

	const [mode, setMode]=useState<keyof typeof modes | Attachment>("agreement");
	const [language, setLanguage]=useState<Language>(defaultLanguage);


	const context=useProductContext();
	const macroBody=context?.extension?.macro?.body;


	return <Inline shouldWrap={false} alignBlock={"stretch"} grow={"fill"} space={"space.500"}>

		<Box xcss={{ width: "50%" }}>

			<ToolPanel header={<ToolBar


				menu={<>

					<ButtonGroup>{Object.entries(modes).map(([selected, label]) =>
						<Button key={selected} isSelected={mode === selected}

							onClick={() => setMode(selected as keyof typeof mode)}

						>{label}</Button>
					)}</ButtonGroup>

				</>}

				more={<ToolLanguage locale={language} onChange={setLanguage}/>}

			/>}>{

				mode === "agreement" ? <ToolText>{macroBody}</ToolText>
					: mode === "references" ? <ToolReferences onClick={setMode}/>
						: <ToolReference language={language}>{mode}</ToolReference>

			}</ToolPanel>

		</Box>

		<Box xcss={{ width: "50%" }}>

			<ToolPanel header={<ToolBar

				menu={
					<ButtonGroup>
						<Button>Issues</Button>
						<Button isDisabled={true}>Chat</Button>
					</ButtonGroup>
				}

				more={<Button>Refresh</Button>}

			/>}>

				<Stack space={"space.200"}>

					<ToolIssue/>
					<ToolIssue/>
					<ToolIssue/>
					<ToolIssue/>

				</Stack>

			</ToolPanel>

		</Box>

	</Inline>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

ForgeReconciler.render(
	<React.StrictMode>

		<ToolArchive>
			<ToolTool/>
		</ToolArchive>

	</React.StrictMode>
);
