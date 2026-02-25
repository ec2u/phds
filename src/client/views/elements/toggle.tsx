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
 * Expand/collapse toggle button component.
 *
 * @module
 */

import { Icon, Pressable, Tooltip, xcss } from "@forge/react";
import React from "react";
import type { SafeXCSS } from "../index";

/**
 * Renders a chevron toggle button for expanding and collapsing content sections.
 *
 * @param props the component props
 * @param props.expanded whether the content is currently expanded
 * @param props.direction the expand/collapse direction (`"vertical"` or `"horizontal"`)
 * @param props.label optional content label for accessibility
 * @param props.onToggle the toggle event handler
 */
export function ToolToggle({

	expanded,
	direction = "vertical",

	label,

	onToggle

}: {

	expanded: boolean;
	direction?: "vertical" | "horizontal";

	label?: string;

	onToggle: () => void;

}) {

	const isVertical = direction === "vertical";
	const content = label || "content";

	const labelExpanded = `Hide ${content}`;
	const labelCollapsed = `Show ${content}`;

	const glyphExpanded = isVertical ? "chevron-up" : "chevron-left";
	const glyphCollapsed = isVertical ? "chevron-down" : "chevron-right";

	return <Pressable

		xcss={xcss({
			backgroundColor: "color.background.neutral.subtle"
		}) as SafeXCSS}

		onClick={onToggle}

	>

		<Tooltip content={expanded ? labelExpanded : labelCollapsed}>

			<Icon size={"medium"}
				label={""}
				glyph={expanded ? glyphExpanded : glyphCollapsed}
			/>

		</Tooltip>

	</Pressable>;

}
