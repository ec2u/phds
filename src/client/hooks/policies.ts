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
 * Policy catalogue retrieval hook.
 *
 * @module
 */

import { useEffect, useState } from "react";
import type { Catalogue } from "../../shared/items/documents";
import { Activity, type Status } from "../../shared/store";
import { useStore } from "./store";


/**
 * Fetches the catalogue of available policy documents and subscribes to reactive updates.
 *
 * @return the current status of the policies catalogue
 */
export function usePolicies(): [Status<Catalogue>] {

	const store = useStore();

	const [policies, setPolicies] = useState<Status<Catalogue>>(Activity.Submitting);


	useEffect(() => store.observePolicies(setPolicies), [store]);


	return [policies];
}
