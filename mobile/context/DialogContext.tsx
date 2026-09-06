import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { AppDialog, type AppDialogTone } from '@/components/AppDialog';
import { BlurOverlayProvider } from '@/context/BlurOverlayContext';

export type ShowAlertOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  tone?: AppDialogTone;
};

export type ShowConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: AppDialogTone;
  destructive?: boolean;
  /** Emphasize Cancel as the solid primary CTA (safer choice). */
  safePrimary?: boolean;
  onConfirm: () => void | Promise<void>;
  /** Called when Cancel / close / backdrop is used (optional). */
  onCancel?: () => void | Promise<void>;
};

type DialogContextValue = {
  showAlert: (options: ShowAlertOptions) => void;
  showConfirm: (options: ShowConfirmOptions) => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

type DialogState =
  | ({ mode: 'alert' } & ShowAlertOptions)
  | ({ mode: 'confirm' } & ShowConfirmOptions)
  | null;

let imperativeApi: DialogContextValue | null = null;

/** Imperative alerts for non-React modules. Prefer useDialog() in components. */
export function showAppAlert(title: string, message?: string, tone: AppDialogTone = 'info') {
  if (!imperativeApi) {
    console.warn('[Dialog] showAppAlert called before DialogProvider mounted');
    return;
  }
  imperativeApi.showAlert({ title, message, tone });
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<DialogState>(null);
  const busyRef = useRef(false);

  const close = useCallback(() => {
    busyRef.current = false;
    setDialog(null);
  }, []);

  const showAlert = useCallback((options: ShowAlertOptions) => {
    setDialog({ mode: 'alert', ...options });
  }, []);

  const showConfirm = useCallback((options: ShowConfirmOptions) => {
    setDialog({ mode: 'confirm', ...options });
  }, []);

  const value = useMemo(() => ({ showAlert, showConfirm }), [showAlert, showConfirm]);
  imperativeApi = value;

  const onConfirm = async () => {
    if (dialog?.mode !== 'confirm' || busyRef.current) return;
    busyRef.current = true;
    const handler = dialog.onConfirm;
    // Close confirm first so follow-up showAlert/showConfirm from onConfirm can display.
    setDialog(null);
    try {
      await handler();
    } finally {
      busyRef.current = false;
    }
  };

  const onClose = async () => {
    if (dialog?.mode === 'confirm' && dialog.onCancel && !busyRef.current) {
      busyRef.current = true;
      const handler = dialog.onCancel;
      setDialog(null);
      try {
        await handler();
      } finally {
        busyRef.current = false;
      }
      return;
    }
    close();
  };

  return (
    <DialogContext.Provider value={value}>
      <BlurOverlayProvider
        overlay={
          <AppDialog
            visible={Boolean(dialog)}
            title={dialog?.title || ''}
            message={dialog?.message}
            tone={dialog?.tone || (dialog?.mode === 'confirm' ? 'warning' : 'info')}
            confirmLabel={dialog?.confirmLabel || t('common.ok')}
            cancelLabel={
              dialog?.mode === 'confirm' ? dialog.cancelLabel || t('common.cancel') : undefined
            }
            destructive={dialog?.mode === 'confirm' ? Boolean(dialog.destructive) : false}
            safePrimary={dialog?.mode === 'confirm' ? Boolean(dialog.safePrimary) : false}
            onConfirm={dialog?.mode === 'confirm' ? onConfirm : undefined}
            onClose={onClose}
          />
        }>
        {children}
      </BlurOverlayProvider>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
}
