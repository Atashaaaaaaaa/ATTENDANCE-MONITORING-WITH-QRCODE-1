"use client";
import { useEffect, useRef, useCallback } from "react";

/**
 * MobileDetailModal — A reusable, accessible modal for displaying details on mobile.
 *
 * Props:
 *   isOpen      — boolean, whether the modal is visible
 *   onClose     — function, called to close the modal
 *   title       — string, modal heading
 *   subtitle    — string (optional), secondary heading text
 *   children    — ReactNode, modal body content
 *   actions     — ReactNode (optional), rendered at the bottom of the modal (buttons)
 *
 * Accessibility:
 *   - role="dialog", aria-modal="true"
 *   - Escape key closes the modal
 *   - Focus trap: Tab cycles within the modal
 *   - Overlay click closes the modal
 */
export default function MobileDetailModal({ isOpen, onClose, title, subtitle, children, actions }) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Focus trap
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose]
  );

  // Manage focus and body scroll lock
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleKeyDown);

      // Auto-focus the close button after render
      setTimeout(() => {
        if (modalRef.current) {
          const closeBtn = modalRef.current.querySelector("[data-modal-close]");
          if (closeBtn) closeBtn.focus();
        }
      }, 100);
    }

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      // Restore previous focus
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="mdm-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mdm-title"
    >
      <div
        className="mdm-container"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mdm-header">
          <div className="mdm-header-text">
            <h3 id="mdm-title" className="mdm-title">{title}</h3>
            {subtitle && <p className="mdm-subtitle">{subtitle}</p>}
          </div>
          <button
            data-modal-close
            className="mdm-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="mdm-body">
          {children}
        </div>

        {/* Actions Footer */}
        {actions && (
          <div className="mdm-actions">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Helper sub-component: renders a label–value detail row inside the modal.
 *
 * Usage:
 *   <MobileDetailModal.Field label="Email" value="user@email.com" />
 */
MobileDetailModal.Field = function ModalField({ label, value, badge, badgeStyle }) {
  return (
    <div className="mdm-field">
      <span className="mdm-field-label">{label}</span>
      {badge ? (
        <span className="mdm-field-badge" style={badgeStyle || {}}>
          {value}
        </span>
      ) : (
        <span className="mdm-field-value">{value || "—"}</span>
      )}
    </div>
  );
};
