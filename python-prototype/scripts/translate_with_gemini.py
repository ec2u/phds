import asyncio
import logging
from asyncio import TaskGroup

from langfuse import observe

from config.paths import get_output_dir
from llm.ports.gemini_port import GeminiPort
from prompt.ports.langfuse_port import LangfusePort
from translation.core.translation_service import TranslationService


@observe(name="Translate")
async def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

    md_dir = get_output_dir("pdf-to-md", "gemini-v5")
    output_dir = get_output_dir("translation", "gemini-v3")

    logging.info("Instantiating clients...")
    gemini_port = GeminiPort()
    langfuse_port = LangfusePort()

    logging.info("Beginning file processing...")
    input_paths = list(md_dir.glob("*.md"))
    logging.info(f"Found {len(input_paths)} input paths")

    translation_service = TranslationService(llm_port=gemini_port, prompt_port=langfuse_port)
    tasks = []

    logging.info(f"Translating {len(input_paths)} documents...")
    async with TaskGroup() as tg:
        for input_path in input_paths:
            task = tg.create_task(translation_service.translate(input_path.read_text(), "IT"))
            tasks.append((task, input_path))
    logging.info("Translation tasks completed")

    for task, input_path in tasks:
        output_path = output_dir / input_path.name
        res = task.result()
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("---\n")
            f.write(f"title: {res.translated_title}\n")
            f.write(f"language: {res.target_language}\n")
            f.write("---\n\n")
            f.write(res.translated_content)
        logging.info(f"Document saved at {output_path}")


if __name__ == "__main__":
    asyncio.run(main())
