from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class DispatchMessage:
    title: str
    message: str
    scenario: str
    severity: str
    recommended_actions: tuple[str, ...]
    privacy_mode: str


@dataclass(frozen=True)
class DispatchResult:
    channel: str
    attempted: bool
    delivered: bool
    detail: str
    provider_message_id: str | None = None
    provider_status: str | None = None


class Dispatcher(Protocol):
    channel: str

    async def dispatch(
        self,
        message: DispatchMessage,
    ) -> DispatchResult:
        ...
