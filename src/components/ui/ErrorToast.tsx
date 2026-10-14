import { AlertTriangle, X } from 'lucide-react';
import { useNotifyStore } from '../../store/useNotifyStore';

export default function ErrorToast() {
  const message = useNotifyStore((s) => s.message);
  const clear = useNotifyStore((s) => s.clear);
  if (!message) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md flex items-start gap-3 bg-red-950 border border-red-800 text-red-100 rounded-lg px-4 py-3 shadow-lg">
      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
      <p className="text-sm flex-1 break-words">{message}</p>
      <button onClick={clear} className="text-red-300 hover:text-white" aria-label="Cerrar">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
