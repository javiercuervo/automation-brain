# Publisher DECA - Sincronización Sheets → Stackby

## Descripción

Este script sincroniza automáticamente las inscripciones del formulario DECA (Getformly → Google Sheets) con la base de datos en Stackby.

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `publisher.gs` | Lógica principal de sincronización |
| `config.gs` | Configuración de columnas, credenciales y parámetros |
| `appsscript.json` | Manifest del proyecto Apps Script |

## Cómo funciona

1. **Trigger automático** (cada 5 min) ejecuta `sync()`
2. Lee filas pendientes del spreadsheet
3. Valida campos obligatorios (email, apellidos, programa)
4. Genera un `external_id` único por fila
5. Envía a Stackby via API
6. Marca la fila como publicada

## Configuración

### Credenciales (ejecutar una vez)

```javascript
// En Apps Script, ejecutar setupSecrets()
// Los valores están en credentials.env (NO commitear)
```

### Trigger

Configurado en Apps Script > Triggers:
- Función: `sync`
- Evento: Tiempo
- Frecuencia: Cada 5 minutos

## Columnas de control

El script añade automáticamente estas columnas al spreadsheet:

| Columna | Descripción |
|---------|-------------|
| `external_id` | ID único generado (hash MD5) |
| `published_at` | Timestamp de sincronización exitosa |
| `publish_attempts` | Número de intentos |
| `last_error` | Último error (si hay) |

## Funciones útiles

- `testSync()` - Ejecutar sincronización manual
- `testConfig()` - Verificar configuración
- `resetRow(n)` - Resetear fila n para re-procesar
- `resetAllErrors()` - Resetear todas las filas con error
- `checkData()` - Diagnóstico de columnas

## API de Stackby

Formato correcto del payload:
```json
{"records": [{"field": {"Columna": "valor"}}]}
```

**IMPORTANTE:** Es `field` (singular), NO `fields`.

Ver documentación completa: https://github.com/javiercuervo/stackby-api-unofficial-docs

## IDs del proyecto

- **Spreadsheet:** `1FK0TPur-qCYyVGM0bRuHMa6I8Q7vp_TpFWz3_2M56DQ`
- **Hoja:** `Deca Inscripción`
- **Stack ID:** (ver credentials.env)
- **Table ID:** (ver credentials.env)
