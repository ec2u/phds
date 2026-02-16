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
 * Provides typed request interfaces, environment variable access, URL query encoding, and cached file reading for
 * Forge resolver functions running within Confluence.
 *
 * @module index
 */

import { InvokePayload } from "@forge/bridge/out/types";
import { Request as NativeRequest } from "@forge/resolver";
import { URLSearchParams } from "url";


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * A typed Forge resolver request with payload and Confluence context.
 *
 * @typeParam T The payload type
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
 * Encodes a record of key-value pairs as a URL query string.
 *
 * @param params The key-value pairs to encode
 *
 * @returns The URL-encoded query string
 */
export function query(params: Record<string, string>) {
	return new URLSearchParams(params).toString();
}
