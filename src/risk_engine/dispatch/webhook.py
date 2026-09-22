import hashlib
import hmac
import json
import os

import httpx

from src.risk_engine.dispatch.base import (
    DispatchMessage,
    DispatchResult,
)


class WebhookDispatcher:
    channel = "webhook"

    def __init__(self) -> None:
        self.url = os.getenv("VERIVOX_WEBHOOK_URL")
        self.secret = os.getenv("VERIVOX_WEBHOOK_SECRET")

    async def dispatch(
        self,
        message: DispatchMessage,
    ) -> DispatchResult:
        if not self.url:
            return DispatchResult(
                channel=self.channel,
                attempted=False,
                delivered=False,
                detail="Webhook URL is not configured.",
            )

        payload = {
            "title": message.title,
            "message": message.message,
            "scenario": message.scenario,
            "severity": message.severity,
            "recommended_actions": list(
                message.recommended_actions
            ),
            "privacy_mode": message.privacy_mode,
        }

        body = json.dumps(
            payload,
            separators=(",", ":"),
        ).encode("utf-8")

        headers = {
            "Content-Type": "application/json",
        }

        if self.secret:
            signature = hmac.new(
                self.secret.encode("utf-8"),
                body,
                hashlib.sha256,
            ).hexdigest()

            headers["X-Verivox-Signature"] = signature

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    self.url,
                    content=body,
                    headers=headers,
                )

            response.raise_for_status()

            return DispatchResult(
                channel=self.channel,
                attempted=True,
                delivered=True,
                detail=f"Webhook returned HTTP {response.status_code}.",
            )

        except Exception as exc:
            return DispatchResult(
                channel=self.channel,
                attempted=True,
                delivered=False,
                detail=f"Webhook delivery failed: {exc}",
            )
