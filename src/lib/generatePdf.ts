import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Presupuesto, calcularSubtotalItem } from "@/types/presupuesto";

const EMERALD = [0, 121, 107] as const;
const fmt = (n: number) => `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Load an image as base64 data URL, handling CORS via proxy fallback */
async function loadImageAsDataUrl(url: string): Promise<string | null> {
  const tryLoad = (src: string): Promise<string | null> =>
    new Promise((resolve) => {
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
      img.src = src;
    });

  let result = await tryLoad(url);
  if (result) return result;

  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  result = await tryLoad(proxyUrl);
  return result;
}
export async function generatePresupuestoPdf(presupuesto: Presupuesto) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(...EMERALD);
  doc.rect(0, 0, pageW, 35, "F");

  // Try to load logo
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = "/logo_floortek.jpg";
    });
    doc.addImage(img, "JPEG", 10, 5, 25, 25);
  } catch {
    // Skip logo if can't load
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("FloorTek", 40, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text("Hacemos de tu casa, tu hogar", 40, 25);

  // Presupuesto number & date
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const numText = `Presupuesto N° FT-${String(presupuesto.numero || 0).padStart(4, "0")}`;
  doc.text(numText, pageW - 15, 15, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${new Date(presupuesto.fecha).toLocaleDateString("es-AR")}`, pageW - 15, 22, { align: "right" });

  // Client info
  let y = 45;
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

  // Product catalog section — only items with image or description from tiendapisos
  const catalogItems = presupuesto.items.filter(
    (item) => item.producto_imagen || item.producto_descripcion
  );

  if (catalogItems.length > 0) {
    const pageH = doc.internal.pageSize.getHeight();

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

      // Product name - large
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

      // Large product image (centered, up to 130x130mm)
      if (item.producto_imagen) {
        const imgData = await loadImageAsDataUrl(item.producto_imagen);
        if (imgData) {
          const imgSize = 130;
          const imgX = (pageW - imgSize) / 2;
          doc.addImage(imgData, "JPEG", imgX, catY, imgSize, imgSize);
          catY += imgSize + 10;
        }
      }

      // Description
      if (item.producto_descripcion) {
        if (catY + 30 > pageH - 30) {
          doc.addPage();
          catY = 20;
        }
        doc.setFillColor(245, 245, 245);
        const descBoxY = catY;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...EMERALD);
        doc.text("Descripción del producto:", 15, catY + 8);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        const descLines = doc.splitTextToSize(item.producto_descripcion, pageW - 30);
        const linesToShow = descLines.slice(0, 12);
        doc.text(linesToShow, 15, catY + 16);
        const boxH = 20 + linesToShow.length * 4.5;
        doc.roundedRect(10, descBoxY - 2, pageW - 20, boxH, 2, 2, "F");
        // Re-draw text on top of background
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...EMERALD);
        doc.text("Descripción del producto:", 15, catY + 8);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text(linesToShow, 15, catY + 16);
      }
    }
  }

  // Footer - Terms (on last page)
  const footerY = doc.internal.pageSize.getHeight() - 30;
  doc.setDrawColor(200, 200, 200);
  doc.line(10, footerY, pageW - 10, footerY);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(130, 130, 130);
  doc.text("TÉRMINOS Y CONDICIONES:", 10, footerY + 5);
  doc.text("• Presupuesto válido por 15 días. • Precios sujetos a cambios sin previo aviso.", 10, footerY + 10);
  doc.text("• Los plazos de entrega se confirman al momento de la compra. • Forma de pago a convenir.", 10, footerY + 14);
  doc.text("FloorTek - Hacemos de tu casa, tu hogar | www.floortek.com.ar", pageW / 2, footerY + 22, { align: "center" });

  doc.save(`FloorTek-FT-${String(presupuesto.numero || 0).padStart(4, "0")}.pdf`);
}
