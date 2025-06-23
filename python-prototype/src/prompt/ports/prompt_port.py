from abc import ABC, abstractmethod


class PromptPort(ABC):
    @abstractmethod
    def get_prompt(self, prompt_name: str, placeholder_values: dict[str, str] = None) -> str: ...
