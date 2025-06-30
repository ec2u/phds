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

import { Button } from "@forge/react";
import React, { useState } from "react";
import { Activity, isActivity, Status } from "../../../shared/tasks";
import { execute } from "../../hooks";

export function ToolClear() {

	const [clearing, setClearing]=useState<Status<void>>();


	function reset() {
		setClearing(Activity.Submitting);
		execute(setClearing, { type: "clear" });
	}


	return <Button

		isDisabled={isActivity(clearing)}

		appearance={"default"}
		iconBefore={"refresh"}

		onClick={reset}

	>{""}</Button>;
}
