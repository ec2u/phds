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

import { Button, LoadingButton, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "@forge/react";
import React, { useState } from "react";
import { isActivity, Status } from "../../../shared/tasks";
import { execute } from "../../hooks";

export function ToolClear() {

	const [confirming, setConfirming]=useState(false);
	const [clearing, setClearing]=useState<Status<void>>();


	function cancel() {
		setConfirming(false);
	}

	function confirm() {
		setConfirming(false);
		execute(setClearing, { type: "clear" });
	}


	return <>

		<LoadingButton
			isLoading={isActivity(clearing)}
			appearance={"default"}
			onClick={() => setConfirming(true)}
		>
			{"Clear"}
		</LoadingButton>

		{confirming && <Modal onClose={() => setConfirming(false)}>

            <ModalHeader>
                <ModalTitle>Confirm Clear Action</ModalTitle>
            </ModalHeader>

            <ModalBody>
                Are you sure you want to clear all cached data? This action will clear the processing
                history of this page, including translations and issues, and cannot be undone.
            </ModalBody>

            <ModalFooter>
                <Button appearance="subtle" autoFocus={true} onClick={cancel}>Cancel</Button>
                <Button appearance="danger" onClick={confirm}>Clear</Button>
            </ModalFooter>

        </Modal>}

	</>;
}
