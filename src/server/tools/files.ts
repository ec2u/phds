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
 * Cached file reading utilities.
 *
 * @module
 */

import { readFileSync } from "fs";
import { join } from "path";

/**
 * Global cache for file contents keyed by resolved path.
 */
const cache = new Map<string, string>();


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Reads a file as UTF-8 text with global caching.
 *
 * @param name The file name or path relative to `base`
 * @param base The base directory to resolve relative paths against, for example `__dirname`
 *
 * @returns The file contents, served from cache on repeated calls with the same resolved path
 */
export function file(name: string, base?: string): string {

	const path = base ? join(base, name) : name;

	if ( !cache.has(path) ) {
		cache.set(path, readFileSync(path, "utf-8"));
	}

	return cache.get(path)!;
}
