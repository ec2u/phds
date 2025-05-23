import { invoke } from "@forge/bridge";

export function _getText(payload: { name: string }) {
	return invoke<string>("getText", payload);
}