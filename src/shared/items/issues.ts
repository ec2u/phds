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
 * Compliance issue model types for tracking and reporting policy analysis results.
 *
 * @module
 */

import { Instant, type Reference } from "./documents";


/**
 * Ordered list of issue workflow states.
 */
export const States = ["pending", "active", "blocked", "resolved"] as const;

/**
 * Ordered list of issue severity levels, from highest to lowest.
 */
export const Severities = [3, 2, 1] as const;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Issue workflow state.
 */
export type State = typeof States[number];

/**
 * Issue severity level, where higher numbers indicate greater severity.
 */
export type Severity = typeof Severities[number];

/**
 * A compliance issue identified during policy analysis.
 */
export interface Issue {

	/**
	 * The unique issue identifier.
	 */
	readonly id: string;

	/**
	 * The creation timestamp.
	 */
	readonly created: Instant;

	/**
	 * The last update timestamp.
	 */
	readonly updated?: Instant;

	/**
	 * The current workflow state.
	 */
	readonly state: State;

	/**
	 * The severity level.
	 */
	readonly severity: Severity;

	/**
	 * The issue title.
	 */
	readonly title: string;

	/**
	 * The issue description as a mixed sequence of text fragments and source references.
	 */
	readonly description: ReadonlyArray<string | Reference>;

	/**
	 * Optional markdown annotations added by reviewers.
	 */
	readonly annotations?: string;

}

/**
 * Subset of mutable {@link Issue} fields accepted by update operations.
 */
export type IssueUpdate = Partial<Pick<Issue, "state" | "severity" | "annotations">>;


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Defaults missing fields on issues retrieved from the KVS.
 *
 * Guards against store entries that may lack fields added after initial creation. Currently defaults
 * {@link State} to `"pending"` for legacy entries predating the `state` field.
 *
 * @param issue the raw issue from the store
 *
 * @return the issue with all required fields guaranteed
 */
export function normalizeIssue(issue: Issue): Issue {
	return {
		...issue,
		state: issue.state || "pending"
	};
}
