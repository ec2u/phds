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
 * Policy documents browser with sidebar navigation and content viewer.
 *
 * @module
 */

import { EmptyState, Pressable, Stack, Text, xcss } from "@forge/react";
import React from "react";
import { isActivity, isTrace, on } from "../../../shared";
import { Catalog } from "../../../shared/items/documents";
import { useStorage } from "../../hooks/storage";
import ToolSplit from "../layouts/split";
import { ToolPolicy } from "./policy";

/**
 * Renders a split-pane view with a selectable policy list in the sidebar and the selected policy content in the
 * main area.
 *
 * Persists the selected policy to browser localStorage for the current page.
 *
 * @param props the component props
 * @param props.page the Confluence page identifier
 * @param props.policies the policy catalogue mapping source identifiers to titles
 */
export function ToolPolicies({

	page,
	policies

}: {

	page: string
	policies: Catalog

}) {

	const [selected, setSelected] = useStorage<undefined | string>(page, "selected-policy", undefined);


	const activity = isActivity(policies);
	const trace = isTrace(policies);


	function select(source: string) {
		setSelected(source === selected ? undefined : source);
	}


	return <ToolSplit

		side={<Stack space={"space.250"}>

			<Stack space={"space.100"}>{(activity || trace ? [] : Object.entries(policies))
				.sort(([, x], [, y]) => x.localeCompare(y))
				.map(([source, title]) => <>

					<Pressable key={source}

						xcss={xcss(({

							padding: "space.050",

							borderWidth: "border.width",
							borderStyle: "solid",
							borderRadius: "border.radius",

							color: source === selected
								? "color.text.selected"
								: "color.text",

							borderColor: source === selected
								? "color.border.selected"
								: "color.border",

							backgroundColor: source === selected
								? "color.background.selected"
								: "color.background.neutral.subtle"

						}))}

						onClick={() => select(source)}

					>

						<Text size={"large"} weight={"bold"}>{title}</Text>

					</Pressable>


				</>)
			}</Stack>

			{on(selected, {

				state: undefined,
				trace: undefined,

				value: document => document && <ToolPolicy source={document} as={"toc"}/>

			})}

		</Stack>}

	>{!selected || !policies[selected] ? (

		<EmptyState header="No Policy Selected" description={
			<Text>Choose one from the sidebar.</Text>
		}/>

	) : (

		<ToolPolicy source={selected}/>

	)}</ToolSplit>;

}
