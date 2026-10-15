import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import Modal from '../ui/Modal';
import type { Quote } from '../../types';
import { createQuotePdf, quoteFileName } from '../../utils/quotePdf';

// ─── Visor de la cotización en PDF ────────────────────────────────────────────

export function QuotePreviewModal({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const [pdfUrl, setPdfUrl] = useState('');

  useEffect(() => {
    let url = '';
    let cancelled = false;
    createQuotePdf(quote).then((doc) => {
      if (cancelled) return;
      url = URL.createObjectURL(doc.output('blob'));
      setPdfUrl(url);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [quote]);

  return (
    <Modal isOpen onClose={onClose} title={`Cotización ${quote.quoteNumber}`} size="xl">
      {pdfUrl ? (
        <iframe src={pdfUrl} title={`Cotización ${quote.quoteNumber}`} className="w-full h-[65vh] rounded-lg bg-white" />
      ) : (
        <div className="h-[65vh] flex items-center justify-center text-slate-400 text-sm animate-pulse">Generando PDF...</div>
      )}
      <div className="flex justify-end gap-3 mt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">Cerrar</button>
        {pdfUrl && (
          <a href={pdfUrl} download={quoteFileName(quote)} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium">
            <Download className="w-4 h-4" /> Descargar PDF
          </a>
        )}
      </div>
    </Modal>
  );
}
