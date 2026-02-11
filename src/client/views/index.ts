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
 * Shared styling utilities and design tokens for UI components.
 *
 * @module index
 */

import type { BackgroundColor, BorderColor } from "@atlaskit/primitives";
import { xcss } from "@forge/react";


/**
 * The parameter type accepted by the Forge `xcss` function.
 */
export type XCSS =
	Parameters<typeof xcss>[0];

/**
 * A pair of Atlassian Design Token colours for background and border styling.
 */
export type Colors = {
	backgroundColor: BackgroundColor;
	borderColor: BorderColor;
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Neutral grey colour pair for default UI elements.
 */
export const NeutralColors = toColors("gray");

/**
 * Bottom border rule style applied to toolbar and section separators.
 */
export const Rule: XCSS = {

	paddingBottom: "space.200",
	marginBottom: "space.300",

	borderWidth: "border.width",
	borderColor: "color.border.accent.gray",
	borderBottomStyle: "solid"

};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Creates a colour pair from an Atlassian Design Token accent colour name.
 *
 * @typeParam T the colour name string literal type
 *
 * @param color the accent colour name
 *
 * @return the border and background colour pair
 */
export function toColors<T extends string>(color: T) {
	return {
		borderColor: `color.border.accent.${color}` as const,
		backgroundColor: `color.background.accent.${color}.subtlest` as const
	};
}
