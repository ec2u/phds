import { Request } from "@forge/resolver";


type Hello={
	name: string;
};

type R<T>={

	context: Request["context"],
	payload: T & Request["payload"];

}


export default function getText({ context, payload: { name } }: Request) {

	return `ciao ${name}!`;

}