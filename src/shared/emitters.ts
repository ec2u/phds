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


import { immutable } from "./index";

/**
 * An async emitter that can emit values and be consumed as an async iterator.
 * @template T The type of values emitted
 */
export interface Emitter<T> {

	/**
	 * Emits a value to the async iterator.
	 * @param value The value to emit
	 * @returns true if the value was emitted successfully, false if the emitter is closed
	 */
	readonly emit: (value: T) => boolean;

	/**
	 * Closes the emitter, preventing further emissions and completing any pending iterations.
	 */
	readonly close: () => void;

	/**
	 * Returns an async generator that yields emitted values.
	 * @returns An async generator for the emitted values
	 */
	readonly [Symbol.asyncIterator]: () => AsyncGenerator<T>;

}

/**
 * Creates a new async emitter that can emit values and be consumed as an async iterator.
 *
 * The emitter uses a queue-based approach to handle backpressure:
 *
 * - When consumers are waiting, values are delivered immediately
 * - When no consumers are waiting, values are queued for later consumption
 * - Once closed, no new values can be emitted
 *
 * @template T The type of values to emit
 * @returns A new immutable emitter instance
 */
export function createAsyncEmitter<T>(): Emitter<T> {

	const pending: T[]=[];
	const waiting: ((value: IteratorResult<T>) => void)[]=[];

	let closed=false;

	const emit=(value: T) => {
		if ( closed ) {return false;} else {

			if ( waiting.length > 0 ) {
				waiting.shift()!({ value, done: false });
			} else {
				pending.push(value);
			}

			return true;
		}
	};

	const close=() => {

		closed=true;

		while ( waiting.length > 0 ) {
			waiting.shift()!({ value: undefined, done: true });
		}

	};

	async function* generator(): AsyncGenerator<T> {
		while ( !closed || pending.length > 0 ) {
			if ( pending.length > 0 ) {

				yield pending.shift()!;

			} else {

				const result=await new Promise<IteratorResult<T>>((resolve) => waiting.push(resolve));

				if ( result.done ) {
					return;
				}

				yield result.value;

			}
		}
	}

	return immutable({
		emit,
		close,
		[Symbol.asyncIterator]: generator
	});
}
