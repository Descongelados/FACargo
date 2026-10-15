import type { Quote } from '../types';
import { APP_NAME, QUOTE_STATUS_LABELS } from '../constants';
import { formatCurrency, formatDate } from './formatters';

/** Texto plano de la cotización, usado para compartir por WhatsApp o email. */
export function buildQuoteText(q: Quote): string {
  return [
    `${APP_NAME} - Cotización ${q.quoteNumber}`,
    '',
    `Cliente: ${q.clientName}`,
    `Ruta: ${q.origin} → ${q.destination}`,
    `Distancia: ${q.distanceKm} km`,
    `Carga: ${q.cargoDescription} (${q.cargoWeightKg.toLocaleString('es-MX')} kg)`,
    `Remolque: ${q.trailerType}`,
    `Tarifa: ${formatCurrency(q.proposedRate)}`,
    `Válida hasta: ${formatDate(q.validUntil)}`,
    ...(q.notes ? ['', `Notas: ${q.notes}`] : []),
  ].join('\n');
}

/** Genera el PDF de la cotización. jspdf se carga bajo demanda para no inflar el bundle inicial. */
export async function createQuotePdf(q: Quote) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();
  const M = 18;
  let y = 22;

  // Encabezado
  doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(30, 41, 59);
  doc.text(APP_NAME, M, y);
  doc.setFontSize(11).setTextColor(100, 116, 139);
  doc.text('COTIZACIÓN DE SERVICIO', W - M, y, { align: 'right' });
  y += 6;
  doc.setDrawColor(59, 130, 246).setLineWidth(0.8).line(M, y, W - M, y);
  y += 10;

  // Datos generales
  doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(30, 41, 59);
  doc.text(q.quoteNumber, M, y);
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(100, 116, 139);
  doc.text(`Estatus: ${QUOTE_STATUS_LABELS[q.status]?.label ?? q.status}`, W - M, y, { align: 'right' });
  y += 6;
  doc.text(`Fecha: ${formatDate(q.createdAt)}`, M, y);
  doc.text(`Válida hasta: ${formatDate(q.validUntil)}`, W - M, y, { align: 'right' });
  y += 12;

  // Filas etiqueta / valor
  const rows: [string, string][] = [
    ['Cliente', q.clientName],
    ...(q.guestClientPhone ? [['Teléfono', q.guestClientPhone] as [string, string]] : []),
    ...(q.guestClientEmail ? [['Email', q.guestClientEmail] as [string, string]] : []),
    ['Origen', q.origin],
    ['Destino', q.destination],
    ['Distancia estimada', `${q.distanceKm} km`],
    ['Tipo de remolque', q.trailerType],
    ...(q.vehicleUnit ? [['Unidad', q.vehicleUnit] as [string, string]] : []),
    ['Descripción de carga', q.cargoDescription],
    ['Peso de carga', `${q.cargoWeightKg.toLocaleString('es-MX')} kg`],
  ];
  const labelW = 48;
  for (const [label, value] of rows) {
    const lines = doc.splitTextToSize(value || '-', W - M * 2 - labelW) as string[];
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(100, 116, 139);
    doc.text(label, M, y);
    doc.setFont('helvetica', 'normal').setTextColor(30, 41, 59);
    doc.text(lines, M + labelW, y);
    y += Math.max(1, lines.length) * 5.5 + 2;
  }

  // Tarifa
  y += 4;
  doc.setFillColor(241, 245, 249).roundedRect(M, y, W - M * 2, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'normal').setFontSize(11).setTextColor(100, 116, 139);
  doc.text('Tarifa propuesta', M + 6, y + 13);
  doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(5, 150, 105);
  doc.text(`${formatCurrency(q.proposedRate)} MXN`, W - M - 6, y + 14, { align: 'right' });
  y += 30;

  // Notas
  if (q.notes) {
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(100, 116, 139);
    doc.text('Notas y condiciones', M, y);
    y += 6;
    doc.setFont('helvetica', 'normal').setTextColor(30, 41, 59);
    doc.text(doc.splitTextToSize(q.notes, W - M * 2) as string[], M, y);
  }

  // Pie
  const H = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'italic').setFontSize(8).setTextColor(148, 163, 184);
  doc.text(`Cotización sujeta a disponibilidad de unidades. Vigente hasta ${formatDate(q.validUntil)}.`, W / 2, H - 14, { align: 'center' });

  return doc;
}

export function quoteFileName(q: Quote): string {
  return `${q.quoteNumber}.pdf`;
}
