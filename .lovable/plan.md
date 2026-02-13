

## FloorTek - Sistema de Gestión de Presupuestos

Aplicación profesional para crear, calcular y exportar presupuestos de revestimientos con la marca FloorTek.

---

### 1. Diseño y Marca
- Paleta de colores: Verde Esmeralda (#00796B), Negro y Blanco
- Logo de FloorTek en el encabezado con el slogan "Hacemos de tu casa, tu hogar"
- Diseño moderno, limpio y profesional con tipografía clara
- Interfaz responsive adaptada a escritorio y tablets

---

### 2. Página Principal — Crear Presupuesto
- **Encabezado** con logo de FloorTek y número de presupuesto correlativo automático (ej: FT-0001)
- **Sección Datos del Cliente**: Nombre, Dirección y Teléfono
- **Sección Ítems del Presupuesto**:
  - Buscador autocompletable de productos con datos de ejemplo (Roble Tivoli, Zócalo Top Line, Porcelanato Calacatta, etc.)
  - Opción de entrada manual para productos personalizados (nombre + precio)
  - Selector de tipo: "Material" (IVA incluido) o "Mano de Obra" (sin IVA)
  - Campos para cantidad y porcentaje de descuento por ítem
  - Botón para agregar y eliminar ítems
- **Panel de Totales en pantalla**:
  - Subtotal Materiales (neto sin IVA)
  - Subtotal Mano de Obra (neto)
  - IVA desglosado (21%)
  - **Total Final con IVA**

---

### 3. Lógica de Cálculos (IVA)
- Materiales: el precio unitario YA incluye 21% IVA → se calcula el neto dividiendo entre 1.21
- Mano de Obra: el precio unitario NO incluye IVA → se suma el 21% al total
- Se muestran ambos desgloses claramente en pantalla y en el PDF

---

### 4. Generación de PDF Profesional
- Diseño estilo catálogo/revista con encabezados verde esmeralda
- Logo de FloorTek en la cabecera del PDF
- Datos del cliente y número/fecha de presupuesto
- Tabla de ítems con imagen miniatura del producto, descripción, cantidad, precio, descuento y subtotal
- Pie de página con desglose de totales (Subtotal Materiales, Subtotal Mano de Obra, IVA, Total Final)
- Términos y condiciones legales al pie
- Descarga automática al presionar "Generar Presupuesto"

---

### 5. Historial de Presupuestos (Supabase)
- Base de datos en Supabase para almacenar presupuestos con todos sus ítems
- Página de historial con listado de presupuestos guardados
- Filtro por cliente o número de presupuesto
- Posibilidad de ver, duplicar o regenerar el PDF de presupuestos anteriores
- Numeración correlativa automática gestionada desde la base de datos

---

### 6. Catálogo de Productos de Ejemplo
- Base de datos precargada con productos de muestra (pisos laminados, porcelanatos, zócalos, adhesivos, etc.)
- Cada producto con nombre, precio, categoría e imagen de referencia
- Búsqueda rápida con autocompletado

