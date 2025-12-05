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

import { Box, Heading, Inline, Stack, Text, xcss } from "@forge/react";
import type { Space } from "@forge/react/out/types/components";
import React, { ReactNode } from "react";
import { Colors, NeutralColors } from "..";
import { ToolToggle } from "../elements/toggle";


const ColCollapsedWidth = 2.5; //%
const RowGap = "space.200";

const CellPaddingBlock = "space.050";
const CellPaddingInline = "space.150";

const BackgroundColor = "color.background.neutral";


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface Lane<T> {

	readonly collapsed?: boolean;

	readonly value: T;

	readonly label?: ReactNode;
	readonly colors?: Colors;

}


export function toggle<T>(lanes: readonly Lane<T>[], value: T) {
	return lanes.map(lane =>
		lane.value === value ? { ...lane, collapsed: !lane.collapsed } : lane
	);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export default function ToolKanban<R, C, I>({

	rows,
	cols,
	items,

	toRow,
	toCol,
	toCard,

	onToggleRow,
	onToggleCol

}: {

	rows: readonly Lane<R>[];
	cols: readonly Lane<C>[];
	items: readonly I[];

	toRow: (item: I) => R;
	toCol: (item: I) => C;
	toCard: (item: I) => ReactNode;

	onToggleRow: (row: R) => void;
	onToggleCol: (col: C) => void;

}) {

	return <Box xcss={xcss({

		overflow: "auto"

	})}>

		<Grid<R, C, I>

			rows={rows}
			cols={cols}
			items={items}

			toRow={toRow}
			toCol={toCol}
			toCard={toCard}

			onToggleRow={onToggleRow}
			onToggleCol={onToggleCol}

		/>

	</Box>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function Grid<R, C, I>({

	rows,
	cols,
	items,

	toRow,
	toCol,
	toCard,

	onToggleRow,
	onToggleCol

}: {

	rows: readonly Lane<R>[];
	cols: readonly Lane<C>[];
	items: readonly I[];

	toCol: (item: I) => C;
	toRow: (item: I) => R;
	toCard: (item: I) => ReactNode;

	onToggleRow: (row: R) => void;
	onToggleCol: (col: C) => void;

}) {

	const collapsed = cols.filter(lane => lane.collapsed).length;
	const expanded = cols.length-collapsed;

	const widths = cols.map(col => expanded === 0 || col.collapsed
		? ColCollapsedWidth
		: (100-ColCollapsedWidth*collapsed)/expanded
	);

	return <Stack space={RowGap}>

		<Cols<C>

			cols={cols}

			widths={widths}

			onToggleCol={onToggleCol}

		/>

		{rows.map((row) => <Row<R, C, I> key={String(row.value)}

			row={row}
			cols={cols}
			items={items.filter(item => toRow(item) === row.value)}

			toCol={toCol}
			toCard={toCard}

			widths={widths}

			onToggleRow={onToggleRow}

		/>)}

	</Stack>;

}

function Cols<G>({

	cols,

	widths,

	onToggleCol

}: {

	cols: readonly Lane<G>[];

	widths: number[];

	onToggleCol: (key: G) => void;

}) {

	return <Inline space={CellPaddingBlock} alignBlock={"stretch"}>

		{cols.map(({ value, collapsed, label, colors }, index) => {

			return <>

				<Box key={String(value)} xcss={xcss({

					width: `${widths[index]}%`,
					...(colors ?? {})

				})}>

					<Col

						padding={[
							CellPaddingBlock,
							"space.0",
							CellPaddingBlock,
							!collapsed ? CellPaddingInline : "space.0"
						]}

						label={!collapsed ? <Heading size="small">{label ?? String(value)}</Heading> : undefined}

						action={<ToolToggle direction="horizontal"

							label={`${String(value)} issues`}
							expanded={!collapsed}

							onToggle={() => onToggleCol(value)}

						/>}

					/>

				</Box>

			</>;
		})}

		{<Filler/>}

	</Inline>;

}

function Col({

	padding = "space.0",

	label,
	action

}: {

	padding?: Space | readonly [Space, Space] | readonly [Space, Space, Space, Space];

	label: ReactNode;
	action?: ReactNode;

}) {

	const [paddingTop, paddingRight, paddingBottom, paddingLeft] =
		!Array.isArray(padding) ? [padding, padding, padding, padding]
			: padding.length === 2 ? [padding[0], padding[1], padding[0], padding[1]]
				: padding;

	return <Box xcss={xcss({

		paddingTop,
		paddingRight,
		paddingBottom,
		paddingLeft

	})}>

		<Inline alignBlock={"center"}>

			<Box xcss={{ flexGrow: 1 }}>{label}</Box>
			<Box>{action}</Box>

		</Inline>

	</Box>;

}

function Row<R, C, I>({

	row,
	cols,
	items,

	toCol,
	toCard,

	widths,

	onToggleRow

}: {

	row: Lane<R>;
	cols: readonly Lane<C>[];
	items: readonly I[];

	toCol: (item: I) => C;
	toCard: (item: I) => ReactNode;

	widths: readonly number[];

	onToggleRow: (row: R) => void;

}) {

	return <Stack space="space.100">

		<Box xcss={xcss({
			...(row.colors ?? NeutralColors)
		})}>

			<Col

				label={<Text size="small">{row.label ?? String(row.value)}</Text>}

				action={<ToolToggle

					expanded={!row.collapsed}
					label="row"

					onToggle={() => onToggleRow(row.value)}

				/>}

				padding={[
					CellPaddingBlock,
					"space.025",
					CellPaddingBlock,
					CellPaddingInline
				]}

			/>

		</Box>

		{!row.collapsed && <Inline

            space={CellPaddingBlock}
            alignBlock={"stretch"}

        >

			{cols.map((col, index) => {

				const isExpanded = widths[index] > ColCollapsedWidth;

				return <Box key={String(col.value)} xcss={xcss({

					width: `${widths[index]}%`,

					backgroundColor: BackgroundColor,

					...(isExpanded && {
						paddingBlock: CellPaddingBlock,
						paddingInline: CellPaddingInline
					})

				})}>

					<Cell>{items
						.filter(item => isExpanded)
						.filter(item => toCol(item) === col.value)
						.map(toCard)
					}</Cell>

				</Box>;

			})}

			{<Filler/>}

        </Inline>}

	</Stack>;

}

function Cell({

	children

}: {

	children: ReactNode;

}) {

	return <Box xcss={xcss({

		paddingTop: "space.100",
		paddingBottom: "space.100"

	})}>

		<Stack space="space.100" alignInline={"stretch"}>
			{children}
		</Stack>

	</Box>;

}

function Filler() {

	return <Box xcss={xcss({

		flexGrow: 1,

		...NeutralColors

	})}>

		<Inline> </Inline>

	</Box>;

}
