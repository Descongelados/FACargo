import type { Quote } from '../types';
import { QUOTE_STATUS_LABELS } from '../constants';
import { formatCurrency, formatDate } from './formatters';
import { useSettingsStore, hexToRgb } from '../store/useSettingsStore';

/** Genera el PDF de la cotización leyendo la configuración del store. */
export async function createQuotePdf(q: Quote) {
  const { jsPDF } = await import('jspdf');
  const cfg = useSettingsStore.getState().quoteConfig;

  const PRIMARY  = hexToRgb(cfg.primaryColor);
  const ACCENT   = hexToRgb(cfg.accentColor);
  const DARK     = [17,  24,  39]  as [number, number, number];
  const MUTED    = [107, 114, 128] as [number, number, number];
  const LIGHT_BG = [243, 244, 246] as [number, number, number];
  const WHITE    = [255, 255, 255] as [number, number, number];

  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const W  = doc.internal.pageSize.getWidth();
  const H  = doc.internal.pageSize.getHeight();
  const ML = 14;
  const MR = 14;
  const CW = W - ML - MR;

  // ─── 1. ENCABEZADO ──────────────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, W, 28, 'F');

  doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(...WHITE);
  doc.text(cfg.companyName, ML, 12);
  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(180, 170, 220);
  doc.text(cfg.slogan, ML, 17);

  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...WHITE);
  doc.text(q.quoteNumber, W - MR, 10, { align: 'right' });
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(200, 190, 240);
  doc.text(formatDate(q.createdAt), W - MR, 15.5, { align: 'right' });
  doc.text(`Vigencia: ${formatDate(q.validUntil)}`, W - MR, 20, { align: 'right' });

  doc.setFillColor(...ACCENT);
  doc.roundedRect(W - MR - 38, 0, 38 + MR, 28, 0, 0, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...WHITE);
  doc.text('COTIZACIÓN', W - MR - 19 + MR / 2, 11, { align: 'center' });
  doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(255, 220, 200);
  doc.text('SERVICIO DE FLETE',   W - MR - 19 + MR / 2, 16.5, { align: 'center' });
  doc.text('SOLUCIONES LOGÍSTICAS', W - MR - 19 + MR / 2, 21,  { align: 'center' });
  doc.text('A TU MEDIDA',         W - MR - 19 + MR / 2, 25,   { align: 'center' });

  let y = 35;

  // ─── 2. FRANJA DE CARACTERÍSTICAS ───────────────────────────────────────────
  doc.setFillColor(...LIGHT_BG);
  doc.rect(0, y - 2, W, 14, 'F');
  const fW = CW / cfg.features.length;
  cfg.features.forEach((f, i) => {
    const fx = ML + i * fW + fW / 2;
    doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...PRIMARY);
    doc.text(f.title, fx, y + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(...MUTED);
    doc.text(f.sub, fx, y + 8, { align: 'center' });
  });
  y += 18;

  // ─── 3. SECCIONES: CLIENTE + DETALLES + RUTA ────────────────────────────────
  const col1W = CW * 0.36;
  const col2W = CW * 0.38;
  const col3W = CW * 0.26;

  const sectionHeader = (title: string, x: number, sy: number, w: number) => {
    doc.setFillColor(...PRIMARY);
    doc.roundedRect(x, sy, w, 7, 1, 1, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...WHITE);
    doc.text(title, x + 4, sy + 5);
  };

  const dataRow = (label: string, value: string, x: number, ry: number, lw: number, vw: number) => {
    doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...DARK);
    doc.text(`${label}:`, x, ry);
    doc.setFont('helvetica', 'normal').setTextColor(...MUTED);
    const lines = doc.splitTextToSize(value || '-', vw) as string[];
    doc.text(lines, x + lw, ry);
    return lines.length * 5;
  };

  // Col 1: Datos del cliente
  const x1 = ML;
  sectionHeader('DATOS DEL CLIENTE', x1, y, col1W - 2);
  let y1 = y + 10;
  const lw1 = 20, vw1 = col1W - lw1 - 4;
  const clientRows: [string, string][] = [
    ['Empresa', q.clientName],
    ...(q.guestClientPhone ? [['Teléfono', q.guestClientPhone] as [string, string]] : []),
    ...(q.guestClientEmail ? [['Correo',   q.guestClientEmail] as [string, string]] : []),
    ['Origen', q.origin],
  ];
  for (const [l, v] of clientRows) y1 += dataRow(l, v, x1, y1, lw1, vw1);

  // Col 2: Detalles del servicio
  const x2 = ML + col1W + 2;
  sectionHeader('DETALLES DEL SERVICIO', x2, y, col2W - 2);
  let y2 = y + 10;
  const lw2 = 26, vw2 = col2W - lw2 - 4;
  const serviceRows: [string, string][] = [
    ['Carga',     q.cargoDescription],
    ['Peso est.', `${q.cargoWeightKg.toLocaleString('es-MX')} kg`],
    ['Unidad',    q.trailerType],
    ...(q.vehicleUnit ? [['No. Unidad', q.vehicleUnit] as [string, string]] : []),
    ['Vigencia',  formatDate(q.validUntil)],
    ['Estatus',   QUOTE_STATUS_LABELS[q.status]?.label ?? q.status],
  ];
  for (const [l, v] of serviceRows) y2 += dataRow(l, v, x2, y2, lw2, vw2);

  // Col 3: Ruta
  const x3 = ML + col1W + col2W + 4;
  sectionHeader('RUTA', x3, y, col3W - 2);
  let y3 = y + 12;
  doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...PRIMARY);
  const originLines = doc.splitTextToSize(q.origin, col3W - 4) as string[];
  doc.text(originLines, x3 + 2, y3);
  y3 += originLines.length * 5 + 3;

  doc.setDrawColor(...ACCENT).setLineWidth(0.5);
  doc.setLineDashPattern([1, 1.5], 0);
  doc.line(x3 + (col3W - 4) / 2, y3, x3 + (col3W - 4) / 2, y3 + 8);
  doc.setLineDashPattern([], 0);

  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...ACCENT);
  doc.text(`${q.distanceKm} km`, x3 + (col3W - 4) / 2, y3 + 13, { align: 'center' });
  y3 += 18;

  doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...PRIMARY);
  const destLines = doc.splitTextToSize(q.destination, col3W - 4) as string[];
  doc.text(destLines, x3 + 2, y3);

  y = Math.max(y1, y2, y3 + destLines.length * 5) + 8;

  // ─── 4. DESGLOSE + CONDICIONES ──────────────────────────────────────────────
  const halfW = CW * 0.5;
  const xCosts = ML;
  const xConds = ML + halfW + 4;

  sectionHeader('DESGLOSE DE COSTOS', xCosts, y, halfW - 2);
  y += 9;

  doc.setFillColor(...PRIMARY);
  doc.rect(xCosts, y, halfW - 2, 6, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...WHITE);
  doc.text('CONCEPTO',      xCosts + 3,         y + 4.2);
  doc.text('IMPORTE (MXN)', xCosts + halfW - 5, y + 4.2, { align: 'right' });
  y += 7;

  const baseRate  = q.proposedRate;
  const toll      = Math.round(baseRate * cfg.tollPercent / 100);
  const maneuver  = Math.round(baseRate * cfg.maneuverPercent / 100);
  const subtotal  = baseRate + toll + maneuver;
  const iva       = Math.round(subtotal * cfg.ivaPercent / 100);
  const total     = subtotal + iva;

  const costRows: [string, number, boolean][] = [
    ['Flete base',                    baseRate,  false],
    ['Casetas',                       toll,      false],
    ['Maniobras de carga y descarga', maneuver,  false],
    ['Subtotal',                      subtotal,  true],
    [`IVA (${cfg.ivaPercent}%)`,      iva,       false],
  ];

  let rowY = y;
  costRows.forEach(([label, amount, bold], idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(...LIGHT_BG);
      doc.rect(xCosts, rowY - 4, halfW - 2, 6, 'F');
    }
    doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(8).setTextColor(...DARK);
    doc.text(label, xCosts + 3, rowY);
    doc.text(formatCurrency(amount), xCosts + halfW - 5, rowY, { align: 'right' });
    rowY += 6;
  });

  doc.setFillColor(...ACCENT);
  doc.roundedRect(xCosts, rowY - 1, halfW - 2, 10, 1, 1, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...WHITE);
  doc.text('TOTAL', xCosts + 5, rowY + 6);
  doc.text(`${formatCurrency(total)} MXN`, xCosts + halfW - 5, rowY + 6, { align: 'right' });
  const costsEndY = rowY + 14;

  // Condiciones
  sectionHeader('CONDICIONES COMERCIALES', xConds, y - 9, halfW - 2);
  let condsY = y + 1;
  cfg.conditions.forEach((cond) => {
    doc.setFillColor(...ACCENT);
    doc.circle(xConds + 2.5, condsY - 1, 1, 'F');
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...DARK);
    const lines = doc.splitTextToSize(cond, halfW - 9) as string[];
    doc.text(lines, xConds + 6, condsY);
    condsY += lines.length * 4.5 + 1.5;
  });

  y = Math.max(costsEndY, condsY) + 6;

  // ─── 5. NOTAS ────────────────────────────────────────────────────────────────
  if (q.notes) {
    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(ML, y, CW, 8, 1, 1, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...PRIMARY);
    doc.text('NOTAS ADICIONALES', ML + 3, y + 5);
    y += 9;
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...DARK);
    const noteLines = doc.splitTextToSize(q.notes, CW - 6) as string[];
    doc.text(noteLines, ML + 3, y);
    y += noteLines.length * 4.5 + 6;
  }

  // ─── 6. FOOTER ───────────────────────────────────────────────────────────────
  const footerY = H - 22;
  doc.setFillColor(...ACCENT);
  doc.rect(0, footerY, W * 0.72, 8, 'F');
  doc.setFillColor(...PRIMARY);
  doc.rect(W * 0.72, footerY, W * 0.28, 8, 'F');

  doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...WHITE);
  doc.text(`📞  ${cfg.phone}`,   ML,       footerY + 5.5);
  doc.text(`✉  ${cfg.email}`,   ML + 45,  footerY + 5.5);
  doc.text(`🌐  ${cfg.website}`, ML + 100, footerY + 5.5);

  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...WHITE);
  doc.text(cfg.footerTagline, W - MR, footerY + 5.5, { align: 'right' });

  doc.setFillColor(...PRIMARY);
  doc.rect(0, H - 14, W, 14, 'F');
  doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(180, 170, 220);
  doc.text(cfg.footerSubline, W / 2, H - 7, { align: 'center' });

  return doc;
}

export function quoteFileName(q: Quote): string {
  return `${q.quoteNumber}.pdf`;
}

/**
 * Comparte el PDF con el menú nativo del dispositivo (WhatsApp, correo, AirDrop, etc.).
 * Si el navegador no soporta compartir archivos, descarga el PDF.
 */
export async function shareQuotePdf(q: Quote): Promise<void> {
  const doc = await createQuotePdf(q);
  const file = new File([doc.output('blob')], quoteFileName(q), { type: 'application/pdf' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `Cotización ${q.quoteNumber}` });
      return;
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return;
    }
  }
  doc.save(quoteFileName(q));
}
