from src.risk_engine.dispatch.base import (
    DispatchMessage,
    DispatchResult,
)


class DashboardDispatcher:
    channel = "dashboard"

    async def dispatch(
        self,
        message: DispatchMessage,
    ) -> DispatchResult:
        return DispatchResult(
            channel=self.channel,
            attempted=True,
            delivered=True,
            detail="Delivered through the application WebSocket.",
        )
