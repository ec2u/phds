from langfuse import observe
from pydantic import BaseModel

from llm.ports.llm_port import LLMPort
from prompt.ports.prompt_port import PromptPort


class TranslationResult(BaseModel):
    target_language: str
    translated_content: str
    translated_title: str


class TranslationService:
    def __init__(self, llm_port: LLMPort, prompt_port: PromptPort, use_translation_improvement: bool = True):
        self.llm_port = llm_port
        self.prompt_port = prompt_port
        self.use_translation_improvement = use_translation_improvement

    @observe
    async def translate(self, source_content: str, target_language: str) -> TranslationResult:
        translation_prompt = self.prompt_port.get_prompt(
            prompt_name="TRANSLATION",
            placeholder_values={"source_content": source_content, "target_language": target_language},
        )
        translation = await self.llm_port.generate([translation_prompt], TranslationResult)
        if self.use_translation_improvement:
            improvement_prompt = self.prompt_port.get_prompt(
                prompt_name="TRANSLATION_IMPROVEMENT",
                placeholder_values={
                    "source_content": source_content,
                    "target_language": target_language,
                    "target_content": translation.translated_content,
                },
            )
            translation = await self.llm_port.generate([improvement_prompt], response_schema=TranslationResult)
        return translation
