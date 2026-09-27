export default function Modal({ title, onClose, onConfirm, confirmLabel = 'Save', children, hideFooter }) {
  return (
    <div className="modalbg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="mh">
          <h3>{title}</h3>
          <button onClick={onClose}>×</button>
        </div>
        {!hideFooter ? (
          <form className="modal-form" onSubmit={(event) => { event.preventDefault(); onConfirm?.(); }}>
            <div className="mb">{children}</div>
            <div className="mf">
              <button type="button" className="btn gh" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn">{confirmLabel}</button>
            </div>
          </form>
        ) : <div className="mb">{children}</div>}
      </div>
    </div>
  );
}
