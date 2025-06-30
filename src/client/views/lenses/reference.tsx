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

import { Box, Heading, Icon, Popup, Pressable, Stack, Text, xcss } from "@forge/react";
import React, { useState } from "react";
import { Reference } from "../../../shared/issues";

export function ToolReference({

	reference

}: {

	reference: Reference

}) {

	const [open, setOpen]=useState<boolean>(false);

	return <Popup

		isOpen={open}

		role={"menu"}
		placement="bottom-end"

		onClose={() => setOpen(false)}

		trigger={() => <Pressable

			onClick={() => setOpen(!open)}

			xcss={xcss({

				paddingInline: "space.025",
				marginInline: "space.025",

				borderRadius: "border.radius",
				backgroundColor: "color.background.neutral"

			})}

		>

			<Icon glyph={"info"} label={reference.title}
				size={"small"} primaryColor={"color.icon.accent.blue"}
			/>

		</Pressable>}

		content={() => <Box xcss={xcss({

			padding: "space.200"

		})}
		>

			<Stack space={"space.100"}>

				<Heading size={"small"}>{reference.title}</Heading>
				<Text>{reference.excerpt}</Text>

			</Stack>

		</Box>}

	/>;

}
