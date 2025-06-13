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
import { defaultLocale, Locale } from "../../../shared/languages";
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

	// !!! check if updated translation is available


	// !!! check if updated full text is available

	useEffect(() => {

		if ( attachment ) {

			setStatus("Retrieving");

			retrieveAttachment(attachment)
				.then(setContent)
				.then(clearStatus)
				.catch(setStatus);

		}

	}, [attachment]);

	// !!! extract full text
	// !!! save full text and remove stale versions

	useEffect(() => {

		if ( content ) {

			setStatus("Translating");

			translate({
				target: locale,
				source: {
					title: attachment.title,
					locale: defaultLocale, // !!! auto
					content
				}
			})
				.then(setTranslation)
				.then(clearStatus)
				.catch(setStatus);

		}

	}, [content, locale]);

	// !!! save translation and remove stale versions

	if ( isTrace(status) ) {

		return <EmptyState
			header={`;( Unable to process ${attachment.title}`} // !!! move title to description
			description={JSON.stringify(status, null, 4)} // !!! human-readable message
		/>;

	} else if ( isString(status) ) {

		return <EmptyState
			header={`${status ?? "Loading"}…`}
			description={<Spinner/>}
		/>;

	} else if ( isDefined(translation) ) {

		if ( isString(translation) ) {
			return <Text>{translation}</Text>;
		} else {
			return <Text>Binary!</Text>;
		}

	} else {

		return null;

	}

}
