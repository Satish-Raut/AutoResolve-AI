import json
from .base import BaseAgent

RESOLVER_SYSTEM_INSTRUCTION = """You are a highly structured corporate resolution engine.
Your job is to compare a customer's case details against retrieved company policies, execute logical reasoning, and make a definitive decision.
Your output must be a valid JSON object matching this exact schema:
{
  "decision": "Approved", "Rejected", "Partial Approval", or "Escalated",
  "action_taken": "A clear description of the mechanical action being taken (e.g. Refund of $120 approved, replacement ordered, credit offered, request rejected).",
  "policy_justification": "A precise explanation showing how the decision complies with specific retrieved policy terms (e.g. 'Customer submitted request 13 days after purchase, which is within the 30-day return window').",
  "override_required": false
}

Logical Math Rules:
- If return request is <= 30 days since purchase -> Approved.
- If return request is between 31 and 45 days -> Partial Approval (80% value credit).
- If return request is > 45 days -> Rejected.
- If subscription cancellation within 14 days and unused -> Approved.
- If subscription cancellation after 14 days -> Cancel renewals immediately but reject refunds for past months.
- If high refund value request (above $500) and delivery matches exception criteria (delivered with signature) -> Escalated to Tier 3.

IMPORTANT: You must output ONLY a valid JSON object. Do not explain your code or add introductions."""

class ResolutionAgent(BaseAgent):
    def __init__(self):
        super().__init__("Resolution Suggester", RESOLVER_SYSTEM_INSTRUCTION)

    def suggest_resolution(self, ticket_text: str, triage_data: dict, rag_data: dict) -> dict:
        if self.mock_mode:
            return self._mock_resolve(triage_data)
            
        try:
            prompt = f"""Customer Ticket:
{ticket_text}

Triage Metadata:
{json.dumps(triage_data, indent=2)}

Retrieved Policies:
{json.dumps(rag_data, indent=2)}

Synthesize this data and output a structured resolution decision in JSON format:"""

            raw_response = self.call_gemini(prompt, json_format=True)
            cleaned = self.clean_json_response(raw_response)
            return json.loads(cleaned)
        except Exception as e:
            print(f"Resolver error: {e}. Running mock fallback.")
            return self._mock_resolve(triage_data)

    def _mock_resolve(self, triage_data: dict) -> dict:
        category = triage_data.get("category")
        entities = triage_data.get("entities", {})
        order_id = entities.get("order_id")
        
        if category == "Refund" and order_id == "SL-8842":
            return {
                "decision": "Approved",
                "action_taken": "Full refund of $120.00 to original payment method.",
                "policy_justification": "Request submitted 13 days since purchase, which is within the standard 30-day return window. No restocking fees apply.",
                "override_required": False
            }
        elif category == "Subscription":
            return {
                "decision": "Partial Approval",
                "action_taken": "Cancel VIP Club auto-renewal immediately. Deny refund of past 6 months' fees ($120.00). Offer a one-time 15-day trial extension.",
                "policy_justification": "Under Rule 3 of VIP Policy, cancellations are processed immediately to prevent auto-renewal, but subscription fees past the initial 14-day cooling-off window are strictly non-refundable.",
                "override_required": False
            }
        elif category == "Shipping" and order_id == "SL-9912":
            return {
                "decision": "Escalated",
                "action_taken": "Escalate to Tier 3 Support Manager for manual audit. Reject auto-refund.",
                "policy_justification": "Order SL-9912 totals $2,000, which exceeds standard support refund limits. Carrier lists package as 'Delivered with Signature', requiring a formal police report for package theft and manager override.",
                "override_required": True
            }
        elif category == "Privacy":
            return {
                "decision": "Approved",
                "action_taken": "Acknowledge right to be forgotten under GDPR. Flag customer record for permanent database wiping within 7-10 business days.",
                "policy_justification": "Under GDPR regulations, the customer has a legal Right to be Forgotten. Account data deletion must be scheduled manually via security teams.",
                "override_required": False
            }
            
        return {
            "decision": "Escalated",
            "action_taken": "Escalate case to general operations queue for manual inspection.",
            "policy_justification": "The system could not deduce a clear automated resolution pathway for this classification.",
            "override_required": True
        }
