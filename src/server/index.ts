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
import { readFile } from "fs/promises";
import { join } from "path";
import { URLSearchParams } from "url";


/**
 * Global cache for file contents keyed by resolved path.
 */
const cache = new Map<string, Promise<string>>();


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
 * Retrieves a required environment variable.
 *
 * @param key The environment variable name
 *
 * @returns The environment variable value
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

/**
 * Reads a file as UTF-8 text with global caching.
 *
 * @param name The file name or path relative to `base`
 * @param base The base directory to resolve relative paths against, for example `__dirname`
 *
 * @returns A promise resolving to the file contents as a string
 */
export function file(name: string, base?: string): Promise<string> {

	const path = base ? join(base, name) : name;

	if ( !cache.has(path) ) {
		cache.set(path, readFile(path, "utf-8"));
	}

	return cache.get(path)!;
}
