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

import { Select } from "@forge/react";
import React from "react";

const DE={ label: "Deutsch", value: "de" };       // German
const EN={ label: "English", value: "en" };       // English
const ES={ label: "Español", value: "es" };       // Spanish
const FR={ label: "Français", value: "fr" };      // French
const IT={ label: "Italiano", value: "it" };      // Italian
const PT={ label: "Português", value: "pt" };     // Portuguese
const RO={ label: "Română", value: "ro" };        // Romanian
const FI={ label: "Suomi", value: "fi" };         // Finnish
const SV={ label: "Svenska", value: "sv" };       // Swedish

const LANGUAGES=[DE, EN, ES, FR, IT, PT, RO, FI, SV];

export function ToolLanguage() {
	return <Select spacing={"compact"}
		isRequired={true}
		defaultValue={EN}
		options={LANGUAGES}
	/>;
}
