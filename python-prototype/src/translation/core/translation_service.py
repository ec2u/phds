from langfuse import observe
from pydantic import BaseModel

from llm.ports.llm_port import LLMPort
from prompt.ports.prompt_port import PromptPort


class TranslationResult(BaseModel):
    target_language: str
    translated_content: str
    translated_title: str


class TranslationService:
    def __init__(self, llm_port: LLMPort, prompt_port: PromptPort):
        self.llm_port = llm_port
        self.prompt_port = prompt_port

    @observe
    async def translate(self, source_content: str, target_language: str) -> TranslationResult:
        translation_prompt = self.prompt_port.get_prompt(
            prompt_name="TRANSLATION",
            placeholder_values={"source_content": source_content, "target_language": target_language},
        )
        target_content = await self.llm_port.generate([translation_prompt])
        improvement_prompt = self.prompt_port.get_prompt(
            prompt_name="TRANSLATION_IMPROVEMENT",
            placeholder_values={
                "source_content": source_content,
                "target_language": target_language,
                "target_content": target_content,
            },
        )
        improved_translation = await self.llm_port.generate([improvement_prompt], response_schema=TranslationResult)
        return improved_translation
