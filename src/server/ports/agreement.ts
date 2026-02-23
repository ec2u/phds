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
 * Forge resolver endpoints for agreement content operations.
 *
 * @module
 */

import type { Request } from "@forge/resolver";
import type { Document } from "../../shared/items/documents";
import type { Status } from "../../shared/store";
import { createServerStore } from "../store";


/**
 * Retrieves the agreement content from the Confluence page body.
 */
export async function getAgreement({ payload: { page } }: Request<{ page: string }>): Promise<Status<null | Document>> {
	return createServerStore(page).getAgreement();
}
