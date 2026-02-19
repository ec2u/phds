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
 * Error trace display component.
 *
 * @module
 */

import { EmptyState, Icon } from "@forge/react";
import React from "react";
import type { Trace } from "../../../shared/store";

/**
 * Renders an error trace as an empty state with the error message and status code.
 *
 * @param props the component props
 * @param props.trace the error trace to display
 */
export function ToolTrace({

	trace

}: {

	trace: Trace

}) {

	const text = trace
		? trace.replace(/^(\(\d+\)\s*)?(.)/, (_, prefix, c) => (prefix ?? "")+c.toUpperCase())
		: "Unable to process document";

	return <EmptyState width={"narrow"}
		header={"Processing Error"}
		description={text}
		primaryAction={<Icon label={""} glyph={"error"} size={"large"} color={"color.icon.warning"}/>}
	/>;

}
