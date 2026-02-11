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
 * Two-column split layout with sidebar and main content areas.
 *
 * @module
 */

import { Box, Inline, Stack, xcss } from "@forge/react";
import React, { ReactNode } from "react";

/**
 * Main content area width as a percentage.
 */
const Width = 66;

/**
 * Gap between sidebar and main content areas.
 */
const Gap = "space.500";


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Renders a two-column layout with a sidebar and main content area.
 *
 * @param props the component props
 * @param props.side the sidebar content
 * @param props.children the main content
 */
export default function ToolSplit({

	side,

	children

}: {

	side: ReactNode

	children: ReactNode

}) {

	return <Inline grow={"fill"}>

		<Box xcss={xcss({

			minWidth: `${100-Width}%`,
			maxWidth: `${100-Width}%`

		})}>

			<Box xcss={xcss({ paddingRight: Gap })}>
				<Stack>{side}</Stack>
			</Box>

		</Box>

		<Box xcss={xcss({

			minWidth: `${Width}%`,
			maxWidth: `${Width}%`

		})}>

			<Stack>{children}</Stack>

		</Box>

	</Inline>;

}
