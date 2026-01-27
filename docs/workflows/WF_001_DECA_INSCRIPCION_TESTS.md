# WF_001: Checklist de Pruebas

**Automatización**: WF_001_DECA_INSCRIPCION
**Versión**: 1.1.0

> **NOTA**: Todos los datos en este documento son SINTÉTICOS. No usar datos reales en pruebas.

---

## Pre-requisitos

- [ ] API Key de Stackby válida y configurada
- [ ] Google Sheets conectado en Pabbly
- [ ] Script `normalize_and_map.js` copiado en Code by Pabbly (Paso 4)
- [ ] Script `filter_and_decide.js` copiado en Code by Pabbly (Paso 6b)
- [ ] Workflow creado según documentación

---

## Casos de Prueba con 5 Filas Ejemplo

### Fila 1: Caso Happy Path (Curso completo)

**Input** (datos sintéticos):
```
Submitted On: 17 Oct, 2025 08:10
Tipo: Curso completo (24 ECTS)
Nombre: Estudiante
Apellidos: Primero Prueba
Email: student+001@example.com
DNI: 00000001T
Fecha nacimiento: Date: 07 Jul, 2004
Sexo: Masculino
```

**Expected**:
| Campo | Valor Esperado |
|-------|----------------|
| `control.action` | `UPSERT` → `CREATE` o `UPDATE` |
| `idempotency_key` | `stackby:SOLICITUDES_DECA:student+001@example.com:2025-10-17T08:10:00Z` |
| `Fecha de nacimiento` | `2004-07-07` |
| `Sexo` | `Masculino` |

**Verificaciones**:
- [ ] Registro creado/actualizado en Stackby
- [ ] Fecha parseada correctamente a ISO
- [ ] Idempotency key generada
- [ ] No hay errores en control.errors

---

### Fila 2: Caso Error (Campo requerido vacío)

**Input** (datos sintéticos):
```
Submitted On: 18 Oct, 2025 14:12
Tipo: Matriculación por módulos
Nombre: (VACÍO)
Apellidos: Segundo Sin-Nombre
Email: student+002@example.com
DNI: 00000002T
Sexo: MUJER
```

**Expected**:
| Campo | Valor Esperado |
|-------|----------------|
| `control.action` | `ERROR` |
| `control.reason` | Contiene "Campo requerido vacío: nombre" |
| `control.errors` | `["Campo requerido vacío: nombre"]` |

**Verificaciones**:
- [ ] Acción es ERROR
- [ ] Registro enviado a DLQ (sheet de errores)
- [ ] NO se crea registro en Stackby
- [ ] Error message claro y descriptivo

---

### Fila 3: Caso Normalización Sexo

**Input** (datos sintéticos):
```
Submitted On: 20 Oct, 2025 11:24
Nombre: Tercero
Apellidos: Normalización Sexo
Email: student+003@example.com
DNI: 00000003T
Sexo: Hombre
```

**Expected**:
| Campo | Valor Esperado |
|-------|----------------|
| `control.action` | `UPSERT` → `CREATE` o `UPDATE` |
| `data.normalized.sexo` | `Masculino` |
| `data.targets.Sexo` | `Masculino` |

**Verificaciones**:
- [ ] "Hombre" normalizado a "Masculino"
- [ ] Registro creado en Stackby con valor correcto
- [ ] No hay errores

---

### Fila 4: Caso Convalidación

**Input** (datos sintéticos):
```
Submitted On: 21 Oct, 2025 14:37
Tipo: Quiero solicitar convalidación
Nombre: Cuarto
Apellidos: Convalidación Test
Email: student+004@example.com
DNI: 00000004T
Estado civil: Pareja de hecho
```

**Expected**:
| Campo | Valor Esperado |
|-------|----------------|
| `control.action` | `UPSERT` → `CREATE` o `UPDATE` |
| `idempotency_key` | `stackby:SOLICITUDES_DECA:student+004@example.com:2025-10-21T14:37:00Z` |
| `data.normalized.estado_civil` | `Pareja de hecho` |

**Verificaciones**:
- [ ] Email con + parseado correctamente
- [ ] Estado civil preservado tal cual
- [ ] Registro creado en Stackby

---

### Fila 5: Caso Fecha con Formato Especial

**Input** (datos sintéticos):
```
Submitted On: 25 Oct, 2025 10:16
Nombre: Quinto
Apellidos: Fecha Especial
Email: student+005@example.com
DNI: 00000005T
Fecha nacimiento: Date: 07 Oct, 2004
Código postal: 06800 (con cero inicial)
```

**Expected**:
| Campo | Valor Esperado |
|-------|----------------|
| `control.action` | `UPSERT` → `CREATE` o `UPDATE` |
| `data.normalized.fecha_nacimiento` | `2004-10-07` |
| `data.normalized.codigo_postal` | `06800` |

**Verificaciones**:
- [ ] Fecha "Date: 07 Oct, 2004" parseada a "2004-10-07"
- [ ] Código postal preserva cero inicial
- [ ] Registro creado en Stackby

---

## Pruebas de Idempotencia

### Test: Ejecución Duplicada

**Procedimiento**:
1. Ejecutar workflow con Fila 1
2. Esperar que complete
3. Ejecutar workflow nuevamente con misma Fila 1

**Expected**:
- [ ] Segunda ejecución actualiza el registro existente (UPDATE)
- [ ] NO se crea duplicado
- [ ] `filter_and_decide.js` detecta match y retorna `action=UPDATE`

---

### Test: Mismo Email, Diferente Submitted On

**Procedimiento**:
1. Crear fila con email `student+test@example.com`, submitted `17 Oct 08:00`
2. Crear fila con email `student+test@example.com`, submitted `17 Oct 09:00`
3. Ejecutar workflow

**Expected**:
- [ ] Se crean 2 registros diferentes (CREATE + CREATE)
- [ ] Idempotency keys son diferentes
- [ ] Ambos registros existen en Stackby

---

## Pruebas de Error Handling

### Test: Fila Completamente Vacía

**Input**: Fila con todos los campos vacíos

**Expected**:
- [ ] `control.action` = `SKIP`
- [ ] `control.reason` = "Fila vacía detectada"
- [ ] No se escribe a Stackby ni DLQ

---

### Test: Email Inválido

**Input**: `Correo electrónico` = `"no-es-email"`

**Expected**:
- [ ] `control.action` = `ERROR`
- [ ] `control.errors` contiene "Email inválido"
- [ ] Registro enviado a DLQ

---

### Test: DNI Inválido

**Input**: `DNI / Pasaporte / NIE` = `"123"`

**Expected**:
- [ ] `control.action` = `ERROR`
- [ ] `control.errors` contiene "DNI/NIE inválido"

---

## Checklist Post-Pruebas

- [ ] **5 filas de muestra procesadas correctamente**
- [ ] **4 registros creados en Stackby** (filas 1, 3, 4, 5)
- [ ] **1 registro en DLQ** (fila 2 - nombre vacío)
- [ ] **Idempotencia verificada** (re-ejecución no duplica)
- [ ] **Normalización de Sexo funciona** (Hombre → Masculino)
- [ ] **Fechas parseadas a ISO** (Date: DD MMM, YYYY → YYYY-MM-DD)
- [ ] **Códigos postales preservan ceros**
- [ ] **Mapping de columnas correcto** (Sheet → Stackby)
- [ ] **Clave compuesta funciona** (email + submitted_on)

---

## Comandos de Verificación

### Verificar registros en Stackby

```bash
curl -X GET "https://stackby.com/api/betav1/rowlist/stHbLS2nezlbb3BL78/tbcoXCDU2ArgKH4eQJ?limit=10&offset=0" \
  -H "Authorization: Bearer TU_API_KEY" \
  -H "Content-Type: application/json" | python3 -m json.tool
```

### Buscar por email específico

```bash
curl -X GET "https://stackby.com/api/betav1/rowlist/stHbLS2nezlbb3BL78/tbcoXCDU2ArgKH4eQJ?search=student+001@example.com" \
  -H "Authorization: Bearer TU_API_KEY" \
  -H "Content-Type: application/json"
```

---

## Sign-off

| Rol | Nombre | Fecha | Firma |
|-----|--------|-------|-------|
| QA | | | |
| Dev | | | |
| Product | | | |

---

## Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.1.0 | Ene 2026 | Añadido paso filter_and_decide.js; anonimizados datos de prueba |
| 1.0.0 | Ene 2026 | Versión inicial |
