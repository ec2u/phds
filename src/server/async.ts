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

import { kvs } from "@forge/kvs";
import { isDefined, isString } from "../shared";
import { Activity, isActivity, Status, Task } from "../shared/tasks";

const statusTimeout=30 * 1000;
const statusClipping=20;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface Specs {

	readonly page: string;
	readonly task: Task;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export async function getStatus<T>(job: string): Promise<Status<T>> {
	return await kvs.get<Status<T>>(jobKey(job)) as Status<T>;
}


export async function setStatus<T>(job: string, value: undefined | Status<T>): Promise<void> {

	console.info(`${job || "background job"} status set to <${

		isActivity(value) ? Activity[value] : JSON.stringify(value, (_, value) =>
			isString(value) && value.length > statusClipping ? `${value.slice(0, statusClipping)}...` : value
		)

	}>`);

	if ( job ) {

		const key=jobKey(job);

		if ( isDefined(value) ) {

			await kvs.set<Status<T>>(key, value);

			if ( !isActivity(value) ) { // delete final status if not picked up by job monitor
				setTimeout(() => kvs.delete(key), statusTimeout);
			}

		} else {

			await kvs.delete(key);

		}

	}
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function jobKey(job: string) {
	return `job:${job}`;
}
