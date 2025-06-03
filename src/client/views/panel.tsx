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

import { Box, Inline, Stack } from "@forge/react";
import React, { ReactNode } from "react";

export default function ToolPanel({

	menu,
	more,

	children

}: {

	menu: ReactNode
	more?: ReactNode

	children: ReactNode

}) {

	return <Box xcss={{ width: "50%" }}>

		<Stack grow={"fill"} space={"space.100"} alignInline={"stretch"}>

			<Box>
				<Inline>

					<Box xcss={{ flexGrow: 1 }}>{menu}</Box>
					<Box>{more}</Box>

				</Inline>
			</Box>

			<Box xcss={{

				flexGrow: 1,
				height: "60em",
				padding: "space.200",
				overflowY: "auto",

				borderStyle: "solid",
				borderWidth: "border.width",
				borderRadius: "border.radius",
				borderColor: "color.border.accent.gray"

			}}>{

				children

			}</Box>

		</Stack>

	</Box>;
}