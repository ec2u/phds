from pathlib import Path


def get_data_dir() -> Path:
    return Path(__file__).parent.parent.parent / "data"


def get_input_dir() -> Path:
    return get_data_dir() / "pdf"


def get_output_dir(output_type: str, output_method: str) -> Path:
    output_dir = get_data_dir() / output_type / output_method
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir
