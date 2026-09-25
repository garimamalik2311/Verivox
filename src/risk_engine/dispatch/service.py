import asyncio
import os

from src.risk_engine.dispatch.base import (
    DispatchMessage,
    DispatchResult,
)
from src.risk_engine.dispatch.dashboard import DashboardDispatcher
from src.risk_engine.dispatch.twilio import (
    SmsDispatcher,
    WhatsAppDispatcher,
)
from src.risk_engine.dispatch.webhook import WebhookDispatcher


class DispatchService:
    """Dispatches an already-approved security notification."""

    def __init__(self) -> None:
        self.enabled = os.getenv(
            "VERIVOX_DISPATCH_ENABLED",
            "false",
        ).lower() == "true"

        self.dispatchers = {
            "dashboard": DashboardDispatcher(),
            "sms": SmsDispatcher(),
            "whatsapp": WhatsAppDispatcher(),
            "webhook": WebhookDispatcher(),
        }

    async def dispatch(
        self,
        message: DispatchMessage,
        channels: list[str],
    ) -> list[DispatchResult]:

        async def send(channel: str) -> DispatchResult:
            dispatcher = self.dispatchers.get(channel)

            if dispatcher is None:
                return DispatchResult(
                    channel=channel,
                    attempted=False,
                    delivered=False,
                    detail="Unsupported dispatch channel.",
                )

            # Dashboard delivery is the application's existing WebSocket
            # transport and remains available regardless of external
            # notification configuration.
            if channel == "dashboard":
                return await dispatcher.dispatch(message)

            # SMS / WhatsApp / webhook are external transports.
            if not self.enabled:
                return DispatchResult(
                    channel=channel,
                    attempted=False,
                    delivered=False,
                    detail="External dispatch disabled by configuration.",
                )

            return await dispatcher.dispatch(message)

        return list(
            await asyncio.gather(
                *(send(channel) for channel in channels)
            )
        )
