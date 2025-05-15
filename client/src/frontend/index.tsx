import { invoke } from "@forge/bridge";
import ForgeReconciler, { AdfRenderer, useProductContext } from "@forge/react";
import React, { useEffect, useState } from "react";

const App=() => {

	const context=useProductContext();
	const macroBody=context?.extension?.macro?.body;

	const [data, setData]=useState<string>();

	useEffect(() => {
		invoke<string>("getText", { example: "my-invoke-variable" }).then(x => setData(x));
	}, []);

	return macroBody && <AdfRenderer document={macroBody}/>;
};

ForgeReconciler.render(
	<React.StrictMode>
		<App/>
	</React.StrictMode>
);
