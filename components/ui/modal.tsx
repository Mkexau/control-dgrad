'use client';

// =============================================================================
// DGRAD CONTROLE - SYSTÈME MODAL UNIFIÉ & DIALOGUE INSTITUTIONNEL
// =============================================================================

import React, { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

function emptySubscribe() {
  return () => {};
}

function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  ariaLabel?: string;
  className?: string;
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  ariaLabel,
  className = '',
}: ModalProps) {
  const isClient = useIsClient();
  const titleId = useId();
  const descId = useId();
  const modalBoxRef = useRef<HTMLDivElement>(null);

  // Verrouillage du scroll du body et gestion clavier Escape
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen || !isClient || typeof document === 'undefined') {
    return null;
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && closeOnOverlayClick) {
          onClose();
        }
      }}
      role="presentation"
      data-testid="modal-backdrop"
    >
      <div
        ref={modalBoxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        aria-label={!title ? ariaLabel || 'Boîte de dialogue' : undefined}
        className={`relative w-full my-auto ${sizeClasses[size]} bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all text-slate-900 dark:text-zinc-100 ${className}`}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* EN-TÊTE DE LA MODALE */}
        {(title || showCloseButton) && (
          <div className="px-6 py-4.5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/50 shrink-0">
            <div className="min-w-0 pr-4">
              {title && (
                <h2
                  id={titleId}
                  className="text-base font-bold text-slate-900 dark:text-zinc-100 tracking-tight truncate"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
                aria-label="Fermer la boîte de dialogue"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* CORPS DE LA MODALE (DÉFILABLE) */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-8rem)] text-sm">
          {children}
        </div>

        {/* PIED DE MODALE OPTIONNEL */}
        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-900/30 shrink-0 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  size?: 'sm' | 'md';
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  isDestructive = false,
  isLoading = false,
  size = 'sm',
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-500'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
            }`}
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>{confirmLabel}</span>
          </button>
        </>
      }
    >
      <div className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
        {message}
      </div>
    </Modal>
  );
}
