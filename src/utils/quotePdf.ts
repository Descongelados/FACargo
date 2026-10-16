import type { Quote } from '../types';
import { APP_NAME, QUOTE_STATUS_LABELS } from '../constants';
import { formatCurrency, formatDate } from './formatters';

// ─── Colores corporativos ──────────────────────────────────────────────────────
const C = {
  purple:      [52,  43,  99]  as [number, number, number],  // #342B63 – encabezado/secciones
  orange:      [234, 88,  12]  as [number, number, number],  // #EA580C – acento / total
  darkText:    [17,  24,  39]  as [number, number, number],  // #111827
  mutedText:   [107, 114, 128] as [number, number, number],  // #6B7280
  lightBg:     [243, 244, 246] as [number, number, number],  // #F3F4F6
  white:       [255, 255, 255] as [number, number, number],
  borderGray:  [209, 213, 219] as [number, number, number],  // #D1D5DB
};

/** Genera el PDF de la cotización con formato profesional inspirado en el diseño de referencia. */
export async function createQuotePdf(q: Quote) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });

  const W  = doc.internal.pageSize.getWidth();   // 215.9
  const H  = doc.internal.pageSize.getHeight();  // 279.4
  const ML = 14;   // margen izquierdo
  const MR = 14;   // margen derecho
  const CW = W - ML - MR; // ancho útil

  // ─── 1. ENCABEZADO ──────────────────────────────────────────────────────────
  // Franja morada completa
  doc.setFillColor(...C.purple);
  doc.rect(0, 0, W, 28, 'F');

  // Nombre empresa (blanco + naranja simulado)
  doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(...C.white);
  doc.text(APP_NAME, ML, 12);

  // Sub-slogan
  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(180, 170, 220);
  doc.text('LOGÍSTICA QUE TE LLEVA MÁS LEJOS', ML, 17);

  // Número de cotización y fecha (derecha)
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...C.white);
  doc.text(q.quoteNumber, W - MR, 10, { align: 'right' });
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(200, 190, 240);
  doc.text(`${formatDate(q.createdAt)}`, W - MR, 15.5, { align: 'right' });
  doc.text(`Vigencia: ${formatDate(q.validUntil)}`, W - MR, 20, { align: 'right' });

  // Etiqueta "COTIZACIÓN" naranja – bloque derecho pequeño
  doc.setFillColor(...C.orange);
  doc.roundedRect(W - MR - 38, 0, 38 + MR, 28, 0, 0, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...C.white);
  doc.text('COTIZACIÓN', W - MR - 19 + MR / 2, 11, { align: 'center' });
  doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(255, 220, 200);
  doc.text('SERVICIO DE FLETE', W - MR - 19 + MR / 2, 16.5, { align: 'center' });
  doc.text('SOLUCIONES LOGÍSTICAS', W - MR - 19 + MR / 2, 21, { align: 'center' });
  doc.text('A TU MEDIDA', W - MR - 19 + MR / 2, 25, { align: 'center' });

  let y = 35;

  // ─── 2. FRANJA DE CARACTERÍSTICAS ───────────────────────────────────────────
  doc.setFillColor(...C.lightBg);
  doc.rect(0, y - 2, W, 14, 'F');

  const features = [
    { icon: '🛡', title: 'Seguro de mercancía', sub: 'Tu carga protegida' },
    { icon: '📍', title: 'Rastreo GPS', sub: 'Monitoreo en tiempo real' },
    { icon: '🇲🇽', title: 'Cobertura nacional', sub: 'Llegamos a donde nos necesites' },
    { icon: '👷', title: 'Operador certificado', sub: 'Experiencia y seguridad' },
  ];
  const fW = CW / features.length;
  features.forEach((f, i) => {
    const fx = ML + i * fW + fW / 2;
    doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...C.purple);
    doc.text(f.title, fx, y + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(...C.mutedText);
    doc.text(f.sub, fx, y + 8, { align: 'center' });
  });
  y += 18;

  // ─── 3. SECCIONES: DATOS CLIENTE + DETALLES + RUTA ──────────────────────────
  const col1W = CW * 0.36;
  const col2W = CW * 0.38;
  const col3W = CW * 0.26;

  // Helper: sección con encabezado morado
  const sectionHeader = (title: string, x: number, sy: number, w: number) => {
    doc.setFillColor(...C.purple);
    doc.roundedRect(x, sy, w, 7, 1, 1, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...C.white);
    doc.text(title, x + 4, sy + 5);
  };

  // Helper: fila label / valor
  const dataRow = (label: string, value: string, x: number, ry: number, labelW: number, valW: number) => {
    doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...C.darkText);
    doc.text(`${label}:`, x, ry);
    doc.setFont('helvetica', 'normal').setTextColor(...C.mutedText);
    const lines = doc.splitTextToSize(value || '-', valW) as string[];
    doc.text(lines, x + labelW, ry);
    return lines.length * 5;
  };

  // ── Col 1: Datos del cliente
  const x1 = ML;
  sectionHeader('DATOS DEL CLIENTE', x1, y, col1W - 2);
  let y1 = y + 10;
  const lw1 = 20;
  const vw1 = col1W - lw1 - 4;
  const clientRows: [string, string][] = [
    ['Empresa', q.clientName],
    ...(q.guestClientPhone ? [['Teléfono', q.guestClientPhone] as [string, string]] : []),
    ...(q.guestClientEmail ? [['Correo', q.guestClientEmail] as [string, string]] : []),
    ['Origen', q.origin],
  ];
  for (const [lbl, val] of clientRows) {
    y1 += dataRow(lbl, val, x1, y1, lw1, vw1);
  }

  // ── Col 2: Detalles del servicio
  const x2 = ML + col1W + 2;
  sectionHeader('DETALLES DEL SERVICIO', x2, y, col2W - 2);
  let y2 = y + 10;
  const lw2 = 26;
  const vw2 = col2W - lw2 - 4;
  const serviceRows: [string, string][] = [
    ['Carga', q.cargoDescription],
    ['Peso est.', `${q.cargoWeightKg.toLocaleString('es-MX')} kg`],
    ['Unidad', q.trailerType],
    ...(q.vehicleUnit ? [['No. Unidad', q.vehicleUnit] as [string, string]] : []),
    ['Vigencia', formatDate(q.validUntil)],
    ['Estatus', QUOTE_STATUS_LABELS[q.status]?.label ?? q.status],
  ];
  for (const [lbl, val] of serviceRows) {
    y2 += dataRow(lbl, val, x2, y2, lw2, vw2);
  }

  // ── Col 3: Ruta
  const x3 = ML + col1W + col2W + 4;
  sectionHeader('RUTA', x3, y, col3W - 2);
  let y3 = y + 12;
  doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...C.purple);
  const originLines = doc.splitTextToSize(q.origin, col3W - 4) as string[];
  doc.text(originLines, x3 + 2, y3);
  y3 += originLines.length * 5 + 3;

  // Línea punteada
  doc.setDrawColor(...C.orange);
  doc.setLineWidth(0.5);
  doc.setLineDashPattern([1, 1.5], 0);
  doc.line(x3 + (col3W - 4) / 2, y3, x3 + (col3W - 4) / 2, y3 + 8);
  doc.setLineDashPattern([], 0);

  // Distancia
  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...C.orange);
  doc.text(`${q.distanceKm} km`, x3 + (col3W - 4) / 2, y3 + 13, { align: 'center' });
  y3 += 18;

  doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...C.purple);
  const destLines = doc.splitTextToSize(q.destination, col3W - 4) as string[];
  doc.text(destLines, x3 + 2, y3);

  // Avanzar al máximo de las 3 columnas
  y = Math.max(y1, y2, y3 + destLines.length * 5) + 8;

  // ─── 4. DESGLOSE DE COSTOS + CONDICIONES COMERCIALES ────────────────────────
  const halfW = CW * 0.5;
  const xCosts = ML;
  const xConds = ML + halfW + 4;

  // ── Desglose
  sectionHeader('DESGLOSE DE COSTOS', xCosts, y, halfW - 2);
  y += 9;

  // Encabezados tabla
  doc.setFillColor(...C.purple);
  doc.rect(xCosts, y, halfW - 2, 6, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...C.white);
  doc.text('CONCEPTO', xCosts + 3, y + 4.2);
  doc.text('IMPORTE (MXN)', xCosts + halfW - 5, y + 4.2, { align: 'right' });
  y += 7;

  // Calcular subtotal y total dinámicamente
  const baseRate  = q.proposedRate;
  const toll      = Math.round(baseRate * 0.08);
  const maneuver  = Math.round(baseRate * 0.06);
  const subtotal  = baseRate + toll + maneuver;
  const iva       = Math.round(subtotal * 0.16);
  const total     = subtotal + iva;

  const costRows: [string, number, boolean][] = [
    ['Flete base',                    baseRate,  false],
    ['Casetas',                       toll,      false],
    ['Maniobras de carga y descarga', maneuver,  false],
    ['Subtotal',                      subtotal,  true],
    ['IVA (16%)',                     iva,       false],
  ];

  let rowY = y;
  costRows.forEach(([label, amount, isBold], idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(...C.lightBg);
      doc.rect(xCosts, rowY - 4, halfW - 2, 6, 'F');
    }
    doc.setFont('helvetica', isBold ? 'bold' : 'normal')
      .setFontSize(8).setTextColor(...C.darkText);
    doc.text(label, xCosts + 3, rowY);
    doc.text(formatCurrency(amount), xCosts + halfW - 5, rowY, { align: 'right' });
    rowY += 6;
  });

  // Fila TOTAL naranja
  doc.setFillColor(...C.orange);
  doc.roundedRect(xCosts, rowY - 1, halfW - 2, 10, 1, 1, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...C.white);
  doc.text('TOTAL', xCosts + 5, rowY + 6);
  doc.text(`${formatCurrency(total)} MXN`, xCosts + halfW - 5, rowY + 6, { align: 'right' });
  const costsEndY = rowY + 14;

  // ── Condiciones comerciales
  sectionHeader('CONDICIONES COMERCIALES', xConds, y - 9, halfW - 2);
  let condsY = y + 1;

  const conditions = [
    'El precio incluye operador y combustible.',
    'La cotización considera carga y descarga en planta.',
    'No incluye almacenaje ni servicios extraordinarios.',
    `Tiempo estimado de tránsito según distancia (${q.distanceKm} km).`,
    'Forma de pago: Transferencia bancaria.',
    'Crédito sujeto a autorización.',
    `Esta cotización tiene una vigencia hasta ${formatDate(q.validUntil)}.`,
    'Cualquier cambio en la ruta o peso puede generar variación en el costo.',
  ];

  conditions.forEach((cond) => {
    doc.setFillColor(...C.orange);
    doc.circle(xConds + 2.5, condsY - 1, 1, 'F');
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...C.darkText);
    const lines = doc.splitTextToSize(cond, halfW - 9) as string[];
    doc.text(lines, xConds + 6, condsY);
    condsY += lines.length * 4.5 + 1.5;
  });

  y = Math.max(costsEndY, condsY) + 6;

  // ─── 5. NOTAS ────────────────────────────────────────────────────────────────
  if (q.notes) {
    doc.setFillColor(...C.lightBg);
    doc.roundedRect(ML, y, CW, 8, 1, 1, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...C.purple);
    doc.text('NOTAS ADICIONALES', ML + 3, y + 5);
    y += 9;
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...C.darkText);
    const noteLines = doc.splitTextToSize(q.notes, CW - 6) as string[];
    doc.text(noteLines, ML + 3, y);
    y += noteLines.length * 4.5 + 6;
  }

  // ─── 6. FOOTER ───────────────────────────────────────────────────────────────
  const footerY = H - 22;

  // Franja naranja
  doc.setFillColor(...C.orange);
  doc.rect(0, footerY, W * 0.72, 8, 'F');

  // Franja morada
  doc.setFillColor(...C.purple);
  doc.rect(W * 0.72, footerY, W * 0.28, 8, 'F');

  // Datos de contacto en naranja
  doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...C.white);
  doc.text('📞  +52 33 1234 5678', ML, footerY + 5.5);
  doc.text('✉  contacto@freightflow.com', ML + 45, footerY + 5.5);
  doc.text('🌐  www.freightflow.com', ML + 100, footerY + 5.5);

  // Texto morado
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...C.white);
  doc.text('TU ALIADO EN EL CAMINO', W - MR, footerY + 5.5, { align: 'right' });

  // Sub-footer
  doc.setFillColor(...C.purple);
  doc.rect(0, H - 14, W, 14, 'F');
  doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(180, 170, 220);
  doc.text(
    'FLETES LOCALES Y FORÁNEOS  |  CARGA SEGURA  |  SOLUCIONES LOGÍSTICAS',
    W / 2, H - 7, { align: 'center' }
  );

  return doc;
}

export function quoteFileName(q: Quote): string {
  return `${q.quoteNumber}.pdf`;
}

/**
 * Comparte el PDF con el menú nativo del dispositivo (WhatsApp, correo, AirDrop, etc.),
 * para que el usuario elija cómo enviarlo. Si el navegador no soporta compartir
 * archivos, descarga el PDF.
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
