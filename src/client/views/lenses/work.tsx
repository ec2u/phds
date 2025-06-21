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

import { LoadingButton } from "@forge/react";
import React, { useState } from "react";
import { Attachment } from "../../../shared/attachments";
import { isUpdate, Status, Update } from "../../hooks";
import { uploadAttachment } from "../../ports/attachments";


export function ToolWork({}: {}) {

	const [attachment, setAttachment]=useState<Status<Attachment>>();

	function upload() {

		setAttachment(Update.Analyzing);


		uploadAttachment({

			original: false,
			language: "en",

			source: undefined,

			title: "test",
			content: "zzz"

		})

			.then(setAttachment)
			.catch(setAttachment);

	}


	return <>

		<LoadingButton isLoading={isUpdate(attachment)} onClick={upload}>!!!</LoadingButton>

		{attachment && JSON.stringify(attachment, null, 2)}

	</>;

}
