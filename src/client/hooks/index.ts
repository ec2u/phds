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

import { Dispatch, SetStateAction } from "react";
import { asTrace } from "../../shared";
import { Activity, isActivity, Observer, Provider, Task } from "../../shared/tasks";
import { monitorTask, submitTask } from "../ports/tasks";

export type State<T> = [T, Dispatch<SetStateAction<T>>];


export async function execute<T>(observer: Observer<T>, task: Task & Provider<T>) {

	try {

		observer(Activity.Submitting);

		const job=await submitTask(task);

		const poll=setInterval(async () => {

			const status=await monitorTask<T>(job);

			if ( !isActivity(status) ) {
				clearInterval(poll);
			}

			observer(status);

		}, 1000);

	} catch ( error ) {

		observer(asTrace(error));

	}

}
