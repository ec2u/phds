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