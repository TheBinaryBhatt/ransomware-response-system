# backend/triage_service/local_ai/llm_loader.py
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

_MODEL_DEFAULT = "triage_service/models/hermes-2-pro-mistral-7b.Q8_0.gguf"

# Try to import llama_cpp, but don't fail if it's not installed.
try:
    from llama_cpp import Llama  # type: ignore
    _LLAMA_AVAILABLE = True
except Exception:
    Llama = None  # type: ignore
    _LLAMA_AVAILABLE = False

class LocalLLM:
    """
    Safe LocalLLM wrapper:
    - Only instantiates llama_cpp.Llama if the model file exists and llama_cpp is importable.
    - If not available, falls back to a lightweight stub that returns deterministic JSON.
    """

    def __init__(self, model_path: str = _MODEL_DEFAULT, ctx_size: int = 4096, n_threads: int = 2):
        self.model_path = model_path
        self.ctx_size = ctx_size
        self.n_threads = n_threads
        self._disabled = False
        self._impl = None  # real Llama instance when available

        # Check model file exists before trying to instantiate
        if not os.path.exists(self.model_path):
            logger.warning("LocalLLM: model file not found at '%s' — LLM disabled", self.model_path)
            self._disabled = True
            return

        if not _LLAMA_AVAILABLE:
            logger.warning("LocalLLM: llama_cpp not available in this environment — LLM disabled")
            self._disabled = True
            return

        try:
            # instantiate Llama safely
            self._impl = Llama(
                model_path=self.model_path,
                n_ctx=self.ctx_size,
                n_threads=self.n_threads,
                use_mmap=True,
                verbose=False,
            )
            logger.info("LocalLLM: successfully loaded model: %s", self.model_path)
        except Exception as e:
            # If the Llama constructor raises, avoid leaving a half-constructed object around.
            logger.exception("LocalLLM: failed to instantiate Llama; disabling local LLM. Error: %s", e)
            # Ensure we don't keep a partially initialized object
            try:
                # if partial object exists, try to close gracefully
                if self._impl and hasattr(self._impl, "close"):
                    try:
                        self._impl.close()
                    except Exception:
                        pass
            finally:
                self._impl = None
            self._disabled = True

    def predict(self, prompt: str) -> str:
        """
        If LLM available, call it; otherwise return a safe JSON fallback string.
        The fallback mirrors the simple shape the triage agent expects.
        """
        if self._disabled or not self._impl:
            # deterministic fallback (small JSON string). Agent will parse this or fallback heuristics.
            fallback = '{"decision":"unknown","confidence":0.0,"reasoning":"local LLM unavailable","recommended_actions":["notify_analyst"]}'
            logger.debug("LocalLLM.predict: returning fallback because LLM disabled.")
            return fallback

        try:
            response = self._impl(
                prompt,
                max_tokens=512,
                temperature=0.2,
                stop=["</analysis>"],
            )
            # llama_cpp returns nested structure; be defensive:
            if isinstance(response, dict):
                choices = response.get("choices") or []
                if choices and isinstance(choices, list):
                    text = choices[0].get("text") or choices[0].get("message", {}).get("content")
                    if text:
                        return text.strip()
                # fallback to string-conversion
                return str(response)
            return str(response)
        except Exception as e:
            logger.exception("LocalLLM.predict: LLM invocation failed: %s", e)
            return '{"decision":"unknown","confidence":0.0,"reasoning":"llm runtime error","recommended_actions":["notify_analyst"]}'
