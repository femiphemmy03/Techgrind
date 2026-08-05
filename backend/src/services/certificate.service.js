import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const INK = rgb(0.043, 0.059, 0.078);       // #0B0F14
const GREEN = rgb(0.224, 0.878, 0.478);     // #39E07A
const AMBER = rgb(1, 0.690, 0.125);         // #FFB020
const OFFWHITE = rgb(0.957, 0.969, 0.961);  // #F4F7F5
const MUTED = rgb(0.608, 0.690, 0.659);     // #9BB0A8

/** Draws the TG mark (same geometry as the brand SVG) directly onto the PDF page. */
function drawMark(page, x, y, scale = 1) {
  const s = scale;
  // T
  page.drawRectangle({ x: x + 0 * s, y: y + 322 * s, width: 150 * s, height: 40 * s, color: GREEN });
  page.drawRectangle({ x: x + 50 * s, y: y + 150 * s, width: 50 * s, height: 212 * s, color: GREEN });
  // G ring (approximated with a thick circle, drawn as stroked ellipse via multiple segments not supported natively —
  // use a filled donut approximation with two circles)
  page.drawEllipse({ x: x + 260 * s, y: y + 268 * s, xScale: 88 * s, yScale: 88 * s, color: GREEN });
  page.drawEllipse({ x: x + 260 * s, y: y + 268 * s, xScale: 66 * s, yScale: 66 * s, color: INK });
  page.drawRectangle({ x: x + 240 * s, y: y + 240 * s, width: 160 * s, height: 56 * s, color: INK });
  page.drawRectangle({ x: x + 260 * s, y: y + 256 * s, width: 92 * s, height: 24 * s, color: GREEN });
  // Ascending ticks
  page.drawRectangle({ x: x + 228 * s, y: y + 114 * s, width: 20 * s, height: 30 * s, color: AMBER });
  page.drawRectangle({ x: x + 256 * s, y: y + 100 * s, width: 20 * s, height: 44 * s, color: AMBER });
  page.drawRectangle({ x: x + 284 * s, y: y + 82 * s, width: 20 * s, height: 62 * s, color: AMBER });
}

/**
 * Generates a certificate PDF for a student.
 * Layout, colors, and the TechGrind mark are fixed ("pre-designed"); only the
 * recipient's name is supplied at generation time — email + track come from the DB, never user input.
 */
export async function generateCertificatePdf({ fullName, trackName, finalScore, cohortName, issuedAt }) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]); // A4 landscape

  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Background
  page.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: OFFWHITE });
  page.drawRectangle({ x: 20, y: 20, width: 802, height: 555, borderColor: GREEN, borderWidth: 3 });
  page.drawRectangle({ x: 30, y: 30, width: 782, height: 535, borderColor: AMBER, borderWidth: 1 });

  drawMark(page, 40, 440, 0.28);

  page.drawText('TECHGRIND', { x: 130, y: 500, size: 26, font: bold, color: INK });
  page.drawText('Certificate of Completion', { x: 280, y: 440, size: 22, font: bold, color: INK });

  page.drawText('This certifies that', { x: 340, y: 385, size: 12, font: regular, color: MUTED });

  const nameWidth = bold.widthOfTextAtSize(fullName, 34);
  page.drawText(fullName, { x: (842 - nameWidth) / 2, y: 335, size: 34, font: bold, color: INK });

  const line = `has successfully completed the ${trackName} track — ${cohortName}`;
  const lineWidth = regular.widthOfTextAtSize(line, 13);
  page.drawText(line, { x: (842 - lineWidth) / 2, y: 300, size: 13, font: regular, color: MUTED });

  const scoreLine = `Final average score: ${finalScore.toFixed(1)}%`;
  page.drawText(scoreLine, { x: 350, y: 270, size: 12, font: regular, color: INK });

  const dateStr = new Date(issuedAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' });
  page.drawText(`Issued on ${dateStr}`, { x: 350, y: 250, size: 11, font: regular, color: MUTED });

  page.drawLine({ start: { x: 300, y: 120 }, end: { x: 542, y: 120 }, thickness: 1, color: MUTED });
  page.drawText('techgrind.ng — Powered by Oluwafemi Sunmola Technologies LTD (RC: 8815307)', {
    x: 220,
    y: 100,
    size: 10,
    font: italic,
    color: MUTED,
  });

  // Official seal/stamp — identical placement, size, and design across every track and student.
  const sealX = 690;
  const sealY = 170;
  page.drawEllipse({ x: sealX, y: sealY, xScale: 62, yScale: 62, color: GREEN, opacity: 0.12 });
  page.drawEllipse({ x: sealX, y: sealY, xScale: 62, yScale: 62, borderColor: GREEN, borderWidth: 2 });
  page.drawEllipse({ x: sealX, y: sealY, xScale: 48, yScale: 48, borderColor: AMBER, borderWidth: 1 });
  drawMark(page, sealX - 34, sealY - 34, 0.15);
  const sealLabel = 'OFFICIAL SEAL';
  const sealLabelWidth = bold.widthOfTextAtSize(sealLabel, 8);
  page.drawText(sealLabel, { x: sealX - sealLabelWidth / 2, y: sealY - 58, size: 8, font: bold, color: INK });

  return doc.save();
}
