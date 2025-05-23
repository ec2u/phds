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