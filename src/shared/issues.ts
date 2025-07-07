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

import { Instant, Source } from "./documents";

export interface Issue {

	readonly resolved?: boolean;

	readonly id: string;
	readonly created: Instant;
	readonly priority: number; // 1..3 integer

	readonly title: string;
	readonly description: ReadonlyArray<string | Reference>;

}

export interface Reference {

	readonly source: Source;

	readonly title: string;
	readonly excerpt: string;

	readonly offset: number;
	readonly length: number;

}
