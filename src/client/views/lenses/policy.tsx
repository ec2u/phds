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
 * Single policy document viewer component.
 *
 * @module
 */

import { AdfRenderer } from "@forge/react";
import React from "react";
import type { Document } from "../../../shared/items/documents";
import { adf } from "../../../shared/tools/text";

/**
 * Renders a policy document as ADF content, with optional table-of-contents mode.
 *
 * @param props the component props
 * @param props.document the policy document to render
 * @param props.as the rendering mode: `"text"` for full content (default) or `"toc"` for table of contents
 */
export function ToolPolicy({

	document,
	as

}: {

	document: Document
	as?: Parameters<typeof adf>[1]

}) {

	return <AdfRenderer document={adf(document.content, as)}/>;

}
