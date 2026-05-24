# AutoResolve AI: Presentation Study Notes & Presentation Guide

Use this document to prepare for your presentation and add your own notes as you learn!

---

## 1. Core Concept Explanations (In Plain English)

### What is RAG (Retrieval-Augmented Generation)?
* **Analogy**: RAG is like an **"Open-Book Exam"** for an AI.
* **Why we use it**: Standard AIs (like ChatGPT or Gemini) know general things but they don't know your company's secret, internal rules. If you ask them for a refund policy, they might guess or hallucinate. 
* **How it works in our project**: 
  1. The customer sends a ticket.
  2. The **Policy/RAG Agent** reads the ticket and searches our local files (e.g., `refund_policy.txt`).
  3. It extracts only the active paragraphs (e.g., "Returns allowed within 30 days").
  4. It feeds this exact text to the LLM. 
  5. The LLM answers using **only** this retrieved text. 
* **Key presentation quote**: *"Instead of letting the AI guess our company rules, we use RAG to look up the exact, active policy text before making any decisions. This guarantees 100% policy compliance."*

### What is a Multi-Agent Workflow?
* **Analogy**: It is like a **factory assembly line**.
* **Why we use it**: If you ask one person to assemble, paint, inspect, and ship a car, they will make mistakes. It is much more efficient to hire five specialists. In AI, giving one massive prompt to do everything causes the model to lose track. Giving small, highly-targeted prompts to specialized agents makes the system incredibly accurate.
* **How it works in our project**:
  - **Agent 1 (Classifier)**: Unpacks and labels the incoming ticket.
  - **Agent 2 (Policy RAG)**: Finds the exact rules for that label.
  - **Agent 3 (Resolver)**: Compares the dates, calculates refund amounts, and makes the logical decision.
  - **Agent 4 (Risk Auditor)**: Checks for fraud signals and financial limits.
  - **Agent 5 (Response Writer)**: Writes the polite customer email.
  - **Human (You)**: Acts as the final approver before the email is sent.
* **Key presentation quote**: *"By breaking down a complex customer service operation into five focused AI specialist agents, we achieve high accuracy, auditability, and clear separation of concerns."*

---

## 2. The Real-Life Scenario: "The Tight Blue Shoes"

Use this exact scenario to explain the project to your teacher and classmates. It makes the system immediately understandable.

### The Setup
A customer named **Sarah** buys a pair of "Nebula Blue Running Shoes" for **$120** from an online store on **May 10th**. When they arrive, they are too tight. On **May 23rd** (13 days later), she sends a ticket:
> *"Hi support, I bought these shoes 13 days ago (Order #SL-8842). They are too small and hurt my feet. Can I get a full refund to my card? Thanks, Sarah."*

### How the Multi-Agent Assembly Line Processes it in 5 Seconds:

1. **Ticket Classifier Agent**
   - **Thought Process**: Reads Sarah's email.
   - **Output**: Category: `Refund`, Priority: `Medium`, Sentiment: `Disappointed`, Order ID: `#SL-8842`, Days elapsed: `13`.

2. **Policy/RAG Agent**
   - **Thought Process**: Takes the category `Refund` and searches our company document (`policies/refund_policy.txt`).
   - **Output**: Extracts the rule: *"Customers are eligible for a full refund if the item is returned within 30 days of purchase in unworn condition."*

3. **Resolution Agent**
   - **Thought Process**: Compares Sarah's days elapsed (`13`) with the policy limit (`30`). Since `13 <= 30`, she is eligible.
   - **Output**: *"Decision: Approve full refund of $120. Reason: Request made 13 days after purchase, which is within the 30-day limit."*

4. **Risk Checker Agent**
   - **Thought Process**: Audits the user's return frequency and transaction risk.
   - **Output**: *"Risk Score: Low. Customer has zero refund history. Transaction value is low."*

5. **Response Writer Agent**
   - **Thought Process**: Combines the resolution details, low risk, and policy facts to draft the email.
   - **Output**:
     > *"Hi Sarah,\n\nThank you for reaching out to support! I am so sorry to hear the shoes were tight and uncomfortable.\n\nSince you are well within our 30-day return policy (you ordered 13 days ago), we have approved your return and processed a full refund of $120 to your card. [... instructions on how to return the package for free ...]\n\nWarm regards,\nSupport Co-Pilot"*

### Human-in-the-Loop Review
On the dashboard, the human support agent sees the ticket, reviews the **Low Risk** badge and the **live logs of all agents**, tweaks any text if desired, and clicks **"Approve & Send Email"**. The case is closed and logged into an audit trail.

---

## 3. What to add in future:
* [ ] Notes on how to connect this to an actual CRM database (like Salesforce or Zendesk).
* [ ] Ideas for processing phone calls (speech-to-text ticket intake).
* [ ] Custom prompts for handling angry customers.
