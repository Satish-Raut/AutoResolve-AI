from .base import BaseAgent
import json

WRITER_SYSTEM_INSTRUCTION = """You are a master of customer success and an empathetic corporate writer.
Your job is to draft a customer-facing support email reply.
Your email must satisfy the following guidelines:
1. Tone: Empathetic, polite, professional, and reassuring. Always thank them for reaching out.
2. Direct Resolution: State the resolution decision in the first paragraph clearly (e.g. approved refund, canceled subscription, or case escalation).
3. Policy Justification: Incorporate specific policy terms and timelines gracefully (e.g. 'Since you reached out within 13 days of delivery, you are fully covered under our 30-day return policy').
4. Alternative Options: If a request is rejected or escalated, explain the alternate pathways or credits available to them.
5. No Placeholder text: Do not use [Insert Date] or similar. Use actual customer data and dates extracted from the context.

IMPORTANT: Do not output any JSON formatting, markdown fencing, or meta explanations. Output ONLY the raw draft of the email reply text."""

class ResponseWriterAgent(BaseAgent):
    def __init__(self):
        super().__init__("Response Writer", WRITER_SYSTEM_INSTRUCTION)

    def draft_response(self, customer_name: str, ticket_text: str, triage_data: dict, rag_data: dict, resolution_data: dict, risk_data: dict) -> str:
        if self.mock_mode:
            return self._mock_draft(customer_name, triage_data, resolution_data, risk_data)
            
        try:
            prompt = f"""Customer Name: {customer_name}
Customer Email: {triage_data.get('entities', {}).get('email')}
Ticket Message:
{ticket_text}

Triage facts:
{json.dumps(triage_data, indent=2)}

Retrieved Policies:
{json.dumps(rag_data, indent=2)}

Suggested Resolution:
{json.dumps(resolution_data, indent=2)}

Risk Auditing:
{json.dumps(risk_data, indent=2)}

Draft the final email response:"""

            return self.call_gemini(prompt, json_format=False)
        except Exception as e:
            print(f"Response Writer error: {e}. Running mock fallback.")
            return self._mock_draft(customer_name, triage_data, resolution_data, risk_data)

    def _mock_draft(self, name: str, triage_data: dict, resolution_data: dict, risk_data: dict) -> str:
        category = triage_data.get("category")
        entities = triage_data.get("entities", {})
        order_id = entities.get("order_id")
        
        # Sarah Jenkins SL-8842
        if category == "Refund" and order_id == "SL-8842":
            return f"""Hi Sarah,

Thank you for reaching out to StrideLife Support! I am very sorry to hear that your Nebula Blue Running Shoes are too tight and causing your feet discomfort. We want every customer to run in absolute comfort!

Since you ordered your shoes 13 days ago, you are well within our 30-day returns window. I am pleased to let you know that we have approved a full refund of $120.00 back to your original payment method. 

You will receive an automated email shortly containing a prepaid return shipping label. Simply pack the shoes in their original box, attach the label, and drop it off at any local courier station. There are no restocking fees associated with standard size exchanges or returns.

Once our warehouse scans the returned package, your refund will clear back to your card within 3-5 business days. Let us know if you would like assistance placing a new order for a larger size instead!

Best regards,

StrideLife Support Co-Pilot
Support Operations Team"""

        # Marcus Aurelius (VIP Subscription refund dispute)
        elif category == "Subscription":
            return f"""Hi Marcus,

Thank you for contacting StrideLife VIP Support regarding your subscription membership.

I have processed the immediate cancellation of your StrideLife VIP Club membership to ensure that no future auto-renewals or monthly charges of $19.99 occur on your account. Your benefits will remain active until the end of your current billing cycle.

Regarding your request for a full refund of the past six months' charges ($120.00): Under our official VIP Membership Policy, subscription fees are non-refundable after the standard 14-day cooling-off window. Because your subscription has been active for six months, we are unable to process a cash refund for these historical charges.

However, we deeply value your membership. As an gesture of goodwill, I have added a one-time 15-day trial extension to your account at zero cost, along with a $20 StrideLife store credit code which you can apply to any shoe purchase.

If you have any further questions about your billing options, please feel free to reply.

Warm regards,

StrideLife Support Co-Pilot
Billing & Memberships Desk"""

        # Ethan Hunt SL-9912 (High value stolen package escalation)
        elif category == "Shipping" and order_id == "SL-9912":
            return f"""Hi Ethan,

Thank you for contacting StrideLife Executive Support. I understand the extreme urgency of your request regarding Order #SL-9912 for the 10 pairs of Limited Edition Golden Runner shoes totaling $2,000.

Because this order exceeds standard refund thresholds and carrier tracking lists the status as "Delivered with Signature Verification", our system has flagged this case for compliance audit. Under Section 3 of our shipping bylaws, we are unable to issue an automated refund or replacement for signature-verified deliveries.

To proceed with an escalation, we kindly request that you file a package theft report with your local police department and share a digital copy or report number with us.

I have forwarded this ticket directly to our Tier 3 Support Operations Manager for a priority manual override review. They will contact you within the next 4 hours to coordinate alternative shipping and safety verifications.

Thank you for your patience as we investigate this high-priority matter.

Sincerely,

StrideLife Executive Support
Security & Logistics Triage"""

        # Emma Watson GDPR
        elif category == "Privacy":
            return f"""Hi Emma,

Thank you for reaching out to StrideLife Support regarding your account privacy.

We respect your privacy and legal rights under GDPR regulations. I have successfully submitted a request to our security engineering team to initiate the permanent wiping of your customer profile.

This procedure will permanently purge your name, email address, phone records, active order logs, and all historical shipping addresses from our active production databases. Under our CCPA and GDPR compliance procedures, this manual process will be completed within 7 to 10 business days.

Please note that a secure, non-identifiable cryptographic hash of your financial transactions must be archived for tax compliance auditing, but it will contain zero personal identifiable information (PII).

We will send a final automated confirmation to this email address once the purge is fully complete. Thank you for your patience.

Best regards,

StrideLife Security & Privacy Team
Compliance Operations"""

        # Default fallback
        return f"""Hi {name},

Thank you for contacting support. I have received your message regarding your ticket.

I have forwarded your request to our support specialist team for a detailed manual review. One of our agents will contact you shortly with an update.

Warm regards,

Support Operations Desk"""
