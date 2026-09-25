import json
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

        self.status_callback_url = os.getenv(
            "VERIVOX_TWILIO_STATUS_CALLBACK_URL"
        )
        self.whatsapp_content_sid = os.getenv(
            "VERIVOX_WHATSAPP_CONTENT_SID"
        )
        self.whatsapp_content_variables = os.getenv(
            "VERIVOX_WHATSAPP_CONTENT_VARIABLES"
        )
        self.sms_trial_template = os.getenv(
            "VERIVOX_SMS_TRIAL_TEMPLATE"
        )

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
        }

        if self.channel == "whatsapp" and self.whatsapp_content_sid:
            body["ContentSid"] = self.whatsapp_content_sid

            if self.whatsapp_content_variables:
                try:
                    json.loads(self.whatsapp_content_variables)
                except json.JSONDecodeError:
                    return DispatchResult(
                        channel=self.channel,
                        attempted=False,
                        delivered=False,
                        detail=(
                            "Invalid VERIVOX_WHATSAPP_CONTENT_VARIABLES JSON."
                        ),
                    )

                body["ContentVariables"] = (
                    self.whatsapp_content_variables
                )
        elif (
            self.channel == "sms"
            and self.sms_trial_template
        ):
            body["Body"] = self.sms_trial_template
        else:
            body["Body"] = (
                f"{message.title}\n\n"
                f"{message.message}\n\n"
                f"Scenario: {message.scenario}\n"
                f"Severity: {message.severity}"
            )

        if self.status_callback_url:
            body["StatusCallback"] = self.status_callback_url

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
            payload = response.json()

            provider_status = str(
                payload.get("status", "accepted")
            ).lower()

            message_sid = payload.get("sid")

            delivered = provider_status in {
                "delivered",
                "read",
            }

            return DispatchResult(
                channel=self.channel,
                attempted=True,
                delivered=delivered,
                detail=(
                    f"Twilio accepted message "
                    f"{message_sid or 'without SID'} "
                    f"with status '{provider_status}'."
                ),
                provider_message_id=message_sid,
                provider_status=provider_status,
            )

        except httpx.HTTPStatusError as exc:
            response = exc.response

            try:
                payload = response.json()
            except Exception:
                payload = {}

            code = payload.get("code")
            message_text = payload.get(
                "message",
                response.text[:300],
            )
            more_info = payload.get("more_info")

            detail = (
                f"Twilio API error {code or response.status_code}: "
                f"{message_text}"
            )

            if more_info:
                detail += f" ({more_info})"

            return DispatchResult(
                channel=self.channel,
                attempted=True,
                delivered=False,
                detail=detail,
                provider_status="failed",
            )

        except Exception as exc:
            return DispatchResult(
                channel=self.channel,
                attempted=True,
                delivered=False,
                detail=f"Twilio delivery failed: {exc}",
                provider_status="failed",
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
