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

import { LoadingButton, Text } from "@forge/react";
import React, { useState } from "react";
import { isActivity, Status, TestTask } from "../../../shared/tasks";
import { monitorTask, submitTask } from "../../ports/tasks";
import { ToolActivity } from "./activity";


export function ToolWork({}: {}) {

	const [status, setStatus]=useState<Status<any>>();
	const [loading, setLoading]=useState(false);

	async function handleSubmit() {
		setLoading(true);

		try {
			// Submit test task
			const jobId=await submitTask({
				type: "test",
				value: "Test task from UI"
			} as TestTask);

			// Start polling
			const pollInterval=setInterval(async () => {
				const result=await monitorTask(jobId);
				setStatus(result);

				console.log(result);

				// Stop polling when complete or failed
				if ( !isActivity(result) ) {
					clearInterval(pollInterval); // !!! handle trace
					setLoading(false);
				}
			}, 1000); // Poll every 2 seconds

		} catch ( error ) {
			console.error("Task submission failed:", error);
			setLoading(false);
		}
	}

	return <>
		<LoadingButton
			onClick={handleSubmit}
			isLoading={loading}
		>
			Submit Test Task
		</LoadingButton>

		{isActivity(status)
			? <ToolActivity>{status}</ToolActivity>
			: <Text>{JSON.stringify(status, null, 2)}</Text>
		}

	</>;

}
