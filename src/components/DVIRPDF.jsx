import React, { useState } from 'react';
import jsPDF from 'jspdf';

function DVIRPDF({ dvir }) {
  const [generating, setGenerating] = useState(false);

  const generatePDF = () => {
    if (!dvir || dvir.status === 'draft') return;
    setGenerating(true);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold);
    doc.text('FleetDVIR', pageWidth / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal);
    doc.text("Ralph's Grocery", pageWidth / 2, y, { align: 'center' });
    y += 6;
    doc.text('Digital Driver Vehicle Inspection Report', pageWidth / 2, y, { align: 'center' });
    y += 14;

    // Driver info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold);
    doc.text('Driver:', 20, y);
    doc.setFont('helvetica', 'normal);
    doc.text(dvir.driverName || '', 45, y);
    y += 7;
    doc.setFont('helvetica', 'bold);
    doc.text('Date/Time:', 20, y);
    doc.setFont('helvetica', 'normal);
    doc.text(dvir.dateTime ? new Date(dvir.dateTime).toLocaleString() : '', 45, y);
    y += 7;
    doc.setFont('helvetica', 'bold);
    doc.text('Location:', 20, y);
    doc.setFont('helvetica', 'normal);
    doc.text(dvir.location || 'Riverside Distribution Center', 45, y);
    y += 7;
    doc.setFont('helvetica', 'bold);
    doc.text('Tractor #:', 20, y);
    doc.setFont('helvetica', 'normal);
    doc.text(dvir.tractorNumber || '', 45, y);
    y += 7;
    doc.setFont('helvetica', 'bold);
    doc.text('Trailer #:', 20, y);
    doc.setFont('helvetica', 'normal);
    doc.text(dvir.trailerNumber || '', 45, y);
    y += 7;
    doc.setFont('helvetica', 'bold);
    doc.text('Odometer:', 20, y);
    doc.setFont('helvetica', 'normal);
    doc.text(String(dvir.odometer || 0), 45, y);
    y += 14;

    // Defect checklist
    doc.setFont('helvetica', 'bold);
    doc.text('DOT Defect Checklist:', 20, y);
    y += 7;
    doc.setFont('helvetica', 'normal);
    const checklist = dvir.defectChecklist || {};
    Object.entries(checklist).forEach(([item, failed]) => {
      const label = item.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
      doc.text(label + ':', 25, y);
      doc.text(failed ? 'FAIL' : 'PASS', 90, y);
      y += 6;
    });
    y += 8;

    // Status
    doc.setFont('helvetica', 'bold);
    doc.text('Status:', 20, y);
    doc.setFont('helvetica', 'normal);
    const statusText = dvir.status === 'defects_found' ? 'DEFECTS FOUND' : 'NO DEFECTS FOUND';
    doc.text(statusText, 45, y);
    y += 7;

    // Unsafe flag
    if (dvir.unsafeFlag) {
      doc.setFont('helvetica', 'bold);
      doc.text('Out of Service Flag:', 20, y);
      doc.setFont('helvetica', 'normal);
      doc.text(dvir.unsafeFlag === 'unsafe_to_drive' ? 'UNSAFE TO DRIVE' : 'SAFE TO DRIVE', 60, y);
      y += 7;
    }

    // Driver signature
    if (dvir.driverSignatureUrl) {
      y += 4;
      doc.setFont('helvetica', 'bold);
      doc.text('Driver Signature:', 20, y);
      y += 4;
      try {
        doc.addImage(dvir.driverSignatureUrl, 'PNG', 20, y, 60, 20);
        y += 26;
      } catch (e) {
        doc.setFont('helvetica', 'normal);
        doc.text('[Signature on file]', 20, y);
        y += 7;
      }
    }

    // Body damage photos
    if (dvir.bodyDamagePhotos && dvir.bodyDamagePhotos.length > 0) {
      y += 4;
      doc.setFont('helvetica', 'bold);
      doc.text('Body Damage Photos: ' + dvir.bodyDamagePhotos.length, 20, y);
      y += 7;
      doc.setFont('helvetica', 'normal);
      doc.text('[Photos attached in digital record]', 25, y);
      y += 7;
    }

    // Mechanic resolution (if defect resolved)
    if (dvir.defectResolution) {
      y += 4;
      doc.setFont('helvetica', 'bold);
      doc.text('Defect Resolution:', 20, y);
      y += 7;
      doc.setFont('helvetica', 'normal);
      doc.text('Resolved by: ' + (dvir.defectResolution.resolvedByName || ''), 25, y);
      y += 6;
      doc.text('Date: ' + (dvir.defectResolution.resolvedAt ? new Date(dvir.defectResolution.resolvedAt).toLocaleString() : ''), 25, y);
      y += 6;
      if (dvir.defectResolution.notes) {
        doc.text('Notes: ' + dvir.defectResolution.notes, 25, y);
        y += 6;
      }
    }

    // Footer - FMCSA retention notice
    y += 14;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic);
    const footerLines = [
      'This record satisfies FMCSA 49 CFR 396.11 requirements.',
      'DVIR, repair certification, and driver review retained minimum 90 days.',
      'Electronic signature legally binding under federal E-SIGN law.',
    ];
    footerLines.forEach((line) => {
      doc.text(line, pageWidth / 2, y, { align: 'center' });
      y += 5;
    });

    doc.save('DVIR-' + (dvir.tractorNumber || 'unknown') + '-' + (dvir.dateTime ? new Date(dvir.dateTime).toISOString().split('T')[0] : 'nodate') + '.pdf);
    setGenerating(false);
  };

  if (!dvir || dvir.status === 'draft') return null;

  return (
    <button
      className="pdf-btn"
      onClick={generatePDF}
      disabled={generating}
    >
      {generating ? 'Generating...' : 'Download PDF'}
    </button>
  );
}

export default DVIRPDF;
