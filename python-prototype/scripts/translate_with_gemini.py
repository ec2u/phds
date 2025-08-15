import asyncio
import logging
from asyncio import TaskGroup
from dataclasses import dataclass
from pathlib import Path

from langfuse import observe

from config.paths import get_output_dir
from llm.ports.gemini_port import GeminiPort
from prompt.ports.langfuse_port import LangfusePort
from translation.core.translation_service import TranslationService


@dataclass(frozen=True)
class Translation:
    file_name: str
    target_language: str
    original_language: str


@observe(name="Translate")
async def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

    md_dir = get_output_dir("pdf-to-md", "gemini")
    direct_output_dir = get_output_dir("translation", "gemini")
    reverse_output_dir = get_output_dir("reverse-translation", "gemini")

    logging.info("Instantiating clients...")
    gemini_port = GeminiPort()
    langfuse_port = LangfusePort()

    logging.info("Beginning file processing...")
    translations = [
        Translation("Area Policy Jena EN - Attachment I.md", "DE", "EN"),
        Translation(
            "Area Policy Turku  EN - Attachment III UTU-Doctoral_training_in_the_Faculty_of_Science.md", "FI", "EN"
        ),
        Translation("General Policy Jena EN - Attachment II.md", "DE", "EN"),
        Translation("Regulations Pavia-EN.md", "IT", "EN"),
        Translation("Regulations Pavia-IT.md", "EN", "IT"),
    ]
    logging.info(f"Found {len(translations)} target files")

    translation_service = TranslationService(
        llm_port=gemini_port, prompt_port=langfuse_port, use_translation_improvement=False
    )
    direct_translation = {t.file_name: t.target_language for t in translations}
    await translate(md_dir, direct_output_dir, translation_service, direct_translation)

    reverse_translation = {t.file_name: t.original_language for t in translations}
    await translate(direct_output_dir, reverse_output_dir, translation_service, reverse_translation)


async def translate(
    input_dir: Path,
    output_dir: Path,
    translation_service: TranslationService,
    input_file_to_target_language: dict[str, str],
):
    tasks = []
    logging.info(f"Translating {len(input_file_to_target_language)} documents...")
    async with TaskGroup() as tg:
        for file_path, target_language in input_file_to_target_language.items():
            input_path = input_dir / file_path
            task = tg.create_task(translation_service.translate(input_path.read_text(), target_language))
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
