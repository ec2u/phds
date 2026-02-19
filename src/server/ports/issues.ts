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
 * Forge resolver endpoints for compliance issue operations.
 *
 * @module
 */

import type { Request } from "@forge/resolver";
import type { Issue, IssueUpdate } from "../../shared/items/issues";
import type { Status } from "../../shared/store";
import { createServerStore } from "../store";


/**
 * Retrieves all compliance issues for the given page.
 */
export async function getIssues({ payload: { page } }: Request<{

	page: string

}>): Promise<Status<ReadonlyArray<Issue>>> {

	return createServerStore(page).getIssues();

}

/**
 * Triggers a new compliance analysis for the given page.
 */
export async function analyseIssues({ payload: { page } }: Request<{

	page: string

}>): Promise<Status<void>> {

	return createServerStore(page).analyseIssues();

}

/**
 * Clears all cached issue data for the given page.
 */
export async function clearIssues({ payload: { page } }: Request<{

	page: string

}>): Promise<Status<void>> {

	return createServerStore(page).clearIssues();

}

/**
 * Retrieves a single compliance issue by identifier.
 */
export async function getIssue({ payload: { page, issue } }: Request<{

	page: string;
	issue: string

}>): Promise<Status<Issue>> {

	return createServerStore(page).getIssue(issue);

}

/**
 * Updates mutable fields of a compliance issue.
 */
export async function updateIssue({ payload: { page, issue, ...update } }: Request<{

	page: string;
	issue: string;

} & IssueUpdate>): Promise<Status<void>> {

	return createServerStore(page).updateIssue(issue, update);

}
