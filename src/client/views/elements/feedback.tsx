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

import { Button, Code, EmptyState, Icon, Text } from "@forge/react";
import React from "react";

export function CorruptedDocumentErrorState() {
	return <EmptyState
		header={"Corrupted Document"}
		description={"The expected document structure was corrupted.\n"+
			"Save your content and attachments and recreate it from scratch"
		}
		primaryAction={<Icon label={""} glyph={"error"} size={"large"} color={"color.icon.warning"}/>}
	/>;
}

export function NoAgreementTextEmptyState() {
	return <EmptyState
		header={"No Agreement Text"}
		description={<Text>Enter Confluence <Code>Edit</Code> mode to update.</Text>}
	/>;
}

export function NoPolicyDocumentsEmptyState() {
	return <EmptyState header={"No Policy Documents"} description={
		<Text>Upload PDF documents to the page <Text weight={"bold"}>Attachments</Text> area.</Text>
	}/>;
}

export function AnalysisNotPerformedPrompt({ onAnalyze }: { onAnalyze: () => void }) {
	return <EmptyState
		header={"Analysis Not Performed"}
		description={<Text>Check the agreement for compliance with policies.</Text>}
		primaryAction={<Button appearance={"discovery"} onClick={onAnalyze}>Analyze</Button>}
	/>;
}
