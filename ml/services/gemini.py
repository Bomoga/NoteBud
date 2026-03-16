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

    def generate_embedding(self, text: str) -> list[float]:
        try:
            response = self._client.models.embed_content(
                model=self.EMBEDDING_MODEL,
                contents=text,
                config={"output_dimensionality": self.EMBEDDING_DIMENSIONS},
            )
            return response.embeddings[0].values
        except genai_errors.ClientError as e:
            if "429" in str(e):
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
            if "429" in str(e):
                raise RuntimeError(f"Gemini rate limit exceeded: {e}") from e
            raise RuntimeError(f"Gemini API error during generation: {e}") from e
        except genai_errors.ServerError as e:
            raise RuntimeError(f"Gemini API error during generation: {e}") from e
