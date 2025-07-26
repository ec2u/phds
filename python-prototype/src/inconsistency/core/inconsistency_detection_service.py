from asyncio import TaskGroup
from enum import Enum
from pathlib import Path

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
    parallel_runs = 5

    def __init__(self, llm_port: LLMPort, prompt_port: PromptPort):
        self.llm_port = llm_port
        self.prompt_port = prompt_port

    @observe
    async def detect_inconsistencies(
        self, agreement_path: Path, policy_path: Path, known_issues: str = None, target_language: str = "EN"
    ) -> list[Inconsistency]:
        tasks = []

        async with TaskGroup() as tg:
            for _ in range(self.parallel_runs):
                task = tg.create_task(
                    self._detect_inconsistencies_with_single_run(
                        agreement_path, policy_path, known_issues or "", target_language
                    )
                )
                tasks.append(task)

        all_inconsistencies = [inc for task in tasks for inc in task.result()]
        unique_inconsistencies = await self._merge_inconsistencies(all_inconsistencies)

        return unique_inconsistencies

    @observe
    async def _detect_inconsistencies_with_single_run(
        self, agreement_path: Path, policy_path: Path, known_issues: str, target_language: str
    ) -> list[Inconsistency]:
        prompt = self.prompt_port.get_prompt(
            prompt_name="INCONSISTENCY_DETECTION",
            placeholder_values={
                "document_name": agreement_path.name,
                "policy_name": policy_path.name,
                "target_language": target_language,
                "known_issues": known_issues,
            },
        )
        response = await self.llm_port.generate(
            [agreement_path, policy_path, prompt], response_schema=InconsistencyDetectionResult
        )
        return response.inconsistencies

    @observe
    async def _merge_inconsistencies(self, all_inconsistencies: list[Inconsistency]) -> list[Inconsistency]:
        inconsistencies_text = "\n\n".join(
            [
                f"Title: {inc.inconsistency_title}\n"
                f"Description: {inc.inconsistency_description}\n"
                f"Severity: {inc.severity.value}\n"
                f"Agreement Content: {inc.agreement_content}\n"
                f"Policy Content: {inc.policy_content}"
                for inc in all_inconsistencies
            ]
        )

        merge_prompt = self.prompt_port.get_prompt(
            prompt_name="INCONSISTENCY_MERGING",
            placeholder_values={
                "inconsistencies": inconsistencies_text,
            },
        )

        response = await self.llm_port.generate([merge_prompt], response_schema=InconsistencyDetectionResult)

        return response.inconsistencies
