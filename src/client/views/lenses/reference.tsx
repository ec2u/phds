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

import { EmptyState, Spinner, Stack, Text } from "@forge/react";
import React, { useEffect, useState } from "react";
import { asTrace, isDefined, isTrace, Trace } from "../../../shared";
import { Attachment } from "../../../shared/attachments";
import { Locale } from "../../../shared/languages";
import { retrieveAttachment } from "../../ports/attachments";

export function ToolReference({

	locale,

	children: attachment

}: {

	locale: Locale

	children: Attachment

}) {

	console.log(locale);

	const [content, setContent]=useState<string | Trace>(); // !!! raw data

	useEffect(() => {

		retrieveAttachment(attachment).then(setContent).catch(error => setContent(asTrace(error)));

	}, [attachment]);

	return isTrace(content) ? <EmptyState header={"!!!"}/> // !!! message + recovery
		: isDefined(content) ? <Stack>
				<Text>{locale}</Text>
				<Text>{content}</Text>
			</Stack> // !!! markdown
			: <Spinner/>; // !!! message
}
