# Estado de Resolución de Issues - Validación Mayte

**Fecha creación:** 13 febrero 2026
**Última actualización:** 13 febrero 2026
**Documento origen:** [Guía para validar - test MT](https://docs.google.com/document/d/1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg/edit?usp=sharing)

---

## ⚠️ IMPORTANTE: Protocolo de Confirmación

**TODAS las resoluciones de issues requieren confirmación explícita de Mayte.**

**Procedimiento:**
1. ✅ Javier marca issue como "RESUELTA" cuando la implementa
2. 🔍 Mayte verifica la resolución siguiendo los pasos de verificación
3. ✅ Mayte marca checkbox "CONFIRMADO POR MAYTE" solo si funciona correctamente
4. ❌ Si no funciona o hay problemas, Mayte anota en "Observaciones Mayte"

**Nunca marcar una issue como completada sin validación de Mayte.**

---

## 📊 Resumen Ejecutivo

| Estado | Cantidad | Issues |
|--------|----------|--------|
| ✅ Resueltas y confirmadas | 0 | - |
| 🔄 Resueltas, pendientes confirmación | 0 | - |
| 🚧 En marcha | 3 | #1, #2, #3 |
| ⏸️ Pendientes | 9 | #4-#12 |
| **Total** | **12** | - |

**Progreso:** 0/12 issues completadas (0%)

---

## 🚧 ISSUES EN MARCHA - Sprint Hoy

### Issue #1: Accesos Mayte - Desbloquear validación ⏸️

**Estado actual:** PENDIENTE EJECUCIÓN
**Responsable:** Javier Cuervo
**Tiempo estimado:** 10 min

**Tareas pendientes:**
- [ ] Compartir "Calificaciones IITD" Sheet con mayte.tortosa@proportione.com (visualizador)
- [ ] Invitar Mayte a Stackby Stack "IITD Matriculación" (Editor)
- [ ] Verificar que puede acceder a ambos

**Problema reportado por Mayte:**
> "NO ME DEJA" acceder a Calificaciones Sheet (Sección 0 del doc de validación)

**Pasos de verificación para Mayte:**
1. Abrir link del Sheet Calificaciones IITD
2. Comprobar que puede ver las 3.573 filas de calificaciones
3. Ir a stackby.com e iniciar sesión
4. Verificar que puede acceder a stack "IITD Matriculación"
5. Abrir tablas: ALUMNOS_ACTUALES, CALIFICACIONES, CONTACTOS, INVENTARIO_SAAS

**Confirmación Mayte:**
- [ ] ✅ CONFIRMADO: Puedo acceder a Calificaciones Sheet
- [ ] ✅ CONFIRMADO: Puedo acceder a Stackby y ver todas las tablas

**Observaciones Mayte:**
```
(Espacio para que Mayte anote si hay problemas al verificar)
```

---

### Issue #2: Crear pestañas Dashboard y KPIs DECA 🚧

**Estado actual:** EN MARCHA
**Responsable:** Javier Cuervo
**Tiempo estimado:** 20 min

**Tareas pendientes:**
- [ ] Ejecutar `node dashboard.mjs` (genera pestaña Dashboard)
- [ ] Ejecutar `node kpis-deca.mjs` (genera pestaña KPIs DECA)
- [ ] Verificar ambas pestañas existen en Panel IITD
- [ ] Notificar a Mayte para re-validar

**Problema reportado por Mayte:**
> "NO EXISTE" pestañas Dashboard y KPIs DECA (Sección 2.1)
> Capturas muestran que pestañas documentadas como "Hechas" no existen

**Contexto técnico:**
- Scripts existen en el repositorio:
  - `/clientes/iitd/integraciones/alumnos/dashboard.mjs` (14 KB)
  - `/clientes/iitd/integraciones/alumnos/kpis-deca.mjs` (14 KB)
- Commit 83b6e63: "feat(iitd): add Sprint 4 tools — validation, dashboard, KPIs (N21, N16, N19)"
- Discrepancia: scripts implementados pero pestañas no generadas

**Pasos de verificación para Mayte:**
1. Abrir Panel IITD (Google Sheet)
2. Buscar pestaña **"Dashboard"** en la parte inferior
3. Verificar contenido:
   - Pipeline de alumnos (cuántos en cada etapa)
   - Alertas (solicitudes >7 días sin respuesta, >14 días sin pago)
   - Actividad reciente
4. Buscar pestaña **"KPIs DECA"**
5. Verificar contenido:
   - Embudo de conversión (solicitan info → matriculan → pagan)
   - Desglose por variante (Infantil/Primaria vs ESO/Bachillerato)

**Confirmación Mayte:**
- [ ] ✅ CONFIRMADO: Pestaña Dashboard existe y tiene contenido correcto
- [ ] ✅ CONFIRMADO: Pestaña KPIs DECA existe y tiene contenido correcto
- [ ] ✅ CONFIRMADO: Los datos mostrados son coherentes

**Observaciones Mayte:**
```
(Espacio para anotar problemas, datos incorrectos, o mejoras sugeridas)
```

---

### Issue #3: Corregir enlaces rotos Recibos y Certificados 🚧

**Estado actual:** EN MARCHA
**Responsable:** Javier Cuervo
**Tiempo estimado:** 20 min

**Tareas pendientes:**
- [ ] Verificar PDFs existen en Drive carpeta "Recibos IITD"
- [ ] Verificar PDFs existen en SiteGround (certificados)
- [ ] Comprobar permisos carpetas Drive (compartir con Mayte)
- [ ] Ejecutar `node sync-sheets.mjs` (regenerar Panel con enlaces correctos)
- [ ] Verificar enlaces funcionan

**Problema reportado por Mayte:**
> Sección 2.1 - Pestañas Recibos y Certificados:
> - "En la pestaña recibos no puedo abrir los enlaces" (captura)
> - "En la pestaña certificados los enlaces me dan error" (captura)

**Contexto técnico:**
- Scripts generadores:
  - `/clientes/iitd/integraciones/alumnos/recibo-pdf.mjs` (18 KB)
  - `/clientes/iitd/integraciones/alumnos/certificado-pdf.mjs` (31 KB)
- Probable causa: permisos insuficientes o enlaces no actualizados

**Pasos de verificación para Mayte:**
1. Abrir Panel IITD (Google Sheet)
2. Ir a pestaña **"Recibos"**
3. Hacer clic en 3-5 enlaces de PDFs diferentes
4. Verificar que PDFs se abren correctamente en Drive
5. Ir a pestaña **"Certificados"**
6. Hacer clic en 3-5 enlaces de PDFs diferentes
7. Verificar que certificados se abren correctamente

**Confirmación Mayte:**
- [ ] ✅ CONFIRMADO: Enlaces de Recibos funcionan y PDFs se abren
- [ ] ✅ CONFIRMADO: Enlaces de Certificados funcionan y PDFs se abren
- [ ] ✅ CONFIRMADO: Tengo permisos para ver todos los PDFs

**Observaciones Mayte:**
```
(Anotar si algunos enlaces funcionan y otros no, o si hay PDFs específicos con problemas)
```

---

## ⏸️ ISSUES PENDIENTES - Sprint Esta Semana

### Issue #4: Configurar BreezeDoc con templates funcionales

**Estado:** PENDIENTE
**Prioridad:** 🟡 ALTA
**Tiempo estimado:** 30 min

**Problema reportado por Mayte:**
> Sección 5: "NO SE PUEDE FIRMAR Y VA SIN DATOS"

**Tareas:**
- [ ] Verificar templates en BreezeDoc UI
- [ ] Modificar templates con datos de prueba (nombre, programa, etc.)
- [ ] Enviar documento de prueba a mayte.tortosa@proportione.com
- [ ] Verificar Mayte puede abrir, ver datos y firmar digitalmente

**Pasos verificación Mayte:**
1. Revisar email de BreezeDoc
2. Abrir documento para firma
3. Verificar que datos están poblados (nombre, programa, fecha)
4. Firmar digitalmente con ratón/dedo
5. Verificar que firma queda registrada

---

### Issue #5: Generar y compartir PDFs de ejemplo

**Estado:** PENDIENTE
**Prioridad:** 🟡 ALTA
**Tiempo estimado:** 15 min

**Problema reportado por Mayte:**
> Secciones 4.1, 4.2, 4.3: "NO HE VISTO" PDFs de ejemplo

**Tareas:**
- [ ] Ejecutar: `node recibo-pdf.mjs --email alumno.test@institutoteologia.org --upload`
- [ ] Ejecutar: `node certificado-pdf.mjs --email alumno.test@institutoteologia.org --programa DECA --upload`
- [ ] Crear carpeta Drive: "PDFs Ejemplo IITD - Validación"
- [ ] Copiar PDFs generados
- [ ] Compartir carpeta con mayte.tortosa@proportione.com
- [ ] Enviar enlace a Mayte

**Pasos verificación Mayte:**
1. Abrir carpeta compartida Drive
2. Revisar recibo PDF (diseño, datos Instituto, formato profesional)
3. Revisar certificado PDF (tabla notas, QR, formato)
4. Revisar diploma PDF (formato formal)
5. Anotar cambios de diseño necesarios

---

### Issue #6: Verificar formulario ARCO+ envío emails

**Estado:** PENDIENTE
**Prioridad:** 🟡 MEDIA
**Tiempo estimado:** 10 min

**Problema reportado por Mayte:**
> Sección 1.2: "NO LO SÉ" si el email llega al enviar formulario

**Tareas:**
- [ ] Coordinar con Mayte fecha/hora para test conjunto
- [ ] Mayte rellena formulario ARCO+ con datos test
- [ ] Javier revisa bandeja informacion@institutoteologia.org
- [ ] Verificar email llega con datos correctos
- [ ] Documentar resultado en guía tests

**Pasos verificación Mayte:**
1. Abrir institutoteologia.org/ejercicio-derechos-rgpd/
2. Rellenar formulario test (nombre, email, tipo derecho, mensaje)
3. Enviar formulario
4. Confirmar con Javier que email llegó
5. Verificar datos enviados coinciden con datos recibidos

---

### Issue #7: Corregir maquetación Portal ARCO+ responsive

**Estado:** PENDIENTE
**Prioridad:** 🟡 ALTA
**Tiempo estimado:** 1 hora

**Problema reportado por Mayte:**
> Sección 1.2: "Me sale esto en PC y móvil" (capturas muestran elementos cortados)

**Tareas:**
- [ ] Descargar capturas de Mayte
- [ ] Identificar problemas CSS (ancho fijo, overflow)
- [ ] Editar estilos WordPress theme/plugin
- [ ] Aplicar CSS responsive (max-width, media queries)
- [ ] Probar desktop (1920x1080, 1366x768)
- [ ] Probar móvil (iPhone, Android)
- [ ] Enviar capturas a Mayte para validar

**Pasos verificación Mayte:**
1. Abrir /ejercicio-derechos-rgpd/ en PC
2. Verificar formulario no está cortado
3. Todos los campos son visibles y accesibles
4. Abrir en móvil (smartphone)
5. Verificar mismo comportamiento responsive
6. Probar rellenar formulario completo en móvil

---

### Issue #8: Re-maquetar Política de Cookies

**Estado:** PENDIENTE
**Prioridad:** 🟡 MEDIA
**Tiempo estimado:** 30 min

**Problema reportado por Mayte:**
> Sección 1.3: "hay que volver a maquetar la página https://institutoteologia.org/politica-de-cookies/"

**Tareas:**
- [ ] Abrir /politica-de-cookies/ en WordPress editor
- [ ] Aplicar formato consistente con /aviso-legal/ y /politica-de-privacidad/
- [ ] Añadir encabezados H2, listas bullet, espaciado
- [ ] Crear tabla tipos de cookies si aplica
- [ ] Publicar cambios
- [ ] Verificar desktop y móvil

**Pasos verificación Mayte:**
1. Abrir institutoteologia.org/politica-de-cookies/
2. Verificar formato mejorado y consistente
3. Comparar con Aviso Legal y Privacidad
4. Verificar legibilidad y estructura clara
5. Probar en móvil

---

### Issue #9: Configurar DNS diplomas.institutoteologia.org

**Estado:** PENDIENTE
**Prioridad:** 🟡 MEDIA
**Tiempo estimado:** 30 min + 24-48h propagación

**Problema reportado por Mayte:**
> Sección 1.6: "Me aparece esto" (captura Error 404)

**Tareas:**
- [ ] Identificar registrar DNS de institutoteologia.org
- [ ] Acceder panel DNS
- [ ] Crear registro CNAME: diplomas → [servidor SiteGround]
- [ ] Guardar cambios DNS
- [ ] Esperar 24-48h propagación
- [ ] Verificar: `dig diplomas.institutoteologia.org`
- [ ] Verificar: abrir diplomas.institutoteologia.org en navegador

**Pasos verificación Mayte:**
1. Esperar notificación de Javier (DNS propagado)
2. Abrir diplomas.institutoteologia.org
3. Verificar subdominio funciona (no Error 404)
4. Probar escanear QR de certificado ejemplo
5. Verificar QR descarga PDF correctamente

---

### Issue #10: Añadir columnas Nombre/Apellidos en CALIFICACIONES

**Estado:** PENDIENTE
**Prioridad:** 🟢 MEDIA-BAJA
**Tiempo estimado:** 30 min

**Sugerencia de Mayte:**
> Sección 3.2: "CREO QUE DEBERÍA TENER NOMBRE Y APELLIDOS"

**Tareas:**
- [ ] Añadir campos Nombre/Apellidos en Stackby tabla CALIFICACIONES
- [ ] Actualizar `/calificaciones-client.mjs`
- [ ] Actualizar `/sync-calificaciones.mjs`
- [ ] Verificar compatibilidad con `/sheets-profesores.mjs`
- [ ] Re-sincronizar: `node sync-calificaciones.mjs --reverse`
- [ ] Verificar columnas aparecen en Sheet

**Pasos verificación Mayte:**
1. Abrir Stackby tabla CALIFICACIONES
2. Verificar columnas Nombre y Apellidos existen
3. Verificar datos están poblados correctamente
4. Abrir Sheet Calificaciones IITD
5. Verificar columnas aparecen también en Sheet
6. Confirmar mejora usabilidad (más fácil identificar alumnos)

---

### Issue #11: Actualizar documentación columnas reales

**Estado:** PENDIENTE
**Prioridad:** 🟢 BAJA
**Tiempo estimado:** 10 min

**Discrepancias reportadas por Mayte:**
> Sección 3.1: Columna documentada "Nº Expediente" **se llama "Notas"** en Stackby
> Sección 3.2: Orden columnas CALIFICACIONES diferente al documentado

**Tareas:**
- [ ] Documentar orden real de columnas CALIFICACIONES en Stackby
- [ ] Actualizar `/clientes/iitd/docs/GUIA-TESTS-VALIDACION-V2-CORREGIDA.md`
- [ ] Aclarar: 'Columna "Notas" (contiene Nº Expediente)'
- [ ] Corregir orden columnas en documentación
- [ ] Actualizar Google Docs de Mayte con correcciones

**Pasos verificación Mayte:**
1. Revisar documentación actualizada
2. Comparar con Stackby real
3. Verificar descripciones coinciden
4. Confirmar que clarificaciones son correctas

---

### Issue #12: N18 - Migración Golden Soft → Holded

**Estado:** PENDIENTE (CRÍTICO URGENTE)
**Prioridad:** 🔴 CRÍTICA
**Deadline:** 15 mayo 2026
**Tiempo estimado:** 5-6 semanas

**Contexto:**
- Golden Soft caduca junio 2026 (4 meses)
- Requiere coordinación con Gema (contadora IITD)
- Migración contable no puede fallar

**Fases:**
1. **Coordinación (1 semana):** Contactar Gema, agendar kick-off
2. **Backup y Análisis (1 semana):** Exportar datos Golden Soft
3. **Importación (2 semanas):** Migrar a Holded
4. **Verificación (1 semana):** Validar con Gema
5. **Go-Live (1 semana):** Capacitación y despliegue

**Pasos verificación Mayte:**
1. Asegurar que Gema está informada de urgencia
2. Coordinar disponibilidad Gema para reunión inicial
3. Monitorear progreso de migración
4. Verificar que no hay interrupción operativa

---

## 📝 Sección a Añadir en Google Docs de Mayte

**Ubicación sugerida:** Después de Sección 10 (Lo que falta y necesitamos)

**Título:** `11. Estado de Resolución de Issues`

**Contenido:**

```
## 11. Estado de Resolución de Issues

Esta tabla refleja el progreso de los 12 problemas identificados durante la validación del 12 de febrero de 2026.

**IMPORTANTE:** Mayte debe CONFIRMAR cada issue marcando el checkbox ✅ SOLO después de verificar personalmente que funciona.

### Issues Críticas (Sprint Hoy)

| Issue | Estado | Confirmado Mayte | Notas |
|-------|--------|------------------|-------|
| #1: Accesos Stackby y Sheet | ⏸️ Pendiente | [ ] | Javier debe compartir accesos |
| #2: Dashboard y KPIs DECA | 🚧 En marcha | [ ] | Pestañas no existen, scripts listos |
| #3: Enlaces Recibos/Certs | 🚧 En marcha | [ ] | PDFs no abren, revisar permisos |

### Issues Importantes (Esta Semana)

| Issue | Estado | Confirmado Mayte | Notas |
|-------|--------|------------------|-------|
| #4: BreezeDoc funcional | ⏸️ Pendiente | [ ] | No se puede firmar, va sin datos |
| #5: PDFs de ejemplo | ⏸️ Pendiente | [ ] | No he visto ejemplos |
| #6: Test formulario ARCO+ | ⏸️ Pendiente | [ ] | No sé si llega email |

### Issues Web (Semana Próxima)

| Issue | Estado | Confirmado Mayte | Notas |
|-------|--------|------------------|-------|
| #7: Portal ARCO+ responsive | ⏸️ Pendiente | [ ] | Elementos cortados PC y móvil |
| #8: Re-maquetar Cookies | ⏸️ Pendiente | [ ] | Hay que volver a maquetar |
| #9: DNS diplomas | ⏸️ Pendiente | [ ] | Error 404 en subdominio |

### Issues Mejoras

| Issue | Estado | Confirmado Mayte | Notas |
|-------|--------|------------------|-------|
| #10: Columnas Nombre/Apellidos | ⏸️ Pendiente | [ ] | Sugerencia mejora usabilidad |
| #11: Docs actualizadas | ⏸️ Pendiente | [ ] | Discrepancias columnas |

### Issue Urgente Futuro

| Issue | Estado | Confirmado Mayte | Deadline |
|-------|--------|------------------|----------|
| #12: Migración Holded | ⏸️ Pendiente | [ ] | 15 mayo 2026 |

**Progreso total:** 0/12 issues completadas (0%)

**Última actualización:** 13 febrero 2026
```

---

## 🔄 Proceso de Actualización de Este Documento

**Quién actualiza:**
- Javier actualiza estado "En marcha" → "Resuelta, pendiente confirmación"
- Mayte actualiza "Confirmado Mayte" → checkbox marcado ✅
- Mayte añade observaciones si hay problemas

**Frecuencia:**
- Javier: al completar cada issue
- Mayte: máximo 48h después de notificación

**Comunicación:**
- Javier notifica a Mayte por email cuando issue está lista para verificar
- Mayte responde confirmando o reportando problemas
- Si hay problemas, issue vuelve a estado "En marcha" con notas de Mayte

---

## 📧 Template Email Notificación

**Asunto:** ✅ Issue #X resuelta - Pendiente tu verificación

**Cuerpo:**
```
Hola Mayte,

He resuelto la Issue #X: [TÍTULO].

**Qué se ha hecho:**
- [Lista de cambios implementados]

**Pasos para que verifiques:**
1. [Paso 1]
2. [Paso 2]
3. [Paso 3]

Por favor, verifica y marca el checkbox "CONFIRMADO POR MAYTE" en el documento:
https://docs.google.com/document/d/1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg/edit

Si encuentras problemas, añade tus observaciones en la sección correspondiente.

Gracias,
Javier
```

---

**Documento preparado por:** Javier Cuervo / Proportione
**Próxima revisión:** Post-reunión IITD 13 febrero 2026
