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

import { Icon, Pressable, Tooltip, xcss } from "@forge/react";
import React from "react";

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
			padding: "space.0",
			margin: "space.0",
			backgroundColor: "color.background.neutral.subtle"
		})}

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
