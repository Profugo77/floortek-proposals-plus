import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Presupuesto, calcularSubtotalItem } from "@/types/presupuesto";

const EMERALD = [0, 121, 107] as const;
const fmt = (n: number) => `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
    // Start on a new page for catalog
    doc.addPage();
    let catY = 15;

    // Catalog header
    doc.setFillColor(...EMERALD);
    doc.rect(0, 0, pageW, 25, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Detalle de Productos", pageW / 2, 16, { align: "center" });

    catY = 35;

    for (const item of catalogItems) {
      // Check if we need a new page (each card ~70px tall)
      if (catY + 75 > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        catY = 15;
      }

      // Card background
      doc.setFillColor(248, 248, 248);
      doc.roundedRect(10, catY, pageW - 20, 65, 3, 3, "F");
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(10, catY, pageW - 20, 65, 3, 3, "S");

      let textX = 15;

      // Try to load product image
      if (item.producto_imagen) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject();
            img.src = item.producto_imagen!;
          });
          doc.addImage(img, "JPEG", 15, catY + 5, 50, 50);
          textX = 70;
        } catch {
          // Skip image if can't load
        }
      }

      // Product name
      doc.setTextColor(...EMERALD);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(item.producto_nombre, textX, catY + 12);

      // Price
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(fmt(item.precio_unitario) + " / unidad", textX, catY + 20);

      // Description
      if (item.producto_descripcion) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        const descLines = doc.splitTextToSize(item.producto_descripcion, pageW - textX - 20);
        doc.text(descLines.slice(0, 5), textX, catY + 28);
      }

      catY += 72;
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
