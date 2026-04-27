import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PresupuestoItem } from "@/types/presupuesto";

const EMERALD = [0, 121, 107] as const;

interface ListaObraData {
  numero: number;
  cliente_nombre: string;
  cliente_direccion: string;
  fecha: string;
  items: PresupuestoItem[];
}

/** Agrupa materiales por nombre y suma cantidades */
function consolidarMateriales(items: PresupuestoItem[]) {
  const map = new Map<string, { nombre: string; cantidad: number }>();
  items
    .filter((i) => i.tipo === "material")
    .forEach((i) => {
      const key = i.producto_nombre.trim();
      const existing = map.get(key);
      if (existing) {
        existing.cantidad += Number(i.cantidad) || 0;
      } else {
        map.set(key, { nombre: i.producto_nombre, cantidad: Number(i.cantidad) || 0 });
      }
    });
  return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export function generateListaObraPdf(data: ListaObraData) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const materiales = consolidarMateriales(data.items);

  if (materiales.length === 0) {
    throw new Error("No hay materiales en este presupuesto");
  }

  const numStr = `FT-${String(data.numero || 0).padStart(4, "0")}`;
  const [year, month, day] = data.fecha.split("-");
  const fechaStr = `${day}/${month}/${year}`;

  // ============ PÁGINA 1: CHECKLIST ============
  doc.setFillColor(...EMERALD);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("LISTA DE OBRA - MATERIALES", pageW / 2, 13, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Presupuesto ${numStr}  |  ${fechaStr}`, pageW / 2, 22, { align: "center" });

  // Datos cliente
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(240, 240, 240);
  doc.rect(10, 34, pageW - 20, 16, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Cliente:", 14, 41);
  doc.setFont("helvetica", "normal");
  doc.text(data.cliente_nombre, 32, 41);
  doc.setFont("helvetica", "bold");
  doc.text("Dirección:", 14, 47);
  doc.setFont("helvetica", "normal");
  doc.text(data.cliente_direccion || "-", 36, 47);

  // Tabla checklist
  autoTable(doc, {
    startY: 56,
    head: [["✓", "Material", "Cantidad"]],
    body: materiales.map((m) => ["", m.nombre, String(m.cantidad)]),
    headStyles: {
      fillColor: [EMERALD[0], EMERALD[1], EMERALD[2]] as [number, number, number],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 11,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 11,
      cellPadding: 4,
      minCellHeight: 10,
    },
    alternateRowStyles: { fillColor: [248, 250, 249] },
    columnStyles: {
      0: { cellWidth: 14, halign: "center" },
      1: { cellWidth: "auto" as any },
      2: { cellWidth: 30, halign: "center", fontStyle: "bold" },
    },
    margin: { left: 10, right: 10 },
    didDrawCell: (cellData) => {
      // Dibujar checkbox cuadrado en columna 0 del body
      if (cellData.section === "body" && cellData.column.index === 0) {
        const x = cellData.cell.x + cellData.cell.width / 2 - 3;
        const y = cellData.cell.y + cellData.cell.height / 2 - 3;
        doc.setDrawColor(80, 80, 80);
        doc.setLineWidth(0.4);
        doc.rect(x, y, 6, 6);
      }
    },
  });

  // Footer página checklist
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Total de materiales: ${materiales.length}  |  ${numStr} - ${data.cliente_nombre}`,
    pageW / 2,
    pageH - 8,
    { align: "center" }
  );

  // ============ HOJAS POR MATERIAL ============
  for (const mat of materiales) {
    doc.addPage();

    // Banda superior pequeña con número de presupuesto y cliente (referencia)
    doc.setFillColor(...EMERALD);
    doc.rect(0, 0, pageW, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`${numStr}  -  ${data.cliente_nombre}`, 10, 9);
    doc.text(fechaStr, pageW - 10, 9, { align: "right" });

    // Nombre del material - GRANDE, centrado vertical/horizontal en parte superior
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");

    // Calcular tamaño de fuente que entre en el ancho disponible
    const maxWidth = pageW - 30;
    let fontSize = 56;
    doc.setFontSize(fontSize);
    let lines = doc.splitTextToSize(mat.nombre.toUpperCase(), maxWidth);
    while (lines.length > 3 && fontSize > 24) {
      fontSize -= 4;
      doc.setFontSize(fontSize);
      lines = doc.splitTextToSize(mat.nombre.toUpperCase(), maxWidth);
    }

    // Centrar verticalmente el bloque del nombre en la mitad superior
    const nombreBlockH = lines.length * fontSize * 0.4;
    const nombreStartY = 60 + (90 - nombreBlockH) / 2;
    lines.forEach((line: string, i: number) => {
      doc.text(line, pageW / 2, nombreStartY + i * fontSize * 0.4, { align: "center" });
    });

    // Línea separadora
    doc.setDrawColor(...EMERALD);
    doc.setLineWidth(1.5);
    doc.line(30, 165, pageW - 30, 165);

    // CANTIDAD - GIGANTE
    doc.setTextColor(...EMERALD);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("CANTIDAD", pageW / 2, 185, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(140);
    doc.setFont("helvetica", "bold");
    doc.text(String(mat.cantidad), pageW / 2, pageH - 40, { align: "center" });
  }

  const safeNombre = data.cliente_nombre
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  doc.save(`ListaObra-${numStr}-${safeNombre}.pdf`);
}
