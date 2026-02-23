/*
 * Copyright © 2025-2026 EC2U Alliance
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

/**
 * Forge resolver handler for client-server communication.
 *
 * Registers resource-centric resolver endpoints as Forge resolver definitions.
 *
 * @module index
 */

import Resolver from "@forge/resolver";
import { analyseIssues, clearIssues, getIssues, updateIssues } from "./issues";
import { clearPolicy, getPolicies, getPolicy } from "./policies";


/**
 * The Forge resolver handler definitions for the macro backend.
 */
export const handler = new Resolver()

	.define(getPolicies.name, getPolicies)
	.define(getPolicy.name, getPolicy)

	.define(clearPolicy.name, clearPolicy)

	.define(getIssues.name, getIssues)
	.define(analyseIssues.name, analyseIssues)
	.define(clearIssues.name, clearIssues)
	.define(updateIssues.name, updateIssues)

	.getDefinitions();
