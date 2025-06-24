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
import { asTrace, Trace } from "../../shared";
import { setStatus, X } from "../async";
import { catalog } from "./catalog";

interface AsyncEventContext {
	jobId: string;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const handler=new Resolver()

	.define("execute", async function ({

		payload: { page, task },
		context: { jobId: job }

	}: {

		payload: X
		context: AsyncEventContext

	}) {

		try {

			switch ( task.type ) {

				case "catalog":

					return await catalog(job, page, task);

				default:

					return await setStatus(job, {
						code: 404,
						text: `unknown task type ${task.type}`
					} as Trace);

			}

		} catch ( error ) {

			return await setStatus(job, asTrace(error));

		}

	} as any)

	.getDefinitions();
