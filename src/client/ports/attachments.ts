import { invoke } from "@forge/bridge";

export default function listAttachments() {
	return invoke<any>("listAttachments", {});
}