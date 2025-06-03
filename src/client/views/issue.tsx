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

import { Badge, Box, Button, Heading, Inline, Stack, Text, xcss } from "@forge/react";
import React from "react";


export default function ToolIssue() {

	return <Box xcss={xcss({

		padding: "space.100",

		borderStyle: "solid",
		borderWidth: "border.width",
		borderRadius: "border.radius",
		borderColor: "color.border.accent.gray",

		backgroundColor: "color.background.accent.blue.subtlest"

	})}>

		<Stack>

			<Inline>
				<Box xcss={{ flexGrow: 1 }}><Heading size={"small"}>lapsus, fraticinida, et genetrix</Heading></Box>
				<Button appearance={"subtle"}>Resolve</Button>
			</Inline>

			<Text>Nunquam experientia domus. lapsus, fraticinida, et genetrix. cum fiscina cantare, omnes gemnaes
				contactus pius, albus elogiumes. est flavum hydra, cesaris. cum zelus ridetis, omnes messores
				attrahendam audax, secundus cedriumes. apolloniates tolerares, tanquam alter frondator. regius
				luna.

				<Badge appearance={"primary"}>1</Badge>
				<Badge appearance={"primary"}>2</Badge>
				<Badge appearance={"primary"}>3</Badge>

			</Text>

		</Stack>

	</Box>;
}