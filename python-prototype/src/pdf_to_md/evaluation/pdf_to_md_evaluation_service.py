from enum import Enum
from pathlib import Path

from langfuse import observe
from pydantic import BaseModel

from llm.ports.llm_port import LLMPort
from prompt.ports.prompt_port import PromptPort


class MdFromPdfEvaluationDifference(BaseModel):
    md_section: str
    pdf_section: str
    difference_description: str


class EvaluationOutcome(Enum):
    OK = "OK"
    DIFFERENCES_FOUND = "DIFFERENCES_FOUND"


class MdFromPdfEvaluationResult(BaseModel):
    evaluation_outcome: EvaluationOutcome
    differences: list[MdFromPdfEvaluationDifference]


class PdfToMdEvaluationService:
    def __init__(self, llm_port: LLMPort, prompt_port: PromptPort):
        self.llm_port = llm_port
        self.prompt_port = prompt_port

    @observe
    async def evaluate_md(self, md_path: Path, pdf_path: Path) -> MdFromPdfEvaluationResult:
        eval_prompt = self.prompt_port.get_prompt("PDF_TO_MD_EVALUATION")
        response: MdFromPdfEvaluationResult = await self.llm_port.generate(
            contents=[pdf_path, md_path, eval_prompt], response_schema=MdFromPdfEvaluationResult
        )
        return response
