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
 * Icon button component with tooltip.
 *
 * @module
 */

import { Icon, Pressable, Tooltip, xcss } from "@forge/react";
import React from "react";
import type { SafeXCSS } from "../index.js";

/**
 * Renders an icon button with a tooltip label.
 *
 * @param props the component props
 * @param props.label the tooltip text and accessibility label
 * @param props.icon the icon glyph name
 * @param props.onClick the click event handler
 * @param props.disabled whether the button is disabled
 */
export function ToolAction({

	label,
	icon,

	onClick,
	disabled

}: {

	disabled?: boolean;

	label: string;
	icon: React.ComponentProps<typeof Icon>["glyph"];

	onClick: () => void;

}) {

	return <Pressable

		xcss={xcss({
			backgroundColor: "color.background.neutral.subtle"
		}) as SafeXCSS}

		onClick={onClick}
		isDisabled={disabled}

	>

		<Tooltip content={label}>

			<Icon primaryColor={disabled ? "color.icon.disabled" : "color.icon"}

				label={label}
				glyph={icon}
				size={"medium"}
			/>

		</Tooltip>

	</Pressable>;

}
