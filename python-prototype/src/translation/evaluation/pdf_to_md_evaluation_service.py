from enum import Enum

from langfuse import observe
from pydantic import BaseModel

from llm.ports.llm_port import LLMPort
from prompt.ports.prompt_port import PromptPort


class TranslationEvaluationDifference(BaseModel):
    original_section: str
    translated_section: str
    description: str


class TranslationEvaluationOutcome(Enum):
    OK = "OK"
    DIFFERENCES_FOUND = "DIFFERENCES_FOUND"


class TranslationEvaluationResult(BaseModel):
    evaluation_outcome: TranslationEvaluationOutcome
    differences: list[TranslationEvaluationDifference]


class TranslationEvaluationService:
    def __init__(self, llm_port: LLMPort, prompt_port: PromptPort):
        self.llm_port = llm_port
        self.prompt_port = prompt_port

    @observe
    async def evaluate_translation(
        self, correct_translation: str, proposed_translation: str
    ) -> TranslationEvaluationResult:
        eval_prompt = self.prompt_port.get_prompt(
            "TRANSLATION_EVALUATION",
            placeholder_values={
                "correct_translation": correct_translation,
                "proposed_translation": proposed_translation,
            },
        )
        response: TranslationEvaluationResult = await self.llm_port.generate(
            contents=eval_prompt, response_schema=TranslationEvaluationResult
        )
        return response
