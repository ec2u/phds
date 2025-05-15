import { invoke } from "@forge/bridge";
import ForgeReconciler, { Text } from "@forge/react";
import React, { useEffect, useState } from "react";

const App=() => {

	const [data, setData]=useState<string>();

	useEffect(() => {
		invoke<string>("getText", { example: "my-invoke-variable" }).then(x => setData(x));
	}, []);

	return (
		<>
			<Text>Hello {data ? data : "‹loading›"}!</Text>
		</>
	);
};

ForgeReconciler.render(
	<React.StrictMode>
		<App/>
	</React.StrictMode>
);
