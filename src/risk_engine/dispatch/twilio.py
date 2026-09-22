import os

import httpx

from src.risk_engine.dispatch.base import (
    DispatchMessage,
    DispatchResult,
)


class TwilioDispatcher:
    def __init__(
        self,
        channel: str,
        from_number_env: str,
        to_number_env: str,
    ) -> None:
        if channel not in {"sms", "whatsapp"}:
            raise ValueError(
                "TwilioDispatcher channel must be sms or whatsapp"
            )

        self.channel = channel
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.from_number = os.getenv(from_number_env)
        self.to_number = os.getenv(to_number_env)

    async def dispatch(
        self,
        message: DispatchMessage,
    ) -> DispatchResult:
        if not all(
            [
                self.account_sid,
                self.auth_token,
                self.from_number,
                self.to_number,
            ]
        ):
            return DispatchResult(
                channel=self.channel,
                attempted=False,
                delivered=False,
                detail="Twilio channel is not configured.",
            )

        from_number = self.from_number
        to_number = self.to_number

        if self.channel == "whatsapp":
            if not from_number.startswith("whatsapp:"):
                from_number = f"whatsapp:{from_number}"
            if not to_number.startswith("whatsapp:"):
                to_number = f"whatsapp:{to_number}"

        url = (
            f"https://api.twilio.com/2010-04-01/"
            f"Accounts/{self.account_sid}/Messages.json"
        )

        body = {
            "From": from_number,
            "To": to_number,
            "Body": (
                f"{message.title}\n\n"
                f"{message.message}\n\n"
                f"Scenario: {message.scenario}\n"
                f"Severity: {message.severity}"
            ),
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.post(
                    url,
                    data=body,
                    auth=(
                        self.account_sid,
                        self.auth_token,
                    ),
                )

            response.raise_for_status()

            return DispatchResult(
                channel=self.channel,
                attempted=True,
                delivered=True,
                detail="Twilio accepted the message.",
            )

        except Exception as exc:
            return DispatchResult(
                channel=self.channel,
                attempted=True,
                delivered=False,
                detail=f"Twilio delivery failed: {exc}",
            )


class SmsDispatcher(TwilioDispatcher):
    def __init__(self) -> None:
        super().__init__(
            channel="sms",
            from_number_env="VERIVOX_SMS_FROM",
            to_number_env="VERIVOX_SMS_TO",
        )


class WhatsAppDispatcher(TwilioDispatcher):
    def __init__(self) -> None:
        super().__init__(
            channel="whatsapp",
            from_number_env="VERIVOX_WHATSAPP_FROM",
            to_number_env="VERIVOX_WHATSAPP_TO",
        )
