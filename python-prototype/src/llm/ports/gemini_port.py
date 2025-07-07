from pathlib import Path

import langfuse
from google.genai import Client
from google.genai.types import GenerateContentConfig, File, UploadFileConfig

from llm.ports.llm_port import LLMPort, T

DEFAULT_MODEL_NAME = "gemini-2.5-flash"


class GeminiPort(LLMPort):
    def __init__(self, model_name: str = DEFAULT_MODEL_NAME):
        self.model_name = model_name
        self.client = Client()

    @langfuse.observe(name="gemini-generation", as_type="generation")
    async def generate(self, contents: list[str | Path] | str, response_schema: type[T] = None) -> str | T:
        uploaded_files = await self._upload_all_files(contents)
        prompt_contents = self._build_prompt_contents(contents, uploaded_files)
        response = await self.client.aio.models.generate_content(
            model=self.model_name,
            config=GenerateContentConfig(
                temperature=0,
                seed=42,
                response_schema=response_schema,
                response_mime_type="application/json" if response_schema else "text/plain",
            ),
            contents=prompt_contents,
        )
        langfuse.get_client().update_current_generation(
            input=contents,
            model=self.model_name,
            usage_details={
                "input": response.usage_metadata.prompt_token_count,
                "output": response.usage_metadata.candidates_token_count,
                "total": response.usage_metadata.total_token_count,
            },
        )
        return response.text if response_schema is None else response.parsed

    @staticmethod
    def _build_prompt_contents(contents: list[str | Path] | str, uploaded_files: list[File]) -> list[str | File]:
        prompt_contents = uploaded_files + [c for c in contents if not isinstance(c, Path)]
        return prompt_contents

    async def _upload_all_files(self, contents: list[str | Path] | str) -> list[File]:
        uploaded_files = [
            await self.client.aio.files.upload(file=c, config=UploadFileConfig(display_name=c.name))
            for c in contents
            if isinstance(c, Path)
        ]
        return uploaded_files
