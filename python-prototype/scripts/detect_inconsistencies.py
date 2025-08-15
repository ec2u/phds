import asyncio
import logging
from datetime import datetime

from langfuse import observe

from config.paths import get_output_dir
from inconsistency.core.inconsistency_detection_service import InconsistencyDetectionService
from llm.ports.gemini_port import GeminiPort
from prompt.ports.langfuse_port import LangfusePort


@observe(name="Detect Inconsistencies")
async def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

    input_dir = get_output_dir("pdf-to-md", "gemini")

    logging.info("Instantiating clients...")
    gemini_port = GeminiPort(model_name="gemini-2.5-pro")
    langfuse_port = LangfusePort()
    inconsistency_detection_service = InconsistencyDetectionService(gemini_port, langfuse_port)

    logging.info("Beginning file processing...")
    agreement_path = input_dir / "Agreement EN - 250204 Cotutelle Agreement UJ-UTU.md"
    policy_path = (
        input_dir / "Area Policy Jena DE - Attachment II Provisions for Doctoral Candidates of the Faculty UJ.md"
    )

    logging.info("Detecting inconsistencies...")
    known_issues = ""
    res = await inconsistency_detection_service.detect_inconsistencies(
        agreement_path.read_text(), policy_path.read_text(), known_issues=known_issues
    )
    logging.info(f"Found {len(res)} inconsistencies")

    # Prepare output file
    output_dir = get_output_dir("inconsistency", "gemini")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = output_dir / f"results_{timestamp}.md"

    lines = [
        "# Inconsistency Detection Results\n\n",
        f"- Generated: {timestamp}\n",
        f"- Agreement file: {agreement_path.name}\n",
        f"- Policy file: {policy_path.name}\n",
        f"- Total inconsistencies: {len(res)}\n\n",
    ]

    for i, inconsistency in enumerate(res, start=1):
        lines.append(f"## {i}. {inconsistency.inconsistency_title} (Severity: {inconsistency.severity.value})\n")
        lines.append("**Description**\n\n")
        lines.append(f"{inconsistency.inconsistency_description}\n\n")
        lines.append("**Document content**\n\n")
        lines.append(f"> {inconsistency.agreement_content}\n\n")
        lines.append("**Policy content**\n\n")
        lines.append(f"> {inconsistency.policy_content}\n\n")
        lines.append("---\n\n")

    output_file.write_text("".join(lines))
    logging.info(f"Wrote inconsistency report to {output_file}")


if __name__ == "__main__":
    asyncio.run(main())
