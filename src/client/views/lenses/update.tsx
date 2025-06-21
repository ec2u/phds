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

import { EmptyState, Spinner } from "@forge/react";
import React from "react";
import { Activity } from "../../../shared/tasks";

export function ToolActivity({

	children: update

}: {

	children: Activity

}) {

	const messages={
		[Activity.Waiting]: "Waiting...",
		[Activity.Initializing]: "Initializing...",
		[Activity.Scanning]: "Scanning Attachments...",
		[Activity.Fetching]: "Fetching Content...",
		[Activity.Extracting]: "Extracting Text...",
		[Activity.Translating]: "Translating...",
		[Activity.Analyzing]: "Analyzing..."
	};

	return <EmptyState header={messages[update]} description={<Spinner/>}/>;

}
