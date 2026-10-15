import { useEffect, useState } from 'react';
import { Download, Mail, MessageCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import { FormField, Input } from '../ui/FormElements';
import { APP_NAME } from '../../constants';
import type { Quote } from '../../types';
import { buildQuoteText, createQuotePdf, quoteFileName } from '../../utils/quotePdf';

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

// ─── Compartir por WhatsApp o email ───────────────────────────────────────────

interface ShareProps {
  quote: Quote;
  defaultPhone: string;
  defaultEmail: string;
  onClose: () => void;
  /** Se llama tras abrir WhatsApp o el correo, para que la página marque la cotización como enviada. */
  onShared: (q: Quote) => void;
}

export function QuoteShareModal({ quote, defaultPhone, defaultEmail, onClose, onShared }: ShareProps) {
  const [phone, setPhone] = useState(defaultPhone);
  const [email, setEmail] = useState(defaultEmail);
  const text = buildQuoteText(quote);

  const shareWhatsApp = () => {
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 10) digits = `52${digits}`; // número mexicano sin lada de país
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    onShared(quote);
  };

  const shareEmail = () => {
    const subject = `Cotización ${quote.quoteNumber} - ${APP_NAME}`;
    window.location.href = `mailto:${email.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    onShared(quote);
  };

  const downloadPdf = async () => {
    (await createQuotePdf(quote)).save(quoteFileName(quote));
  };

  return (
    <Modal isOpen onClose={onClose} title={`Enviar ${quote.quoteNumber}`} size="md">
      <div className="space-y-4">
        <FormField label="WhatsApp">
          <div className="flex gap-2">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+52 55 1234 5678" />
            <button onClick={shareWhatsApp} className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors font-medium shrink-0">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
          </div>
        </FormField>
        <FormField label="Email">
          <div className="flex gap-2">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contacto@empresa.com" />
            <button onClick={shareEmail} className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium shrink-0">
              <Mail className="w-4 h-4" /> Email
            </button>
          </div>
        </FormField>
        <p className="text-xs text-slate-500">
          Se envía el resumen de la cotización. Para adjuntar el PDF, descárgalo y agrégalo al mensaje.
          {quote.status === 'draft' && ' Al compartir, la cotización pasará a Enviada.'}
        </p>
        <div className="flex justify-between gap-3 pt-3 border-t border-slate-700">
          <button onClick={downloadPdf} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
            <Download className="w-4 h-4" /> Descargar PDF
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">Cancelar</button>
        </div>
      </div>
    </Modal>
  );
}
