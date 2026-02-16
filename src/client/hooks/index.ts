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
 * Shared React hook type definitions.
 *
 * @module index
 */

import { Dispatch, SetStateAction } from "react";
import { isActivity, type Status } from "../../shared/index";


/**
 * Interval in milliseconds between status polling requests for in-progress operations.
 */
const PollingPeriod = 1000;



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * A React state tuple containing the current value and its setter function.
 *
 * @typeParam T the type of the state value
 */
export type State<T> = [T, Dispatch<SetStateAction<T>>];


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Polls an asynchronous resource until a terminal status is reached.
 *
 * Fires an immediate call, then polls at {@link PollingPeriod} intervals. The task function performs the fetch and
 * handles the result; `poll` inspects the returned status to decide whether to continue. Stops polling when the
 * status is no longer an {@link Activity}. Returns a cleanup function that aborts polling.
 *
 * @param task The async function to poll — must return the status for lifecycle control
 *
 * @returns A cleanup function that stops polling
 */
export function poll(task: () => Promise<Status<unknown>>): () => void {

	const interval = setInterval(tick, PollingPeriod);

	tick();

	return () => clearInterval(interval);

	function tick() {
		task().then(status => {
			if ( !isActivity(status) ) {
				clearInterval(interval);
			}
		});
	}

}
