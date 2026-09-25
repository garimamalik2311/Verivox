def test_audio_preview_storage_disabled_by_default(monkeypatch):
    monkeypatch.delenv(
        "VERIVOX_ALLOW_AUDIO_PREVIEW",
        raising=False,
    )

    import src.adversarial.router as router

    assert router.ALLOW_AUDIO_PREVIEW is False
