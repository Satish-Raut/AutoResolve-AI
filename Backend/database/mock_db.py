import json
from datetime import datetime
import os
from typing import Dict, List, Optional
from ..models import TicketResponse

# Simulated Database in memory
TICKETS_DB: Dict[str, Dict] = {
    "TKT-1001": {
        "id": "TKT-1001",
        "customer_name": "Sarah Jenkins",
        "customer_email": "sarah.j@gmail.com",
        "subject": "Size Exchange/Refund Request",
        "message": "Hi StrideLife, I bought a pair of your Nebula Blue Running Shoes 13 days ago (Order #SL-8842) but they are too tight and hurt my feet. Can I get a full refund to my credit card? Thanks, Sarah.",
        "status": "Pending",
        "priority": "Medium",
        "category": "Unclassified",
        "sentiment": "Neutral",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "resolved_at": None,
        "draft_reply": None,
        "risk_score": "Low",
        "risk_reasons": []
    },
    "TKT-1002": {
        "id": "TKT-1002",
        "customer_name": "Marcus Aurelius",
        "customer_email": "marcus.philosophy@outlook.com",
        "subject": "Cancel VIP Club & Refund",
        "message": "Hi, I subscribed to your VIP Club 6 months ago. I noticed I am still being billed $19.99 every month. I haven't used the free shipping at all. Please cancel this immediately and issue a full refund of all $120 billed to me over the last six months. Thank you.",
        "status": "Pending",
        "priority": "Medium",
        "category": "Unclassified",
        "sentiment": "Neutral",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "resolved_at": None,
        "draft_reply": None,
        "risk_score": "Low",
        "risk_reasons": []
    },
    "TKT-1003": {
        "id": "TKT-1003",
        "customer_name": "Ethan Hunt",
        "customer_email": "imf_ethan@impossible.org",
        "subject": "Stolen package / high refund request",
        "message": "URGENT: I ordered 10 pairs of the Limited Edition Golden Runner shoes for my team, totaling $2,000 (Order #SL-9912). The tracking code says 'Delivered with Signature' but we never received anything in our compound. I demand an immediate full refund or a fast courier reshipment today. We need these for a mission.",
        "status": "Pending",
        "priority": "High",
        "category": "Unclassified",
        "sentiment": "Neutral",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "resolved_at": None,
        "draft_reply": None,
        "risk_score": "Low",
        "risk_reasons": []
    },
    "TKT-1004": {
        "id": "TKT-1004",
        "customer_name": "Emma Watson",
        "customer_email": "emma.w@privacy-first.uk",
        "subject": "GDPR Wiping / Privacy Request",
        "message": "Hello, I am requesting that StrideLife permanently deletes my account and wipes all of my personal data, including email, order logs, and shipping addresses, from your systems. I would like to exercise my Right to be Forgotten under GDPR laws. Please let me know when this is done.",
        "status": "Pending",
        "priority": "Medium",
        "category": "Unclassified",
        "sentiment": "Neutral",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "resolved_at": None,
        "draft_reply": None,
        "risk_score": "Low",
        "risk_reasons": []
    }
}

AUDIT_LOG_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "audit_log.jsonl")

def get_all_tickets() -> List[Dict]:
    # Return sorted by ID
    return sorted(list(TICKETS_DB.values()), key=lambda t: t["id"], reverse=True)

def get_ticket_by_id(ticket_id: str) -> Optional[Dict]:
    return TICKETS_DB.get(ticket_id)

def add_ticket(customer_name: str, customer_email: str, subject: str, message: str) -> Dict:
    next_id = f"TKT-{1000 + len(TICKETS_DB) + 1}"
    new_ticket = {
        "id": next_id,
        "customer_name": customer_name,
        "customer_email": customer_email,
        "subject": subject,
        "message": message,
        "status": "Pending",
        "priority": "Medium",
        "category": "Unclassified",
        "sentiment": "Neutral",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "resolved_at": None,
        "draft_reply": None,
        "risk_score": "Low",
        "risk_reasons": []
    }
    TICKETS_DB[next_id] = new_ticket
    return new_ticket

def update_ticket(ticket_id: str, updates: Dict) -> Optional[Dict]:
    if ticket_id in TICKETS_DB:
        TICKETS_DB[ticket_id].update(updates)
        return TICKETS_DB[ticket_id]
    return None

def log_approval_audit(ticket_id: str, draft_reply: str, risk_score: str, notes: str):
    ticket = TICKETS_DB.get(ticket_id)
    if not ticket:
        return
        
    audit_entry = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "ticket_id": ticket_id,
        "customer_name": ticket["customer_name"],
        "customer_email": ticket["customer_email"],
        "category": ticket.get("category"),
        "resolution_decision": "Approved and Sent",
        "risk_level": risk_score,
        "audit_notes": notes,
        "draft_reply": draft_reply
    }
    
    with open(AUDIT_LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(audit_entry) + "\n")
