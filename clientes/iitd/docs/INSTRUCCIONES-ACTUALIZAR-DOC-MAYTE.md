# Instrucciones para Actualizar Google Docs de Mayte

**Documento:** [Guía para validar - test MT](https://docs.google.com/document/d/1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg/edit?usp=sharing)
**Fecha:** 13 febrero 2026
**Responsable actualización:** Javier Cuervo

---

## 🎯 Objetivo

Añadir una nueva sección al documento de Mayte que documente:
1. Las 12 issues identificadas durante su validación
2. El estado actual de cada issue (pendiente / en marcha / resuelta)
3. Un sistema de confirmación para que Mayte valide cada resolución

---

## 📍 Ubicación en el Documento

**DESPUÉS DE:** Sección 10 - "Lo que falta y lo que necesitamos de vosotros"
**ANTES DE:** Sección 11 - "Checklist final"

**Acción:** Renumerar actual sección 11 (Checklist final) → pasa a ser sección 12

---

## ✏️ Contenido a Añadir

### Nueva Sección 11: Estado de Resolución de Issues

Copiar y pegar el siguiente contenido completo:

```markdown
---

## 11. Estado de Resolución de Issues

Esta sección documenta el progreso de los 12 problemas identificados durante tu validación del 12 de febrero de 2026.

**PROTOCOLO IMPORTANTE:**
- Javier marcará cada issue como "RESUELTA" cuando la implemente
- **TÚ (Mayte) debes CONFIRMAR** marcando el checkbox ✅ **SOLO después de verificar personalmente** que funciona
- Si algo no funciona o hay problemas, anótalo en la columna "Observaciones Mayte"
- Nunca marcar como confirmado sin probar primero

---

### 🔴 Issues Críticas - Sprint Hoy (50 min)

#### Issue #1: Accesos Stackby y Sheet Calificaciones

**Tu problema reportado (Sección 0):**
> "NO ME DEJA" acceder a Calificaciones Sheet y no tengo cuenta Stackby

**Estado:** ⏸️ PENDIENTE EJECUCIÓN

**Qué debe hacer Javier:**
1. Compartir "Calificaciones IITD" Sheet contigo (visualizador)
2. Invitarte a Stackby Stack "IITD Matriculación" (Editor)
3. Verificar que puedes acceder

**Qué debes verificar tú:**
1. Abrir link del Sheet Calificaciones IITD → ver las 3.573 filas
2. Ir a stackby.com → iniciar sesión con tu cuenta
3. Acceder a stack "IITD Matriculación"
4. Abrir todas las tablas: ALUMNOS_ACTUALES, CALIFICACIONES, CONTACTOS, INVENTARIO_SAAS

**Tu confirmación:**
- [ ] ✅ CONFIRMADO: Puedo acceder a Calificaciones Sheet
- [ ] ✅ CONFIRMADO: Puedo acceder a Stackby y ver todas las tablas

**Observaciones Mayte:**
```
(Escribe aquí si hay problemas)
```

---

#### Issue #2: Crear pestañas Dashboard y KPIs DECA

**Tu problema reportado (Sección 2.1):**
> "NO EXISTE" pestañas Dashboard y KPIs DECA (con capturas)

**Estado:** 🚧 EN MARCHA

**Qué debe hacer Javier:**
1. Ejecutar scripts `dashboard.mjs` y `kpis-deca.mjs`
2. Generar ambas pestañas en Panel IITD
3. Notificarte para que re-valides

**Qué debes verificar tú:**
1. Abrir Panel IITD (Google Sheet)
2. Buscar pestaña **"Dashboard"** en parte inferior
3. Verificar contenido:
   - Pipeline de alumnos (etapas: solicitó info → matriculado → pagado)
   - Alertas (solicitudes >7 días sin respuesta, >14 días sin pago)
   - Actividad reciente
4. Buscar pestaña **"KPIs DECA"**
5. Verificar contenido:
   - Embudo conversión (cuántos solicitan → matriculan → pagan)
   - Desglose Infantil/Primaria vs ESO/Bachillerato

**Tu confirmación:**
- [ ] ✅ CONFIRMADO: Pestaña Dashboard existe con contenido correcto
- [ ] ✅ CONFIRMADO: Pestaña KPIs DECA existe con contenido correcto
- [ ] ✅ CONFIRMADO: Los datos mostrados son coherentes

**Observaciones Mayte:**
```
(Escribe aquí si datos incorrectos o mejoras)
```

---

#### Issue #3: Corregir enlaces rotos Recibos y Certificados

**Tu problema reportado (Sección 2.1):**
> - "En la pestaña recibos no puedo abrir los enlaces" (captura)
> - "En la pestaña certificados los enlaces me dan error" (captura)

**Estado:** 🚧 EN MARCHA

**Qué debe hacer Javier:**
1. Verificar PDFs existen en Drive y SiteGround
2. Comprobar permisos carpetas (compartir contigo)
3. Regenerar Panel IITD con enlaces correctos
4. Verificar que enlaces funcionan

**Qué debes verificar tú:**
1. Abrir Panel IITD (Google Sheet)
2. Ir a pestaña **"Recibos"**
3. Hacer clic en 3-5 enlaces de PDFs diferentes
4. Verificar PDFs se abren correctamente en Drive
5. Ir a pestaña **"Certificados"**
6. Hacer clic en 3-5 enlaces de PDFs diferentes
7. Verificar certificados se abren correctamente

**Tu confirmación:**
- [ ] ✅ CONFIRMADO: Enlaces Recibos funcionan, PDFs se abren
- [ ] ✅ CONFIRMADO: Enlaces Certificados funcionan, PDFs se abren
- [ ] ✅ CONFIRMADO: Tengo permisos para ver todos los PDFs

**Observaciones Mayte:**
```
(Si algunos funcionan y otros no, anota cuáles)
```

---

### 🟡 Issues Importantes - Sprint Esta Semana (55 min)

#### Issue #4: BreezeDoc funcional con datos

**Tu problema reportado (Sección 5):**
> "NO SE PUEDE FIRMAR Y VA SIN DATOS"

**Estado:** ⏸️ PENDIENTE

**Qué debe hacer Javier:**
1. Configurar templates BreezeDoc con datos de prueba
2. Enviarte documento test para firma

**Qué debes verificar tú:**
1. Revisar email de BreezeDoc
2. Abrir documento
3. Verificar datos poblados (nombre, programa, fecha)
4. Firmar digitalmente con ratón/dedo
5. Confirmar firma quedó registrada

**Tu confirmación:**
- [ ] ✅ CONFIRMADO: Recibí email BreezeDoc
- [ ] ✅ CONFIRMADO: Documento tiene datos (no va vacío)
- [ ] ✅ CONFIRMADO: Puedo firmar digitalmente

**Observaciones Mayte:**
```
```

---

#### Issue #5: PDFs de ejemplo compartidos

**Tu problema reportado (Secciones 4.1, 4.2, 4.3):**
> "NO HE VISTO" PDFs de ejemplo

**Estado:** ⏸️ PENDIENTE

**Qué debe hacer Javier:**
1. Generar PDFs ejemplo: recibo + certificado + diploma
2. Crear carpeta Drive "PDFs Ejemplo IITD - Validación"
3. Compartir carpeta contigo
4. Enviarte enlace

**Qué debes verificar tú:**
1. Abrir carpeta compartida Drive
2. Revisar recibo PDF (diseño, datos Instituto, profesional)
3. Revisar certificado PDF (tabla notas, QR visible)
4. Revisar diploma PDF (formato formal)
5. Anotar cambios diseño necesarios

**Tu confirmación:**
- [ ] ✅ CONFIRMADO: Recibí acceso a carpeta con PDFs
- [ ] ✅ CONFIRMADO: Recibo profesional y correcto
- [ ] ✅ CONFIRMADO: Certificado con notas y QR visible
- [ ] ✅ CONFIRMADO: Diploma formato adecuado

**Observaciones Mayte:**
```
(Cambios de diseño sugeridos)
```

---

#### Issue #6: Test formulario ARCO+ envío email

**Tu problema reportado (Sección 1.2):**
> "NO LO SÉ" si el email llega al enviar formulario

**Estado:** ⏸️ PENDIENTE (requiere coordinación)

**Qué debe hacer Javier:**
1. Coordinar contigo fecha/hora para test conjunto
2. Mientras tú rellenas formulario, revisar bandeja informacion@institutoteologia.org
3. Verificar email llega con datos correctos

**Qué debes verificar tú:**
1. Rellenar formulario /ejercicio-derechos-rgpd/ con datos test
2. Enviar formulario
3. Confirmar con Javier que email llegó
4. Verificar datos coinciden

**Tu confirmación:**
- [ ] ✅ CONFIRMADO: Email llegó a informacion@institutoteologia.org
- [ ] ✅ CONFIRMADO: Datos del formulario coinciden con email recibido

**Observaciones Mayte:**
```
```

---

### 🟡 Issues Web - Sprint Semana Próxima (2h)

#### Issue #7: Portal ARCO+ responsive (elementos cortados)

**Tu problema reportado (Sección 1.2):**
> "Me sale esto en PC y móvil" (capturas elementos cortados)

**Estado:** ⏸️ PENDIENTE

**Qué debe hacer Javier:**
1. Arreglar CSS responsive
2. Probar PC y móvil
3. Enviarte capturas para validar

**Qué debes verificar tú:**
1. Abrir /ejercicio-derechos-rgpd/ en PC
2. Verificar formulario NO está cortado
3. Todos campos visibles y accesibles
4. Abrir en móvil
5. Verificar mismo comportamiento
6. Probar rellenar formulario completo en móvil

**Tu confirmación:**
- [ ] ✅ CONFIRMADO: Portal se ve bien en PC (no cortado)
- [ ] ✅ CONFIRMADO: Portal se ve bien en móvil
- [ ] ✅ CONFIRMADO: Puedo rellenar formulario en móvil

**Observaciones Mayte:**
```
```

---

#### Issue #8: Re-maquetar Política de Cookies

**Tu problema reportado (Sección 1.3):**
> "hay que volver a maquetar la página https://institutoteologia.org/politica-de-cookies/"

**Estado:** ⏸️ PENDIENTE

**Qué debe hacer Javier:**
1. Aplicar formato consistente con Aviso Legal y Privacidad
2. Añadir encabezados H2, listas, espaciado
3. Publicar cambios

**Qué debes verificar tú:**
1. Abrir /politica-de-cookies/
2. Verificar formato mejorado y consistente
3. Comparar con Aviso Legal y Privacidad
4. Verificar legibilidad clara

**Tu confirmación:**
- [ ] ✅ CONFIRMADO: Formato mejorado y profesional
- [ ] ✅ CONFIRMADO: Consistente con otras páginas legales

**Observaciones Mayte:**
```
```

---

#### Issue #9: Activar DNS diplomas.institutoteologia.org

**Tu problema reportado (Sección 1.6):**
> "Me aparece esto" (captura Error 404)

**Estado:** ⏸️ PENDIENTE (requiere 24-48h propagación DNS)

**Qué debe hacer Javier:**
1. Configurar DNS en registrador
2. Esperar propagación 24-48h
3. Verificar subdominio funciona
4. Notificarte

**Qué debes verificar tú:**
1. Esperar notificación Javier (DNS propagado)
2. Abrir diplomas.institutoteologia.org
3. Verificar NO sale Error 404
4. Escanear QR certificado ejemplo
5. Verificar QR descarga PDF

**Tu confirmación:**
- [ ] ✅ CONFIRMADO: diplomas.institutoteologia.org funciona
- [ ] ✅ CONFIRMADO: QR certificado descarga PDF correctamente

**Observaciones Mayte:**
```
```

---

### 🟢 Issues Mejoras - Febrero/Marzo (40 min)

#### Issue #10: Columnas Nombre/Apellidos en CALIFICACIONES

**Tu sugerencia (Sección 3.2):**
> "CREO QUE DEBERÍA TENER NOMBRE Y APELLIDOS"

**Estado:** ⏸️ PENDIENTE

**Qué debe hacer Javier:**
1. Añadir campos Nombre/Apellidos en Stackby
2. Actualizar scripts sincronización
3. Re-sincronizar datos

**Qué debes verificar tú:**
1. Abrir Stackby tabla CALIFICACIONES
2. Verificar columnas Nombre/Apellidos existen
3. Verificar datos poblados
4. Abrir Sheet Calificaciones IITD
5. Verificar columnas también en Sheet
6. Confirmar mejora usabilidad

**Tu confirmación:**
- [ ] ✅ CONFIRMADO: Columnas añadidas en Stackby
- [ ] ✅ CONFIRMADO: Columnas sincronizadas en Sheet
- [ ] ✅ CONFIRMADO: Mejora usabilidad (identifico alumnos fácilmente)

**Observaciones Mayte:**
```
```

---

#### Issue #11: Corregir documentación columnas

**Tu observación (Sección 3.1 y 3.2):**
> - Columna "Nº Expediente" **se llama "Notas"** en Stackby
> - Orden columnas CALIFICACIONES diferente al documentado

**Estado:** ⏸️ PENDIENTE

**Qué debe hacer Javier:**
1. Actualizar documentación con nombres reales
2. Corregir orden columnas
3. Aclarar discrepancias

**Qué debes verificar tú:**
1. Revisar documentación actualizada
2. Comparar con Stackby real
3. Verificar coinciden

**Tu confirmación:**
- [ ] ✅ CONFIRMADO: Documentación corregida y coincide con realidad

**Observaciones Mayte:**
```
```

---

### 🔴 Issue Urgente Futuro - Marzo/Abril

#### Issue #12: Migración Golden Soft → Holded

**Contexto:** Golden Soft caduca junio 2026
**Deadline:** 15 mayo 2026
**Estado:** ⏸️ PENDIENTE (requiere Gema)

**Qué debe hacer Javier:**
1. Contactar Gema para disponibilidad
2. Planificar migración 5-6 semanas
3. Ejecutar migración datos contables

**Qué debes hacer tú:**
1. Asegurar Gema informada urgencia
2. Coordinar disponibilidad Gema
3. Monitorear progreso

**Tu confirmación:**
- [ ] ✅ CONFIRMADO: Gema contactada y disponible
- [ ] ✅ CONFIRMADO: Migración iniciada antes mayo

**Observaciones Mayte:**
```
```

---

### 📊 Resumen Estado Issues

| Categoría | Total | Pendiente | En Marcha | Resueltas Confirmadas |
|-----------|-------|-----------|-----------|----------------------|
| Críticas (Hoy) | 3 | 1 | 2 | 0 |
| Importantes (Semana) | 3 | 3 | 0 | 0 |
| Web (Próxima semana) | 3 | 3 | 0 | 0 |
| Mejoras | 2 | 2 | 0 | 0 |
| Urgente Futuro | 1 | 1 | 0 | 0 |
| **TOTAL** | **12** | **10** | **2** | **0** |

**Progreso:** 0/12 issues completadas y confirmadas (0%)

**Última actualización:** 13 febrero 2026, 10:30

---

**RECORDATORIO IMPORTANTE:**
- Solo marca checkboxes ✅ después de verificar personalmente
- Si algo no funciona, anótalo en Observaciones
- Javier te notificará por email cuando issue esté lista para verificar
```

---

## ✅ Checklist Actualización

- [ ] Abrir Google Docs de Mayte en modo edición
- [ ] Ir a Sección 10 (al final)
- [ ] Añadir salto de página
- [ ] Copiar contenido completo de "Nueva Sección 11"
- [ ] Renumerar actual "11. Checklist final" → "12. Checklist final"
- [ ] Verificar formato correcto (encabezados, tablas, checkboxes)
- [ ] Guardar cambios
- [ ] Notificar a Mayte que documento ha sido actualizado

---

## 📧 Email a Mayte Post-Actualización

**Asunto:** 📋 Actualizado: Estado de resolución de tus 12 issues

**Cuerpo:**
```
Hola Mayte,

He actualizado tu documento de validación con una nueva sección 11 que documenta el estado de los 12 problemas que identificaste.

📄 **Documento:** https://docs.google.com/document/d/1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg/edit

**Qué verás en la nueva sección:**
- Estado actual de cada issue (pendiente / en marcha / resuelta)
- Qué problema reportaste exactamente
- Qué estoy haciendo para resolverlo
- Pasos claros para que verifiques cuando esté listo
- Checkboxes para que CONFIRMES cada resolución

**IMPORTANTE:**
Solo marca los checkboxes ✅ después de verificar personalmente que funciona. Si algo no funciona o hay problemas, usa el espacio "Observaciones Mayte" para anotarlo.

**Issues que estoy trabajando HOY (Sprint 50 min):**
1. #1: Darte accesos Stackby y Sheet Calificaciones ✅ (haré ahora)
2. #2: Crear pestañas Dashboard y KPIs DECA (en marcha)
3. #3: Corregir enlaces rotos Recibos/Certificados (en marcha)

Te notificaré por email cuando cada issue esté lista para que la verifiques.

¿Alguna duda sobre el nuevo formato de seguimiento?

Saludos,
Javier
```

---

**Preparado por:** Javier Cuervo / Proportione
**Fecha:** 13 febrero 2026
