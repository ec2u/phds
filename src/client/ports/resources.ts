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
 * Forge bridge invocations for resource-centric operations.
 *
 * @module
 */

import { invoke } from "@forge/bridge";
import type { Status } from "../../shared/index";
import { Catalog, Document, Source } from "../../shared/items/documents";
import { type IssueUpdate, Issue } from "../../shared/items/issues";
import { Language } from "../../shared/items/languages";


export function getPolicies(): Promise<Status<Catalog>> {
	return invoke("getPolicies");
}

export function getPolicy(source: Source, language?: Language): Promise<Status<Document>> {
	return invoke("getPolicy", { source, language });
}


export function getIssues(): Promise<Status<Issue[]>> {
	return invoke("getIssues");
}

export function refreshIssues(): Promise<Status<void>> {
	return invoke("refreshIssues");
}

export function getIssue(issue: string): Promise<Status<Issue>> {
	return invoke("getIssue", { issue });
}

export function updateIssue(issue: string, update: IssueUpdate): Promise<Status<void>> {
	return invoke("updateIssue", { issue, ...update });
}


export function clearCache(): Promise<Status<void>> {
	return invoke("clearCache");
}
