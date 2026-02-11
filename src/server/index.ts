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
 * Server-side utilities for Forge resolver request handling.
 *
 * @module index
 */

import { InvokePayload } from "@forge/bridge/out/types";
import { Request as NativeRequest } from "@forge/resolver";
import { URLSearchParams } from "url";


/**
 * A typed Forge resolver request with payload and Confluence context.
 *
 * @typeParam T the payload type
 */
export interface Request<T extends NativeRequest["payload"]> {

	/**
	 * The request payload.
	 */
	payload: T;

	/**
	 * The Confluence invocation context.
	 */
	context: InvokePayload["context"];

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Retrieves a required environment variable.
 *
 * @param key the environment variable name
 *
 * @return the environment variable value
 *
 * @throws {Error} if the environment variable is not defined
 */
export function secret(key: string) {

	const value = process.env[key];

	if ( !value ) {
		throw new Error(`undefined environment variable <${key}>`);
	}

	return value;
}


/**
 * Encodes a record of key-value pairs as a URL query string.
 *
 * @param params the key-value pairs to encode
 *
 * @return the URL-encoded query string
 */
export function query(params: Record<string, string>) {
	return new URLSearchParams(params).toString();
}
