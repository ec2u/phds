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
 * Empty state prompt for triggering compliance analysis.
 *
 * @module
 */

import { Button, EmptyState, Text } from "@forge/react";
import React from "react";


/**
 * Renders an empty state prompting the user to run compliance analysis.
 *
 * @param props the component props
 * @param props.onAnalyse the callback to trigger analysis
 */
export function AnalysisNotPerformedPrompt({ onAnalyse }: { onAnalyse: () => void }) {

	return <EmptyState
		header={"Analysis Not Performed"}
		description={<Text>Check the agreement for compliance with policies.</Text>}
		primaryAction={<Button appearance={"discovery"} onClick={onAnalyse}>Analyse</Button>}
	/>;

}
