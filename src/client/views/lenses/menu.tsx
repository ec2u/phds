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

import { Button, Popup, Stack } from "@forge/react";
import React, { useState } from "react";
import { Activity, isActivity, Observer } from "../../../shared/tasks";

export interface Handler {

	<T>(observer: Observer<T>): void;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function ToolMenu({

	actions


}: {

	actions: Record<string, Handler>

}) {

	const [open, setOpen]=useState<boolean | Activity>(false);


	function call(handler: Handler) {
		setOpen(Activity.Submitting);
		handler(status => setOpen(isActivity(status) ? status : false));
	}


	return <Popup

		isOpen={open === true}

		role={"menu"}
		placement="bottom-end"

		onClose={() => setOpen(false)}

		trigger={() => <Button

			isSelected={open === true}
			isDisabled={isActivity(open)}

			appearance="default"
			iconBefore={isActivity(open) ? "more" : "settings"}

			onClick={() => setOpen(!open)}

		>{""}</Button>}

		content={() => <Stack>{Object.entries(actions).map(([name, handler]) =>
			<Button key={name} appearance={"subtle"}
				onClick={() => call(handler)}>{name}</Button>
		)}</Stack>}

	/>;
}
