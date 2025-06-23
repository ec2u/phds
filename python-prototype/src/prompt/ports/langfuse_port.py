from langfuse import get_client

from prompt.ports.prompt_port import PromptPort


class LangfusePort(PromptPort):
    def get_prompt(self, prompt_name: str, placeholder_values: dict[str, str] = None) -> str:
        langfuse_client = get_client()
        prompt = langfuse_client.get_prompt(prompt_name)
        return prompt.compile(**(placeholder_values or {}))
