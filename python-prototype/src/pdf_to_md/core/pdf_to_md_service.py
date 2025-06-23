from asyncio import TaskGroup
from pathlib import Path

from langfuse import observe
from pydantic import BaseModel

from llm.ports.llm_port import LLMPort
from prompt.ports.prompt_port import PromptPort


class MdExtractionResult(BaseModel):
    md_text: str
    title: str
    language: str


class MdFromPdf(MdExtractionResult):
    pdf_path: Path


class PdfToMdService:
    def __init__(self, llm_port: LLMPort, prompt_port: PromptPort):
        self.llm_port = llm_port
        self.prompt_port = prompt_port

    @observe
    async def convert(self, pdf_paths: list[Path]) -> list[MdFromPdf]:
        pdf_to_md_prompt = self.prompt_port.get_prompt("PDF_TO_MD")
        tasks = []

        async with TaskGroup() as tg:
            for pdf_path in pdf_paths:
                task = tg.create_task(
                    self.llm_port.generate([pdf_path, pdf_to_md_prompt], response_schema=MdExtractionResult)
                )
                tasks.append((task, pdf_path))

        res = [
            MdFromPdf(
                pdf_path=pdf_path,
                md_text=task.result().md_text,
                title=task.result().title,
                language=task.result().language,
            )
            for task, pdf_path in tasks
        ]

        return res
