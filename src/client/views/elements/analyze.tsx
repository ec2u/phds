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

import { Button, EmptyState, Text } from "@forge/react";
import React from "react";


export function AnalysisNotPerformedPrompt({ onAnalyze }: { onAnalyze: () => void }) {

	return <EmptyState
		header={"Analysis Not Performed"}
		description={<Text>Check the agreement for compliance with policies.</Text>}
		primaryAction={<Button appearance={"discovery"} onClick={onAnalyze}>Analyze</Button>}
	/>;

}
