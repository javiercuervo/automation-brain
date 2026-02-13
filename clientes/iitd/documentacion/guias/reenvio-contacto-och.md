# Guía: Reenviar formulario de contacto OCH a Miriam (N03)

**Para**: Sonia
**Fecha**: 2026-02-09
**Problema**: El formulario de contacto de OnlineCourseHost envía a `proportione@porqueviven.org` (Sonia). Miriam no lo ve.

## Opción 1: Reenvío automático en Gmail (recomendada)

### Pasos para Sonia

1. Abre Gmail con la cuenta `proportione@porqueviven.org`
2. Ve a **Configuración** (rueda dentada arriba a la derecha) → **Ver todos los ajustes**
3. Pestaña **"Filtros y direcciones bloqueadas"**
4. Clic en **"Crear un filtro nuevo"**
5. En el campo **"De"** escribe: `noreply@onlinecoursehost.com`
   (o el remitente que aparezca en los emails de contacto de OCH)
6. Clic en **"Crear filtro"**
7. Marca **"Reenviar a:"** y escribe: `alumnos@institutoteologia.org`
8. Marca también **"No enviar nunca a Spam"**
9. Si quieres que Sonia también lo vea, NO marques "Eliminar"
10. Clic en **"Crear filtro"**

### Verificación

Envía un formulario de contacto de prueba desde la web de OCH. Debe llegar a:
- `proportione@porqueviven.org` (Sonia, como siempre)
- `alumnos@institutoteologia.org` (Miriam, reenvío nuevo)

## Opción 2: Cambiar destinatario en OCH

Si Sonia no necesita ver estos emails:

1. Accede al panel de administración de OnlineCourseHost
2. Ve a **Settings** → **Notifications** (o similar)
3. Busca la configuración del formulario de contacto
4. Cambia el email de destino a `alumnos@institutoteologia.org`
5. Guarda los cambios

## Opción 3: Añadir CC en OCH

Si OCH permite múltiples destinatarios:

1. Panel OCH → Settings → Contact Form
2. Añadir `alumnos@institutoteologia.org` como CC
3. Así llega a ambas

## Notas

- El email de Miriam (secretaría) es: `alumnos@institutoteologia.org`
- Si hay dudas sobre la configuración de OCH, contactar a Proportione
