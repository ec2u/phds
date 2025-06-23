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

import Resolver from "@forge/resolver";
import { Trace } from "../../shared";
import { Task } from "../../shared/tasks";
import { setStatus } from "../async";
import { test } from "./test";

interface AsyncEventContext {
	jobId: string;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const handler=new Resolver()

	.define("execute", async function ({

		payload: task,
		context: { jobId: id }

	}: {

		payload: Task
		context: AsyncEventContext

	}) {

		switch ( task.type ) {

			case "test":
				return await test(id, task);

			default:
				return await setStatus(id, {
					code: 404,
					text: `unknown task type ${task.type}`
				} as Trace);

		}


	} as any)

	.getDefinitions();
