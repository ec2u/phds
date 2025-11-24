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

import { Box, Inline, xcss } from "@forge/react";
import React, { ReactNode } from "react";

export function ToolBar({

	menu,
	more

}: {

	menu: ReactNode;
	more?: ReactNode;

}) {

	return <Box xcss={xcss({

		paddingBottom: "space.200",
		marginBottom: "space.300",

		borderWidth: "border.width",
		borderColor: "color.border.accent.gray",
		borderBottomStyle: "solid"

	})}>

		<Inline alignBlock={"center"}>

			<Box xcss={{ flexGrow: 1 }}>{menu}</Box>
			<Box>{more}</Box>

		</Inline>

	</Box>;

}
