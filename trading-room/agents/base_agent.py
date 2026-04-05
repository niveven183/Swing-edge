"""Base class for all agents."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from utils.logger import get_logger


class BaseAgent(ABC):
    """All agents inherit from this and implement `run`."""

    name: str = "base"

    def __init__(self) -> None:
        self.log = get_logger(f"agent.{self.name}")

    @abstractmethod
    def run(self, context: dict[str, Any]) -> Any:
        """Execute the agent against the shared pipeline context."""
        raise NotImplementedError
