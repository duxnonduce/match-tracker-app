'use client';

/**
 * Modale di conferma riutilizzabile — sostituisce confirm()/alert() del
 * browser per le azioni delicate (soldi, cancellazioni).
 */
export default function ConfirmDialog({ open, title, children, confirmLabel = 'Conferma', danger = false, onConfirm, onCancel, busy = false, confirmDisabled = false }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="card modal-box" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        <div>{children}</div>
        <div className="row" style={{ gap: 8, marginTop: 18 }}>
          <button className="btn secondary" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Annulla</button>
          <button
            className={danger ? 'btn danger' : 'btn'}
            style={{ flex: 1, ...(danger ? { background: 'var(--danger)', color: '#2a0f08', border: 'none' } : {}) }}
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
          >
            {busy ? 'Attendere…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
