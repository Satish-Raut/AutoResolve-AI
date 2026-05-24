import React, { useState, useEffect } from 'react';

export default function ResponseEditor({ ticket, draftReply, riskScore, riskReasons, isProcessing, onApprove, width }) {
  const [editedDraft, setEditedDraft] = useState(draftReply || '');
  const [auditNotes, setAuditNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    setEditedDraft(draftReply || '');
    setIsSuccess(false);
    setAuditNotes('');
  }, [draftReply, ticket.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editedDraft) return;

    setSubmitting(true);
    try {
      await onApprove({
        draft_reply: editedDraft,
        risk_score: riskScore,
        notes: auditNotes || 'Approved with standard agent validation.'
      });
      setIsSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getRiskBadgeColor = (score) => {
    switch (score) {
      case 'High': return 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/30 glow-rose';
      case 'Medium': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 glow-amber';
      default: return 'bg-accent-theme/10 text-accent-theme border border-accent-theme/30 glow-amber';
    }
  };

  if (isSuccess) {
    return (
      <div 
        style={{ width: width ? `${width}px` : '320px' }}
        className="shrink-0 bg-bg-panel border-l border-border-theme p-5 flex flex-col items-center justify-center text-center h-full animate-fade-in transition-all duration-300"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-950/50 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mb-5 shadow-lg shadow-emerald-500/15 animate-bounce">
          <i className="fa-solid fa-paper-plane text-xl"></i>
        </div>
        <h3 className="text-xl font-bold text-text-primary mb-2">Resolution Dispatched!</h3>
        <p className="text-sm text-text-secondary max-w-xs mb-6 leading-relaxed">
          The email reply has been sent to <span className="text-text-primary font-semibold">{ticket.customer_email}</span> and the transaction has been recorded in the secure audit log database.
        </p>
        <span className="text-xs font-mono bg-bg-base border border-border-theme text-text-secondary px-4 py-2 rounded-full uppercase tracking-wider">
          AUDIT_LOG_FILE // CLOSED_SECURELY
        </span>
      </div>
    );
  }

  return (
    <div 
      style={{ width: width ? `${width}px` : '320px' }}
      className="shrink-0 bg-bg-panel border-l border-border-theme p-5 flex flex-col h-full overflow-y-auto transition-all duration-300"
    >
      <div className="border-b border-border-theme pb-5 mb-5">
        <h2 className="text-xl font-extrabold text-text-primary tracking-wide">Human Review & Approval</h2>
        <p className="text-xs text-text-secondary mt-1.5">Review the AI proposed solution, verify risk profiles, and approve dispatch.</p>
      </div>

      {/* Message and original context */}
      <div className="flex-1 space-y-6">
        {/* Ticket Details Panel */}
        <div className="p-4 bg-bg-base/50 border border-border-theme rounded-xl text-sm leading-relaxed">
          <h4 className="font-bold text-text-primary mb-2 tracking-wide uppercase text-xs">Original Message Context</h4>
          <p className="text-text-secondary italic">"{ticket.message}"</p>
        </div>

        {/* Risk Audit Alert Banner */}
        <div className={`p-4 rounded-xl border flex flex-col gap-2 ${getRiskBadgeColor(riskScore)}`}>
          <div className="flex items-center gap-2">
            <i className={`fa-solid ${riskScore === 'High' ? 'fa-triangle-exclamation' : riskScore === 'Medium' ? 'fa-shield-halved' : 'fa-circle-check'} text-sm`}></i>
            <span className="text-xs font-extrabold uppercase tracking-widest">
              Compliance Risk Profile: {riskScore || 'Low'}
            </span>
          </div>

          {riskReasons && riskReasons.length > 0 ? (
            <ul className="text-xs space-y-1.5 mt-1.5 text-text-primary list-disc pl-4 leading-normal font-medium">
              {riskReasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-text-primary leading-relaxed font-medium">
              No suspicious fraud patterns, financial liabilities, or database security flags detected for this resolution.
            </p>
          )}
        </div>

        {/* The Response Editor Text Area */}
        {draftReply ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest block">
                Drafted Email Reply (Editable)
              </label>
              <textarea
                value={editedDraft}
                onChange={(e) => setEditedDraft(e.target.value)}
                rows={11}
                className="w-full p-4 rounded-xl bg-bg-base/70 border border-border-theme text-sm text-text-primary focus:outline-none focus:border-accent-theme transition-colors resize-none leading-relaxed font-sans shadow-inner shadow-black/5"
                placeholder="No response drafted yet."
                required
              />
            </div>

            {/* Human Override Notes */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest block">
                Supervisor Override / Audit Notes
              </label>
              <input
                type="text"
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-bg-base/70 border border-border-theme text-sm text-text-primary focus:outline-none focus:border-accent-theme transition-colors"
                placeholder="e.g. Order matched original payment method, approved return."
              />
            </div>

            {/* Action buttons */}
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer ${
                riskScore === 'High'
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
              }`}
            >
              {submitting ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin"></i>
                  Dispatching...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane"></i>
                  {riskScore === 'High' ? 'Override and Approve' : 'Approve & Send Email'}
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center text-text-secondary">
            <i className="fa-solid fa-pen-nib text-4xl mb-4 text-text-secondary/30 animate-pulse"></i>
            <p className="text-sm font-bold tracking-widest text-text-secondary uppercase">Awaiting Draft</p>
            <p className="text-xs text-text-secondary max-w-xs mt-2 leading-relaxed">Once the multi-agent pipeline finishes executing, the drafted email draft will appear here for audit editing.</p>
          </div>
        )}
      </div>
    </div>
  );
}
