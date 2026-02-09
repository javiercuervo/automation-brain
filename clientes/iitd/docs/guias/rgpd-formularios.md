# Guía RGPD: Separación de consentimientos en formularios (N11)

**Fecha**: 2026-02-09
**Prioridad**: URGENTE (riesgo legal)
**Responsable implementación**: Proportione (WordPress) + Miriam (validación)

## Problema

El formulario de contacto de la web (`institutoteologia.org`) actualmente:
- Recoge datos de contacto (nombre, email, teléfono, mensaje)
- **No separa** el consentimiento de tratamiento del consentimiento de marketing
- Puede estar suscribiendo automáticamente a la newsletter (Acumbamail) sin consentimiento explícito

Esto incumple el RGPD (Art. 6 y 7): cada finalidad requiere un consentimiento **separado, libre, específico e informado**.

## Requisitos legales

### 1. Consentimientos separados
Cada formulario debe tener checkboxes independientes:

- **Checkbox obligatorio** (tratamiento):
  > "He leído y acepto la [Política de Privacidad]. Consiento el tratamiento de mis datos para gestionar mi consulta."

- **Checkbox opcional** (marketing):
  > "Deseo recibir información sobre cursos, novedades y actividades del Instituto por email."
  - **Desmarcado por defecto** (opt-in explícito)
  - Si no se marca, NO se suscribe a Acumbamail

### 2. Texto legal mínimo
Antes del botón de envío, mostrar:
> **Responsable**: Instituto Internacional de Teología a Distancia
> **Finalidad**: Responder a tu consulta y, si lo autorizas, enviarte comunicaciones comerciales.
> **Legitimación**: Tu consentimiento.
> **Destinatarios**: No se cederán datos a terceros salvo obligación legal.
> **Derechos**: Acceso, rectificación, supresión, portabilidad y oposición en alumnos@institutoteologia.org.
> **Más información**: [Política de Privacidad]

### 3. Registro de consentimiento
Para cada formulario enviado, registrar:
- Fecha y hora del consentimiento
- IP (si aplica)
- Texto exacto del checkbox que marcó
- Versión del formulario

## Implementación técnica

### WordPress (formulario de contacto)

1. **Añadir checkboxes** al formulario (Contact Form 7, Gravity Forms, o el que use):
   ```
   [checkbox* privacy-accept] He leído y acepto la Política de Privacidad...
   [checkbox marketing-accept] Deseo recibir comunicaciones comerciales...
   ```

2. **Campo oculto** con versión del formulario:
   ```
   [hidden form-version "v2.0-rgpd-2026"]
   ```

3. **Lógica condicional**: el campo `marketing-accept` se pasa al publisher de leads

### Stackby (tabla LEADS)

Añadir columnas:
| Columna | Tipo | Descripción |
|---------|------|-------------|
| consentimiento_privacidad | Checkbox | Siempre true (obligatorio) |
| consentimiento_marketing | Checkbox | true solo si opt-in explícito |
| version_formulario | Text | "v2.0-rgpd-2026" |
| fecha_consentimiento | DateTime | Timestamp del envío |

### Acumbamail

Modificar la lógica de suscripción:
```
SI consentimiento_marketing = true:
  → Suscribir a Acumbamail (lista newsletter)
SI NO:
  → NO suscribir
  → Solo guardar en Stackby LEADS para gestión de consulta
```

### Formulario DECA (Getformly)

El formulario DECA de inscripción ya recoge datos para matrícula (base legal: ejecución de contrato, no consentimiento). Pero:
- Revisar que NO tiene suscripción automática a newsletter
- Si se quiere enviar comunicaciones comerciales, añadir checkbox marketing separado
- La firma del formulario DECA es consentimiento de tratamiento para la matrícula, NO para marketing

## Formularios a revisar

| Formulario | Ubicación | Acción |
|------------|-----------|--------|
| Contacto web | institutoteologia.org | Añadir 2 checkboxes + texto legal |
| DECA inscripción | Getformly | Verificar que no suscribe a newsletter |
| Pre-matrícula | Getformly | Verificar |
| Blog (si existe formulario de suscripción) | WordPress | Checkbox marketing explícito |

## Cronograma sugerido

1. **Semana 1**: Modificar formulario de contacto web (WordPress)
2. **Semana 1**: Crear campos en Stackby LEADS
3. **Semana 2**: Revisar formularios Getformly (DECA, pre-matrícula)
4. **Semana 2**: Modificar lógica Acumbamail (solo suscribir con consentimiento)

## Verificación

- [ ] Formulario contacto web tiene 2 checkboxes separados
- [ ] Checkbox marketing desmarcado por defecto
- [ ] Texto legal visible antes del botón de envío
- [ ] Envío sin marcar marketing → NO aparece en Acumbamail
- [ ] Envío con marketing marcado → aparece en Acumbamail
- [ ] Campo `consentimiento_marketing` registrado en Stackby LEADS
- [ ] Formulario DECA NO suscribe automáticamente a newsletter
