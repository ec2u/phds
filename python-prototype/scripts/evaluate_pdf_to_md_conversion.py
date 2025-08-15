import asyncio
import logging

from langfuse import observe

from config.paths import get_input_dir, get_output_dir
from llm.ports.gemini_port import GeminiPort
from pdf_to_md.evaluation.pdf_to_md_evaluation_service import PdfToMdEvaluationService, EvaluationOutcome
from prompt.ports.langfuse_port import LangfusePort


@observe(name="Evaluate PDF to MD Conversion")
async def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

    pdf_dir = get_input_dir()
    md_dir = get_output_dir("pdf-to-md", "gemini-v5")

    logging.info("Instantiating clients...")
    gemini_port = GeminiPort()
    langfuse_port = LangfusePort()

    logging.info("Beginning file processing...")
    pdf_paths = list(pdf_dir.glob("*.pdf"))
    logging.info(f"Found {len(pdf_paths)} input paths")

    eval_service = PdfToMdEvaluationService(llm_port=gemini_port, prompt_port=langfuse_port)

    for pdf_path in pdf_paths:
        logging.info(f"Evaluating PDF: {pdf_path.name}")
        md_path = md_dir / pdf_path.with_suffix(".md").name
        eval_result = await eval_service.evaluate_md(md_path=md_path, pdf_path=pdf_path)
        if eval_result.evaluation_outcome == EvaluationOutcome.DIFFERENCES_FOUND:
            logging.warning(f"⚠️ Differences found for {pdf_path.name}.")
            for i, diff in enumerate(eval_result.differences):
                logging.info(f"Difference {i + 1} description: {diff.difference_description}")
        else:
            logging.info(f"✅ No differences found for {pdf_path.name}.")


if __name__ == "__main__":
    asyncio.run(main())
