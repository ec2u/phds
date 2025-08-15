import asyncio
import csv
import logging
from datetime import datetime

from langfuse import observe

from config.paths import get_output_dir
from llm.ports.gemini_port import GeminiPort
from prompt.ports.langfuse_port import LangfusePort
from translation.evaluation.pdf_to_md_evaluation_service import (
    TranslationEvaluationService,
    TranslationEvaluationDifference,
)


class EvalDifference(TranslationEvaluationDifference):
    file_name: str


@observe(name="Evaluate PDF to MD Conversion")
async def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

    original_files_dir = get_output_dir("pdf-to-md", "gemini")
    translation_dir = get_output_dir("reverse-translation", "gemini")
    file_names = [f.name for f in translation_dir.iterdir() if f.is_file()]
    logging.info(f"Found {len(file_names)} files to evaluate")

    logging.info("Instantiating clients...")
    gemini_port = GeminiPort(model_name="gemini-2.5-pro")
    langfuse_port = LangfusePort()
    eval_service = TranslationEvaluationService(llm_port=gemini_port, prompt_port=langfuse_port)

    logging.info("Beginning file processing...")
    differences = []
    for file_name in file_names:
        logging.info(f"Processing {file_name}...")
        correct_translation_path = original_files_dir / file_name
        proposed_translation_path = translation_dir / file_name
        response = await eval_service.evaluate_translation(
            correct_translation=correct_translation_path.read_text(),
            proposed_translation=proposed_translation_path.read_text(),
        )
        differences.extend(
            [
                EvalDifference(
                    file_name=file_name,
                    original_section=d.original_section,
                    translated_section=d.translated_section,
                    description=d.description,
                )
                for d in response.differences
            ]
        )
        logging.info(f"Result on file {correct_translation_path.name}...")
        logging.info(f"Evaluation outcome: {response.evaluation_outcome.value}")
        logging.info(f"Differences found: {len(response.differences)}")

    csv_output_dir = get_output_dir("evaluation", "translation")
    csv_filename = f"results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    csv_path = csv_output_dir / csv_filename

    rows = [[d.file_name, d.description, d.original_section, d.translated_section, ""] for d in differences]
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["file_name", "description", "original section", "translated section", "human review outcome"])
        writer.writerows(rows)

    logging.info(f"CSV with differences written to: {csv_path}")


if __name__ == "__main__":
    asyncio.run(main())
