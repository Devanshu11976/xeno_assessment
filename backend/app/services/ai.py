import json
import logging
import traceback
from groq import Groq
from app.config.settings import settings

logger = logging.getLogger("stratos.ai")

# Model to use — llama-3.3-70b-versatile is Groq's best general-purpose model
GROQ_MODEL = "llama-3.3-70b-versatile"


class AIService:
    """Manages prompt construction and calls to the Groq API.

    Feeds summarized diagnostic metrics (error ratios, counts per column, etc.)
    to an LLM to extract structured executive feedback on dataset quality.
    """

    def __init__(self) -> None:
        self.api_key = settings.GROQ_API_KEY
        self._client: Groq | None = None

    @property
    def client(self) -> Groq:
        """Lazy-initialise the Groq client on first use."""
        if self._client is None:
            if not self.api_key:
                raise ValueError(
                    "GROQ_API_KEY is not set. Add it to your .env file."
                )
            self._client = Groq(api_key=self.api_key)
        return self._client

    def _build_prompt(self, job_metrics: dict, error_logs: list) -> str:
        """Construct the analysis prompt from job data."""
        error_summary = json.dumps(error_logs[:50], indent=2)  # cap to 50 entries
        metrics_summary = json.dumps(job_metrics, indent=2)

        return f"""You are a data quality analyst. Analyse the following dataset validation results and return a JSON object with these exact keys:
- quality_score: float 0-100
- common_errors: list of objects with keys "field", "error", "count"
- country_analysis: object mapping country codes to objects with keys "status" ("passing"|"warning"|"failing") and "issue" (string or null)
- recommendations: list of actionable string recommendations
- executive_summary: plain-language string summary (2-3 sentences)

Job metrics:
{metrics_summary}

Top validation errors (up to 50):
{error_summary}

Respond with valid JSON only. No markdown, no explanation outside the JSON."""

    async def generate_quality_report(self, job_metrics: dict, error_logs: list) -> dict:
        """Call Groq and return structured quality report.

        Falls back to a placeholder response if the API key is missing or the
        call fails, so the rest of the pipeline is never blocked by AI errors.
        """
        try:
            prompt = self._build_prompt(job_metrics, error_logs)

            response = self.client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,       # low temperature for deterministic structured output
                max_tokens=1024,
                response_format={"type": "json_object"},
            )

            raw = response.choices[0].message.content
            return json.loads(raw)

        except Exception as exc:
            logger.error(
                f"Groq AI report generation failed:\n"
                f"Error type: {type(exc).__name__}\n"
                f"Error message: {str(exc)}\n"
                f"Traceback:\n{traceback.format_exc()}"
            )
            # Return a safe fallback so the job still completes
            return {
                "quality_score": 0.0,
                "common_errors": [],
                "country_analysis": {},
                "recommendations": ["AI report unavailable — check GROQ_API_KEY and retry."],
                "executive_summary": f"AI analysis could not be completed: {str(exc)}",
            }


ai_service = AIService()
