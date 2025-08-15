from enum import Enum

from langfuse import observe
from pydantic import BaseModel

from llm.ports.llm_port import LLMPort
from prompt.ports.prompt_port import PromptPort


class InconsistencySeverity(Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class Inconsistency(BaseModel):
    agreement_content: str
    policy_content: str
    inconsistency_title: str
    inconsistency_description: str
    severity: InconsistencySeverity


class InconsistencyDetectionResult(BaseModel):
    inconsistencies: list[Inconsistency]


class InconsistencyDetectionService:
    def __init__(self, llm_port: LLMPort, prompt_port: PromptPort):
        self.llm_port = llm_port
        self.prompt_port = prompt_port

    @observe
    async def detect_inconsistencies(
        self, document_md: str, policy_md: str, known_issues: str = None, target_language: str = "EN"
    ) -> list[Inconsistency]:
        prompt = self.prompt_port.get_prompt(
            prompt_name="INCONSISTENCY_DETECTION",
            placeholder_values={
                "document_md": document_md,
                "policy_md": policy_md,
                "target_language": target_language,
                "known_issues": known_issues,
            },
        )
        response = await self.llm_port.generate(prompt, response_schema=InconsistencyDetectionResult)

        return response.inconsistencies
