import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useNotifyStore } from '../../store/useNotifyStore';

export default function ErrorToast() {
  const { message, type, clear } = useNotifyStore();
  if (!message) return null;

  const isSuccess = type === 'success';

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-md flex items-start gap-3 rounded-lg px-4 py-3 shadow-lg border transition-all ${
        isSuccess
          ? 'bg-emerald-950 border-emerald-700 text-emerald-100'
          : 'bg-red-950 border-red-800 text-red-100'
      }`}
    >
      {isSuccess
        ? <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        : <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
      }
      <p className="text-sm flex-1 break-words">{message}</p>
      <button onClick={clear} className={`${isSuccess ? 'text-emerald-300 hover:text-white' : 'text-red-300 hover:text-white'}`} aria-label="Cerrar">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
