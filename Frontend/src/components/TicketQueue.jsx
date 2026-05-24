import React from 'react';

export default function TicketQueue({ tickets, selectedTicket, onSelectTicket, width }) {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Urgent': return 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/30';
      case 'High': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30';
      case 'Medium': return 'bg-accent-theme/10 text-accent-theme border border-accent-theme/30';
      default: return 'bg-slate-500/10 text-slate-500 dark:text-slate-450 border border-slate-550/30';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Resolved': return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      case 'Processing': return 'bg-accent-theme/15 text-accent-theme border border-accent-theme/20 animate-pulse';
      case 'Failed': return 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/20';
      default: return 'bg-bg-base text-text-secondary border border-border-theme';
    }
  };

  const getSentimentEmoji = (sentiment) => {
    switch (sentiment) {
      case 'Angry': return '😡';
      case 'Frustrated': return '😟';
      case 'Happy': return '😊';
      default: return '😐';
    }
  };

  return (
    <div 
      style={{ width: width ? `${width}px` : '288px' }}
      className="shrink-0 bg-bg-panel border-r border-border-theme flex flex-col h-full transition-all duration-300"
    >
      <div className="p-5 border-b border-border-theme flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-text-primary tracking-wide">Inbox Tickets</h2>
        <span className="text-xs bg-bg-base text-text-secondary px-3 py-1 rounded-full border border-border-theme font-extrabold tracking-wider">
          {tickets.length} ACTIVE
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tickets.map(ticket => {
          const isSelected = selectedTicket && selectedTicket.id === ticket.id;
          return (
            <div
              key={ticket.id}
              onClick={() => onSelectTicket(ticket)}
              className={`p-5 rounded-2xl transition-all duration-300 cursor-pointer border relative overflow-hidden group ${
                isSelected
                  ? 'bg-bg-base border-accent-theme shadow-md shadow-accent-theme-glow'
                  : 'bg-bg-panel/40 border-border-theme hover:bg-bg-base/50 hover:border-accent-theme/40'
              }`}
            >
              {/* Card Header */}
              <div className="flex justify-between items-center gap-2 mb-3">
                <span className="text-xs font-bold text-text-secondary/70 tracking-widest font-mono">
                  {ticket.id}
                </span>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${getStatusBadge(ticket.status)}`}>
                  {ticket.status}
                </span>
              </div>

              {/* Subject */}
              <h4 className="text-base font-extrabold text-text-primary group-hover:text-accent-theme transition-colors line-clamp-1 mb-2">
                {ticket.subject}
              </h4>

              {/* Message Snippet */}
              <p className="text-sm text-text-secondary line-clamp-2 mb-4 leading-relaxed">
                {ticket.message}
              </p>

              {/* Card Footer tags */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
                
                {ticket.category !== 'Unclassified' && (
                  <span className="text-[11px] bg-bg-base text-text-primary px-2.5 py-0.5 rounded-full border border-border-theme font-bold">
                    {ticket.category}
                  </span>
                )}

                <span className="text-sm ml-auto" title={`Sentiment: ${ticket.sentiment}`}>
                  {getSentimentEmoji(ticket.sentiment)}
                </span>
              </div>

              {/* Indicator bar */}
              {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-accent-theme"></div>
              )}
            </div>
          );
        })}

        {tickets.length === 0 && (
          <div className="text-center py-16">
            <i className="fa-solid fa-folder-open text-text-secondary text-4xl mb-4 block"></i>
            <p className="text-sm text-text-secondary">No support tickets found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
