# Guía CRM Proportione en Stackby

## Orden de ejecución

```
PASO 1  →  Preparar campos para scripts en UI (5 min)
PASO 2  →  Ejecutar script de actividades (automatico, ~15 min)
PASO 3  →  Traducir etapas del pipeline en UI (5 min)
PASO 4  →  Renombrar todas las columnas al espanol en UI (15 min)
PASO 5  →  Anadir campos adicionales en UI (15 min)
PASO 6  →  Crear tabla Proyectos en UI (10 min)
PASO 7  →  Configurar vistas en UI (30 min)
PASO 8  →  Configurar dashboard en UI (20 min)
```

**NOTA IMPORTANTE sobre campos Select:**
La API de Stackby solo acepta valores que ya existen como opciones en campos Single Select.
Para traducir opciones de Select, hay que renombrar las opciones en la UI (no via script).

---

## PASO 1: Preparar campos para scripts (ANTES de ejecutar)

### En la tabla Interactions:
El campo **Type** es Single Select sin opciones configuradas. Para que el script pueda escribir tipos:
1. Click derecho en el encabezado de la columna **Type**
2. Seleccionar **Customize field** o **Editar campo**
3. **Cambiar el tipo de campo** de "Single Select" a **"Single Line Text"**
4. Confirmar el cambio

### En la tabla Opportunities:
1. Click en el **+** a la derecha de la ultima columna
2. Nombre: `Tipo de Servicio`
3. Tipo: **Single Line Text** (NO Select — lo convertiremos despues)
4. Guardar

---

## PASO 2: Ejecutar script de actividades

Desde la terminal, en la carpeta `CRM/`:

```bash
# Restaura los tipos de actividad (Llamada, Reunion, Nota, Tarea)
node translate-activities.js

# Clasifica oportunidades por tipo de servicio
node classify-services.js
```

Esperar a que terminen sin errores antes de continuar.

**Despues de ejecutar los scripts:**
1. En Interactions: cambiar el campo **Type** de vuelta a **Single Select**
   (Stackby creara automaticamente las opciones a partir de los valores existentes)
2. En Opportunities: cambiar **Tipo de Servicio** a **Single Select** si lo deseas

---

## PASO 3: Traducir etapas del pipeline

El campo **Stage** es Single Select con opciones en ingles. Hay que renombrar cada opcion:

1. En la tabla **Opportunities**, click derecho en la columna **Stage**
2. Seleccionar **Customize field** o **Editar campo**
3. Renombrar cada opcion:

| Opcion actual | → Cambiar a |
|---|---|
| closedwon | Ganada |
| closedlost | Perdida |
| appointmentscheduled | Contacto Inicial |
| qualifiedtobuy | Calificada |
| presentationscheduled | Propuesta |
| decisionmakerboughtin | Negociacion |
| contractsent | Contrato Enviado |

4. Anadir nuevas opciones si no existen:
   - `Prospecto` (para nuevos leads)
5. Guardar

Todos los registros se actualizaran automaticamente con los nuevos nombres.

---

## PASO 4: Renombrar columnas al español

### Cómo renombrar una columna en Stackby:
1. Click derecho en el encabezado de la columna
2. Seleccionar "Rename" o "Editar campo"
3. Cambiar el nombre
4. Guardar

### Tabla: Contacts → renombrar a "Contactos"
(Click en el nombre de la tabla para renombrarla)

| Nombre actual | → Cambiar a |
|---|---|
| Full Name | Nombre Completo |
| Title | Cargo |
| Email | Email *(no cambiar)* |
| Phone | Telefono |
| Website | Web |
| Company | Empresa |

### Tabla: Companies → renombrar a "Empresas"

| Nombre actual | → Cambiar a |
|---|---|
| Company Name | Nombre |
| Industry | Sector |
| Employees | Empleados |
| Website | Web |

### Tabla: Opportunities → renombrar a "Oportunidades"

| Nombre actual | → Cambiar a |
|---|---|
| Deal Name | Nombre |
| Stage | Etapa |
| Status | Estado |
| Priority | Prioridad |
| Main Contacts | Contacto Principal |
| Owner | Responsable |
| Close Date | Fecha de Cierre |
| Total Value | Valor Total |
| Users | Usuarios |
| Price/User | Precio/Usuario |
| Company | Empresa |
| Tipo de Servicio | *(ya en espanol)* |
| Email | *(eliminar — click derecho → Delete field)* |

### Tabla: Interactions → renombrar a "Actividades"

| Nombre actual | → Cambiar a |
|---|---|
| Task Name | Titulo |
| Type | Tipo |
| Notes | Notas |
| Date | Fecha |
| Done? | Completada |
| Team Lead? | *(eliminar si no se usa)* |

---

## PASO 5: Añadir campos adicionales

### En "Contactos" — añadir:

| Campo | Tipo | Opciones |
|---|---|---|
| Rol en Venta | Single Select | Decisor, Influenciador, Champion, Usuario |
| Origen | Single Select | Referido, Web, Evento, LinkedIn, Otro |
| Ultimo Contacto | Date | — |
| Idioma | Single Select | Espanol, Ingles, Portugues |

### En "Empresas" — añadir:

| Campo | Tipo | Opciones |
|---|---|---|
| Tamano | Single Select | Startup, PYME, Mediana, Gran Empresa |
| Pais | Single Line Text | — |
| Ciudad | Single Line Text | — |
| Estado Cliente | Single Select | Activo, Inactivo, Prospecto |

### En "Oportunidades" — añadir:

| Campo | Tipo | Opciones / Fórmula |
|---|---|---|
| Probabilidad | Number (%) | — |
| Valor Ponderado | Formula | `{Valor Total} * {Probabilidad} / 100` |
| Motivo de Perdida | Single Select | Presupuesto, Competencia, Timing, Sin Necesidad, Otro |
| Proximo Seguimiento | Date | — |

### En "Actividades" — añadir:

| Campo | Tipo |
|---|---|
| Duracion (min) | Number |
| Proxima Accion | Single Line Text |

---

## PASO 6: Crear tabla "Proyectos"

1. Click en **+ Add Table** en la parte inferior
2. Nombre: **Proyectos**
3. Crear estos campos:

| Campo | Tipo | Opciones |
|---|---|---|
| Nombre | Single Line Text | — |
| Empresa | Link to "Empresas" | — |
| Oportunidad | Link to "Oportunidades" | — |
| Responsable | Single Line Text | — |
| Tipo de Servicio | Single Select | Formacion, Coaching, Consultoria, Desarrollo Web, Marketing, Otro |
| Estado | Single Select | Planificado, En Curso, Completado, Pausado, Cancelado |
| Fecha Inicio | Date | — |
| Fecha Fin | Date | — |
| Horas Estimadas | Number | — |
| Horas Reales | Number | — |
| Presupuesto | Currency (EUR) | — |
| Notas | Long Text | — |

---

## PASO 7: Configurar vistas

### Cómo crear una vista en Stackby:
1. En la barra lateral izquierda de la tabla, click en **+ Add View**
2. Seleccionar el tipo de vista (Grid, Kanban, Calendar, etc.)
3. Nombrar la vista
4. Configurar filtros, agrupaciones y ordenamiento

### Vistas para "Oportunidades":

**Vista 1: Kanban por Etapa** (tipo: Kanban)
- Campo de agrupacion: Etapa
- Orden de columnas: Prospecto → Calificada → Propuesta → Negociacion → Ganada → Perdida
- En cada tarjeta mostrar: Nombre, Valor Total, Contacto Principal
- Uso: Arrastrar deals entre etapas

**Vista 2: Pipeline Activo** (tipo: Grid)
- Filtro: Etapa NO es "Ganada" NI "Perdida"
- Ordenar por: Valor Total (descendente)
- Columnas visibles: Nombre, Empresa, Etapa, Valor Total, Tipo de Servicio, Contacto Principal, Proximo Seguimiento

**Vista 3: Ganadas** (tipo: Grid)
- Filtro: Etapa = "Ganada"
- Ordenar por: Fecha de Cierre (descendente)
- Agrupar por: Tipo de Servicio

**Vista 4: Por Tipo de Servicio** (tipo: Grid)
- Agrupar por: Tipo de Servicio
- Ordenar dentro de grupo: Valor Total (descendente)

**Vista 5: Calendario de Seguimiento** (tipo: Calendar)
- Campo de fecha: Proximo Seguimiento
- Color por: Etapa

### Vistas para "Contactos":

**Vista 1: Todos** (tipo: Grid — ya existe por defecto)
- Ordenar por: Nombre Completo (A-Z)
- Columnas principales: Nombre Completo, Cargo, Email, Empresa, Rol en Venta

**Vista 2: Por Empresa** (tipo: Grid)
- Agrupar por: Empresa
- Ordenar dentro: Cargo (A-Z)

**Vista 3: Por Rol** (tipo: Grid)
- Agrupar por: Rol en Venta
- Util para ver quienes son tus decisores vs influenciadores

### Vistas para "Empresas":

**Vista 1: Clientes Activos** (tipo: Grid)
- Filtro: Estado Cliente = "Activo"
- Ordenar por: Nombre (A-Z)

**Vista 2: Por Sector** (tipo: Grid)
- Agrupar por: Sector

**Vista 3: Por Pais** (tipo: Grid)
- Agrupar por: Pais
- Util para ver distribucion geografica (Espana, Panama, Portugal, etc.)

### Vistas para "Actividades":

**Vista 1: Calendario** (tipo: Calendar)
- Campo de fecha: Fecha
- Color por: Tipo

**Vista 2: Pendientes** (tipo: Grid)
- Filtro: Completada = false
- Ordenar por: Fecha (ascendente, los mas urgentes primero)

**Vista 3: Por Tipo** (tipo: Grid)
- Agrupar por: Tipo
- Ordenar dentro: Fecha (descendente)

### Vistas para "Proyectos":

**Vista 1: Kanban por Estado** (tipo: Kanban)
- Campo de agrupacion: Estado
- Orden: Planificado → En Curso → Completado

**Vista 2: En Curso** (tipo: Grid)
- Filtro: Estado = "En Curso"
- Columnas: Nombre, Empresa, Responsable, Fecha Fin, Horas Estimadas, Horas Reales

**Vista 3: Calendario** (tipo: Calendar)
- Campo de fecha: Fecha Fin
- Color por: Estado

---

## PASO 8: Dashboard ejecutivo

### Cómo crear un dashboard en Stackby:
1. Click en **Dashboard** en la barra superior
2. Añadir widgets arrastrando desde el panel

### Widgets recomendados:

**Fila 1 — KPIs principales (Summary boxes):**

| Widget | Tabla | Calculo | Filtro |
|---|---|---|---|
| Pipeline Activo | Oportunidades | Suma de Valor Total | Etapa ≠ Ganada, Perdida |
| Deals Ganados | Oportunidades | Count | Etapa = Ganada |
| Ingresos Totales | Oportunidades | Suma de Valor Total | Etapa = Ganada |
| Tasa de Conversion | Oportunidades | Ganadas / (Ganadas + Perdidas) | — |

**Fila 2 — Graficos:**

| Widget | Tipo | Datos |
|---|---|---|
| Pipeline por Etapa | Grafico de barras | Oportunidades agrupadas por Etapa, suma Valor Total |
| Ingresos por Servicio | Grafico de tarta | Oportunidades Ganadas agrupadas por Tipo de Servicio |

**Fila 3 — Tablas:**

| Widget | Datos |
|---|---|
| Top 10 Oportunidades | Grid: Pipeline Activo, top 10 por Valor Total |
| Actividad Reciente | Grid: Ultimas 10 actividades por Fecha |

---

## Etapas del Pipeline — Referencia rapida

| Etapa | Significado | Probabilidad sugerida |
|---|---|---|
| **Prospecto** | Contacto identificado, conversacion pendiente | 10% |
| **Calificada** | Necesidad confirmada, presupuesto y timeline definidos | 25% |
| **Propuesta** | Propuesta enviada, decisor identificado | 50% |
| **Negociacion** | Terminos en discusion, contrato en revision | 75% |
| **Ganada** | Contrato firmado | 100% |
| **Perdida** | No avanza (registrar motivo de perdida) | 0% |

---

## Mejores practicas

1. **Actualizar el CRM a diario**: Despues de cada llamada/reunion, registrar la actividad
2. **Mover deals por el pipeline**: Usar la vista Kanban para arrastrar deals entre etapas
3. **Siempre poner Proximo Seguimiento**: Ningun deal activo debe quedarse sin fecha de seguimiento
4. **Registrar motivo de perdida**: Cada deal perdido debe tener motivo para aprender
5. **Clasificar contactos por rol**: Saber quien es decisor vs influenciador ahorra tiempo
6. **Revisar pipeline semanalmente**: Revisar el dashboard para detectar deals estancados
7. **Crear proyecto al ganar**: Cada deal ganado debe tener un proyecto asociado para tracking de entrega
8. **Segmentar por tipo de servicio**: Usar los filtros para analizar que lineas de servicio generan mas ingresos
