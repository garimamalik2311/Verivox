from src.privacy_policy import PRIVACY_POLICY, assert_zero_retention


def test_zero_retention_is_enabled_by_default():
    assert PRIVACY_POLICY.mode == "feature_only"
    assert PRIVACY_POLICY.retain_raw_audio is False


def test_zero_retention_guard_passes():
    assert_zero_retention()
