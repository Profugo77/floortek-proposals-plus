import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Presupuesto, Alternativa, calcularSubtotalItem } from "@/types/presupuesto";

const EMERALD = [0, 121, 107] as const;
const fmt = (n: number) => `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Load an image - supports both base64 data URLs and regular URLs */
async function loadImageForPdf(url: string): Promise<string | null> {
  if (url.startsWith('data:')) {
    return url;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Load header image as base64 */
async function loadHeaderImage(): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = "/header_pdf.png";
  });
}

/** Draw footer on current page */
function drawFooter(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const footerH = 28;
  const footerY = pageH - footerH;

  doc.setFillColor(...EMERALD);
  doc.rect(0, footerY, pageW, footerH, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");

  const col1X = 15;
  let y = footerY + 5;
  doc.text("Munro", col1X, y);
  doc.setFont("helvetica", "normal");
  doc.text("Sivori 5180 – Munro – Bs As", col1X, y + 4);
  doc.text("(11) 4762 1872 / 0497", col1X, y + 8);
  doc.text("+54 9 11 2239 – 3653", col1X, y + 12);
  doc.text("info@floortek.com.ar", col1X, y + 16);

  const col2X = pageW / 2 + 10;
  doc.setFont("helvetica", "bold");
  doc.text("CABA", col2X, y);
  doc.setFont("helvetica", "normal");
  doc.text("Av. Cramer 2933 – CABA", col2X, y + 4);
  doc.text("(11) 4545 3335 – (11) 4543 8306", col2X, y + 8);
  doc.text("+54 9 11 2239 3653", col2X, y + 12);
  doc.text("info@floortek.com.ar", col2X, y + 16);

  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(pageW / 2, footerY + 3, pageW / 2, pageH - 3);
}

/** Draw header with full-width image */
function drawHeader(doc: jsPDF, headerData: string | null, presupuesto?: Presupuesto) {
  const pageW = doc.internal.pageSize.getWidth();
  const headerH = 32;

  if (headerData) {
    doc.addImage(headerData, "PNG", 0, 0, pageW, headerH);
  } else {
    doc.setFillColor(...EMERALD);
    doc.rect(0, 0, pageW, headerH, "F");
  }

  if (presupuesto) {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    const numText = `Presupuesto N° FT-${String(presupuesto.numero || 0).padStart(4, "0")}`;
    doc.text(numText, pageW - 15, 13, { align: "right" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha: ${new Date(presupuesto.fecha).toLocaleDateString("es-AR")}`, pageW - 15, 20, { align: "right" });
  }
}

/** Draw items table and return finalY */
function drawItemsTable(doc: jsPDF, items: Presupuesto["items"], startY: number): number {
  const tableData = items.map((item) => [
    item.producto_nombre,
    item.tipo === "material" ? "Material" : "Mano de Obra",
    fmt(item.precio_unitario),
    item.cantidad.toString(),
    `${item.descuento}%`,
    fmt(calcularSubtotalItem(item)),
  ]);

  autoTable(doc, {
    startY,
    head: [["Producto", "Tipo", "Precio Unit.", "Cant.", "Desc.", "Subtotal"]],
    body: tableData,
    headStyles: {
      fillColor: [EMERALD[0], EMERALD[1], EMERALD[2]] as [number, number, number],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 250, 249] },
    columnStyles: {
      0: { cellWidth: 60 },
      2: { halign: "right" },
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: 10, right: 10 },
  });

  return (doc as any).lastAutoTable.finalY;
}

/** Draw totals block and return finalY */
function drawTotals(doc: jsPDF, totales: { subtotal_materiales: number; subtotal_mano_obra: number; iva: number; total: number }, startY: number): number {
  const pageW = doc.internal.pageSize.getWidth();
  const finalY = startY + 10;

  doc.setFillColor(...EMERALD);
  doc.rect(pageW - 90, finalY, 80, 4, "F");

  const totalsX = pageW - 85;
  const valX = pageW - 15;
  let tY = finalY + 12;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Subtotal Materiales (neto):", totalsX, tY);
  doc.text(fmt(totales.subtotal_materiales), valX, tY, { align: "right" });
  tY += 7;
  doc.text("Subtotal Mano de Obra (neto):", totalsX, tY);
  doc.text(fmt(totales.subtotal_mano_obra), valX, tY, { align: "right" });
  tY += 7;
  doc.text("IVA (21%):", totalsX, tY);
  doc.text(fmt(totales.iva), valX, tY, { align: "right" });
  tY += 3;
  doc.setDrawColor(EMERALD[0], EMERALD[1], EMERALD[2]);
  doc.line(totalsX, tY, valX, tY);
  tY += 7;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...EMERALD);
  doc.text("TOTAL:", totalsX, tY);
  doc.text(fmt(totales.total), valX, tY, { align: "right" });

  return tY;
}

export async function generatePresupuestoPdf(presupuesto: Presupuesto) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const headerData = await loadHeaderImage();

  drawHeader(doc, headerData, presupuesto);

  // Client info
  let y = 37;
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(240, 240, 240);
  doc.rect(10, y - 5, pageW - 20, 22, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL CLIENTE", 15, y + 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Cliente: ${presupuesto.cliente_nombre}`, 15, y + 9);
  doc.text(`Dirección: ${presupuesto.cliente_direccion}`, 95, y + 9);
  doc.text(`Tel: ${presupuesto.cliente_telefono}`, 15, y + 15);

  y = 72;

  const hasAlternativas = presupuesto.alternativas && presupuesto.alternativas.length > 0;

  if (hasAlternativas) {
    // Render each alternativa as a separate section
    for (let ai = 0; ai < presupuesto.alternativas!.length; ai++) {
      const alt = presupuesto.alternativas![ai];

      // Check if we need a new page
      if (ai > 0) {
        doc.addPage();
        drawHeader(doc, headerData, presupuesto);
        y = 37;
      }

      // Alternativa title
      doc.setFillColor(EMERALD[0], EMERALD[1], EMERALD[2]);
      doc.rect(10, y, pageW - 20, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(alt.nombre.toUpperCase(), 15, y + 6);
      y += 12;

      // Items table
      const tableEndY = drawItemsTable(doc, alt.items, y);

      // Totals for this alternativa
      const totalsEndY = drawTotals(doc, alt, tableEndY);
      y = totalsEndY + 15;
    }

    // Total general de todas las alternativas
    if (presupuesto.mostrarTotalGeneral && presupuesto.alternativas!.length > 1) {
      const grandTotal = presupuesto.alternativas!.reduce(
        (acc, a) => ({
          subtotal_materiales: acc.subtotal_materiales + a.subtotal_materiales,
          subtotal_mano_obra: acc.subtotal_mano_obra + a.subtotal_mano_obra,
          iva: acc.iva + a.iva,
          total: acc.total + a.total,
        }),
        { subtotal_materiales: 0, subtotal_mano_obra: 0, iva: 0, total: 0 }
      );

      // Check if we need a new page
      if (y + 80 > pageH - 38) {
        doc.addPage();
        drawHeader(doc, headerData, presupuesto);
        y = 37;
      }

      // Grand total header bar
      doc.setFillColor(30, 30, 30);
      doc.rect(10, y, pageW - 20, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL GENERAL", 15, y + 6);
      y += 12;

      drawTotals(doc, grandTotal, y - 5);
    }
  } else {
    // Single items list (no alternativas)
    const tableEndY = drawItemsTable(doc, presupuesto.items, y);
    const totalsEndY = drawTotals(doc, presupuesto, tableEndY);
    y = totalsEndY;
  }

  // Comments section
  let currentY = y + 12;
  if (presupuesto.comentarios) {
    // Check page space
    if (currentY + 20 > pageH - 38) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text("COMENTARIOS:", 10, currentY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(presupuesto.comentarios, pageW - 20);
    doc.text(lines, 10, currentY + 6);
    currentY += 6 + lines.length * 4 + 8;
  }

  // Terms
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(130, 130, 130);
  const termsY = pageH - 38;
  doc.text("TÉRMINOS Y CONDICIONES:", 10, termsY);
  doc.text("• Presupuesto válido por 15 días. • Precios sujetos a cambios sin previo aviso.", 10, termsY + 5);
  doc.text("• Los plazos de entrega se confirman al momento de la compra. • Forma de pago a convenir.", 10, termsY + 9);

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc);
  }

  // Product catalog section (collect all items from alternativas or main, deduplicate by name)
  const allItems = hasAlternativas
    ? presupuesto.alternativas!.flatMap((a) => a.items)
    : presupuesto.items;

  const seenNames = new Set<string>();
  const catalogItems = allItems
    .filter((item) => {
      if (!(item.producto_imagen || item.producto_descripcion)) return false;
      if (seenNames.has(item.producto_nombre)) return false;
      seenNames.add(item.producto_nombre);
      return true;
    })
    .map((item) => {
      // Excluir imágenes de productos Pallmann (no mostrar imagen de piso)
      if (item.producto_nombre.toLowerCase().includes("pallmann")) {
        return { ...item, producto_imagen: undefined };
      }
      return item;
    });

  if (catalogItems.length > 0) {
    for (let ci = 0; ci < catalogItems.length; ci++) {
      const item = catalogItems[ci];
      doc.addPage();

      doc.setFillColor(...EMERALD);
      doc.rect(0, 0, pageW, 25, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Detalle de Producto", pageW / 2, 16, { align: "center" });

      let catY = 35;

      doc.setTextColor(...EMERALD);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      const nameLines = doc.splitTextToSize(item.producto_nombre, pageW - 30);
      doc.text(nameLines, 15, catY + 8);
      catY += 8 + nameLines.length * 8 + 5;

      doc.setTextColor(60, 60, 60);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`Precio: ${fmt(item.precio_unitario)} / unidad`, 15, catY);
      catY += 12;

      if (item.producto_imagen) {
        const imgData = await loadImageForPdf(item.producto_imagen);
        if (imgData) {
          const imgSize = 130;
          const imgX = (pageW - imgSize) / 2;
          doc.addImage(imgData, "JPEG", imgX, catY, imgSize, imgSize);
          catY += imgSize + 10;
        }
      }

      if (item.producto_descripcion) {
        if (catY + 30 > pageH - 35) {
          doc.addPage();
          catY = 20;
        }

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const descLines = doc.splitTextToSize(item.producto_descripcion, pageW - 40);
        const linesToShow = descLines.slice(0, 18);
        const boxH = 14 + linesToShow.length * 4.2;

        doc.setFillColor(50, 50, 50);
        doc.roundedRect(10, catY, pageW - 20, boxH, 3, 3, "F");

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("Características del producto", 18, catY + 9);

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(230, 230, 230);
        doc.text(linesToShow, 18, catY + 16);
      }

      drawFooter(doc);
    }
  }

  const safeNombre = presupuesto.cliente_nombre.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, "").trim().replace(/\s+/g, "_");
  doc.save(`FloorTek-FT-${String(presupuesto.numero || 0).padStart(4, "0")}-${safeNombre}.pdf`);
}
