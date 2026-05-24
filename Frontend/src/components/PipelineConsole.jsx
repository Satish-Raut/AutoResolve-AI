import React, { useState } from 'react';

export default function PipelineConsole({ logs, isProcessing, onStartPipeline }) {
  const [expandedLog, setExpandedLog] = useState(null);

  const agents = [
    { name: 'Ticket Classifier', displayName: 'Ticket Classifier', icon: 'fa-tags', color: 'indigo' },
    { name: 'Policy RAG Retriever', displayName: 'Policy RAG', icon: 'fa-book-open', color: 'cyan' },
    { name: 'Resolution Suggester', displayName: 'Resolution Suggester', icon: 'fa-brain', color: 'emerald' },
    { name: 'Risk Auditor', displayName: 'Risk Auditor', icon: 'fa-shield-halved', color: 'amber' },
    { name: 'Response Writer', displayName: 'Response Writer', icon: 'fa-pen-nib', color: 'pink' }
  ];

  const getAgentStatus = (agentName) => {
    const step = [...logs].reverse().find(l => l.agent_name === agentName);
    if (!step) return 'idle';
    return step.status; // "Processing", "Success", "Error"
  };

  const getAgentPayload = (agentName) => {
    const step = [...logs].reverse().find(l => l.agent_name === agentName);
    return step ? step.payload : null;
  };

  const toggleExpandLog = (idx) => {
    setExpandedLog(expandedLog === idx ? null : idx);
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
      {/* Node Map Panel */}
      <div className="p-6 rounded-2xl bg-bg-panel border border-border-theme glass-panel transition-all duration-300">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-border-theme/40">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-extrabold text-text-primary tracking-wider uppercase whitespace-nowrap">Multi-Agent Assembly Pipeline</h3>
            <span className="text-[10px] bg-accent-theme/10 text-accent-theme border border-accent-theme/20 px-2.5 py-0.5 rounded-full font-bold tracking-wider">
              AUTONOMOUS
            </span>
          </div>
          {onStartPipeline && (
            <button
              onClick={onStartPipeline}
              disabled={isProcessing}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
                isProcessing
                  ? 'bg-accent-theme/10 text-accent-theme border border-accent-theme/35 cursor-not-allowed shadow-md shadow-accent-theme-glow/30 animate-pulse'
                  : 'bg-accent-theme hover:bg-accent-theme-hover text-slate-950 shadow-lg shadow-accent-theme-glow'
              }`}
            >
              {isProcessing ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin text-accent-theme"></i>
                  Orchestrating...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-play"></i>
                  Process with AI Agents
                </>
              )}
            </button>
          )}
        </div>

        {/* Horizontal Node Pipeline */}
        <div className="relative flex justify-between items-center px-4 mt-8 mb-4">
          {/* Connector Line Background with live glowing laser-flow stream animation during processing */}
          <div className={`absolute left-8 right-8 top-[23px] h-[3px] -z-10 transition-all duration-500 rounded-full ${
            isProcessing 
              ? 'animate-flow-stream shadow-[0_0_12px_rgba(234,179,8,0.4)]' 
              : 'bg-border-theme/60'
          }`}></div>

          {agents.map((agent, index) => {
            const status = getAgentStatus(agent.name);
            const payload = getAgentPayload(agent.name);
            
            let nodeClass = 'border-border-theme bg-bg-base text-text-secondary';
            let iconClass = 'text-text-secondary';
            let pulseClass = '';

            if (status === 'Processing') {
              nodeClass = 'border-accent-theme bg-accent-theme/15 text-accent-theme shadow-lg shadow-accent-theme-glow';
              iconClass = 'text-accent-theme';
              pulseClass = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-theme opacity-20';
            } else if (status === 'Success') {
              nodeClass = 'border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-lg shadow-emerald-500/15';
              iconClass = 'text-emerald-500';
            } else if (status === 'Error') {
              nodeClass = 'border-rose-500 bg-rose-500/10 text-rose-500 shadow-lg shadow-rose-500/15';
              iconClass = 'text-rose-450';
            }

            return (
              <div key={agent.name} className="flex flex-col items-center relative group">
                {/* Visual Node circle wrapper */}
                <div className="relative w-12 h-12 mb-2">
                  <span className={pulseClass}></span>
                  <div className={`w-full h-full rounded-full border-2 flex items-center justify-center transition-all duration-300 relative z-10 ${nodeClass}`}>
                    {status === 'Success' ? (
                      <i className="fa-solid fa-check text-base"></i>
                    ) : status === 'Error' ? (
                      <i className="fa-solid fa-triangle-exclamation text-base"></i>
                    ) : status === 'Processing' ? (
                      <i className="fa-solid fa-spinner animate-spin text-base"></i>
                    ) : (
                      <i className={`fa-solid ${agent.icon} text-base ${iconClass}`}></i>
                    )}
                  </div>
                </div>

                {/* Node Label */}
                <span className={`text-[9px] font-extrabold tracking-wider text-center max-w-[64px] leading-tight mt-1 ${
                  status === 'Processing' ? 'text-accent-theme' : status === 'Success' ? 'text-emerald-500' : 'text-text-secondary'
                }`}>
                  {agent.displayName.split(' ')[0]} <br /> {agent.displayName.split(' ')[1] || ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Terminal Output Logs (Styled as a premium developer console - dark matte) */}
      <div className="flex-1 flex flex-col rounded-2xl bg-[#0f0f12] border border-border-theme overflow-hidden shadow-inner shadow-black/80 transition-all duration-300">
        <div className="bg-[#15151b] px-5 py-3.5 border-b border-border-theme flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/60"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/60"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/60"></span>
          </div>
          <span className="text-xs text-slate-500 font-bold font-mono tracking-widest ml-4">
            CONSOLE_OUTPUT // AGENT_ORCHESTRATOR_STREAM
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 font-mono text-sm space-y-4 scrollbar-thin">
          {logs.map((step, idx) => {
            const isSuccess = step.status === 'Success';
            const isError = step.status === 'Error';
            const isExpanded = expandedLog === idx;

            return (
              <div key={idx} className="border-b border-border-theme/40 pb-3">
                <div
                  onClick={() => step.payload && toggleExpandLog(idx)}
                  className={`flex items-start gap-4 transition-colors ${
                    step.payload ? 'cursor-pointer hover:bg-slate-900/40 p-2 rounded-lg' : ''
                  }`}
                >
                  <span className="text-slate-500 select-none">[{step.timestamp}]</span>
                  
                  {isSuccess ? (
                    <span className="text-emerald-400 font-bold">[OK]</span>
                  ) : isError ? (
                    <span className="text-rose-400 font-bold">[ERR]</span>
                  ) : (
                    <span className="text-accent-theme animate-pulse font-bold">[RUN]</span>
                  )}

                  <span className={isSuccess ? 'text-slate-200' : 'text-slate-400'}>
                    <strong className="text-slate-100 font-semibold">{step.agent_name}</strong>: {step.message}
                  </span>

                  {step.payload && (
                    <span className="text-xs bg-slate-900 text-slate-300 px-2.5 py-1 rounded ml-auto flex items-center gap-1.5 hover:bg-slate-800 font-bold border border-border-theme/40">
                      <i className={`fa-solid ${isExpanded ? 'fa-eye-slash' : 'fa-eye'} text-[10px]`}></i>
                      {isExpanded ? 'Hide Payload' : 'Inspect JSON'}
                    </span>
                  )}
                </div>

                {/* Inspect Payload Panel */}
                {isExpanded && step.payload && (
                  <pre className="mt-3 p-5 rounded-2xl bg-[#141418] border border-border-theme/50 text-xs text-yellow-400 overflow-x-auto max-w-full font-mono shadow-inner shadow-black/40 leading-relaxed">
                    {JSON.stringify(step.payload, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}

          {logs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 text-center">
              <i className="fa-solid fa-terminal text-3xl mb-3 text-slate-800"></i>
              <p className="text-xs font-bold tracking-widest text-slate-700 uppercase">System Ready</p>
              <p className="text-sm text-slate-550 mt-2 max-w-xs leading-normal">Select a ticket and click 'Process with AI Agents' to begin pipeline execution.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
