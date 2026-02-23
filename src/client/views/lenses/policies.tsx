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
import React, { type ReactNode, useEffect, useState } from "react";
import type { Catalogue, Document } from "../../../shared/items/documents";
import { isContent, on, type Status } from "../../../shared/store";
import { usePolicies } from "../../hooks/policies";
import { type PolicyActions, usePolicy } from "../../hooks/policy";
import type { SafeXCSS } from "../index";
import ToolSplit from "../layouts/split";
import { ToolActivity } from "./activity";
import { ToolPolicy } from "./policy";
import { ToolTrace } from "./trace";


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Renders a split-pane view with a selectable policy list in the sidebar and the selected policy content in the
 * main area.
 *
 * Uses {@link usePolicies} internally for data. Persists the selected policy to browser localStorage for the current
 * page.
 *
 */
export function ToolPolicies({

	onActions

}: {

	onActions: (actions: ReactNode) => () => void;

}) {

	const [selected, setSelected] = useState<undefined | string>();

	const [policies] = usePolicies();
	const [policy, policyActions] = usePolicy(selected);


	useEffect(() => onActions(
		<ToolPoliciesActions policies={policies} policy={[policy, policyActions]}/>
	), [policies, policy, policyActions, onActions]);


	function select(source: string) {
		setSelected(source === selected ? undefined : source);
	}


	return <ToolSplit

		side={<Stack space={"space.250"}>

			<Stack space={"space.100"}>{on(policies, {
				state: [],
				trace: [],
				other: catalog => Object.entries(catalog)
			})
				.sort(([, x], [, y]) => x.localeCompare(y))
				.map(([source, title]) => <>

					<Pressable key={source}

						xcss={xcss({

							padding: "space.075",

							borderWidth: "border.width",
							borderStyle: "solid",
							borderRadius: "radius.medium",

							color: source === selected
								? "color.text.selected"
								: "color.text",

							borderColor: source === selected
								? "color.border.selected"
								: "color.border",

							backgroundColor: source === selected
								? "color.background.selected"
								: "color.background.neutral.subtle"

						}) as SafeXCSS}

						onClick={() => select(source)}

					>

						<Text size={"large"} weight={"bold"}>{title}</Text>

					</Pressable>


				</>)
			}</Stack>

			{on(policies, {

				state: undefined,
				trace: undefined,

				value: () => selected && on(policy, {

					state: undefined,
					trace: undefined,

					value: document => document && <ToolPolicy document={document} as={"toc"}/>

				})

			})}

		</Stack>}

	>{on(policies, {

		state: activity => <ToolActivity activity={activity}/>,
		trace: trace => <ToolTrace trace={trace}/>,

		value: () => !selected ? <PolicyNotSelectedPrompt/> : on(policy, {

			state: activity => <ToolActivity activity={activity}/>,
			trace: trace => <ToolTrace trace={trace}/>,

			value: document => document ? <ToolPolicy document={document}/> : null

		})

	})}</ToolSplit>;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Renders the policies toolbar action group with a "Refresh Content" button that prompts for confirmation before
 * clearing the selected policy's cached data.
 *
 * Disabled when no policy is selected.
 */
function ToolPoliciesActions({

	policies,
	policy: [policy, { clear }]

}: {

	policies: Status<Catalogue>;
	policy: [Status<undefined | Document>, PolicyActions];

}) {

	const [confirming, setConfirming] = useState(false);

	function cancel() {
		setConfirming(false);
	}

	function confirm() {
		try { clear();} finally { setConfirming(false); }
	}


	return <ButtonGroup>

		<Button

			isDisabled={policy === undefined
				|| !isContent(policies)
				|| !isContent(policy)
		}

			onClick={() => setConfirming(true)}

		>Refresh Content</Button>

		{confirming && <Modal onClose={() => setConfirming(false)}>

            <ModalHeader>
                <ModalTitle>Confirm Refresh Content</ModalTitle>
            </ModalHeader>

            <ModalBody>
                Are you sure you want to refresh this policy? Content will be re-extracted from the
                source PDF attachment, replacing the current version.
            </ModalBody>

            <ModalFooter>
                <Button appearance="subtle" autoFocus={true} onClick={cancel}>Cancel</Button>
                <Button appearance="danger" onClick={confirm}>Refresh Content</Button>
            </ModalFooter>

        </Modal>}

	</ButtonGroup>;
}

/**
 * Renders an empty state prompting the user to select a policy from the sidebar.
 */
function PolicyNotSelectedPrompt() {

	return <EmptyState
		header={"No Policy Selected"}
		description={<Text>Choose one from the sidebar.</Text>}
	/>;

}
