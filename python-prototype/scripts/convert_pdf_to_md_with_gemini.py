import asyncio
import logging

from langfuse import observe

from config.paths import get_input_dir, get_output_dir
from llm.ports.gemini_port import GeminiPort
from pdf_to_md.core.pdf_to_md_service import PdfToMdService
from prompt.ports.langfuse_port import LangfusePort


@observe(name="Convert PDF to Markdown")
async def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

    input_dir = get_input_dir()
    output_dir = get_output_dir("pdf-to-md", "gemini-v5")

    logging.info("Instantiating clients...")
    gemini_port = GeminiPort()
    langfuse_port = LangfusePort()

    logging.info("Beginning file processing...")
    input_paths = list(input_dir.glob("*.pdf"))
    logging.info(f"Found {len(input_paths)} input paths")

    pdf_to_md_service = PdfToMdService(llm_port=gemini_port, prompt_port=langfuse_port)
    results = await pdf_to_md_service.convert(input_paths)

    for r in results:
        output_path = output_dir / r.pdf_path.with_suffix(".md").name
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("---\n")
            f.write(f"title: {r.title}\n")
            f.write(f"language: {r.language}\n")
            f.write(f"original_file: {r.pdf_path.name}\n")
            f.write("---\n\n")
            f.write(r.md_text)
        logging.info(f"Document saved at {output_path}")


if __name__ == "__main__":
    asyncio.run(main())
