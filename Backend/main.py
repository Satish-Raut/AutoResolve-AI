from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import time
from typing import List, Dict, Any

from .models import TicketInput, TicketResponse, PipelineResult, AgentLogStep, ApprovalInput
# Real persistent SQLite database (import mock_db if you want to switch back to in-memory)
from .database import sqlite_db as mock_db
from .agents.classifier import TicketClassifierAgent
from .agents.rag import PolicyRAGAgent
from .agents.resolver import ResolutionAgent
from .agents.risk_checker import RiskCheckerAgent
from .agents.response_writer import ResponseWriterAgent

# Initialize FastAPI App
app = FastAPI(  
    title="AutoResolve AI Backend",
    description="Multi-Agent Customer Support Automation Pipeline",
    version="1.0.0"
)

# Configure CORS for local development with React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate our specialized agents
classifier_agent = TicketClassifierAgent()
rag_agent = PolicyRAGAgent()
resolver_agent = ResolutionAgent()
risk_agent = RiskCheckerAgent()
writer_agent = ResponseWriterAgent()

@app.get("/")
@app.get("/api")
def home():
    return {
        "status": "online",
        "service": "AutoResolve AI Orchestration API",
        "mock_mode": classifier_agent.mock_mode,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

@app.get("/api/tickets", response_model=List[TicketResponse])
def get_tickets():
    return mock_db.get_all_tickets()

@app.get("/api/tickets/{ticket_id}", response_model=TicketResponse)
def get_ticket_details(ticket_id: str):
    ticket = mock_db.get_ticket_by_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket

@app.post("/api/tickets", response_model=TicketResponse)
def create_manual_ticket(input_data: TicketInput):
    new_ticket = mock_db.add_ticket(
        customer_name=input_data.customer_name,
        customer_email=input_data.customer_email,
        subject=input_data.subject,
        message=input_data.message
    )
    return new_ticket

@app.post("/api/process/{ticket_id}", response_model=PipelineResult)
def process_ticket(ticket_id: str):
    ticket = mock_db.get_ticket_by_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    # Update status to Processing
    mock_db.update_ticket(ticket_id, {"status": "Processing"})
    
    logs: List[AgentLogStep] = []
    
    # helper for adding logs
    def add_log(agent_name: str, status: str, message: str, payload: dict = None):
        logs.append(AgentLogStep(
            agent_name=agent_name,
            status=status,
            message=message,
            timestamp=datetime.now().strftime("%H:%M:%S"),
            payload=payload
        ))
        # Introduce a micro artificial delay to make the frontend visualization feel realistic and engaging
        time.sleep(0.6)

    try:
        # ---------------------------------------------
        # STEP 1: CLASSIFIER AGENT
        # ---------------------------------------------
        add_log("Ticket Classifier", "Processing", "Reading ticket details and performing text triage...")
        triage_data = classifier_agent.triage(ticket["message"])
        
        # Save parsed variables back to db
        mock_db.update_ticket(ticket_id, {
            "category": triage_data.get("category", "Other"),
            "priority": triage_data.get("priority", "Medium"),
            "sentiment": triage_data.get("sentiment", "Neutral")
        })
        
        add_log("Ticket Classifier", "Success", "Triage complete. Extracted customer details.", triage_data)

        # ---------------------------------------------
        # STEP 2: RAG AGENT
        # ---------------------------------------------
        category = triage_data.get("category", "Other")
        add_log("Policy RAG Retriever", "Processing", f"Searching company policies folder for '{category}' bylaws...")
        
        rag_data = rag_agent.retrieve_policies(category, ticket["message"], triage_data.get("entities", {}))
        
        add_log("Policy RAG Retriever", "Success", f"Retrieved {len(rag_data.get('retrieved_policies', []))} active policy clauses.", rag_data)

        # ---------------------------------------------
        # STEP 3: RESOLUTION AGENT
        # ---------------------------------------------
        add_log("Resolution Suggester", "Processing", "Evaluating client query rules against policy bylaws...")
        
        res_data = resolver_agent.suggest_resolution(ticket["message"], triage_data, rag_data)
        
        add_log("Resolution Suggester", "Success", f"Determined resolution: {res_data.get('decision')}", res_data)

        # ---------------------------------------------
        # STEP 4: RISK AUDITOR AGENT
        # ---------------------------------------------
        add_log("Risk Auditor", "Processing", "Auditing resolution path for fraud compliance indicators...")
        
        risk_data = risk_agent.check_risk(ticket["message"], triage_data, res_data)
        
        mock_db.update_ticket(ticket_id, {
            "risk_score": risk_data.get("risk_score", "Low"),
            "risk_reasons": risk_data.get("reasons", [])
        })
        
        add_log("Risk Auditor", "Success", f"Audit complete. Risk Level: {risk_data.get('risk_score')}", risk_data)

        # ---------------------------------------------
        # STEP 5: RESPONSE WRITER AGENT
        # ---------------------------------------------
        add_log("Response Writer", "Processing", "Formulating empathetic customer email draft...")
        
        draft = writer_agent.draft_response(
            customer_name=ticket["customer_name"],
            ticket_text=ticket["message"],
            triage_data=triage_data,
            rag_data=rag_data,
            resolution_data=res_data,
            risk_data=risk_data
        )
        
        # Save draft back to db
        mock_db.update_ticket(ticket_id, {
            "draft_reply": draft,
            "status": "Pending"  # Set back to Pending to wait for Human Approval
        })
        
        add_log("Response Writer", "Success", "Polished email response drafted successfully.", {"length": len(draft)})

        # Return full compiled result
        return PipelineResult(
            ticket_id=ticket_id,
            status="Pending",
            category=category,
            priority=triage_data.get("priority", "Medium"),
            sentiment=triage_data.get("sentiment", "Neutral"),
            draft_reply=draft,
            risk_score=risk_data.get("risk_score", "Low"),
            risk_reasons=risk_data.get("reasons", []),
            logs=logs
        )

    except Exception as e:
        mock_db.update_ticket(ticket_id, {"status": "Failed"})
        add_log("System Orchestrator", "Error", f"Pipeline crashed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Orchestration failure: {str(e)}")

@app.post("/api/approve/{ticket_id}")
def approve_resolution(ticket_id: str, approval: ApprovalInput):
    ticket = mock_db.get_ticket_by_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    # Update status to Resolved
    mock_db.update_ticket(ticket_id, {
        "status": "Resolved",
        "draft_reply": approval.draft_reply,
        "resolved_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })
    
    # Save transaction history to Audit Log file
    mock_db.log_approval_audit(
        ticket_id=ticket_id,
        draft_reply=approval.draft_reply,
        risk_score=approval.risk_score,
        notes=approval.notes
    )
    
    return {"message": "Resolution approved and audit log saved."}
