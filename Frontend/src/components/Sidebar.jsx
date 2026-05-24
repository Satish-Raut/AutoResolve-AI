import React from 'react';
import logoImg from '../assets/logo.png';

export default function Sidebar({ tickets, isMockMode, onNewTicketClick, onBackToHome, onSettingsClick }) {
  const total = tickets.length;
  const pending = tickets.filter(t => t.status === 'Pending' || t.status === 'Processing').length;
  const resolved = tickets.filter(t => t.status === 'Resolved').length;
  const highRisk = tickets.filter(t => t.risk_score === 'High').length;

  return (
    <aside className="w-60 shrink-0 bg-bg-panel border-r border-border-theme flex flex-col justify-between p-5 transition-all duration-300">
      <div>
        {/* Branding Header - Clickable to return to Landing Page */}
        <div 
          onClick={onBackToHome}
          className="flex items-center gap-3 mb-8 cursor-pointer hover:opacity-85 active:scale-98 transition-all"
          title="Return to Landing Page"
        >
          <img 
            src={logoImg} 
            alt="AutoResolve Logo" 
            className="w-11 h-11 rounded-xl object-cover shadow-lg shadow-accent-theme-glow border border-accent-theme/20"
          />
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-text-primary leading-none">AutoResolve</h1>
            <span className="text-[10px] text-accent-theme font-bold tracking-wider uppercase mt-1 block">Co-Pilot Portal</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onNewTicketClick}
          className="w-full py-3.5 mb-4 bg-accent-theme hover:bg-accent-theme-hover active:scale-95 transition-all text-slate-950 font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-accent-theme-glow text-sm cursor-pointer"
        >
          <i className="fa-solid fa-plus text-sm"></i>
          File Customer Ticket
        </button>

        {/* Back to Home Button */}
        <button
          onClick={onBackToHome}
          className="w-full py-3 mb-8 bg-bg-base/60 hover:bg-bg-base hover:text-text-primary transition-all text-text-secondary font-bold rounded-xl flex items-center justify-center gap-2 border border-border-theme text-xs cursor-pointer"
        >
          <i className="fa-solid fa-house text-xs"></i>
          Exit to Product Page
        </button>

        {/* Metrics Grid */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-3">Performance Analytics</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-bg-base/40 rounded-xl border border-border-theme">
              <span className="text-xs text-text-secondary font-bold uppercase tracking-wider block">Total Inbox</span>
              <p className="text-3xl font-extrabold text-text-primary mt-1.5">{total}</p>
            </div>
            <div className="p-4 bg-bg-base/40 rounded-xl border border-border-theme">
              <span className="text-xs text-text-secondary font-bold uppercase tracking-wider block">Active Queue</span>
              <p className="text-3xl font-extrabold text-amber-500 mt-1.5">{pending}</p>
            </div>
            <div className="p-4 bg-bg-base/40 rounded-xl border border-border-theme">
              <span className="text-xs text-text-secondary font-bold uppercase tracking-wider block">Resolved</span>
              <p className="text-3xl font-extrabold text-emerald-500 mt-1.5">{resolved}</p>
            </div>
            <div className="p-4 bg-bg-base/40 rounded-xl border border-border-theme">
              <span className="text-xs text-text-secondary font-bold uppercase tracking-wider block">High Risk</span>
              <p className="text-3xl font-extrabold text-rose-500 mt-1.5">{highRisk}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Bottom Button */}
      <div className="mt-auto">
        <button
          onClick={onSettingsClick}
          className="w-full py-3 bg-bg-base/60 hover:bg-bg-base hover:text-text-primary border border-border-theme transition-all text-text-secondary font-extrabold rounded-xl flex items-center justify-center gap-2.5 text-xs cursor-pointer hover:border-accent-theme/40"
        >
          <i className="fa-solid fa-gear text-sm"></i>
          Console Settings
        </button>
      </div>
    </aside>
  );
}
