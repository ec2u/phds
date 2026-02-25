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
 * Forge bridge invocations for compliance issue operations.
 *
 * @module
 */

import { invoke } from "@forge/bridge";
import { Issue, type IssueUpdate } from "../../shared/items/issues";
import type { Status } from "../../shared/store";


/**
 * Retrieves all compliance issues for the current page.
 *
 * @param page The Confluence page identifier
 */
export function getIssues(page: string): Promise<Status<Issue[]>> {
	return invoke("getIssues", { page });
}

/**
 * Triggers a new compliance analysis for the current page.
 *
 * @param page The Confluence page identifier
 */
export function analyseIssues(page: string): Promise<Status<void>> {
	return invoke("analyseIssues", { page });
}

/**
 * Clears all cached issue data for the current page.
 *
 * @param page The Confluence page identifier
 */
export function clearIssues(page: string): Promise<Status<void>> {
	return invoke("clearIssues", { page });
}

/**
 * Updates mutable fields of a compliance issue.
 *
 * @param page The Confluence page identifier
 * @param issue The issue identifier
 * @param update The fields to update
 */
export function updateIssues(page: string, issue: string, update: IssueUpdate): Promise<Status<void>> {
	return invoke("updateIssues", { page, issue, ...update });
}
