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

import ForgeReconciler, {
	AdfRenderer,
	Box,
	CodeBlock,
	EmptyState,
	Tab,
	TabList,
	TabPanel,
	Tabs,
	useConfig,
	useProductContext
} from "@forge/react";
import { json } from "node:stream/consumers";
import React, { useEffect, useState } from "react";
import { Attachment } from "../shared/attachments";
import { createAttachment, listAttachments } from "./ports/attachments";
import { translate } from "./ports/gemini";
import { ToolReferences } from "./views/references";

function Macro() {

	const context=useProductContext();
	const config=useConfig();

	const macroBody=context?.extension?.macro?.body;

	const [data, setData]=useState<string>();
	const [attachments, setAttachments]=useState<Attachment[]>();


	useEffect(() => {
		translate({
			source: { title: "test", locale: "it", content: "Quel ramo del lago di Como che vogle ad oriente" },
			target: "en"
		}).then(setData);
	}, []);

	useEffect(() => {
		listAttachments().then(setAttachments);
	}, []);


	return <Tabs id="default">

		<TabList>
			<Tab>References</Tab>
			<Tab>Text</Tab>
			<Tab>Issues</Tab>

		</TabList>

		<TabPanel>
			<Box padding="space.300">

				<ToolReferences attachments={attachments} onClick={attachment =>
					createAttachment(attachment).then(setData)
				}/>

				<CodeBlock language={"json"} text={data ?? ""}/>

			</Box>
		</TabPanel>

		<TabPanel>
			<Box padding="space.300">
				{macroBody && <AdfRenderer document={macroBody}/>}
			</Box>
		</TabPanel>

		<TabPanel>
			<Box padding="space.300">
				<EmptyState header={"Work in progress…"}/>
				<CodeBlock language={"json"} text={data ?? ""}/>
			</Box>
		</TabPanel>

	</Tabs>;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

ForgeReconciler.render(
	<React.StrictMode>
		<Macro/>
	</React.StrictMode>
);
