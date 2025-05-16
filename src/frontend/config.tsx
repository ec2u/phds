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

import { invoke, view } from "@forge/bridge";
import ForgeReconciler, {
	AdfRenderer,
	Box,
	Button,
	Inline,
	SectionMessage,
	Stack,
	Textfield,
	useConfig,
	useProductContext,
	xcss
} from "@forge/react";
import React, { useEffect, useState } from "react";

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
		invoke<string>("getText", { example: "my-invoke-variable" }).then(setValue);
	}, []);


	return <Inline shouldWrap={false} alignBlock={"stretch"} grow={"fill"}>

		{macroBody && <AdfRenderer document={macroBody}/>}

		<Box xcss={xcss({

			backgroundColor: "color.background.accent.purple.subtlest",
			padding: "space.200",
			borderColor: "color.border.discovery",
			borderWidth: "border.width",
			borderStyle: "solid",
			borderRadius: "border.radius",
			width: "240px",
			minHeight: "100%"

		})}>

			<Stack space="space.200" grow={"fill"}>

				<Textfield id="myField" value={value} onChange={(e) => setValue(e.target.value)}/>

				<Button appearance="primary" onClick={() => submit({ myField: value })}>
					Submit
				</Button>

				{typeof error !== "undefined" &&
                    <SectionMessage appearance={error ? "error" : "success"}>{message}</SectionMessage>}

			</Stack>


		</Box>

	</Inline>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

ForgeReconciler.render(
	<React.StrictMode>
		<Config/>
	</React.StrictMode>
);
