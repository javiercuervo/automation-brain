# Guía: Acceso a datos de alumnos en Stackby (N02)

**Para**: Josete, Miriam, equipo IITD
**Fecha**: 2026-02-09

## Qué es Stackby

Stackby es la base de datos donde se almacenan todos los datos de alumnos del Instituto. Funciona como una hoja de cálculo avanzada con filtros, vistas y exportación.

## Acceso directo

**URL**: [https://stackby.com/stHbLS2nezlbb3BL78](https://stackby.com/stHbLS2nezlbb3BL78)

Tablas disponibles:
- **SOLICITUDES_DECA** — Todas las solicitudes de matrícula DECA recibidas
- **ALUMNOS** — Registro maestro de alumnos (nombre, email, teléfono, DNI, programa, estado)

## Qué datos hay

Cada alumno tiene:
| Campo | Ejemplo |
|-------|---------|
| Email | juan.perez@gmail.com |
| Nombre | Juan |
| Apellidos | Pérez García |
| Teléfono | +34 600 123 456 |
| DNI | 12345678A |
| Programa | DECA |
| Estado | solicitud / admitido / pagado / enrolado / activo / baja |
| Docs estado | pendiente / parcial / completo / verificado |
| Estado pago | pendiente / parcial / pagado |

## Cómo filtrar

1. Abre la tabla ALUMNOS en Stackby
2. Haz clic en **"Filter"** (icono de embudo arriba a la derecha)
3. Añade condición: ej. `Estado` = `activo`
4. Los datos se filtran automáticamente

## Cómo exportar a CSV/Excel

1. Abre la tabla con el filtro que quieras
2. Haz clic en el menú **"..."** (tres puntos arriba a la derecha)
3. Selecciona **"Export as CSV"**
4. Se descarga un archivo .csv que puedes abrir en Excel

## Cómo crear una vista personalizada

1. Haz clic en **"Views"** en la barra lateral
2. **"+ Create View"**
3. Elige tipo: Grid (tabla), Kanban (columnas), o Calendar
4. Aplica filtros y ordena como necesites
5. La vista se guarda automáticamente

## Ejemplo: Ver solo alumnos DECA activos

1. Filtro 1: `Programa` = `DECA`
2. Filtro 2: `Estado` = `activo`
3. Ordenar por: `Apellidos` (A-Z)

## Preguntas frecuentes

**¿Los datos se actualizan solos?**
Sí. Cuando llega una solicitud DECA nueva, se sincroniza automáticamente.

**¿Puedo editar datos directamente en Stackby?**
Sí, pero con cuidado. Los campos de estado se gestionan por el sistema.

**¿Puedo compartir una vista con otro profesor?**
Sí. Usa "Share View" para generar un link de solo lectura.
