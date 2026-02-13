# Uber Facturas → SparkReceipt

Automatizacion para descargar facturas (no recibos) de Uber for Business desde riders.uber.com y enviarlas a SparkReceipt.

## Flujo

```
riders.uber.com (perfil Empresa)
  ↓ Playwright (descarga PDFs factura)
SparkReceipt (cataloga, marca Wise, tag #proportione)
  ↓ Pabbly Connect (ya configurado)
Google Drive
```

## Componentes

| Archivo | Funcion |
|---------|---------|
| `uber-invoices.mjs` | Script principal: descarga facturas PDF + envia a SparkReceipt |
| `uber-storage-state.json` | Cookies/auth de Uber (generado con --auth) |
| `uber-invoices-state.json` | Tracking de facturas ya procesadas |
| `downloads/` | PDFs descargados |

## Setup

### 1. Instalar dependencias

```bash
cd clientes/proportione/scripts/expenses
npm install
```

### 2. Login en Uber (una vez, se renueva automaticamente)

```bash
npm run auth
# o: node uber-invoices.mjs --auth
```

Se abre navegador → inicia sesion con tu cuenta de Uber (drematec) → navega hasta ver viajes → cierra.

### 3. Configurar email (opcional)

Para envio automatico a SparkReceipt, crear App Password en Google:
1. Ir a myaccount.google.com → Seguridad → Verificacion en 2 pasos → Contraseñas de aplicacion
2. Crear una para "Correo" + "Mac"
3. Añadir a `.env`:

```
SMTP_PASS=xxxx xxxx xxxx xxxx
```

Sin esto, las facturas se descargan pero no se envian (envio manual).

### 4. Ejecutar

```bash
# Ver que facturas hay pendientes (sin descargar nada)
npm run invoices:dry

# Descargar y enviar facturas nuevas
npm run invoices

# Re-procesar todas (ignorar estado)
npm run invoices:all
```

## Como funciona

1. **Auth**: Reutiliza cookies guardadas de riders.uber.com
2. **Trips**: Navega a `/trips?profile=BUSINESS` (solo viajes de empresa)
3. **Por cada viaje nuevo**:
   - Abre detalle del viaje
   - Click "Descarga la factura"
   - Obtiene URL firmada del PDF
   - Descarga el PDF a `downloads/`
   - (Opcional) Envia por email a SparkReceipt
4. **Estado**: Guarda trip IDs procesados en `uber-invoices-state.json`
5. **Deduplicacion**: No procesa viajes ya descargados (salvo `--all`)

## Datos

| Parametro | Valor |
|-----------|-------|
| SparkReceipt email | `proportione-97ymp+expense@to.sparkreceipt.com` |
| Uber trips URL | `riders.uber.com/trips?profile=BUSINESS` |
| Cuenta Uber | drematec (email personal) |
| SMTP | Gmail Proportione (javier.cuervo@proportione.com) |

## Troubleshooting

**Auth expirada (no carga viajes):**
```bash
npm run auth   # Re-login
```

**"Descarga la factura" no aparece:**
- Puede ser un viaje cancelado (0,00€) que no tiene factura
- El script lo salta automaticamente

**SMTP_PASS no configurado:**
- Las facturas se descargan igualmente a `downloads/`
- Puedes reenviarlas manualmente a SparkReceipt

**Quiero procesar solo un mes:**
- Usa `--all` para re-procesar todo, o borra entradas del state JSON
