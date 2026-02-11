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

import { Instant, Source } from "./documents";


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
 * A reference to a specific location within a source document.
 */
export interface Reference {

	/**
	 * The source attachment identifier.
	 */
	readonly source: Source;

	/**
	 * The referenced document title.
	 */
	readonly title: string;

	/**
	 * The quoted text excerpt from the source.
	 */
	readonly excerpt: string;

	/**
	 * The character offset within the source content.
	 */
	readonly offset: number;

	/**
	 * The character length of the referenced content.
	 */
	readonly length: number;

}
