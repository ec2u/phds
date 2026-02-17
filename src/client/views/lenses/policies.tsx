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

import {
	Button,
	ButtonGroup,
	EmptyState,
	Modal,
	ModalBody,
	ModalFooter,
	ModalHeader,
	ModalTitle,
	Pressable,
	Stack,
	Text,
	xcss
} from "@forge/react";
import React, { useState } from "react";
import { isActivity, isTrace, on } from "../../../shared";
import { useCache } from "../../hooks/cache";
import { usePolicies } from "../../hooks/policies";
import { PolicyKeyPrefix } from "../../hooks/policy";
import { useStorage } from "../../hooks/storage";
import ToolSplit from "../layouts/split";
import { ToolActivity } from "./activity";
import { ToolPolicy } from "./policy";
import { ToolTrace } from "./trace";

/**
 * Renders a split-pane view with a selectable policy list in the sidebar and the selected policy content in the
 * main area.
 *
 * Uses {@link usePolicies} internally for data. Persists the selected policy to browser localStorage for the current
 * page.
 *
 * @param props the component props
 * @param props.page the Confluence page identifier
 */
export function ToolPolicies({

	page

}: {

	page: string

}) {

	const [policies] = usePolicies();

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

	>{on(policies, {

		state: activity => <ToolActivity activity={activity}/>,
		trace: trace => <ToolTrace trace={trace}/>,

		value: catalog => !selected || !catalog[selected] ? (

			<EmptyState header="No Policy Selected" description={
				<Text>Choose one from the sidebar.</Text>
			}/>

		) : (

		<ToolPolicy source={selected}/>

		)

	})}</ToolSplit>;

}

/**
 * Renders the policies toolbar action group with a "Clear Policies" button that prompts for confirmation before
 * purging all cached policy data for the current page.
 *
 * Uses {@link usePolicies} internally for scoped cache invalidation. Automatically disabled when policies are loading,
 * in error state, or empty.
 */
export function ToolPoliciesActions() {

	const { someCache } = useCache();
	const [policies, { clear }] = usePolicies();

	const [confirming, setConfirming] = useState(false);

	const busy = someCache(PolicyKeyPrefix, isActivity);
	const disabled = isActivity(policies) || isTrace(policies) || Object.keys(policies).length === 0 || busy;


	function cancel() {
		setConfirming(false);
	}

	function confirm() {
		setConfirming(false);
		clear();
	}


	return <ButtonGroup>

		<Button

			isDisabled={disabled}

			onClick={() => setConfirming(true)}

		>Clear Policies</Button>

		{confirming && <Modal onClose={() => setConfirming(false)}>

            <ModalHeader>
                <ModalTitle>Confirm Clear Policies</ModalTitle>
            </ModalHeader>

            <ModalBody>
                Are you sure you want to clear all cached policy data? This action will clear the processing
                history of policy translations for this page and cannot be undone.
            </ModalBody>

            <ModalFooter>
                <Button appearance="subtle" autoFocus={true} onClick={cancel}>Cancel</Button>
                <Button appearance="danger" onClick={confirm}>Clear Policies</Button>
            </ModalFooter>

        </Modal>}

	</ButtonGroup>;
}
