import os
import re
from .base import BaseAgent

RAG_SYSTEM_INSTRUCTION = """You are a meticulous policy audit and retrieval agent.
Your task is to review the provided policy fragments and extract the exact rules that apply to the customer's issue.
Your output must be structured like this:
{
  "retrieved_policies": [
    {
      "clause": "Rule name/number",
      "text": "Exact text quote of the retrieved policy ruling"
    }
  ],
  "rag_explanation": "Brief explanation of how these rules relate to the customer's case."
}

IMPORTANT: Base your output STRICTLY on the policy text provided in the prompt. Do not extrapolate, assume, or invent rules not mentioned. If no rules apply, state it clearly. Output valid JSON only."""

class PolicyRAGAgent(BaseAgent):
    def __init__(self):
        super().__init__("Policy RAG Retriever", RAG_SYSTEM_INSTRUCTION)
        self.policies_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "policies")

    def _get_policy_file_for_category(self, category: str) -> str:
        cat_map = {
            "Refund": "refund_policy.txt",
            "Shipping": "shipping_policy.txt",
            "Subscription": "subscription_policy.txt",
            "Privacy": "privacy_policy.txt"
        }
        filename = cat_map.get(category, "refund_policy.txt") # Default to refund
        return os.path.join(self.policies_dir, filename)

    def _local_keyword_search(self, filepath: str, query_terms: list, top_k: int = 3) -> str:
        """Reads the policy file, splits it into paragraphs, ranks them, and returns top K."""
        if not os.path.exists(filepath):
            return "No official policy found."
            
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
            
        # Split by empty lines to get paragraphs
        paragraphs = [p.strip() for p in re.split(r'\n\s*\n', content) if p.strip()]
        
        ranked_paragraphs = []
        for p in paragraphs:
            # Score based on query term frequency
            score = 0
            for term in query_terms:
                if term.lower() in p.lower():
                    score += 2  # Match term
                    
            ranked_paragraphs.append((score, p))
            
        # Sort by score descending
        ranked_paragraphs.sort(key=lambda x: x[0], reverse=True)
        
        # Take top K and join them
        selected = [p[1] for p in ranked_paragraphs[:top_k]]
        return "\n\n---\n\n".join(selected)

    def retrieve_policies(self, category: str, ticket_text: str, extracted_entities: dict) -> dict:
        policy_file = self._get_policy_file_for_category(category)
        
        # Create search query terms based on entities and text
        search_terms = [category.lower(), "policy"]
        if extracted_entities.get("item_name"):
            search_terms.extend(str(extracted_entities["item_name"]).lower().split())
        if "days" in ticket_text.lower():
            search_terms.append("days")
        if "cancel" in ticket_text.lower():
            search_terms.append("cancel")
        if "wiping" in ticket_text.lower() or "gdpr" in ticket_text.lower():
            search_terms.extend(["gdpr", "deletion", "forgotten"])
            
        # Step 1: Perform the local keyword ranking
        relevant_context = self._local_keyword_search(policy_file, search_terms)
        
        if self.mock_mode:
            return self._mock_retrieve(category, ticket_text)
            
        try:
            # Step 2: Query Gemini to extract the precise active clauses from the context
            prompt = f"Customer Query:\n{ticket_text}\n\nRelevant Policy Context:\n{relevant_context}\n\nExtract relevant ruling clauses in JSON format:"
            raw_response = self.call_gemini(prompt, json_format=True)
            import json
            cleaned = self.clean_json_response(raw_response)
            return json.loads(cleaned)
        except Exception as e:
            print(f"RAG LLM extraction failed: {e}. Falling back to mock RAG.")
            return self._mock_retrieve(category, ticket_text)

    def _mock_retrieve(self, category: str, text: str) -> dict:
        # High fidelity mock responses based on categories
        if category == "Refund" and ("8842" in text or "nebula" in text):
            return {
                "retrieved_policies": [
                    {
                        "clause": "Rule 1: Standard Return Window",
                        "text": "Customers are eligible to return any item purchased from StrideLife within 30 days of the delivery date. Items must be in clean, unworn, and resaleable condition."
                    },
                    {
                        "clause": "Rule 5: Restocking Fees",
                        "text": "No restocking fee is charged for standard returns or size exchange requests."
                    }
                ],
                "rag_explanation": "Retrieved standard return window policy. Customer returned item within 13 days, satisfying the 30-day requirement."
            }
        elif category == "Subscription" and ("vip" in text or "6 months" in text):
            return {
                "retrieved_policies": [
                    {
                        "clause": "Rule 2: Cancellation Rules",
                        "text": "Members can cancel their VIP Club subscription at any time. The subscription will not auto-renew for the next month. mid-cycle cancellation benefits remain active."
                    },
                    {
                        "clause": "Rule 3: Subscription Refunds",
                        "text": "New subscribers are eligible for a full refund of their first month's fee ($19.99) if they cancel and request a refund within 14 days of subscribing. Post-14 Days: No refunds are issued for mid-cycle cancellations. Fees are non-refundable."
                    }
                ],
                "rag_explanation": "Retrieved subscription policy. Customer is requesting cancellation and refund for 6 months. While cancellation is immediate, refunds for past months are strictly barred past the 14-day window."
            }
        elif category == "Shipping" and ("SL-9912" in text or "2,000" in text):
            return {
                "retrieved_policies": [
                    {
                        "clause": "Rule 3: Lost in Transit Protocol",
                        "text": "A package is officially declared 'Lost in Transit' if there has been no tracking status update for more than 7 consecutive business days. Once declared lost, customer is eligible for a replacement or full refund."
                    },
                    {
                        "clause": "Rule 3 Exception: Delivered Signature",
                        "text": "Exception: If the carrier tracking states 'Delivered' and has a signature verification, the claim is rejected. The customer must file a police report for package theft before we can issue an escalation."
                    }
                ],
                "rag_explanation": "Retrieved lost in transit and delivered exception protocols. Since carrier marks order SL-9912 as Delivered with a signature, auto-refund is rejected pending a formal police report."
            }
        elif category == "Privacy":
            return {
                "retrieved_policies": [
                    {
                        "clause": "Rule 1: Data Deletion Requests (GDPR / CCPA)",
                        "text": "Under GDPR and CCPA regulations, customers have the right to request the permanent deletion of their account and all associated personal data. The customer must submit a written request from their registered email."
                    }
                ],
                "rag_explanation": "Retrieved GDPR right to be forgotten policy. Account deletion requires a written request from their registered email and takes 7-10 business days."
            }
            
        # Default generic policy
        return {
            "retrieved_policies": [
                {
                    "clause": "Section 1: General Policy",
                    "text": "All customer support tickets must be handled with empathy, resolving issues in compliance with official department terms."
                }
            ],
            "rag_explanation": "Retrieved standard general customer care rules."
        }
