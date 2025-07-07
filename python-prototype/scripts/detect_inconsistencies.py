import asyncio
import logging

from langfuse import observe

from config.paths import get_input_dir
from inconsistency.core.inconsistency_detection_service import InconsistencyDetectionService
from llm.ports.gemini_port import GeminiPort
from prompt.ports.langfuse_port import LangfusePort


@observe(name="Detect Inconsistencies")
async def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

    input_dir = get_input_dir()

    logging.info("Instantiating clients...")
    gemini_port = GeminiPort()
    langfuse_port = LangfusePort()
    inconsistency_detection_service = InconsistencyDetectionService(gemini_port, langfuse_port)

    logging.info("Beginning file processing...")
    agreement_path = input_dir / "Agreement EN - 250204 Cotutelle Agreement UJ-UTU.pdf"
    policy_path = (
        input_dir / "Area Policy Jena DE - Attachment II Provisions for Doctoral Candidates of the Faculty UJ.pdf"
    )

    logging.info("Detecting inconsistencies...")
    known_issues = """
    Direct Contradiction in Doctoral Thesis Grading at UTU
    The agreement explicitly states that the Faculty of Science at UTU accepts doctoral theses 'without any grading'. This directly contradicts the policy, which mandates that doctoral theses are graded as 'accepted with honours', 'accepted', or 'rejected' by the Faculty Council at UTU.
    Document content: The Faculty of Science accepts doctoral theses without any grading.
    Policy content: The Faculty Council decides on accepting doctoral and licentiate theses. Doctoral theses are graded as "accepted with honours”, “accepted” or “rejected”. The grading is based on the statements from the official examiners. If all examiners estimate in their statements that the doctoral thesis is on the same level as the top 10% of theses in its field internationally, the thesis can be accepted with honours.
    """
    res = await inconsistency_detection_service.detect_inconsistencies(agreement_path, policy_path, known_issues)
    logging.info(f"Found {len(res)} inconsistencies")
    for i, inconsistency in enumerate(res):
        logging.info(
            f"Inconsistency ({i + 1}): {inconsistency.inconsistency_title} ({inconsistency.severity.value})\n{inconsistency.inconsistency_description}\nDocument content: {inconsistency.agreement_content}\nPolicy content: {inconsistency.policy_content}\n\n\n"
        )


if __name__ == "__main__":
    asyncio.run(main())
