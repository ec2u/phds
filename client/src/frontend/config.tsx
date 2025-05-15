import { view } from "@forge/bridge";
import ForgeReconciler, { Button, Label, SectionMessage, Stack, Textfield, useConfig } from "@forge/react";
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

		} catch ( error: any ) { // error type

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

	const {
		error,
		message,
		submit
	}=useSubmit();

	useEffect(() => {
		setValue(config?.myField);
	}, [config?.myField]);

	return <Stack space="space.200">

		<Label labelFor="myField">Config field:</Label>
		<Textfield id="myField" value={value} onChange={(e) => setValue(e.target.value)}/>
		<Button appearance="subtle" onClick={() => view.close()}>
			Close
		</Button>
		<Button appearance="primary" onClick={() => submit({ myField: value })}>
			Submit
		</Button>
		{typeof error !== "undefined" &&
            <SectionMessage appearance={error ? "error" : "success"}>{message}</SectionMessage>}

	</Stack>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

ForgeReconciler.render(
	<React.StrictMode>
		<Config/>
	</React.StrictMode>
);
