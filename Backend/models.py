from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class TicketInput(BaseModel):
    customer_name: str = Field(..., description="Name of the customer submitting the ticket")
    customer_email: str = Field(..., description="Email address of the customer")
    subject: str = Field(..., description="Subject of the support ticket")
    message: str = Field(..., description="Customer's support message")

class TicketResponse(BaseModel):
    id: str
    customer_name: str
    customer_email: str
    subject: str
    message: str
    status: str  # "Pending", "Processing", "Resolved", "Failed"
    priority: Optional[str] = "Medium"  # "Low", "Medium", "High", "Urgent"
    category: Optional[str] = "Unclassified" # "Refund", "Shipping", "Subscription", "Privacy", "Other"
    sentiment: Optional[str] = "Neutral"
    assigned_agent: Optional[str] = None
    created_at: str
    resolved_at: Optional[str] = None
    draft_reply: Optional[str] = None
    risk_score: Optional[str] = "Low"  # "Low", "Medium", "High"
    risk_reasons: Optional[List[str]] = []

class AgentLogStep(BaseModel):
    agent_name: str
    status: str  # "Processing", "Success", "Error"
    message: str
    timestamp: str
    payload: Optional[Dict[str, Any]] = None

class PipelineResult(BaseModel):
    ticket_id: str
    status: str
    category: str
    priority: str
    sentiment: str
    draft_reply: str
    risk_score: str
    risk_reasons: List[str]
    logs: List[AgentLogStep]

class ApprovalInput(BaseModel):
    draft_reply: str
    risk_score: Optional[str] = "Low"
    notes: Optional[str] = ""
