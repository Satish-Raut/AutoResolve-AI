import os
import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Optional
from dotenv import load_dotenv

# Load local environment variables from .env
load_dotenv()

# Path to SQLite fallback DB file in the root workspace directory
DB_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
DB_PATH = os.path.join(DB_DIR, "autoresolve.db")
AUDIT_LOG_FILE = os.path.join(DB_DIR, "audit_log.jsonl")

# Read database URL (Supabase PostgreSQL URI)
DATABASE_URL = os.getenv("DATABASE_URL")

def get_connection():
    if DATABASE_URL:
        import psycopg2
        # Connect directly to your live Supabase cloud database
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    else:
        # Fall back to self-contained SQLite file
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row  # Returns dictionaries instead of tuples
        return conn

def get_cursor(conn):
    if DATABASE_URL:
        from psycopg2.extras import RealDictCursor
        # RealDictCursor makes PostgreSQL rows behave exactly like python dictionaries
        return conn.cursor(cursor_factory=RealDictCursor)
    else:
        return conn.cursor()

def execute_query(cursor, query: str, params: tuple = ()):
    if DATABASE_URL:
        # Translate SQLite '?' query placeholders to PostgreSQL '%s' placeholders
        query = query.replace("?", "%s")
    cursor.execute(query, params)

def init_db():
    """Initializes the database schema (SQLite or PostgreSQL) and seeds default tickets if empty."""
    conn = get_connection()
    cursor = get_cursor(conn)
    
    if DATABASE_URL:
        # ---------------------------------------------
        # Live Cloud Supabase PostgreSQL Schema
        # ---------------------------------------------
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS tickets (
            id VARCHAR PRIMARY KEY,
            customer_name VARCHAR NOT NULL,
            customer_email VARCHAR NOT NULL,
            subject VARCHAR NOT NULL,
            message TEXT NOT NULL,
            status VARCHAR NOT NULL,
            priority VARCHAR DEFAULT 'Medium',
            category VARCHAR DEFAULT 'Unclassified',
            sentiment VARCHAR DEFAULT 'Neutral',
            created_at VARCHAR NOT NULL,
            resolved_at VARCHAR,
            draft_reply TEXT,
            risk_score VARCHAR DEFAULT 'Low',
            risk_reasons TEXT DEFAULT '[]'
        )
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id SERIAL PRIMARY KEY,
            timestamp VARCHAR NOT NULL,
            ticket_id VARCHAR NOT NULL,
            customer_name VARCHAR NOT NULL,
            customer_email VARCHAR NOT NULL,
            category VARCHAR,
            resolution_decision VARCHAR NOT NULL,
            risk_level VARCHAR NOT NULL,
            audit_notes TEXT,
            draft_reply TEXT NOT NULL
        )
        """)
        conn.commit()
        
        # Seed default tickets if table is completely empty
        cursor.execute("SELECT COUNT(*) as count FROM tickets")
        if cursor.fetchone()["count"] == 0:
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            default_tickets = [
                (
                    "TKT-1001", "Sarah Jenkins", "sarah.j@gmail.com", "Size Exchange/Refund Request",
                    "Hi StrideLife, I bought a pair of your Nebula Blue Running Shoes 13 days ago (Order #SL-8842) but they are too tight and hurt my feet. Can I get a full refund to my credit card? Thanks, Sarah.",
                    "Pending", "Medium", "Unclassified", "Neutral", now_str, None, None, "Low", "[]"
                ),
                (
                    "TKT-1002", "Marcus Aurelius", "marcus.philosophy@outlook.com", "Cancel VIP Club & Refund",
                    "Hi, I subscribed to your VIP Club 6 months ago. I noticed I am still being billed $19.99 every month. I haven't used the free shipping at all. Please cancel this immediately and issue a full refund of all $120 billed to me over the last six months. Thank you.",
                    "Pending", "Medium", "Unclassified", "Neutral", now_str, None, None, "Low", "[]"
                ),
                (
                    "TKT-1003", "Ethan Hunt", "imf_ethan@impossible.org", "Stolen package / high refund request",
                    "URGENT: I ordered 10 pairs of the Limited Edition Golden Runner shoes for my team, totaling $2,000 (Order #SL-9912). The tracking code says 'Delivered with Signature' but we never received anything in our compound. I demand an immediate full refund or a fast courier reshipment today. We need these for a mission.",
                    "Pending", "High", "Unclassified", "Neutral", now_str, None, None, "Low", "[]"
                ),
                (
                    "TKT-1004", "Emma Watson", "emma.w@privacy-first.uk", "GDPR Wiping / Privacy Request",
                    "Hello, I am requesting that StrideLife permanently deletes my account and wipes all of my personal data, including email, order logs, and shipping addresses, from your systems. I would like to exercise my Right to be Forgotten under GDPR laws. Please let me know when this is done.",
                    "Pending", "Medium", "Unclassified", "Neutral", now_str, None, None, "Low", "[]"
                )
            ]
            cursor.executemany("""
            INSERT INTO tickets (
                id, customer_name, customer_email, subject, message, status, 
                priority, category, sentiment, created_at, resolved_at, 
                draft_reply, risk_score, risk_reasons
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, default_tickets)
            conn.commit()
            
    else:
        # ---------------------------------------------
        # Local SQLite Fallback Schema
        # ---------------------------------------------
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS tickets (
            id TEXT PRIMARY KEY,
            customer_name TEXT NOT NULL,
            customer_email TEXT NOT NULL,
            subject TEXT NOT NULL,
            message TEXT NOT NULL,
            status TEXT NOT NULL,
            priority TEXT DEFAULT 'Medium',
            category TEXT DEFAULT 'Unclassified',
            sentiment TEXT DEFAULT 'Neutral',
            created_at TEXT NOT NULL,
            resolved_at TEXT,
            draft_reply TEXT,
            risk_score TEXT DEFAULT 'Low',
            risk_reasons TEXT DEFAULT '[]'
        )
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            ticket_id TEXT NOT NULL,
            customer_name TEXT NOT NULL,
            customer_email TEXT NOT NULL,
            category TEXT,
            resolution_decision TEXT NOT NULL,
            risk_level TEXT NOT NULL,
            audit_notes TEXT,
            draft_reply TEXT NOT NULL
        )
        """)
        conn.commit()
        
        # Seed default tickets if table is completely empty
        cursor.execute("SELECT COUNT(*) as count FROM tickets")
        if cursor.fetchone()["count"] == 0:
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            default_tickets = [
                (
                    "TKT-1001", "Sarah Jenkins", "sarah.j@gmail.com", "Size Exchange/Refund Request",
                    "Hi StrideLife, I bought a pair of your Nebula Blue Running Shoes 13 days ago (Order #SL-8842) but they are too tight and hurt my feet. Can I get a full refund to my credit card? Thanks, Sarah.",
                    "Pending", "Medium", "Unclassified", "Neutral", now_str, None, None, "Low", "[]"
                ),
                (
                    "TKT-1002", "Marcus Aurelius", "marcus.philosophy@outlook.com", "Cancel VIP Club & Refund",
                    "Hi, I subscribed to your VIP Club 6 months ago. I noticed I am still being billed $19.99 every month. I haven't used the free shipping at all. Please cancel this immediately and issue a full refund of all $120 billed to me over the last six months. Thank you.",
                    "Pending", "Medium", "Unclassified", "Neutral", now_str, None, None, "Low", "[]"
                ),
                (
                    "TKT-1003", "Ethan Hunt", "imf_ethan@impossible.org", "Stolen package / high refund request",
                    "URGENT: I ordered 10 pairs of the Limited Edition Golden Runner shoes for my team, totaling $2,000 (Order #SL-9912). The tracking code says 'Delivered with Signature' but we never received anything in our compound. I demand an immediate full refund or a fast courier reshipment today. We need these for a mission.",
                    "Pending", "High", "Unclassified", "Neutral", now_str, None, None, "Low", "[]"
                ),
                (
                    "TKT-1004", "Emma Watson", "emma.w@privacy-first.uk", "GDPR Wiping / Privacy Request",
                    "Hello, I am requesting that StrideLife permanently deletes my account and wipes all of my personal data, including email, order logs, and shipping addresses, from your systems. I would like to exercise my Right to be Forgotten under GDPR laws. Please let me know when this is done.",
                    "Pending", "Medium", "Unclassified", "Neutral", now_str, None, None, "Low", "[]"
                )
            ]
            cursor.executemany("""
            INSERT INTO tickets (
                id, customer_name, customer_email, subject, message, status, 
                priority, category, sentiment, created_at, resolved_at, 
                draft_reply, risk_score, risk_reasons
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, default_tickets)
            conn.commit()
            
    conn.close()

# Always auto-initialize database tables on module import
init_db()

def get_all_tickets() -> List[Dict]:
    conn = get_connection()
    cursor = get_cursor(conn)
    execute_query(cursor, "SELECT * FROM tickets ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    
    result = []
    for r in rows:
        d = dict(r)
        d["risk_reasons"] = json.loads(d["risk_reasons"]) if d["risk_reasons"] else []
        result.append(d)
    return result

def get_ticket_by_id(ticket_id: str) -> Optional[Dict]:
    conn = get_connection()
    cursor = get_cursor(conn)
    execute_query(cursor, "SELECT * FROM tickets WHERE id = ?", (ticket_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        d = dict(row)
        d["risk_reasons"] = json.loads(d["risk_reasons"]) if d["risk_reasons"] else []
        return d
    return None

def add_ticket(customer_name: str, customer_email: str, subject: str, message: str) -> Dict:
    conn = get_connection()
    cursor = get_cursor(conn)
    
    # Generate the next serial TKT ID
    execute_query(cursor, "SELECT COUNT(*) as count FROM tickets")
    total_count = cursor.fetchone()["count"]
    next_id = f"TKT-{1000 + total_count + 1}"
    
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
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
        "created_at": now_str,
        "resolved_at": None,
        "draft_reply": None,
        "risk_score": "Low",
        "risk_reasons": []
    }
    
    execute_query(cursor, """
    INSERT INTO tickets (
        id, customer_name, customer_email, subject, message, status, 
        priority, category, sentiment, created_at, resolved_at, 
        draft_reply, risk_score, risk_reasons
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        new_ticket["id"],
        new_ticket["customer_name"],
        new_ticket["customer_email"],
        new_ticket["subject"],
        new_ticket["message"],
        new_ticket["status"],
        new_ticket["priority"],
        new_ticket["category"],
        new_ticket["sentiment"],
        new_ticket["created_at"],
        new_ticket["resolved_at"],
        new_ticket["draft_reply"],
        new_ticket["risk_score"],
        json.dumps(new_ticket["risk_reasons"])
    ))
    conn.commit()
    conn.close()
    return new_ticket

def update_ticket(ticket_id: str, updates: Dict) -> Optional[Dict]:
    conn = get_connection()
    cursor = get_cursor(conn)
    
    # Verify ticket exists first
    execute_query(cursor, "SELECT * FROM tickets WHERE id = ?", (ticket_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
        
    # Map the update dictionary to SET updates
    fields = []
    values = []
    for k, v in updates.items():
        fields.append(f"{k} = ?")
        if k == "risk_reasons":
            values.append(json.dumps(v))
        else:
            values.append(v)
            
    values.append(ticket_id)
    query = f"UPDATE tickets SET {', '.join(fields)} WHERE id = ?"
    
    execute_query(cursor, query, tuple(values))
    conn.commit()
    conn.close()
    
    return get_ticket_by_id(ticket_id)

def log_approval_audit(ticket_id: str, draft_reply: str, risk_score: str, notes: str):
    ticket = get_ticket_by_id(ticket_id)
    if not ticket:
        return
        
    conn = get_connection()
    cursor = get_cursor(conn)
    
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    execute_query(cursor, """
    INSERT INTO audit_logs (
        timestamp, ticket_id, customer_name, customer_email, 
        category, resolution_decision, risk_level, audit_notes, draft_reply
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        now_str,
        ticket_id,
        ticket["customer_name"],
        ticket["customer_email"],
        ticket.get("category"),
        "Approved and Sent",
        risk_score,
        notes,
        draft_reply
    ))
    conn.commit()
    conn.close()
    
    # Maintain traditional audit_log.jsonl appendment for audit file continuity
    audit_entry = {
        "timestamp": now_str,
        "ticket_id": ticket_id,
        "customer_name": ticket["customer_name"],
        "customer_email": ticket["customer_email"],
        "category": ticket.get("category"),
        "resolution_decision": "Approved and Sent",
        "risk_level": risk_score,
        "audit_notes": notes,
        "draft_reply": draft_reply
    }
    
    try:
        with open(AUDIT_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(audit_entry) + "\n")
    except Exception as e:
        print(f"Error appending to JSONL audit log file: {e}")
