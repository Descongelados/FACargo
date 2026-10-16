import type { Quote } from '../types';
import type { QuoteConfig } from '../store/useSettingsStore';
import { formatCurrency, formatDate } from './formatters';
import { useSettingsStore, hexToRgb } from '../store/useSettingsStore';
import { useClientsStore } from '../store/useClientsStore';

// Velocidad media y horas de manejo por jornada para estimar el tiempo de tránsito
const AVG_SPEED_KMH = 60;
const DRIVING_HOURS_PER_DAY = 10;

/** Desglose de la cotización: la tarifa propuesta es el flete base. */
export function calcQuoteTotals(baseRate: number, cfg: Pick<QuoteConfig, 'tollPercent' | 'maneuverPercent' | 'ivaPercent'>) {
  const toll     = Math.round(baseRate * cfg.tollPercent / 100);
  const maneuver = Math.round(baseRate * cfg.maneuverPercent / 100);
  const subtotal = baseRate + toll + maneuver;
  const iva      = Math.round(subtotal * cfg.ivaPercent / 100);
  return { baseRate, toll, maneuver, subtotal, iva, total: subtotal + iva };
}

/** Tiempo de tránsito estimado según la distancia ("4 horas", "2 días"). */
export function estimateTransit(distanceKm: number): string {
  const hours = Math.max(1, Math.ceil(distanceKm / AVG_SPEED_KMH));
  if (hours <= 12) return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  const days = Math.ceil(hours / DRIVING_HOURS_PER_DAY);
  return `${days} días`;
}

/** Días de vigencia entre la fecha de emisión y "válida hasta". */
function validityText(q: Quote): string {
  const days = Math.round((new Date(q.validUntil).getTime() - new Date(q.createdAt).getTime()) / 86_400_000);
  const n = Number.isFinite(days) ? Math.max(1, days) : 1;
  return `${n} ${n === 1 ? 'día' : 'días'}`;
}

/** Número para wa.me (México por defecto cuando vienen 10 dígitos). */
function whatsappNumber(raw: string): string | null {
  let d = raw.replace(/\D/g, '');
  if (d.length === 10) d = `52${d}`;
  else if (d.length === 13 && d.startsWith('521')) d = `52${d.slice(3)}`;
  return d.length >= 11 ? d : null;
}

/** Carga el logo (cualquier formato del navegador) y lo convierte a PNG para jsPDF. */
function loadLogo(url: string): Promise<{ data: string; w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || 300;
      const h = img.naturalHeight || 100;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, w, h);
      resolve({ data: canvas.toDataURL('image/png'), w, h });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Genera el PDF de la cotización leyendo la configuración del store. */
export async function createQuotePdf(q: Quote) {
  const { jsPDF } = await import('jspdf');
  const { cfg, logoUrl } = (() => {
    const s = useSettingsStore.getState();
    return { cfg: s.quoteConfig, logoUrl: s.logoUrl };
  })();
  const client = q.clientId ? useClientsStore.getState().clients.find((c) => c.id === q.clientId) : undefined;
  const logo = logoUrl ? await loadLogo(logoUrl) : null;

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
  const FOOTER_Y = H - 22;

  // ─── 1. ENCABEZADO ──────────────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, W, 28, 'F');

  let textX = ML;
  if (logo) {
    const logoH = 16;
    const logoW = Math.min(logoH * (logo.w / logo.h), 40);
    doc.setFillColor(...WHITE);
    doc.roundedRect(ML, 4, logoW + 4, 20, 1.5, 1.5, 'F');
    doc.addImage(logo.data, 'PNG', ML + 2, 6, logoW, logoH);
    textX = ML + logoW + 8;
  }

  doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(...WHITE);
  doc.text(cfg.companyName, textX, 12);
  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(180, 170, 220);
  doc.text(cfg.slogan, textX, 17);

  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...WHITE);
  doc.text(q.quoteNumber, W - MR, 10, { align: 'right' });
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(200, 190, 240);
  doc.text(formatDate(q.createdAt), W - MR, 15.5, { align: 'right' });
  doc.text(`Vigencia: ${validityText(q)}`, W - MR, 20, { align: 'right' });

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

  // Col 1: Datos del cliente (cliente registrado → su ficha; prospecto → lo capturado en la cotización)
  const x1 = ML;
  sectionHeader('DATOS DEL CLIENTE', x1, y, col1W - 2);
  let y1 = y + 10;
  const lw1 = 20, vw1 = col1W - lw1 - 4;
  const contact = client?.contactName || q.guestClientContact;
  const phone   = client?.phone       || q.guestClientPhone;
  const email   = client?.email       || q.guestClientEmail;
  const address = client?.address     || q.guestClientAddress;
  const clientRows: [string, string][] = [
    ['Empresa', q.clientName],
    ...(contact ? [['Contacto', contact] as [string, string]] : []),
    ...(phone   ? [['Teléfono', phone]   as [string, string]] : []),
    ...(email   ? [['Correo',   email]   as [string, string]] : []),
    ...(address ? [['Dirección', address] as [string, string]] : []),
  ];
  for (const [l, v] of clientRows) y1 += dataRow(l, v, x1, y1, lw1, vw1);

  // Col 2: Detalles del servicio
  const x2 = ML + col1W + 2;
  sectionHeader('DETALLES DEL SERVICIO', x2, y, col2W - 2);
  let y2 = y + 10;
  const lw2 = 30, vw2 = col2W - lw2 - 4;
  const serviceRows: [string, string][] = [
    ['Tipo de carga',    q.cargoDescription],
    ['Peso estimado',    `${q.cargoWeightKg.toLocaleString('es-MX')} kg`],
    ['Tipo de unidad',   q.trailerType],
    ...(q.serviceDate ? [['Fecha de servicio', formatDate(q.serviceDate)] as [string, string]] : []),
    ['Tiempo estimado',  estimateTransit(q.distanceKm)],
    ...(q.reference   ? [['Referencia', q.reference] as [string, string]] : []),
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

  const sectionY = y;
  sectionHeader('DESGLOSE DE COSTOS', xCosts, sectionY, halfW - 2);
  const costsTableHeaderY = sectionY + 9;

  doc.setFillColor(...PRIMARY);
  doc.rect(xCosts, costsTableHeaderY, halfW - 2, 6, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...WHITE);
  doc.text('CONCEPTO',      xCosts + 3,         costsTableHeaderY + 4.2);
  doc.text('IMPORTE (MXN)', xCosts + halfW - 5, costsTableHeaderY + 4.2, { align: 'right' });
  y = costsTableHeaderY + 7;

  const { baseRate, toll, maneuver, subtotal, iva, total } = calcQuoteTotals(q.proposedRate, cfg);

  const costRows: [string, number, boolean][] = [
    ['Flete base',                    baseRate,  false],
    ['Casetas',                       toll,      false],
    ['Maniobras de carga y descarga', maneuver,  false],
    ['Subtotal',                      subtotal,  true],
    [`IVA (${cfg.ivaPercent}%)`,      iva,       false],
  ];

  let rowY = y + 4.5; // texto centrado en el primer rect (rect empieza en y, altura 6 → centro en y+3, baseline ~y+4.5)
  costRows.forEach(([label, amount, bold], idx) => {
    const rectTop = rowY - 4;
    if (idx % 2 === 0) {
      doc.setFillColor(...LIGHT_BG);
      doc.rect(xCosts, rectTop, halfW - 2, 6, 'F');
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

  // Condiciones ({transito} y {vigencia} se reemplazan con los datos de esta cotización)
  sectionHeader('CONDICIONES COMERCIALES', xConds, sectionY, halfW - 2);
  let condsY = sectionY + 13;
  const transit  = estimateTransit(q.distanceKm);
  const validity = validityText(q);
  cfg.conditions.forEach((raw) => {
    const cond = raw.replace(/\{transito\}/g, transit).replace(/\{vigencia\}/g, validity);
    doc.setFillColor(...ACCENT);
    doc.circle(xConds + 2.5, condsY - 1, 1, 'F');
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...DARK);
    const lines = doc.splitTextToSize(cond, halfW - 9) as string[];
    doc.text(lines, xConds + 6, condsY);
    condsY += lines.length * 4.5 + 1.5;
  });

  y = Math.max(costsEndY, condsY) + 6;

  // Si el siguiente bloque no cabe antes del pie, pasa a una página nueva
  const ensureSpace = (h: number) => {
    if (y + h > FOOTER_Y - 4) {
      doc.addPage();
      y = 15;
    }
  };

  // ─── 5. NOTAS ────────────────────────────────────────────────────────────────
  if (q.notes) {
    const noteLines = doc.splitTextToSize(q.notes, CW - 6) as string[];
    ensureSpace(9 + noteLines.length * 4.5 + 6);
    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(ML, y, CW, 8, 1, 1, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...PRIMARY);
    doc.text('NOTAS ADICIONALES', ML + 3, y + 5);
    y += 9;
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...DARK);
    doc.text(noteLines, ML + 3, y);
    y += noteLines.length * 4.5 + 6;
  }

  // ─── 6. DATOS BANCARIOS + FIRMA + WHATSAPP ──────────────────────────────────
  const bankRows: [string, string][] = ([
    ['Banco',   cfg.bankName],
    ['Titular', cfg.legalName],
    ['Cuenta',  cfg.bankAccount],
    ['CLABE',   cfg.bankClabe],
    ['RFC',     cfg.rfc],
  ] as [string, string][]).filter(([, v]) => v.trim());
  const waNumber = whatsappNumber(cfg.whatsapp || cfg.phone);

  let qrData: string | null = null;
  if (waNumber) {
    const QRCode = (await import('qrcode')).default;
    const msg = encodeURIComponent(`Hola, me interesa la cotización ${q.quoteNumber}.`);
    qrData = await QRCode.toDataURL(`https://wa.me/${waNumber}?text=${msg}`, { margin: 0, width: 256 });
  }

  const blocks = [
    ...(bankRows.length ? [{ kind: 'bank' as const, weight: 0.42 }] : []),
    { kind: 'sign' as const, weight: 0.30 },
    ...(qrData ? [{ kind: 'qr' as const, weight: 0.28 }] : []),
  ];
  const totalWeight = blocks.reduce((s, b) => s + b.weight, 0);

  const BLOCK_H = 38;
  ensureSpace(BLOCK_H);
  let bx = ML;
  blocks.forEach((b, idx) => {
    const bw = CW * (b.weight / totalWeight);

    if (idx > 0) {
      doc.setDrawColor(229, 231, 235).setLineWidth(0.3);
      doc.line(bx - 2, y + 2, bx - 2, y + BLOCK_H - 4);
    }

    if (b.kind === 'bank') {
      sectionHeader('DATOS BANCARIOS', bx, y, bw - 6);
      let by = y + 12;
      bankRows.forEach(([l, v]) => { by += dataRow(l, v, bx + 2, by, 17, bw - 6 - 17 - 4); });
    }

    if (b.kind === 'sign') {
      const cx = bx + bw / 2;
      doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...DARK);
      doc.text('Atentamente,', cx, y + 6, { align: 'center' });
      doc.setDrawColor(...DARK).setLineWidth(0.3);
      doc.line(cx - 24, y + 22, cx + 24, y + 22);
      let sy = y + 27;
      if (cfg.signerName) {
        doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...DARK);
        doc.text(cfg.signerName, cx, sy, { align: 'center' });
        sy += 4.5;
      }
      if (cfg.signerTitle) {
        doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED);
        doc.text(cfg.signerTitle, cx, sy, { align: 'center' });
        sy += 4.5;
      }
      doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...PRIMARY);
      doc.text(cfg.legalName || cfg.companyName, cx, sy, { align: 'center', maxWidth: bw - 4 });
    }

    if (b.kind === 'qr' && qrData) {
      const qrSize = 24;
      doc.addImage(qrData, 'PNG', bx + 2, y + 4, qrSize, qrSize);
      const tx = bx + qrSize + 6;
      const tw = bw - qrSize - 8;
      doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...PRIMARY);
      const t1 = doc.splitTextToSize('¡Contáctanos por WhatsApp!', tw) as string[];
      doc.text(t1, tx, y + 10);
      doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(...MUTED);
      doc.text('Escanea el código', tx, y + 10 + t1.length * 4 + 1);
    }

    bx += bw;
  });
  y += BLOCK_H;

  // ─── 7. PIE DE PÁGINA (en todas las páginas) ────────────────────────────────
  const legalLine = [cfg.legalName, cfg.rfc && `RFC ${cfg.rfc}`, cfg.address].filter(Boolean).join('   |   ');
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);

    doc.setFillColor(...ACCENT);
    doc.rect(0, FOOTER_Y, W * 0.72, 8, 'F');
    doc.setFillColor(...PRIMARY);
    doc.rect(W * 0.72, FOOTER_Y, W * 0.28, 8, 'F');

    doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...WHITE);
    doc.text(`Tel: ${cfg.phone}`,   ML,       FOOTER_Y + 5.5);
    doc.text(`Correo: ${cfg.email}`, ML + 45,  FOOTER_Y + 5.5);
    doc.text(`Web: ${cfg.website}`,  ML + 100, FOOTER_Y + 5.5);

    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...WHITE);
    doc.text(cfg.footerTagline, W - MR, FOOTER_Y + 5.5, { align: 'right' });

    doc.setFillColor(...PRIMARY);
    doc.rect(0, H - 14, W, 14, 'F');
    doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(180, 170, 220);
    if (legalLine) {
      doc.text(legalLine, W / 2, H - 9.5, { align: 'center', maxWidth: CW });
      doc.text(cfg.footerSubline, W / 2, H - 5, { align: 'center' });
    } else {
      doc.text(cfg.footerSubline, W / 2, H - 7, { align: 'center' });
    }
  }

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
