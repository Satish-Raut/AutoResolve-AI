import json
from datetime import datetime
from .base import BaseAgent

CLASSIFIER_SYSTEM_INSTRUCTION = """You are a highly efficient, accurate support ticket triage agent.
Your task is to analyze the incoming customer support ticket and extract structured facts.
You MUST output ONLY a valid JSON object matching this exact schema:
{
  "category": "Refund", "Shipping", "Subscription", "Privacy", or "Other",
  "priority": "Low", "Medium", "High", or "Urgent",
  "sentiment": "Angry", "Frustrated", "Neutral", or "Happy",
  "entities": {
    "order_id": "string or null",
    "tracking_id": "string or null",
    "item_name": "string or null",
    "monetary_value": "float or null"
  }
}

Guidelines:
- category: Select the single most relevant category.
- priority: 'Urgent' is only for extreme complaints, security issues, or threat letters. 'High' is for high monetary disputes (above $500) or severe delay. 'Medium' is default.
- sentiment: Base it on the text tone.
- entities: Extract exact IDs (e.g. SL-8842, TKT-100), names, or prices.

IMPORTANT: Do not return any introduction, explanation, or backticks outside of the JSON block. Just output the clean JSON object."""

class TicketClassifierAgent(BaseAgent):
    def __init__(self):
        super().__init__("Ticket Classifier", CLASSIFIER_SYSTEM_INSTRUCTION)

    def triage(self, ticket_text: str) -> dict:
        if self.mock_mode:
            return self._mock_triage(ticket_text)
            
        try:
            prompt = f"Analyze this ticket:\n\n{ticket_text}"
            raw_response = self.call_gemini(prompt, json_format=True)
            cleaned = self.clean_json_response(raw_response)
            return json.loads(cleaned)
        except Exception as e:
            print(f"Classifier error: {e}. Running mock fallback.")
            return self._mock_triage(ticket_text)

    def _mock_triage(self, text: str) -> dict:
        text_lower = text.lower()
        
        # Match Sarah (TKT-1001)
        if "8842" in text or "nebula blue" in text:
            return {
                "category": "Refund",
                "priority": "Medium",
                "sentiment": "Frustrated",
                "entities": {
                    "order_id": "SL-8842",
                    "tracking_id": None,
                    "item_name": "Nebula Blue Running Shoes",
                    "monetary_value": 120.00
                }
            }
        # Match Marcus (TKT-1002)
        elif "vip club" in text or "subscription" in text:
            return {
                "category": "Subscription",
                "priority": "Medium",
                "sentiment": "Frustrated",
                "entities": {
                    "order_id": None,
                    "tracking_id": None,
                    "item_name": "VIP Club Membership",
                    "monetary_value": 120.00
                }
            }
        # Match Ethan (TKT-1003)
        elif "2,000" in text or "golden runner" in text or "mission" in text:
            return {
                "category": "Shipping",
                "priority": "High",
                "sentiment": "Angry",
                "entities": {
                    "order_id": "SL-9912",
                    "tracking_id": "Delivered with Signature",
                    "item_name": "Golden Runner Shoes (10 pairs)",
                    "monetary_value": 2000.00
                }
            }
        # Match Emma (TKT-1004)
        elif "gdpr" in text or "wiping" in text or "privacy" in text:
            return {
                "category": "Privacy",
                "priority": "Medium",
                "sentiment": "Neutral",
                "entities": {
                    "order_id": None,
                    "tracking_id": None,
                    "item_name": "Customer Profile Data",
                    "monetary_value": None
                }
            }
            
        # Generic fallback
        category = "Other"
        if "refund" in text_lower or "return" in text_lower:
            category = "Refund"
        elif "ship" in text_lower or "track" in text_lower or "deliver" in text_lower:
            category = "Shipping"
        elif "cancel" in text_lower or "subscribe" in text_lower or "vip" in text_lower:
            category = "Subscription"
            
        priority = "High" if "urgent" in text_lower or "immediate" in text_lower or "demand" in text_lower else "Medium"
        sentiment = "Frustrated" if "unacceptable" in text_lower or "disappointed" in text_lower or "hurt" in text_lower else "Neutral"
        
        return {
            "category": category,
            "priority": priority,
            "sentiment": sentiment,
            "entities": {
                "order_id": None,
                "tracking_id": None,
                "item_name": None,
                "monetary_value": None
            }
        }
