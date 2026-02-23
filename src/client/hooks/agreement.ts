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
 * Agreement content retrieval hook.
 *
 * @module
 */

import { useEffect, useState } from "react";
import type { Document } from "../../shared/items/documents";
import { Activity, type Status } from "../../shared/store";
import { useStore } from "./store";


/**
 * Fetches the agreement document and subscribes to reactive updates.
 *
 * @return the current status of the agreement document
 */
export function useAgreement(): Status<null | Document> {

	const store = useStore();

	const [agreement, setAgreement] = useState<Status<null | Document>>(Activity.Submitting);


	useEffect(() => store.observeAgreement(setAgreement), [store]);


	return agreement;
}
