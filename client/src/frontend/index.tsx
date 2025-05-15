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

function Macro() {

	const context=useProductContext();
	const config=useConfig();

	const macroBody=context?.extension?.macro?.body;

	const [data, setData]=useState<string>();

	useEffect(() => {
		invoke<string>("getText", { example: "my-invoke-variable" }).then(setData);
	}, []);


	return <Tabs id="default">

		<TabList>
			<Tab>Text</Tab>
			<Tab>Configuration</Tab>
			<Tab>Lorem Ipsum</Tab>
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
			<Box padding="space.300">
				This is the content area of the third tab.
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
