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

import { EmptyState, Spinner, Text } from "@forge/react";
import React, { useEffect, useState } from "react";
import { isDefined, isString, isTrace, Trace } from "../../../shared";
import { Attachment } from "../../../shared/attachments";
import { Content } from "../../../shared/documents";
import { Locale } from "../../../shared/languages";
import { retrieveAttachment } from "../../ports/attachments";
import { translate } from "../../ports/gemini";

export function ToolReference({

	locale,

	children: attachment

}: {

	locale: Locale

	children: Attachment

}) {

	const [status, setStatus]=useState<string | Trace>();

	const [content, setContent]=useState<Content>();
	const [translation, setTranslation]=useState<Content>();


	function clearStatus() {
		setStatus(undefined);
	}


	useEffect(() => {

		if ( attachment ) {

			setStatus("Retrieving");

			retrieveAttachment(attachment)
				.then(setContent)
				.then(clearStatus)
				.catch(setStatus);

		}

	}, [attachment]);

	useEffect(() => {

		if ( content ) {

			setStatus("Translating");

			translate({
				target: locale,
				source: {
					title: attachment.title,
					locale: Locale.EN, // !!! auto
					content
				}
			})
				.then(setTranslation)
				.then(clearStatus)
				.catch(setStatus);

		}

	}, [content]);

	// !!! save translation

	if ( isTrace(status) ) {

		return <EmptyState
			header={`;( Unable to process ${attachment.title}`} // move title to description
			description={JSON.stringify(status, null, 4)} // !!! human-readable message
		/>;

	} else if ( isDefined(translation) ) {

		if ( isString(translation) ) {
			return <Text>{translation}</Text>;
		} else {
			return <Text>Binary!</Text>;
		}

	} else {

		return <EmptyState
			header={`${status ?? "Loading"}…`}
			description={<Spinner/>}
		/>;

	}

}
