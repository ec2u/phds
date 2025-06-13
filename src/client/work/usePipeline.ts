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

import { useEffect, useState } from "react";
import { createAsyncEmitter } from "./createAsyncEmitter";
import { PipelineUpdate, processDocument } from "./processDocument";

function lookup(docId: string, consumer: (update: PipelineUpdate) => void) {

	async function consume(consumer: (update: PipelineUpdate) => void) {
		for await (const update of emitter) {consumer(update);}
	}

	const emitter=createAsyncEmitter<PipelineUpdate>();

	consume(consumer);

	processDocument(docId, emitter);

	return () => emitter.close();
}


export function usePipeline(id: string): PipelineUpdate[] {

	const [updates, setUpdates]=useState<PipelineUpdate[]>([]);

	useEffect(() => {

		return lookup(id, update => setUpdates(prev => [...prev, update]));

	}, [id]);

	return updates;
}
