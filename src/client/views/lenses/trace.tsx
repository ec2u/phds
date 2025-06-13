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

import { EmptyState, Icon } from "@forge/react";
import React from "react";
import { Trace } from "../../../shared";

export function ToolTrace({

	children: trace

}: {

	children: Trace

}) {

	const code=trace.code;
	const text=trace.text
		? trace.text.replace(/^./, c => c.toUpperCase())
		: "Unable to process document";

	return <EmptyState width={"narrow"}
		header={"Processing Error"}
		description={`${text} (${code})`}
		primaryAction={<Icon label={""} glyph={"error"} size={"large"} primaryColor={"color.icon.warning"}/>}
	/>;
}
