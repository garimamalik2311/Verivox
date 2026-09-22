from dataclasses import dataclass


@dataclass(frozen=True)
class PrivacyPolicy:
    mode: str = "feature_only"
    retain_raw_audio: bool = False


PRIVACY_POLICY = PrivacyPolicy()


def assert_zero_retention() -> None:
    if PRIVACY_POLICY.retain_raw_audio:
        raise RuntimeError(
            "Zero-retention policy has been disabled."
        )
