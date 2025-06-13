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

import { view } from "@forge/bridge";
import ForgeReconciler, {
	Box,
	Button,
	ButtonGroup,
	EmptyState,
	Inline,
	Stack,
	useConfig,
	useProductContext
} from "@forge/react";
import React, { useEffect, useState } from "react";
import { Attachment } from "../shared/attachments";
import { listAttachments } from "./ports/attachments";
import { ToolBar } from "./views/layouts/bar";
import ToolPanel from "./views/layouts/panel";
import ToolIssue from "./views/lenses/issue";
import { ToolLanguage } from "./views/lenses/language";
import { ToolReferences } from "./views/lenses/references";
import { ToolText } from "./views/lenses/text";

const useSubmit=() => {

	const [error, setError]=useState<boolean>();
	const [message, setMessage]=useState("");

	const submit=async (fields: any) => { // !!! fields type

		const payload={ config: fields };

		try {

			await view.submit(payload);

			setError(false);
			setMessage(`Submitted successfully.`);

		} catch ( error: any ) { // !!! error type

			setError(true);
			setMessage(`${error.code}: ${error.message}`);
		}

	};

	return {
		error,
		message,
		submit
	};

};


function ToolConfig() {

	const config=useConfig();

	const [mode, setMode]=useState<string>("agreement");

	const [value, setValue]=useState("");
	// const [json, setJSON]=useState<any>();


	const context=useProductContext();
	const macroBody=context?.extension?.macro?.body;

	const [attachments, setAttachments]=useState<Attachment[]>();


	const {
		error,
		message,
		submit
	}=useSubmit();

	// useEffect(() => {
	// 	setValue(config?.myField);
	// }, [config?.myField]);


	useEffect(() => {
		listAttachments().then(setAttachments);
	}, []);


	function doShowAgreement() {
		setMode("agreement");
	}

	function doShowReferences() {
		setMode("references");
	}

	function doShowReference(id: string) {
		setMode(id);
	}


	return <Inline shouldWrap={false} alignBlock={"stretch"} grow={"fill"} space={"space.500"}>

		<Box xcss={{ width: "50%" }}>

			<ToolPanel header={<ToolBar

				menu={
					<ButtonGroup>

						<Button appearance={mode === "agreement" ? "primary" : "default"}
							onClick={doShowAgreement}>Agreement</Button>

						<Button appearance={mode === "references" ? "primary" : "default"}
							onClick={doShowReferences}>References</Button>

					</ButtonGroup>
				}

				more={<ToolLanguage/>}

			/>}>{

				mode === "agreement" ? <ToolText>{macroBody}</ToolText>
					: mode === "references" ? <ToolReferences attachments={attachments}/>
						: null // !!! ToolReference()

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

				more={<Button>Reset</Button>}

			/>}>

				<Stack space={"space.200"}>

					<ToolIssue/>
					<ToolIssue/>
					<ToolIssue/>
					<ToolIssue/>

					<EmptyState header={value}/>

				</Stack>

				{/* <CodeBlock language={"json"} text={JSON.stringify(json, null, 4)}/> */}

			</ToolPanel>

		</Box>

	</Inline>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

ForgeReconciler.render(
	<React.StrictMode>
		<ToolConfig/>
	</React.StrictMode>
);
