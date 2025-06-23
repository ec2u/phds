import typing
from abc import ABC, abstractmethod
from pathlib import Path

from pydantic import BaseModel

T = typing.TypeVar("T", bound=BaseModel)


class LLMPort(ABC):
    @abstractmethod
    async def generate(self, contents: list[str | Path] | str, response_schema: type[T] = None) -> str | T: ...
