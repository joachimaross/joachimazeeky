"""Zeeky package initialization."""

from importlib import metadata

try:
    __version__: str = metadata.version("zeeky")
except metadata.PackageNotFoundError:  # pragma: no cover
    __version__ = "0.0.0"

from .assistant import ZeekyAssistant  # noqa: E402

__all__ = [
    "ZeekyAssistant",
]