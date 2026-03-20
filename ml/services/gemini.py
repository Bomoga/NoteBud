import os
from google import genai
from google.genai import errors as genai_errors


class GeminiClient:
    EMBEDDING_MODEL = "gemini-embedding-001"
    EMBEDDING_DIMENSIONS = 768
    GENERATION_MODEL = "gemini-2.5-flash"

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")
        self._client = genai.Client(api_key=api_key)

    @staticmethod
    def _is_rate_limit_error(error: Exception) -> bool:
        """
        Determine whether the given error represents a rate-limit (HTTP 429) error.

        Prefer structured status/code fields on the exception or attached response,
        and only fall back to string parsing if those are unavailable.
        """
        # Try common structured fields first.
        status_code = getattr(error, "status_code", None)
        if status_code is None:
            status_code = getattr(error, "code", None)
        if status_code is None:
            response = getattr(error, "response", None)
            if response is not None:
                status_code = getattr(response, "status_code", None)
        if status_code == 429:
            return True
        # Fall back to string parsing to preserve existing behavior if needed.
        return "429" in str(error)

    def generate_embedding(self, text: str) -> list[float]:
        try:
            response = self._client.models.embed_content(
                model=self.EMBEDDING_MODEL,
                contents=text,
                config={"output_dimensionality": self.EMBEDDING_DIMENSIONS},
            )
            return response.embeddings[0].values
        except genai_errors.ClientError as e:
            if self._is_rate_limit_error(e):
                raise RuntimeError(f"Gemini rate limit exceeded: {e}") from e
            raise RuntimeError(f"Gemini API error during embedding: {e}") from e
        except genai_errors.ServerError as e:
            raise RuntimeError(f"Gemini API error during embedding: {e}") from e

    def generate_response(self, prompt: str) -> str:
        try:
            response = self._client.models.generate_content(
                model=self.GENERATION_MODEL,
                contents=prompt,
                config={
                    "temperature": 0.2,
                    "max_output_tokens": 1024,
                    "top_p": 0.9,
                },
            )
            return response.text
        except genai_errors.ClientError as e:
            if self._is_rate_limit_error(e):
                raise RuntimeError(f"Gemini rate limit exceeded: {e}") from e
            raise RuntimeError(f"Gemini API error during generation: {e}") from e
        except genai_errors.ServerError as e:
            raise RuntimeError(f"Gemini API error during generation: {e}") from e
