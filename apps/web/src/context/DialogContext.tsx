import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X } from 'lucide-react';

export type DialogType = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: DialogType;
  badge?: string;
}

export interface AlertOptions {
  title?: string;
  message: string;
  confirmText?: string;
  type?: DialogType;
  badge?: string;
}

interface DialogState {
  isOpen: boolean;
  mode: 'confirm' | 'alert';
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: DialogType;
  badge: string;
}

interface DialogContextValue {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  alert: (options: AlertOptions | string) => Promise<void>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    mode: 'confirm',
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'info',
    badge: '',
  });

  const resolverRef = useRef<((value: any) => void) | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  const confirm = (options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      if (typeof options === 'string') {
        setDialogState({
          isOpen: true,
          mode: 'confirm',
          title: 'Confirmation Required',
          message: options,
          confirmText: 'Confirm',
          cancelText: 'Cancel',
          type: 'danger',
          badge: 'SYS.CONFIRM',
        });
      } else {
        setDialogState({
          isOpen: true,
          mode: 'confirm',
          title: options.title || (options.type === 'danger' ? 'Confirm Action' : 'Confirmation Required'),
          message: options.message,
          confirmText: options.confirmText || (options.type === 'danger' ? 'Delete' : 'Confirm'),
          cancelText: options.cancelText || 'Cancel',
          type: options.type || 'danger',
          badge: options.badge || (options.type === 'danger' ? 'SYS.DANGER' : 'SYS.CONFIRM'),
        });
      }
    });
  };

  const alert = (options: AlertOptions | string): Promise<void> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      if (typeof options === 'string') {
        setDialogState({
          isOpen: true,
          mode: 'alert',
          title: 'System Notice',
          message: options,
          confirmText: 'Acknowledge',
          cancelText: '',
          type: 'warning',
          badge: 'SYS.ALERT',
        });
      } else {
        setDialogState({
          isOpen: true,
          mode: 'alert',
          title: options.title || 'System Notification',
          message: options.message,
          confirmText: options.confirmText || 'Acknowledge',
          cancelText: '',
          type: options.type || 'info',
          badge: options.badge || (options.type === 'danger' ? 'SYS.ERROR' : options.type === 'warning' ? 'SYS.WARN' : 'SYS.INFO'),
        });
      }
    });
  };

  const handleConfirm = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  };

  const handleCancel = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  };

  // Keyboard navigation: Enter to confirm, Escape to cancel
  useEffect(() => {
    if (!dialogState.isOpen) return;

    // Focus confirm button when opened
    const timer = setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        // Prevent accidental form submission
        e.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dialogState.isOpen]);

  const getIcon = () => {
    switch (dialogState.type) {
      case 'danger':
        return <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-[#38bdf8] shrink-0" />;
    }
  };

  const getBadgeStyle = () => {
    switch (dialogState.type) {
      case 'danger':
        return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
      case 'warning':
        return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
      case 'success':
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
      case 'info':
      default:
        return 'text-[#38bdf8] border-[#38bdf8]/40 bg-[#38bdf8]/10';
    }
  };

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}

      {dialogState.isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-150 font-sans"
          onClick={handleCancel}
        >
          <div
            className="relative w-full max-w-md glass-panel bg-[#090d16]/95 rounded-2xl p-5 sm:p-6 border border-white/[0.12] shadow-2xl shadow-black/90 flex flex-col space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Titlebar */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 shrink-0">
              <div className="flex items-center space-x-2.5">
                {getIcon()}
                <span className="text-sm font-display font-bold text-white tracking-wide">
                  {dialogState.title}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-semibold ${getBadgeStyle()}`}>
                  {dialogState.badge}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer text-xs transition-colors"
                title="Close dialog (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Box */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs space-y-1 shrink-0">
              <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                {dialogState.message}
              </p>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end space-x-2.5 pt-1">
              {dialogState.mode === 'confirm' && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-white hover:border-white/[0.18] hover:bg-white/[0.08] transition cursor-pointer"
                >
                  {dialogState.cancelText}
                </button>
              )}

              <button
                ref={confirmButtonRef}
                type="button"
                onClick={handleConfirm}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 shadow-glow-sm ${
                  dialogState.type === 'danger'
                    ? 'bg-rose-500/20 border border-rose-500/50 text-rose-200 hover:bg-rose-600 hover:text-white'
                    : 'btn-primary'
                }`}
              >
                <span>{dialogState.confirmText}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};

export const useDialog = (): DialogContextValue => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};
