interface Issue {

	title: string;
	description: string;

	citations: Citation[];

}

interface Citation {

	source: string;
	offset: number;
	length: number;

}