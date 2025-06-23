import asyncio
import logging

from langfuse import observe

from config.paths import get_output_dir
from inconsistency.core.inconsistency_detection_service import InconsistencyDetectionService
from llm.ports.gemini_port import GeminiPort
from prompt.ports.langfuse_port import LangfusePort


@observe(name="Detect Inconsistencies")
async def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

    md_dir = get_output_dir("pdf-to-md", "gemini-v5")

    logging.info("Instantiating clients...")
    gemini_port = GeminiPort()
    langfuse_port = LangfusePort()
    inconsistency_detection_service = InconsistencyDetectionService(gemini_port, langfuse_port)

    logging.info("Beginning file processing...")
    agreement = md_dir / "Agreement EN - 250204 Cotutelle Agreement UJ-UTU.md"
    policy = md_dir / "Area Policy Turku  EN - Attachment III UTU-Doctoral_training_in_the_Faculty_of_Science.md"

    logging.info("Detecting inconsistencies...")
    res = await inconsistency_detection_service.detect_inconsistencies(agreement.read_text(), policy.read_text())
    logging.info(f"Found {len(res)} inconsistencies")
    for i, inconsistency in enumerate(res):
        logging.info(
            f"Inconsistency ({i + 1}): {inconsistency.inconsistency_reason}\nDocument content: {inconsistency.agreement_content}\nPolicy content: {inconsistency.policy_content}\n\n\n"
        )


if __name__ == "__main__":
    asyncio.run(main())
