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
 * Document model types for policy sources and their content.
 *
 * @module
 */

import { Language } from "./languages";


/**
 * Mapping from source identifiers to their display titles.
 */
export type Catalog = Readonly<Record<Source, Title>>;

/**
 * Source attachment identifier; empty string for Confluence page body.
 */
export type Source = "" | string

/**
 * UTC ISO date-time string with millisecond precision.
 */
export type Instant = string

/**
 * Human-readable document title.
 */
export type Title = string

/**
 * Markdown-formatted text content.
 */
export type Markdown = string

/**
 * A policy document with its content and metadata.
 */
export interface Document {

	/**
	 * Whether this is the original language version.
	 */
	readonly original: boolean;

	/**
	 * The language of the document content.
	 */
	readonly language: Language;

	/**
	 * The source attachment identifier.
	 */
	readonly source: Source;

	/**
	 * The creation timestamp.
	 */
	readonly created: Instant;

	/**
	 * The document title.
	 */
	readonly title: Title;

	/**
	 * The document content in markdown format.
	 */
	readonly content: Markdown;

}
