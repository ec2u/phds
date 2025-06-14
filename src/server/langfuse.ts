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

import Langfuse from "langfuse";
import { asTrace } from "../shared";
import { Prompt } from "../shared/langfuse";
import { Request } from "./utils";

export async function retrievePrompt({ payload: { name, variables } }: Request<Prompt>): Promise<string> {
	try {

		const client=new Langfuse();

		// const prompt=await client.getPrompt(name);

		// !!! const prompt=await bindInvocationContext(() => client.getPrompt(name))();

		// return prompt.compile(variables);

		return "!!!";

	} catch ( error ) {

		console.error(error);

		throw asTrace(error);
	}

}
