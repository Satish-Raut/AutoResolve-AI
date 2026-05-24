import json
from .base import BaseAgent

RISK_SYSTEM_INSTRUCTION = """You are a master corporate compliance officer and fraud prevention auditor.
Your job is to audit a support ticket and its proposed resolution to detect fraud indicators, security leaks, or high financial liabilities.
Your output must be a valid JSON object matching this exact schema:
{
  "risk_score": "Low", "Medium", or "High",
  "reasons": [
    "A list of specific strings explaining the compliance or fraud flags identified. If no risk factors are present, leave this empty."
  ],
  "requires_escalation": false
}

Fraud and Risk Audit Flags:
- High Financial Value: Any refund or product replacement valued above $500 is immediately HIGH risk.
- Tracking Contradictions: If the customer claims "never received" but tracking status states "Delivered with Signature", this is a HIGH risk fraud signal.
- Threatening Tone: Mention of lawyers, legal actions, or public shaming is MEDIUM risk.
- GDPR Data Security: Requests to delete accounts when there are high active orders or unresolved disputes are MEDIUM risk.

IMPORTANT: You must output ONLY a valid JSON object. Do not add introductions or summaries outside of the JSON block."""

class RiskCheckerAgent(BaseAgent):
    def __init__(self):
        super().__init__("Risk Auditor", RISK_SYSTEM_INSTRUCTION)

    def check_risk(self, ticket_text: str, triage_data: dict, resolution_data: dict) -> dict:
        if self.mock_mode:
            return self._mock_check_risk(triage_data)
            
        try:
            prompt = f"""Customer Ticket:
{ticket_text}

Triage facts:
{json.dumps(triage_data, indent=2)}

Proposed Resolution:
{json.dumps(resolution_data, indent=2)}

Audit this case and output the compliance risk profile in JSON:"""

            raw_response = self.call_gemini(prompt, json_format=True)
            cleaned = self.clean_json_response(raw_response)
            return json.loads(cleaned)
        except Exception as e:
            print(f"Risk Auditor error: {e}. Running mock fallback.")
            return self._mock_check_risk(triage_data)

    def _mock_check_risk(self, triage_data: dict) -> dict:
        category = triage_data.get("category")
        entities = triage_data.get("entities", {})
        monetary_value = entities.get("monetary_value", 0) or 0
        tracking = entities.get("tracking_id")
        
        # High Value and Delivery contradiction (Ethan Hunt SL-9912)
        if monetary_value >= 500 or (tracking == "Delivered with Signature"):
            reasons = []
            if monetary_value >= 500:
                reasons.append(f"Financial liability exceeds high-risk threshold (Value: ${monetary_value:.2f}).")
            if tracking == "Delivered with Signature":
                reasons.append("Fraud Indicator: Customer claims package was stolen, but carrier records state 'Delivered with Signature'.")
                
            return {
                "risk_score": "High",
                "reasons": reasons,
                "requires_escalation": True
            }
        
        # Subscription dispute and threats (Marcus Aurelius)
        if category == "Subscription" and monetary_value >= 100:
            return {
                "risk_score": "Medium",
                "reasons": [
                    "Multi-month subscription dispute ($120.00 total) claiming billing oversights.",
                    "User request demands immediate complete restitution of historical charges."
                ],
                "requires_escalation": False
            }
            
        # GDPR (Emma Watson)
        if category == "Privacy":
            return {
                "risk_score": "Low",
                "reasons": [
                    "Requires secure verification of official email prior to database wiping."
                ],
                "requires_escalation": False
            }
            
        # Standard low risk (Sarah SL-8842)
        return {
            "risk_score": "Low",
            "reasons": [],
            "requires_escalation": False
        }
