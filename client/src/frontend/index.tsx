import { invoke } from "@forge/bridge";
import ForgeReconciler, { AdfRenderer, CodeBlock, useConfig, useProductContext } from "@forge/react";
import React, { useEffect, useState } from "react";

function Macro() {

	const context=useProductContext();
	const config=useConfig();

	const macroBody=context?.extension?.macro?.body;

	const [data, setData]=useState<string>();

	useEffect(() => {
		invoke<string>("getText", { example: "my-invoke-variable" }).then(setData);
	}, []);

	return <>

		<CodeBlock language="json" text={JSON.stringify(config, null, 2)}/>

		{macroBody && <AdfRenderer document={macroBody}/>}

	</>;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

ForgeReconciler.render(
	<React.StrictMode>
		<Macro/>
	</React.StrictMode>
);
