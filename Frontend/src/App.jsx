import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TicketQueue from './components/TicketQueue';
import PipelineConsole from './components/PipelineConsole';
import ResponseEditor from './components/ResponseEditor';
import logoImg from './assets/logo.png';

export default function App() {
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
  const [theme, setTheme] = useState('dark'); // 'light' or 'dark'
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isMockMode, setIsMockMode] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [autoTrigger, setAutoTrigger] = useState(() => {
    return JSON.parse(localStorage.getItem('autoTrigger') || 'false');
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('autoTrigger', JSON.stringify(autoTrigger));
  }, [autoTrigger]);
  
  // Dynamic Sidebar & Console Panel Resizing States
  const [queueWidth, setQueueWidth] = useState(288);
  const [editorWidth, setEditorWidth] = useState(320);

  const startResizeQueue = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = queueWidth;

    const doDrag = (moveEvent) => {
      const newWidth = Math.max(220, Math.min(450, startWidth + (moveEvent.clientX - startX)));
      setQueueWidth(newWidth);
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  const startResizeEditor = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = editorWidth;

    const doDrag = (moveEvent) => {
      const newWidth = Math.max(260, Math.min(480, startWidth - (moveEvent.clientX - startX)));
      setEditorWidth(newWidth);
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };
  
  // New ticket form inputs
  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newSubmitting, setNewSubmitting] = useState(false);

  // Keep HTML document element class synchronized with active state theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark-theme');
    } else {
      root.classList.remove('dark-theme');
    }
  }, [theme]);

  // Fetch all tickets on load
  const fetchTickets = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tickets`);
      console.log(res)
      const data = await res.json();
      setTickets(data);
      
      // Auto-select first ticket if none is selected
      if (data.length > 0 && !selectedTicket) {
        setSelectedTicket(data[0]);
      }
    } catch (err) {
      console.error("Error fetching tickets:", err);
    }
  };

  // Check backend server status and Mock Mode
  const checkServerStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api`);
      console.log(res);

      const data = await res.json();
      setIsMockMode(data.mock_mode);
    } catch (err) {
      console.error("Error checking status:", err);
    }
  };

  useEffect(() => {
    fetchTickets();
    checkServerStatus();
  }, []);

  const handleSelectTicket = (ticket) => {
    setSelectedTicket(ticket);
    setIsProcessing(false);
    
    // If ticket has a saved draft, pre-load logs
    if (ticket.draft_reply) {
      setLogs([
        {
          agent_name: "Ticket Classifier",
          status: "Success",
          message: "Pre-loaded triage stats from database records.",
          timestamp: "00:00:00",
          payload: { category: ticket.category, priority: ticket.priority, sentiment: ticket.sentiment }
        },
        {
          agent_name: "Policy RAG Retriever",
          status: "Success",
          message: "Retrieved applicable policy details from database records.",
          timestamp: "00:00:00"
        },
        {
          agent_name: "Risk Auditor",
          status: "Success",
          message: `Audit complete. Risk Level: ${ticket.risk_score}`,
          timestamp: "00:00:00",
          payload: { risk_score: ticket.risk_score, reasons: ticket.risk_reasons }
        },
        {
          agent_name: "Response Writer",
          status: "Success",
          message: "Loaded completed draft reply.",
          timestamp: "00:00:00"
        }
      ]);
    } else {
      setLogs([]);
    }
  };

  // Start Multi-Agent Pipeline
  const handleStartPipeline = async (tkt = null) => {
    const targetTicket = tkt || selectedTicket;
    if (!targetTicket || isProcessing) return;

    setIsProcessing(true);
    setLogs([]);
    
    setTickets(prev =>
      prev.map(t => (t.id === targetTicket.id ? { ...t, status: 'Processing' } : t))
    );

    try {
      const res = await fetch(`${API_BASE}/api/process/${targetTicket.id}`, {
        method: 'POST',
      });
      
      if (!res.ok) throw new Error("Orchestrator error");

      const result = await res.json();
      
      let logIdx = 0;
      const interval = setInterval(() => {
        if (logIdx < result.logs.length) {
          const nextStep = result.logs[logIdx];
          setLogs(prev => [...prev, nextStep]);
          logIdx++;
        } else {
          clearInterval(interval);
          setIsProcessing(false);
          
          const updatedTicket = {
            ...targetTicket,
            status: 'Pending',
            category: result.category,
            priority: result.priority,
            sentiment: result.sentiment,
            draft_reply: result.draft_reply,
            risk_score: result.risk_score,
            risk_reasons: result.risk_reasons
          };
          
          // Only update selected ticket if we are currently viewing it
          setSelectedTicket(prev => {
            if (!prev || prev.id === targetTicket.id) {
              return updatedTicket;
            }
            return prev;
          });
          
          setTickets(prev =>
            prev.map(t => (t.id === targetTicket.id ? updatedTicket : t))
          );
        }
      }, 700);

    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      setTickets(prev =>
        prev.map(t => (t.id === targetTicket.id ? { ...t, status: 'Failed' } : t))
      );
      setLogs(prev => [...prev, {
        agent_name: "System Orchestrator",
        status: "Error",
        message: "Failed to coordinate multi-agent assembly pipeline.",
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
  };

  // Human-in-the-loop Approval Action
  const handleApproveResolution = async (approvalData) => {
    try {
      const res = await fetch(`${API_BASE}/api/approve/${selectedTicket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(approvalData)
      });
      
      if (!res.ok) throw new Error("Approval failed");

      await fetchTickets();
      
      setSelectedTicket(prev => ({
        ...prev,
        status: 'Resolved',
        draft_reply: approvalData.draft_reply
      }));

    } catch (err) {
      console.error(err);
      alert("Failed to submit approval.");
    }
  };

  // Form Submission for New Manual Ticket
  const handleNewTicketSubmit = async (e) => {
    e.preventDefault();
    if (!newCustName || !newCustEmail || !newSubject || !newMessage) return;

    setNewSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: newCustName,
          customer_email: newCustEmail,
          subject: newSubject,
          message: newMessage
        })
      });
      
      if (!res.ok) throw new Error("Failed to file ticket");
      
      const newTkt = await res.json();
      
      await fetchTickets();
      setSelectedTicket(newTkt);
      setLogs([]);
      
      setNewCustName('');
      setNewCustEmail('');
      setNewSubject('');
      setNewMessage('');
      setShowModal(false);
      
      if (autoTrigger) {
        handleStartPipeline(newTkt);
      }
      
      // Go straight to dashboard when filing new ticket!
      navigate('/console');
    } catch (err) {
      console.error(err);
      alert("Failed to submit ticket.");
    } finally {
      setNewSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // VIEW RENDERER
  // ----------------------------------------------------
  return (
    <Routes>
      <Route path="/" element={
      <div className="min-h-screen w-screen bg-bg-base bg-grid-pattern overflow-y-auto selection:bg-accent-theme selection:text-slate-950 pb-16 transition-all duration-300 relative">
        
        {/* Ambient Corner Glow Halos (As seen in your reference image) */}
        <div className="absolute top-[-150px] left-[-150px] w-[500px] h-[500px] rounded-full bg-accent-theme/6 dark:bg-accent-theme/4 blur-[130px] pointer-events-none -z-10"></div>
        <div className="absolute top-[-150px] right-[-150px] w-[500px] h-[500px] rounded-full bg-amber-500/6 dark:bg-amber-500/4 blur-[130px] pointer-events-none -z-10"></div>
        
        {/* Transparent Header Navigation (Borderless & Smooth) */}
        <header className="w-full bg-transparent border-none transition-all duration-300">
          <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
            <div 
              onClick={() => navigate('/')}
              className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-opacity"
              title="AutoResolve AI Home"
            >
              <img 
                src={logoImg} 
                alt="AutoResolve Logo" 
                className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-accent-theme-glow border border-accent-theme/20"
              />
              <div>
                <span className="text-lg font-black tracking-wider text-text-primary">AutoResolve AI</span>
              </div>
            </div>
            <nav className="flex items-center gap-6">
              <a href="#agents" className="text-sm font-semibold text-text-secondary hover:text-text-primary transition-all duration-200">Agents Team</a>
              <a href="#features" className="text-sm font-semibold text-text-secondary hover:text-text-primary transition-all duration-200">Key Tech</a>
              
              {/* Interactive Theme Toggle Button */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-10 h-10 rounded-xl bg-bg-panel hover:bg-bg-base border border-border-theme text-text-secondary hover:text-text-primary flex items-center justify-center cursor-pointer transition-all active:scale-90"
                title="Toggle Color Theme"
              >
                {theme === 'dark' ? (
                  <i className="fa-solid fa-sun text-sm text-amber-500 animate-pulse"></i>
                ) : (
                  <i className="fa-solid fa-moon text-sm text-amber-500"></i>
                )}
              </button>

              <button
                onClick={() => navigate('/console')}
                className="px-5 py-2.5 rounded-xl bg-accent-theme hover:bg-accent-theme-hover active:scale-95 text-xs font-bold text-slate-950 shadow-lg shadow-accent-theme-glow transition-all cursor-pointer"
              >
                Launch Operations Console
              </button>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section className="max-w-4xl mx-auto px-6 flex flex-col justify-center items-center min-h-[calc(100vh-120px)] text-center">
          <div className="inline-flex items-center gap-2 px-4.5 py-1.5 rounded-full bg-accent-theme/10 border border-accent-theme/35 text-accent-theme text-xs font-bold uppercase tracking-widest mb-8 animate-pulse">
            <i className="fa-solid fa-robot text-xs"></i>
            Autonomous Support Orchestration
          </div>
          
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text-primary mb-6 leading-tight max-w-3xl mx-auto">
            Autonomous Customer Support <br />
            <span className="bg-linear-to-r from-amber-500 via-yellow-500 to-orange-500 dark:from-yellow-450 dark:via-amber-450 dark:to-orange-450 bg-clip-text text-transparent">
              That Resolves in Seconds
            </span>
          </h2>
          
          <p className="text-base md:text-lg text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed font-normal italic">
            "AI handles the cognitive heavy lifting; humans maintain the customer connection. Empowering operations teams with coordinated specialized agents that retrieve facts, verify compliance, and draft empathetic resolutions in seconds."
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/console')}
              className="w-full sm:w-auto px-7 py-3.5 bg-accent-theme hover:bg-accent-theme-hover text-slate-950 font-bold rounded-xl shadow-xl shadow-accent-theme-glow text-sm active:scale-97 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-terminal"></i>
              Launch Operations Dashboard
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="w-full sm:w-auto px-7 py-3.5 bg-bg-panel hover:bg-bg-base border border-border-theme text-text-primary font-bold rounded-xl text-sm active:scale-97 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-plus"></i>
              File Test Customer Ticket
            </button>
          </div>
        </section>

        {/* Visual Multi-Agent Assembly Line Section */}
        <section id="agents" className="max-w-7xl mx-auto px-6 py-16 border-t border-border-theme mt-16">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-extrabold text-text-primary tracking-wide">The Specialized Agent Assembly Team</h3>
            <p className="text-base text-text-secondary mt-3 max-w-2xl mx-auto">AutoResolve AI avoids generalized AI glitches by coordinating five highly focused agent co-pilots.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Agent 1 */}
            <div className="p-8 bg-bg-panel rounded-3xl border border-border-theme text-center hover-glow transition-all duration-350">
              <div className="w-14 h-14 rounded-2xl bg-accent-theme/10 text-accent-theme border border-accent-theme/35 flex items-center justify-center mx-auto mb-5">
                <i className="fa-solid fa-tags text-xl"></i>
              </div>
              <h4 className="font-extrabold text-text-primary text-base mb-2 uppercase tracking-widest">1. Classifier</h4>
              <p className="text-sm text-text-secondary leading-relaxed mt-3">Triages tickets, classifies category, extracts priority, sentiment, and Order IDs in JSON.</p>
            </div>
            {/* Agent 2 */}
            <div className="p-8 bg-bg-panel rounded-3xl border border-border-theme text-center hover-glow transition-all duration-350">
              <div className="w-14 h-14 rounded-2xl bg-accent-theme/10 text-accent-theme border border-accent-theme/35 flex items-center justify-center mx-auto mb-5">
                <i className="fa-solid fa-book-open text-xl"></i>
              </div>
              <h4 className="font-extrabold text-text-primary text-base mb-2 uppercase tracking-widest">2. RAG Retriever</h4>
              <p className="text-sm text-text-secondary leading-relaxed mt-3">Scans local text policy rules, ranks matching sections, and retrieves clauses for context.</p>
            </div>
            {/* Agent 3 */}
            <div className="p-8 bg-bg-panel rounded-3xl border border-border-theme text-center hover-glow transition-all duration-350">
              <div className="w-14 h-14 rounded-2xl bg-accent-theme/10 text-accent-theme border border-accent-theme/35 flex items-center justify-center mx-auto mb-5">
                <i className="fa-solid fa-brain text-xl"></i>
              </div>
              <h4 className="font-extrabold text-text-primary text-base mb-2 uppercase tracking-widest">3. Resolver</h4>
              <p className="text-sm text-text-secondary leading-relaxed mt-3">Compares client timeline dates against policy requirements to make logical resolution choices.</p>
            </div>
            {/* Agent 4 */}
            <div className="p-8 bg-bg-panel rounded-3xl border border-border-theme text-center hover-glow transition-all duration-350">
              <div className="w-14 h-14 rounded-2xl bg-accent-theme/10 text-accent-theme border border-accent-theme/35 flex items-center justify-center mx-auto mb-5">
                <i className="fa-solid fa-shield-halved text-xl"></i>
              </div>
              <h4 className="font-extrabold text-text-primary text-base mb-2 uppercase tracking-widest">4. Risk Checker</h4>
              <p className="text-sm text-text-secondary leading-relaxed mt-3">Audits transaction value limits, signature verification leaks, and security safety concerns.</p>
            </div>
            {/* Agent 5 */}
            <div className="p-8 bg-bg-panel rounded-3xl border border-border-theme text-center hover-glow transition-all duration-350">
              <div className="w-14 h-14 rounded-2xl bg-accent-theme/10 text-accent-theme border border-accent-theme/35 flex items-center justify-center mx-auto mb-5">
                <i className="fa-solid fa-pen-nib text-xl"></i>
              </div>
              <h4 className="font-extrabold text-text-primary text-base mb-2 uppercase tracking-widest">5. Writer</h4>
              <p className="text-sm text-text-secondary leading-relaxed mt-3">Drafts warm, empathetic support replies, quoting the retrieved rules and providing options.</p>
            </div>
          </div>
        </section>

        {/* Feature Highlights Section */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-16 border-t border-border-theme mt-16 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="flex gap-5">
            <div className="w-12 h-12 rounded-xl bg-accent-theme/10 border border-accent-theme/35 flex items-center justify-center text-accent-theme shrink-0">
              <i className="fa-solid fa-search text-lg"></i>
            </div>
            <div>
              <h4 className="text-lg font-bold text-text-primary mb-3">Local Paragraph RAG</h4>
              <p className="text-sm text-text-secondary leading-relaxed">
                Uses local word-matching algorithms over loaded company policies to keep responses entirely factual, compliance-aligned, and free of general AI hallucinations.
              </p>
            </div>
          </div>
          <div className="flex gap-5">
            <div className="w-12 h-12 rounded-xl bg-accent-theme/10 border border-accent-theme/35 flex items-center justify-center text-accent-theme shrink-0">
              <i className="fa-solid fa-lock text-lg"></i>
            </div>
            <div>
              <h4 className="text-lg font-bold text-text-primary mb-3">Compliance Risk Guard</h4>
              <p className="text-sm text-text-secondary leading-relaxed">
                Flags contradictory delivery tracking details, legal litigation threats, or GDPR security violations instantly, rating entries as low, medium, or high risk.
              </p>
            </div>
          </div>
          <div className="flex gap-5">
            <div className="w-12 h-12 rounded-xl bg-accent-theme/10 border border-accent-theme/35 flex items-center justify-center text-accent-theme shrink-0">
              <i className="fa-solid fa-user-check text-lg"></i>
            </div>
            <div>
              <h4 className="text-lg font-bold text-text-primary mb-3">Human-in-the-Loop Approval</h4>
              <p className="text-sm text-text-secondary leading-relaxed">
                Gives human supervisors complete control to review, edit, override, and manually note justifications before logging resolved tickets into audit trails.
              </p>
            </div>
          </div>
        </section>

        {/* intake modal trigger from landing */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/75 backdrop-filter backdrop-blur-md flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="w-full max-w-xl rounded-3xl bg-bg-panel-heavy border border-border-theme p-8 shadow-2xl glow-accent relative">
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-5 right-5 text-text-secondary hover:text-text-primary cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>

              <h3 className="text-xl font-extrabold text-text-primary mb-2">File Customer Support Ticket</h3>
              <p className="text-sm text-text-secondary mb-6">Simulate a customer sending an email inquiry to test your agents.</p>

              <form onSubmit={handleNewTicketSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest block">Customer Name</label>
                    <input
                      type="text"
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-bg-base/70 border border-border-theme focus:outline-none focus:border-accent-theme text-sm text-text-primary transition-all"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest block">Email Address</label>
                    <input
                      type="email"
                      value={newCustEmail}
                      onChange={(e) => setNewCustEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-bg-base/70 border border-border-theme focus:outline-none focus:border-accent-theme text-sm text-text-primary transition-all"
                      placeholder="e.g. john@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest block">Subject</label>
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-bg-base/70 border border-border-theme focus:outline-none focus:border-accent-theme text-sm text-text-primary transition-all"
                    placeholder="e.g. Refund for damaged product"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest block">Support Message Body</label>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    required
                    rows={5}
                    className="w-full p-4 rounded-xl bg-bg-base/70 border border-border-theme focus:outline-none focus:border-accent-theme text-sm text-text-primary resize-none leading-relaxed transition-all"
                    placeholder="Type out what customer is saying..."
                  />
                </div>

                <div className="flex gap-4 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 rounded-xl border border-border-theme hover:bg-bg-base text-sm font-bold text-text-secondary transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={newSubmitting}
                    className="flex-1 py-3 rounded-xl bg-accent-theme hover:bg-accent-theme-hover text-slate-950 shadow-lg shadow-accent-theme-glow text-sm font-bold active:scale-97 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {newSubmitting ? (
                      <>
                        <i className="fa-solid fa-spinner animate-spin"></i>
                        Filing Ticket...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-paper-plane"></i>
                        Submit to Queue
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    } />
    
    <Route path="/console" element={
      <div className="flex h-screen w-screen overflow-hidden bg-bg-base text-text-primary transition-colors duration-300">
        
        {/* Sidebar Component */}
        <Sidebar 
          tickets={tickets} 
          isMockMode={isMockMode} 
          onNewTicketClick={() => setShowModal(true)} 
          onBackToHome={() => navigate('/')}
          onSettingsClick={() => setShowSettingsModal(true)}
        />

       {/* Ticket Queue Component */}
      <TicketQueue 
        tickets={tickets} 
        selectedTicket={selectedTicket} 
        onSelectTicket={handleSelectTicket} 
        width={queueWidth}
      />

      {/* Vertical Resizer between Ticket Queue and Center Console */}
      <div 
        onMouseDown={startResizeQueue}
        className="w-[4px] hover:w-[6px] active:w-[6px] h-full cursor-col-resize bg-border-theme/40 hover:bg-accent-theme active:bg-accent-theme transition-all shrink-0 z-20"
        title="Drag to resize panels"
      />

      {/* Central Pipeline Console Visuals */}
      {selectedTicket ? (
        <PipelineConsole 
          logs={logs} 
          isProcessing={isProcessing} 
          onStartPipeline={selectedTicket.status !== 'Resolved' ? handleStartPipeline : null} 
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-text-secondary bg-bg-base/30">
          <i className="fa-solid fa-envelope-open-text text-4xl mb-4 text-text-secondary/40"></i>
          <p className="text-sm font-bold uppercase tracking-widest text-text-secondary">No ticket loaded</p>
        </div>
      )}

      {/* Vertical Resizer between Center Console and Response Editor */}
      {selectedTicket && (
        <div 
          onMouseDown={startResizeEditor}
          className="w-[4px] hover:w-[6px] active:w-[6px] h-full cursor-col-resize bg-border-theme/40 hover:bg-accent-theme active:bg-accent-theme transition-all shrink-0 z-20"
          title="Drag to resize panels"
        />
      )}

      {/* Right Column: Response Editor and Risk Panel */}
      {selectedTicket && (
        <ResponseEditor 
          ticket={selectedTicket}
          draftReply={selectedTicket.draft_reply}
          riskScore={selectedTicket.risk_score}
          riskReasons={selectedTicket.risk_reasons}
          isProcessing={isProcessing}
          onApprove={handleApproveResolution}
          width={editorWidth}
        />
      )}

      {/* Slide-in Intake Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/75 backdrop-filter backdrop-blur-md flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="w-full max-w-xl rounded-3xl bg-bg-panel-heavy border border-border-theme p-8 shadow-2xl glow-accent relative">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-text-secondary hover:text-text-primary cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>

            <h3 className="text-xl font-extrabold text-text-primary mb-2">File Customer Support Ticket</h3>
            <p className="text-sm text-text-secondary mb-6">Simulate a customer sending an email inquiry to test your agents.</p>

            <form onSubmit={handleNewTicketSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest block">Customer Name</label>
                  <input
                    type="text"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-bg-base/70 border border-border-theme focus:outline-none focus:border-accent-theme text-sm text-text-primary transition-all"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest block">Email Address</label>
                  <input
                    type="email"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-bg-base/70 border border-border-theme focus:outline-none focus:border-accent-theme text-sm text-text-primary transition-all"
                    placeholder="e.g. john@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest block">Subject</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-bg-base/70 border border-border-theme focus:outline-none focus:border-accent-theme text-sm text-text-primary transition-all"
                  placeholder="e.g. Refund for damaged product"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest block">Support Message Body</label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  required
                  rows={5}
                  className="w-full p-4 rounded-xl bg-bg-base/70 border border-border-theme focus:outline-none focus:border-accent-theme text-sm text-text-primary resize-none leading-relaxed transition-all"
                  placeholder="Type out what customer is saying..."
                />
              </div>

              <div className="flex gap-4 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl border border-border-theme hover:bg-bg-base text-sm font-bold text-text-secondary transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newSubmitting}
                  className="flex-1 py-3 rounded-xl bg-accent-theme hover:bg-accent-theme-hover text-slate-950 shadow-lg shadow-accent-theme-glow text-sm font-bold active:scale-97 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {newSubmitting ? (
                    <>
                      <i className="fa-solid fa-spinner animate-spin"></i>
                      Filing Ticket...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane"></i>
                      Submit to Queue
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-in Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/75 backdrop-filter backdrop-blur-md flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="w-full max-w-md rounded-3xl bg-bg-panel-heavy border border-border-theme p-8 shadow-2xl glow-accent relative">
            <button 
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-5 right-5 text-text-secondary hover:text-text-primary cursor-pointer transition-all"
            >
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>

            <h3 className="text-xl font-extrabold text-text-primary mb-2 flex items-center gap-2">
              <i className="fa-solid fa-sliders text-accent-theme"></i>
              Console Settings
            </h3>
            <p className="text-sm text-text-secondary mb-6">Customize your co-pilot operational parameters.</p>

            <div className="space-y-5">
              {/* Setting 1: Theme Selector */}
              <div className="flex items-center justify-between p-4 bg-bg-base/40 rounded-2xl border border-border-theme">
                <div>
                  <span className="text-sm font-bold text-text-primary block">Color Theme Mode</span>
                  <span className="text-xs text-text-secondary mt-0.5 block">Toggle Light or Dark interface style.</span>
                </div>
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="px-4 py-2.5 rounded-xl bg-bg-panel border border-border-theme text-xs font-bold text-text-primary cursor-pointer hover:border-accent-theme/30 active:scale-95 transition-all flex items-center gap-2"
                >
                  {theme === 'dark' ? (
                    <>
                      <i className="fa-solid fa-sun text-amber-500"></i>
                      Light Mode
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-moon text-amber-500"></i>
                      Dark Mode
                    </>
                  )}
                </button>
              </div>

              {/* Setting 2: Autonomous Auto-Trigger Pipeline */}
              <div className="flex items-center justify-between p-4 bg-bg-base/40 rounded-2xl border border-border-theme">
                <div className="pr-4 min-w-0">
                  <span className="text-sm font-bold text-text-primary block">Autonomous Auto-Trigger</span>
                  <span className="text-xs text-text-secondary mt-0.5 block">AI Agents run instantly when a new ticket is submitted.</span>
                </div>
                <button
                  onClick={() => setAutoTrigger(!autoTrigger)}
                  className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoTrigger ? 'bg-accent-theme' : 'bg-border-theme/80'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-slate-950 shadow-md ring-0 transition duration-200 ease-in-out ${autoTrigger ? 'translate-x-5.5' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-border-theme">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-full py-3 bg-accent-theme hover:bg-accent-theme-hover text-slate-950 font-bold rounded-xl shadow-lg shadow-accent-theme-glow text-sm active:scale-97 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-check"></i>
                Save & Apply Settings
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    } />
  </Routes>
  );
}
