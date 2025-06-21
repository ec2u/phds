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

import { Queue } from "@forge/events";
import { Activity, isActivity, Status, Task } from "../../shared/tasks";
import { getStatus, setStatus } from "../async";
import { Request } from "../index";


const queue=new Queue({ key: "executor-queue" });


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export async function submitTask({ payload: task }: Request<Task>): Promise<string> {

	const id=await queue.push(task as any); // !!! typing errors

	await setStatus(id, Activity.Waiting); // create storage entry

	return id;
}

export async function monitorTask<T>({ payload: { id } }: Request<{ id: string }>): Promise<Status<T>> {

	const status=await getStatus<T>(id);

	if ( !isActivity(status) ) {
		await setStatus(id, undefined); // clean up storage after completion
	}

	return status;
}
