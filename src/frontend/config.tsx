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
	ButtonGroup,
	EmptyState,
	Inline,
	Select,
	Stack,
	useConfig,
	useProductContext
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

		<Box xcss={{ width: "50%" }}>

			<Stack grow={"fill"} space={"space.050"} alignInline={"stretch"}>

				<Box xcss={{ flexGrow: 0 }}>
					<Inline>

						<Box xcss={{ flexGrow: 1 }}>
							<ButtonGroup>
								<Button>Agreement</Button>
								<Button>References</Button>
							</ButtonGroup>
						</Box>

						<Box>
							<Select isRequired={true} defaultValue={{ label: "English", "value": "en" }}
								spacing={"compact"} options={[
								{ label: "English", "value": "en" },
								{ label: "Finnish", "value": "fi" }
							]}/>
						</Box>

					</Inline>
				</Box>

				<Box xcss={{ flexGrow: 1 }}>{macroBody && <AdfRenderer document={macroBody}/>}</Box>

			</Stack>

		</Box>

		<Box xcss={{ width: "50%" }}>

			<EmptyState header={"Chat Area"}/>

		</Box>

	</Inline>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

ForgeReconciler.render(
	<React.StrictMode>
		<Config/>
	</React.StrictMode>
);
