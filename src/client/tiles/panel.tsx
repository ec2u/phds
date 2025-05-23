import { Box, Inline, Stack } from "@forge/react";
import React, { ReactNode } from "react";

export function ToolPanel({

	menu,
	more,

	children

}: {

	menu: ReactNode
	more?: ReactNode

	children: ReactNode

}) {

	return <Box xcss={{ width: "50%" }}>

		<Stack grow={"fill"} space={"space.400"} alignInline={"stretch"}>

			<Box>
				<Inline>

					<Box xcss={{ flexGrow: 1 }}>{menu}</Box>
					<Box>{more}</Box>

				</Inline>
			</Box>

			<Box xcss={{ flexGrow: 1 }}>{children}</Box>

		</Stack>

	</Box>;
}