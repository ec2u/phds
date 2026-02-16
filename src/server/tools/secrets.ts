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
 * Environment variable access utilities.
 *
 * @module
 */

/**
 * Retrieves a required environment variable.
 *
 * @param key The environment variable name
 *
 * @returns The environment variable value, guaranteed to be non-empty
 *
 * @throws {Error} If the environment variable is not defined
 */
export function secret(key: string) {

	const value = process.env[key];

	if ( !value ) {
		throw new Error(`undefined environment variable <${key}>`);
	}

	return value;
}
