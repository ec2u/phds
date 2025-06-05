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
	EmptyState,
	Spinner,
	Tab,
	TabList,
	TabPanel,
	Tabs,
	Text,
	useConfig,
	useProductContext
} from "@forge/react";
import React, { useEffect, useState } from "react";
import { Content, isNull, isStatus, isUndefined } from "../shared";
import { Attachment } from "../shared/attachments";
import { listAttachments, retrieveAttachment } from "./ports/attachments";
import { translate } from "./ports/gemini";
import { ToolReferences } from "./views/references";


//// !!! //////////////////////////////////////////////////////////////////////////////////////////////////////////////

function monitor<T>(setter: (value: Content<T>) => void): (promise: Promise<T>) => void {
	return promise => {

		setter(null);

		promise.then(setter).catch(error =>
			setter(isStatus(error) ? error : { code: 999, text: JSON.stringify(error, null, 4) })
		);

	};
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function ToolMacro() {

	const context=useProductContext();
	const config=useConfig();

	const macroBody=context?.extension?.macro?.body;

	const [attachments, setAttachments]=useState<Attachment[]>();

	const [data, setData]=useState<Content<string>>();


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
					monitor(setData)(retrieveAttachment(attachment).then(value => {

						return translate({

							source: { title: attachment.title, content: value, locale: "en" }, // !!! locale
							target: "it"

						});

					}))
				}/>

				{isUndefined(data) ? undefined
					: isNull(data) ? <Spinner label={"Loading…"}/>
						: isStatus(data) ? <Text>{JSON.stringify(data)}</Text>
							: <Text>{data}</Text>
				}

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
			</Box>
		</TabPanel>

	</Tabs>;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

ForgeReconciler.render(
	<React.StrictMode>
		<ToolMacro/>
	</React.StrictMode>
);
