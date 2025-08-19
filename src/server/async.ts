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
import { isDefined } from "../shared";
import { Status, Task } from "../shared/tasks";


export interface Specs {

	readonly page: string;
	readonly task: Task;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export async function getStatus<T>(job: string): Promise<Status<T>> {
	return await kvs.get<Status<T>>(key(job)) as Status<T>;
}

export async function setStatus<T>(job: string, value: undefined | Status<T>): Promise<void> {
	if ( isDefined(value) ) {

		await kvs.set<Status<T>>(key(job), value);

	} else {

		await kvs.delete(key(job));

	}
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function key(job: string) {
	return `job:${job}`;
}
