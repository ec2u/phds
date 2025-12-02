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

import { EmptyState, Pressable, Stack, Text, xcss } from "@forge/react";
import React from "react";
import { isTrace } from "../../../shared";
import { Source } from "../../../shared/items/documents";
import { isActivity, on } from "../../../shared/tasks";
import { usePolicies } from "../../hooks/policies";
import { useStorage } from "../../hooks/storage";
import { NoPolicyDocumentsEmptyState } from "../elements/feedback";
import ToolSplit from "../layouts/split";
import { ToolActivity } from "./activity";
import { ToolPolicy } from "./policy";
import { ToolTrace } from "./trace";

export function ToolPolicies() {

	const policies = usePolicies();

	const [selected, setSelected] = useStorage<Source>("selected-policy");


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

	>{on(policies, {

		state: state => <ToolActivity activity={state}/>,
		trace: trace => <ToolTrace trace={trace}/>,

		value: policies => !Object.keys(policies).length ? (

			<NoPolicyDocumentsEmptyState/>

		) : !selected || !policies[selected] ? (

			<EmptyState header="No Policy Selected" description={
				<Text>Choose one from the sidebar.</Text>
			}/>

		) : (

			<ToolPolicy source={selected}/>

		)

	})}</ToolSplit>;

}
