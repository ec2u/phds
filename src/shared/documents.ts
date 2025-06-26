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

import { Language } from "./languages";


export type Catalog=Readonly<Record<Source, string>>;

export type Source="" | string // source attachment id; empty for macro body
export type Timestamp=string // UTC ISO dateTime with ms precision

export interface Document {

	readonly original: boolean;
	readonly language: Language;
	readonly source: Source;
	readonly created: Timestamp;

	readonly title: string;
	readonly content: string;

}
