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

import { invoke } from "@forge/bridge";
import ForgeReconciler, {
	AdfRenderer,
	Box,
	CodeBlock,
	Tab,
	TabList,
	TabPanel,
	Tabs,
	useConfig,
	useProductContext
} from "@forge/react";
import React, { useEffect, useState } from "react";
import listAttachments from "./ports/attachments";

function Macro() {

	const context=useProductContext();
	const config=useConfig();

	const macroBody=context?.extension?.macro?.body;

	const [data, setData]=useState<string>();
	const [json, setJSON]=useState<any>();

	useEffect(() => {
		invoke<string>("getText", { example: "my-invoke-variable" }).then(setData);
	}, []);

	useEffect(() => {
		listAttachments().then(setJSON);
	}, []);


	return <Tabs id="default">

		<TabList>
			<Tab>Text</Tab>
			<Tab>Configuration</Tab>
			<Tab>Attachments</Tab>
		</TabList>

		<TabPanel>
			<Box padding="space.300">
				{macroBody && <AdfRenderer document={macroBody}/>}
			</Box>
		</TabPanel>

		<TabPanel>
			<Box padding="space.300">
				<CodeBlock language="json" text={JSON.stringify(config, null, 2)}/>
			</Box>
		</TabPanel>

		<TabPanel>
			<CodeBlock language="json" text={JSON.stringify(json, null, 2)}/>
		</TabPanel>

	</Tabs>;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

ForgeReconciler.render(
	<React.StrictMode>
		<Macro/>
	</React.StrictMode>
);
