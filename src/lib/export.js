import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

async function fetchFinalizedComments(userId, yearId, sectionId, quarter) {
  const studentsPath = `teachers/${userId}/schoolYears/${yearId}/sections/${sectionId}/students`;
  const studentsSnap = await getDocs(collection(db, studentsPath));

  const results = [];
  for (const studentDoc of studentsSnap.docs) {
    const student = { id: studentDoc.id, ...studentDoc.data() };
    const quarterPath = `${studentsPath}/${studentDoc.id}/quarters/${quarter}`;
    try {
      const quarterSnap = await getDoc(doc(db, quarterPath));
      if (quarterSnap.exists() && quarterSnap.data().status === 'finalized') {
        results.push({
          student,
          comment: quarterSnap.data().editedComment || quarterSnap.data().generatedComment || '',
        });
      }
    } catch (e) { /* skip */ }
  }

  results.sort((a, b) => (a.student.order || 0) - (b.student.order || 0));
  return results;
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportMarkdown(results, sectionLabel, quarter) {
  let content = `# ${sectionLabel} - ${quarter.toUpperCase()} Comments\n\n`;
  content += results.map((r) => `## ${r.student.name}\n\n${r.comment}\n`).join('\n---\n\n');
  const blob = new Blob([content], { type: 'text/markdown' });
  downloadBlob(blob, `${sectionLabel}_${quarter.toUpperCase()}_Comments.md`);
}

async function exportDocx(results, sectionLabel, quarter) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } = await import('docx');

  const children = [];

  // Title
  children.push(new Paragraph({
    children: [new TextRun({ text: `${sectionLabel} - ${quarter.toUpperCase()} Comments`, bold: true, size: 32 })],
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 300 },
  }));

  results.forEach((r, i) => {
    // Student name
    children.push(new Paragraph({
      children: [new TextRun({ text: r.student.name, bold: true, size: 26 })],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 100 },
    }));

    // Comment paragraphs
    const paragraphs = r.comment.split('\n\n').filter((p) => p.trim());
    paragraphs.forEach((p) => {
      children.push(new Paragraph({
        children: [new TextRun({ text: p.trim(), size: 22 })],
        spacing: { after: 120 },
      }));
    });

    // Divider (except after last)
    if (i < results.length - 1) {
      children.push(new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
        spacing: { before: 200, after: 200 },
      }));
    }
  });

  const docFile = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(docFile);
  downloadBlob(blob, `${sectionLabel}_${quarter.toUpperCase()}_Comments.docx`);
}

async function exportPdf(results, sectionLabel, quarter) {
  const { jsPDF } = await import('jspdf');

  const pdf = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const usableWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (needed) => {
    const pageHeight = pdf.internal.pageSize.getHeight();
    if (y + needed > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  // Title
  pdf.setFontSize(18);
  pdf.setFont(undefined, 'bold');
  pdf.text(`${sectionLabel} - ${quarter.toUpperCase()} Comments`, margin, y);
  y += 12;

  results.forEach((r, i) => {
    checkPageBreak(20);

    // Student name
    pdf.setFontSize(13);
    pdf.setFont(undefined, 'bold');
    pdf.text(r.student.name, margin, y);
    y += 7;

    // Comment text
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    const lines = pdf.splitTextToSize(r.comment, usableWidth);
    lines.forEach((line) => {
      checkPageBreak(5);
      pdf.text(line, margin, y);
      y += 4.5;
    });

    // Spacing between students
    if (i < results.length - 1) {
      y += 6;
      checkPageBreak(2);
      pdf.setDrawColor(200);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 8;
    }
  });

  pdf.save(`${sectionLabel}_${quarter.toUpperCase()}_Comments.pdf`);
}

export async function exportComments(userId, yearId, sectionId, quarter, sectionLabel, format = 'markdown') {
  const results = await fetchFinalizedComments(userId, yearId, sectionId, quarter);

  if (results.length === 0) {
    return null;
  }

  switch (format) {
    case 'docx':
      await exportDocx(results, sectionLabel, quarter);
      break;
    case 'pdf':
      await exportPdf(results, sectionLabel, quarter);
      break;
    case 'markdown':
    default:
      exportMarkdown(results, sectionLabel, quarter);
      break;
  }

  return results.length;
}
