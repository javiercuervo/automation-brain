# Publisher Pre-Matricula DECA

Publisher de Google Apps Script para el flujo de pre-matriculacion del Instituto Internacional de Teologia a Distancia.

## Flujo

```
Getformly (formulario)
    |
    v
Google Sheets (raw_getformly) - Buffer append-only
    |
    v [Trigger cada 5 min]
Apps Script (este publisher) - Validacion + external_id
    |
    v [POST webhook]
Pabbly Connect - Orquestacion
    |
    v [Search + Upsert]
Stackby (SoT) - Solicitudes_PreMatricula
```

## Archivos

| Archivo | Descripcion |
|---------|-------------|
| `config.gs` | Constantes de configuracion y manejo de secrets |
| `publisher_prematricula.gs` | Logica principal del publisher |

## Configuracion inicial

### 1. Crear proyecto en Apps Script

1. Abrir Google Sheets del buffer (`raw_getformly`)
2. Menu: **Extensiones > Apps Script**
3. Renombrar proyecto a "Publisher Pre-Matricula DECA"

### 2. Crear archivos

1. Crear archivo `config.gs` y pegar el contenido de `config.gs`
2. Crear archivo `publisher.gs` y pegar el contenido de `publisher_prematricula.gs`
3. Guardar (Ctrl+S)

### 3. Configurar webhook de Pabbly

1. En Pabbly Connect, crear un nuevo flujo con trigger "Webhook / Catch Hook"
2. Copiar la URL del webhook generada
3. En Apps Script, abrir `config.gs`
4. Modificar la URL en la funcion `setupSecrets()`:
   ```javascript
   props.setProperty('PABBLY_WEBHOOK_URL', 'https://connect.pabbly.com/workflow/sendwebhookdata/TU_WEBHOOK_ID');
   ```
5. Ejecutar `setupSecrets()` una vez (menu Ejecutar > setupSecrets)

### 4. Verificar configuracion

1. Ejecutar `testConfig()` para verificar que todo esta OK
2. Revisar logs: **Ver > Registros de ejecucion**

### 5. Configurar trigger automatico

1. En Apps Script, ir a **Activadores** (icono reloj en la barra lateral)
2. Click en **+ Añadir activador**
3. Configurar:
   - Funcion: `sync`
   - Tipo de activador: Basado en tiempo
   - Tipo de intervalo: Minutos
   - Intervalo: Cada 5 minutos
4. Guardar

## Estructura de la hoja

La hoja `raw_getformly` debe tener las siguientes columnas:

| Columna | Indice | Campo | Descripcion |
|---------|--------|-------|-------------|
| A | 0 | submitted_at | Timestamp del envio de Getformly |
| B | 1 | email | Email del solicitante |
| C | 2 | nombre | Nombre completo |
| D | 3 | telefono | Telefono de contacto |
| E | 4 | programa | Programa/curso solicitado |
| F | 5 | sede | Campus o sede |
| G | 6 | external_id | (Auto) ID unico generado |
| H | 7 | published_at | (Auto) Timestamp de publicacion |
| I | 8 | publish_attempts | (Auto) Contador de intentos |
| J | 9 | last_error | (Auto) Ultimo error registrado |

> **Nota:** Las columnas G-J son de control y se llenan automaticamente.
> Si tu formulario tiene columnas diferentes, ajustar los indices en `CONFIG.COLUMNS` dentro de `config.gs`.

## Payload enviado a Pabbly

```json
{
  "external_id": "deca_pm_a1b2c3d4e5f6g7h8",
  "source": "getformly",
  "submitted_at": "2026-02-01T10:12:00.000Z",
  "ingested_at": "2026-02-01T10:13:10.000Z",
  "email": "alumno@dominio.com",
  "email_key": "alumno@dominio.com",
  "nombre": "Nombre Apellido",
  "telefono": "+34600123456",
  "programa": "DECA Primaria",
  "sede": "Madrid"
}
```

## Funciones de utilidad

### Testing

```javascript
// Verificar configuracion sin ejecutar sync
testConfig()

// Ejecutar sync manualmente y ver logs
testSync()

// Generar payload de ejemplo para probar Pabbly
generateSamplePayload()
```

### Mantenimiento

```javascript
// Resetear una fila especifica para re-procesar
resetRow(5)  // Fila 5

// Resetear todas las filas con error (para re-intentar)
resetAllErrors()
```

## Personalizacion

### Cambiar columnas del formulario

Si tu formulario de Getformly tiene columnas diferentes, editar `CONFIG.COLUMNS` en `config.gs`:

```javascript
COLUMNS: {
  SUBMITTED_AT: 0,  // Indice de columna (0 = A, 1 = B, etc.)
  EMAIL: 1,
  NOMBRE: 2,
  // ... ajustar segun tu estructura
}
```

### Cambiar campos requeridos

```javascript
REQUIRED_FIELDS: ['EMAIL', 'SUBMITTED_AT', 'PROGRAMA'],
```

### Ajustar reintentos

```javascript
MAX_ATTEMPTS: 5,        // Intentos maximos por fila
MAX_ROWS_PER_RUN: 50,   // Filas a procesar por ejecucion
```

## Monitoreo

### Logs de ejecucion

- **Apps Script:** Ver > Registros de ejecucion (muestra ultimas ejecuciones)
- **Google Cloud Logging:** Para logs persistentes (requiere proyecto Cloud vinculado)

### Indicadores de salud

| Indicador | Donde ver | Valor saludable |
|-----------|-----------|-----------------|
| Ejecuciones/hora | Apps Script > Ejecuciones | 12 (cada 5 min) |
| Filas pendientes | Sheets > Filtrar por H vacio | < 10 |
| Errores | Sheets > Columna J | Sin errores recientes |
| Intentos maximos | Sheets > Filtrar I >= 5 | 0 filas |

### Alertas recomendadas

1. **Si hay filas con `publish_attempts >= 5`:** Revisar `last_error` y corregir
2. **Si Pabbly no recibe eventos:** Verificar URL del webhook
3. **Si la ejecucion tarda >5 min:** Reducir `MAX_ROWS_PER_RUN`

## Troubleshooting

### "PABBLY_WEBHOOK_URL no configurada"

Ejecutar `setupSecrets()` despues de modificar la URL del webhook.

### "Hoja raw_getformly no encontrada"

Verificar que:
1. La hoja existe en el Spreadsheet
2. El nombre coincide exactamente (case-sensitive)
3. Ajustar `CONFIG.SHEET_NAME` si es diferente

### "Lock timeout"

Otra ejecucion esta en curso. Esperar 1 minuto y volver a intentar.

### Filas no se procesan

1. Verificar que tienen todos los campos requeridos (email, submitted_at, programa)
2. Verificar que `published_at` esta vacio
3. Verificar que `publish_attempts` < 5

### Error 4xx de Pabbly

El payload tiene formato incorrecto. Revisar:
1. Que Pabbly espera los campos que enviamos
2. Ejecutar `generateSamplePayload()` y probar manualmente en Pabbly

### Error 5xx de Pabbly

Problema temporal del servidor. El script reintenta automaticamente con backoff.

## Referencias

- [Flujo Pre-matriculacion DECA](../../docs/DECA_flujo_pre-matriculacion.md)
- [Costes y limites Apps Script](../../../generico/corpus/apps_script_education_DECA.md)
- [Documentacion Apps Script](https://developers.google.com/apps-script)
- [API Pabbly Webhooks](https://www.pabbly.com/connect/)
