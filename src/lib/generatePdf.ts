import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Presupuesto, calcularSubtotalItem } from "@/types/presupuesto";

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

/** Load logo as base64 (PNG to preserve transparency) */
async function loadLogo(): Promise<string | null> {
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
    img.src = "/logo_floortek_pdf.png";
  });
}

/** Draw footer on current page */
function drawFooter(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const footerH = 28;
  const footerY = pageH - footerH;

  // Green bar
  doc.setFillColor(...EMERALD);
  doc.rect(0, footerY, pageW, footerH, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");

  // Munro column
  const col1X = 15;
  let y = footerY + 5;
  doc.text("Munro", col1X, y);
  doc.setFont("helvetica", "normal");
  doc.text("Sivori 5180 – Munro – Bs As", col1X, y + 4);
  doc.text("(11) 4762 1872 / 0497", col1X, y + 8);
  doc.text("+54 9 11 2239 – 3653", col1X, y + 12);
  doc.text("info@floortek.com.ar", col1X, y + 16);

  // CABA column
  const col2X = pageW / 2 + 10;
  doc.setFont("helvetica", "bold");
  doc.text("CABA", col2X, y);
  doc.setFont("helvetica", "normal");
  doc.text("Av. Cramer 2933 – CABA", col2X, y + 4);
  doc.text("(11) 4545 3335 – (11) 4543 8306", col2X, y + 8);
  doc.text("+54 9 11 2239 3653", col2X, y + 12);
  doc.text("info@floortek.com.ar", col2X, y + 16);

  // Center divider line
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(pageW / 2, footerY + 3, pageW / 2, pageH - 3);
}

/** Draw header bar with logo */
function drawHeader(doc: jsPDF, logoData: string | null, presupuesto?: Presupuesto) {
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(...EMERALD);
  doc.rect(0, 0, pageW, 32, "F");

  // Logo - proportional as per brand reference
  if (logoData) {
    doc.addImage(logoData, "PNG", 8, 4, 58, 24);
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

export async function generatePresupuestoPdf(presupuesto: Presupuesto) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  // Pre-load logo
  const logoData = await loadLogo();

  // Header
  drawHeader(doc, logoData, presupuesto);

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

  // Items table
  const tableData = presupuesto.items.map((item) => [
    item.producto_nombre,
    item.tipo === "material" ? "Material" : "Mano de Obra",
    fmt(item.precio_unitario),
    item.cantidad.toString(),
    `${item.descuento}%`,
    fmt(calcularSubtotalItem(item)),
  ]);

  autoTable(doc, {
    startY: y,
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

  // Totals section
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFillColor(...EMERALD);
  doc.rect(pageW - 90, finalY, 80, 4, "F");

  const totalsX = pageW - 85;
  const valX = pageW - 15;
  let tY = finalY + 12;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Subtotal Materiales (neto):", totalsX, tY);
  doc.text(fmt(presupuesto.subtotal_materiales), valX, tY, { align: "right" });
  tY += 7;
  doc.text("Subtotal Mano de Obra (neto):", totalsX, tY);
  doc.text(fmt(presupuesto.subtotal_mano_obra), valX, tY, { align: "right" });
  tY += 7;
  doc.text("IVA (21%):", totalsX, tY);
  doc.text(fmt(presupuesto.iva), valX, tY, { align: "right" });
  tY += 3;
  doc.setDrawColor(EMERALD[0], EMERALD[1], EMERALD[2]);
  doc.line(totalsX, tY, valX, tY);
  tY += 7;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...EMERALD);
  doc.text("TOTAL:", totalsX, tY);
  doc.text(fmt(presupuesto.total), valX, tY, { align: "right" });

  // Comments section
  let currentY = tY + 12;
  if (presupuesto.comentarios) {
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
  const termsY = doc.internal.pageSize.getHeight() - 38;
  doc.text("TÉRMINOS Y CONDICIONES:", 10, termsY);
  doc.text("• Presupuesto válido por 15 días. • Precios sujetos a cambios sin previo aviso.", 10, termsY + 5);
  doc.text("• Los plazos de entrega se confirman al momento de la compra. • Forma de pago a convenir.", 10, termsY + 9);

  // Footer on first page
  drawFooter(doc);

  // Product catalog section
  const catalogItems = presupuesto.items.filter(
    (item) => item.producto_imagen || item.producto_descripcion
  );

  if (catalogItems.length > 0) {
    for (let ci = 0; ci < catalogItems.length; ci++) {
      const item = catalogItems[ci];
      doc.addPage();

      // Header bar
      doc.setFillColor(...EMERALD);
      doc.rect(0, 0, pageW, 25, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Detalle de Producto", pageW / 2, 16, { align: "center" });

      let catY = 35;

      // Product name
      doc.setTextColor(...EMERALD);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      const nameLines = doc.splitTextToSize(item.producto_nombre, pageW - 30);
      doc.text(nameLines, 15, catY + 8);
      catY += 8 + nameLines.length * 8 + 5;

      // Price
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`Precio: ${fmt(item.precio_unitario)} / unidad`, 15, catY);
      catY += 12;

      // Large product image
      if (item.producto_imagen) {
        const imgData = await loadImageForPdf(item.producto_imagen);
        if (imgData) {
          const imgSize = 130;
          const imgX = (pageW - imgSize) / 2;
          doc.addImage(imgData, "JPEG", imgX, catY, imgSize, imgSize);
          catY += imgSize + 10;
        }
      }

      // Description box
      if (item.producto_descripcion) {
        const pageH = doc.internal.pageSize.getHeight();
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

      // Footer on each catalog page
      drawFooter(doc);
    }
  }

  doc.save(`FloorTek-FT-${String(presupuesto.numero || 0).padStart(4, "0")}.pdf`);
}
