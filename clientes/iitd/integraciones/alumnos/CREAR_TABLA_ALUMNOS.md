# Guía: Crear Tabla ALUMNOS en Stackby

## Opción A: Importar desde CSV (Recomendado)

### Paso 1: Preparar el archivo CSV

1. Usa `ALUMNOS_plantilla.csv` como base (solo contiene encabezados)
2. Consulta `ALUMNOS_ejemplo.csv` para ver cómo rellenar los datos
3. Asegúrate de que:
   - El archivo esté en **UTF-8**
   - Las fechas estén en formato **YYYY-MM-DD** (ej: 2026-02-01)
   - Los valores de Estado, Programa, etc. coincidan exactamente con las opciones

### Paso 2: Importar a Stackby

1. Ir a [Stackby](https://stackby.com/stHbLS2nezlbb3BL78)
2. Click en **"+ Add Table"** → **"Import Data"** → **"CSV"**
3. Selecciona tu archivo CSV
4. Stackby creará la tabla con las columnas automáticamente
5. Renombra la tabla a **ALUMNOS**

### Paso 3: Configurar tipos de columna

Después de importar, ajusta los tipos de columna manualmente:

| Columna | Cambiar a |
|---------|-----------|
| Estado | Single Select |
| Programa | Single Select |
| Docs estado | Single Select |
| Estado pago | Single Select |
| Fuente | Single Select |
| Fecha estado | Date |
| Fecha pago | Date |
| Ultimo acceso | Date |
| Progreso | Number (%) |
| Telefono | Phone |
| Email | Email |

---

## Opción B: Crear manualmente

### Paso 1: Crear la tabla

1. Ir a [Stackby](https://stackby.com/stHbLS2nezlbb3BL78)
2. Click en **"+ Add Table"** (o el botón de añadir tabla)
3. Nombre: **ALUMNOS**

### Paso 2: Crear columnas

Crea estas columnas en orden (la primera columna Email ya existe por defecto, renómbrala):

| # | Nombre columna | Tipo | Opciones |
|---|----------------|------|----------|
| 1 | **Email** | Email | - |
| 2 | **Nombre** | Text | - |
| 3 | **Apellidos** | Text | - |
| 4 | **Telefono** | Phone | - |
| 5 | **DNI** | Text | - |
| 6 | **Estado** | Single Select | Copiar opciones abajo ↓ |
| 7 | **Fecha estado** | Date | - |
| 8 | **Programa** | Single Select | Copiar opciones abajo ↓ |
| 9 | **Docs estado** | Single Select | Copiar opciones abajo ↓ |
| 10 | **Estado pago** | Single Select | Copiar opciones abajo ↓ |
| 11 | **Fecha pago** | Date | - |
| 12 | **OCH Student ID** | Text | - |
| 13 | **Ultimo acceso** | Date | - |
| 14 | **Progreso** | Number | Formato: Porcentaje |
| 15 | **Fuente** | Single Select | Copiar opciones abajo ↓ |
| 16 | **Notas** | Long Text | - |

## Paso 3: Opciones para Single Select

### Estado (copiar estas opciones):
```
solicitud
admitido
pagado
enrolado
activo
baja
```

### Programa:
```
DECA
Experto
Master
Curso libre
Otro
```

### Docs estado:
```
pendiente
parcial
completo
verificado
```

### Estado pago:
```
pendiente
parcial
pagado
```

### Fuente:
```
formulario_deca
polar
och
manual
```

## Paso 4: Obtener el TABLE_ID

1. Con la tabla ALUMNOS abierta, mira la URL del navegador
2. Tendrá este formato: `https://stackby.com/stHbLS2nezlbb3BL78/TABLE_ID_AQUI`
3. Copia el TABLE_ID (empieza con `tb...`)

## Paso 5: Configurar en Apps Script

1. Ir a Apps Script del proyecto DECA
2. Ejecutar la función `setupSecrets()`
3. Añadir esta línea con tu TABLE_ID:
```javascript
props.setProperty('STACKBY_ALUMNOS_TABLE_ID', 'tbXXXXXXXXXXXXXX');
```

## Paso 6: Verificar

Ejecutar `testUpsertAlumno()` en Apps Script para verificar que funciona.

---

---

## Añadir datos desde CSV (Append)

Si ya tienes la tabla ALUMNOS creada y quieres añadir más registros:

1. Abre la tabla ALUMNOS en Stackby
2. Click en el menú de vista (3 puntos o icono de menú)
3. Selecciona **"Append data from CSV"**
4. Sube tu archivo CSV
5. **Mapea las columnas**: Stackby te mostrará una pantalla para hacer coincidir las columnas del CSV con las de la tabla
6. Click en **"Save records"**

### Valores válidos para Single Select

Asegúrate de usar estos valores exactos en tu CSV:

| Columna | Valores válidos |
|---------|-----------------|
| Estado | `solicitud`, `admitido`, `pagado`, `enrolado`, `activo`, `baja` |
| Programa | `DECA`, `Experto`, `Master`, `Curso libre`, `Otro` |
| Docs estado | `pendiente`, `parcial`, `completo`, `verificado` |
| Estado pago | `pendiente`, `parcial`, `pagado` |
| Fuente | `formulario_deca`, `polar`, `och`, `manual` |

---

## Flujo de validación manual (Miriam)

### Cómo funciona

1. Las solicitudes DECA llegan a **Google Sheets** (hoja "Deca Inscripción")
2. También se copian automáticamente a **Stackby SOLICITUDES_DECA**
3. **Miriam revisa** cada solicitud en Google Sheets
4. Si es un alumno válido, marca **"Sí"** en la columna **"Es alumno"** (columna AB)
5. El sistema crea automáticamente el registro en **ALUMNOS_ACTUALES** de Stackby

### Columnas de control en Google Sheets

| Columna | Nombre | Descripción |
|---------|--------|-------------|
| AB | **Es alumno** | Miriam marca: `Sí` / `No` / (vacío) |
| AC | **alumno_created_at** | Fecha automática cuando se crea en ALUMNOS |

### Valores válidos para "Es alumno"

- `Sí` o `Si` o `Yes` → Se crea el alumno en Stackby
- `No` → No se procesa (rechazado)
- (vacío) → Pendiente de revisión

### Ejecución

El proceso `syncAlumnos()` se ejecuta automáticamente cada 5-10 minutos.
También se puede ejecutar manualmente desde Apps Script.
