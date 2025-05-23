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
	AdfRenderer,
	Button,
	ButtonGroup,
	EmptyState,
	Inline,
	Select,
	useConfig,
	useProductContext
} from "@forge/react";
import React, { useEffect, useState } from "react";
import getText from "./ports/text";
import { ToolPanel } from "./tiles/panel";

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


function Config() {

	const [value, setValue]=useState("");
	const config=useConfig();


	const context=useProductContext();
	const macroBody=context?.extension?.macro?.body;


	const {
		error,
		message,
		submit
	}=useSubmit();

	// useEffect(() => {
	// 	setValue(config?.myField);
	// }, [config?.myField]);


	useEffect(() => {
		getText({ name: "babbo" }).then(setValue);
	}, []);


	return <Inline shouldWrap={false} alignBlock={"stretch"} grow={"fill"} space={"space.400"}>

		<ToolPanel

			menu={
				<ButtonGroup>
					<Button>Agreement</Button>
					<Button>References</Button>
				</ButtonGroup>
			}

			more={
				<Select isRequired={true} defaultValue={{ label: "English", "value": "en" }}
					spacing={"compact"} options={[
					{ label: "Deutsch", value: "de" },       // German
					{ label: "English", value: "en" },       // English
					{ label: "Español", value: "es" },       // Spanish
					{ label: "Français", value: "fr" },      // French
					{ label: "Italiano", value: "it" },      // Italian
					{ label: "Português", value: "pt" },     // Portuguese
					{ label: "Română", value: "ro" },        // Romanian
					{ label: "Suomi", value: "fi" },         // Finnish
					{ label: "Svenska", value: "sv" }        // Swedish
				]}/>
			}

		>

			{macroBody && <AdfRenderer document={macroBody}/>}

		</ToolPanel>

		<ToolPanel

			menu={
				<ButtonGroup>
					<Button>Highlights</Button>
					<Button isDisabled={true}>Chat</Button>
				</ButtonGroup>
			}

			more={
				<Button>Reset</Button>
			}

		>

			<EmptyState header={value}/>

		</ToolPanel>

	</Inline>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

ForgeReconciler.render(
	<React.StrictMode>
		<Config/>
	</React.StrictMode>
);
