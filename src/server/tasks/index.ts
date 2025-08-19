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
import { asTrace } from "../../shared";
import { setStatus, Specs } from "../async";
import { purge } from "../tools/cache";
import { annotate } from "./annotate";
import { classify } from "./classify";
import { clear } from "./clear";
import { issues } from "./issues";
import { policies } from "./policies";
import { policy } from "./policy";
import { resolve } from "./resolve";

interface AsyncEventContext {
	jobId: string;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const handler=new Resolver()

	.define("execute", async function ({

		payload: { page, task },
		context: { jobId: job }

	}: {

		payload: Specs
		context: AsyncEventContext

	}) {

		try {

			// global cache purge (run completely in background)

			purge();


			// process task

			switch ( task.type ) {

				case "policies":

					return await policies(job, page, task);

				case "policy":

					return await policy(job, page, task);

				case "issues":

					return await issues(job, page, task);

				case "classify":

					return await classify(job, page, task);

				case "annotate":

					return await annotate(job, page, task);

				case "resolve":

					return await resolve(job, page, task);

				case "clear":

					return await clear(job, page, task);

			}

		} catch ( error ) {

			return await setStatus(job, asTrace(error));

		}

	} as any)

	.getDefinitions();
