# Matriz de Priorización de Automatizaciones IITD

**Fecha:** 2026-02-02
**Versión:** 1.1
**Última actualización:** 2026-02-02

## Estado de Implementación del TOP 5

| # | Automatización | Estado | Archivos |
|---|----------------|--------|----------|
| 1 | Notificación a Miriam | ✅ **IMPLEMENTADO** | `apps_script_deca/publisher.gs` |
| 2 | Script Acumbamail | ✅ **IMPLEMENTADO** | `acumbamail/acumbamail-client.js` |
| 3 | Sync OCH → Stackby | ✅ **IMPLEMENTADO** | `och-stackby-sync/sync-enrollments.js` |
| 4 | Dashboard Stackby | 📋 **DOCUMENTADO** | `integraciones/README.md` |
| 5 | Webhook Stripe | ✅ **IMPLEMENTADO** | `stripe-webhook/stripe-webhook-handler.js` |

---

## Criterios de Clasificación

### Eje 1 - Implementabilidad por Claude:
| Nivel | Descripción |
|-------|-------------|
| **A. Directo** | Puedo ejecutar ahora mismo con las APIs disponibles |
| **B. Configuración** | Necesito IDs/credenciales que el usuario puede dar |
| **C. Parcial** | Puedo hacer parte, otra parte requiere UI manual |
| **D. No viable** | Requiere acceso que no tengo o decisión humana |

### Eje 2 - Prioridad del documento:
- **Alta** / **Media** / **Baja**

---

## CUADRANTE 1: IMPORTANTE + DIRECTO (Hacer YA)

| # | Automatización | Stack | Qué puedo hacer | Falta |
|---|----------------|-------|-----------------|-------|
| 4.1 | Pipeline DECA completo | Apps Script + Stackby | ✅ Ya implementado (Publisher DECA) | Notificaciones a Miriam |
| 5.2 | Sync LMS → Stackby | OCH API + Stackby | Crear script que consulte OCH y actualice Stackby | IDs de cursos |
| 2.1 | Leads web → Stackby | Apps Script + Stackby | Copiar publisher.gs para otro formulario | Sheet ID + columnas |
| 6.1 | Alta Acumbamail con consentimiento | Acumbamail API | Script para añadir suscriptor con campos | List ID |
| 9.1 | ID único de alumno | Stackby | Script de deduplicación por email | Acceso a tabla Alumnos |

---

## CUADRANTE 2: IMPORTANTE + CONFIGURACIÓN (Próximas)

| # | Automatización | Stack | Qué puedo hacer | Falta |
|---|----------------|-------|-----------------|-------|
| 1.1 | Separar consentimientos | WordPress + Acumbamail | Alta en Acumbamail si checkbox B | Config del formulario WordPress |
| 5.1 | Dashboard operativo | Stackby | Crear vista/filtros en Stackby | Definir métricas exactas |
| 7.1 | Stripe → Stackby → Holded | Stripe MCP + APIs | Pipeline completo de pago a factura | Webhook Stripe configurado |
| 8.1 | KPIs DECA automáticos | Analytics + Stackby | Script extracción métricas | Acceso a Analytics/Search Console |
| 4.3 | Onboarding curso gratuito | OCH + Stackby | Matricular + registrar fuente | IDs curso gratuito |

---

## CUADRANTE 3: MEDIA PRIORIDAD + DIRECTO (Quick wins)

| # | Automatización | Stack | Qué puedo hacer | Esfuerzo |
|---|----------------|-------|-----------------|----------|
| 3.2 | Bundles y pricing | Stackby + OCH | Crear productos en Stackby sincronizados | 1-2h |
| 5.3 | Upsell tutorías | OCH + Acumbamail | Email trigger al finalizar curso | 1h |
| 6.2 | Tickets con IA | Stackby | Crear tabla tickets + categorización | 2h |
| 2.2 | CRM contactos institucionales | Stackby | Crear tabla + pipeline | 30min |

---

## CUADRANTE 4: REQUIERE DECISIÓN HUMANA O ACCESO ESPECIAL

| # | Automatización | Bloqueador |
|---|----------------|------------|
| 1.2 | Política borrado RGPD | Decisión legal sobre plazos |
| 1.3 | Inventario SaaS | Recopilación manual de contratos |
| 1.4 | Grabaciones y consentimientos | Decisión de política |
| 4.2 | Minimización DNI | Decisión operativa |
| 7.2 | Migración Golden Soft | Acceso a datos de salida |
| 9.2 | Validación migración | Datos origen |

---

## TOP 5 PARA IMPLEMENTAR AHORA

### 1. Notificación a Miriam cuando hay nueva solicitud DECA

**Estado actual:** Publisher funciona pero no notifica
**Implementabilidad:** A (Directo)
**Prioridad:** Alta

**Acción técnica:**
```javascript
// Añadir en publisher.gs después de crear row en Stackby
MailApp.sendEmail({
  to: "miriam@iitd.es",
  subject: "Nueva solicitud DECA: " + nombre,
  body: "Se ha recibido una nueva solicitud DECA.\n\n" +
        "Nombre: " + nombre + "\n" +
        "Email: " + email + "\n" +
        "Fecha: " + new Date().toLocaleString('es-ES')
});
```

**Checklist para empezar:**
- [ ] Confirmar email de Miriam
- [ ] Definir contenido del email
- [ ] Decidir si incluir link directo a Stackby

**Impacto operativo:** Miriam recibe notificación inmediata, puede actuar en <24h

---

### 2. Script para añadir alumno a Acumbamail

**Estado actual:** Alta manual en Acumbamail
**Implementabilidad:** B (Configuración)
**Prioridad:** Alta

**Acción técnica:**
```javascript
// Módulo reutilizable para Acumbamail
async function addSubscriberToAcumbamail(email, fields, listId) {
  const response = await fetch('https://acumbamail.com/api/1/addSubscriber/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      auth_token: ACUMBAMAIL_TOKEN,
      list_id: listId,
      email: email,
      merge_fields: JSON.stringify(fields),
      double_optin: '0'
    })
  });
  return response.json();
}
```

**Checklist para empezar:**
- [ ] Obtener API token de Acumbamail
- [ ] Identificar list_id de la lista principal
- [ ] Definir campos personalizados (nombre, origen, fecha_alta)
- [ ] Decidir si usar double opt-in

**Impacto operativo:** Automatiza 100% del alta de contactos con consentimiento

---

### 3. Sync enrolamientos OnlineCourseHost → Stackby

**Estado actual:** Registro manual o inexistente
**Implementabilidad:** B (Configuración)
**Prioridad:** Alta

**Acción técnica:**
```javascript
// Script de sincronización OCH → Stackby
async function syncOCHEnrollments() {
  // 1. Obtener cursos de OCH
  const courses = await ochClient.listCourses();

  // 2. Para cada curso, obtener alumnos matriculados
  for (const course of courses) {
    const enrollments = await ochClient.listEnrollments(course.id);

    // 3. Para cada alumno, crear/actualizar en Stackby
    for (const enrollment of enrollments) {
      await stackbyClient.upsertRow('Alumnos', {
        email: enrollment.email,
        nombre: enrollment.name,
        curso: course.name,
        fecha_matricula: enrollment.enrolled_at,
        estado: enrollment.status,
        progreso: enrollment.progress
      });
    }
  }
}
```

**Checklist para empezar:**
- [ ] Token de API de OnlineCourseHost
- [ ] IDs de los cursos a sincronizar
- [ ] Table ID de Stackby "Alumnos"
- [ ] Definir frecuencia de sync (diario, tiempo real)
- [ ] Decidir lógica de deduplicación (por email)

**Impacto operativo:** Visibilidad completa de alumnos, fuente única de verdad

---

### 4. Vista dashboard operativo en Stackby

**Estado actual:** Sin visión consolidada
**Implementabilidad:** C (Parcial - requiere UI)
**Prioridad:** Alta

**Acción técnica:**
Crear vistas filtradas en Stackby:
- **Solicitudes pendientes:** Estado = "Pendiente"
- **Inactivos 30 días:** Última actividad < 30 días
- **Sin pago:** Estado pago = "Pendiente"
- **Próximas tutorías:** Fecha tutoría = próximos 7 días

**Checklist para empezar:**
- [ ] Definir las 4-5 métricas clave a visualizar
- [ ] Identificar campos para filtrar en cada tabla
- [ ] Acceso a Stackby para crear vistas (requiere UI manual)
- [ ] Decidir si usar Stackby nativo o exportar a dashboard externo

**Impacto operativo:** Decisiones basadas en datos, alertas de seguimiento

---

### 5. Pipeline Stripe → Stackby (pago → estado pagado)

**Estado actual:** Actualización manual de estado de pago
**Implementabilidad:** B (Configuración)
**Prioridad:** Alta

**Acción técnica:**
```javascript
// Webhook handler para Stripe
async function handleStripeWebhook(event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Buscar alumno por email en Stackby
    const alumno = await stackbyClient.findRow('Alumnos', {
      email: session.customer_email
    });

    if (alumno) {
      // Actualizar estado de pago
      await stackbyClient.updateRow('Alumnos', alumno.id, {
        estado_pago: 'Pagado',
        fecha_pago: new Date().toISOString(),
        stripe_session_id: session.id,
        importe: session.amount_total / 100
      });

      // Opcional: trigger facturación en Holded
      await createHoldedInvoice(session, alumno);
    }
  }
}
```

**Checklist para empezar:**
- [ ] Configurar webhook en dashboard de Stripe
- [ ] URL endpoint para recibir eventos
- [ ] Stripe webhook secret para validar firma
- [ ] Mapeo email Stripe → registro Stackby
- [ ] Decidir si incluir facturación automática Holded

**Impacto operativo:** Elimina trabajo manual de verificación de pagos

---

## Detalle Completo Cuadrante 1

### 4.1 Pipeline DECA Completo

**Estado:** ✅ Implementado parcialmente
**Componentes existentes:**
- `publisher.gs`: Google Sheets → Stackby funcionando
- Trigger automático en cambios de hoja

**Pendiente:**
- Notificación email a responsable
- Posible: actualización de estado en Sheet original

**Archivos relacionados:**
- `/Users/javiercuervolopez/code/Stackby/IITD/publisher.gs`

---

### 5.2 Sync LMS → Stackby

**Estado:** Por implementar
**Dependencias:**
- API OnlineCourseHost documentada
- Stackby API funcionando

**Decisiones pendientes:**
- Sync incremental vs completo
- Frecuencia (cron diario vs webhook tiempo real)
- Campos a sincronizar

---

### 2.1 Leads Web → Stackby

**Estado:** Plantilla disponible (publisher.gs)
**Para replicar:**
1. Identificar Google Sheet de leads
2. Crear tabla destino en Stackby
3. Adaptar mapeo de columnas
4. Instalar trigger

---

### 6.1 Alta Acumbamail con Consentimiento

**Estado:** Por implementar
**Flujo propuesto:**
1. Formulario web marca checkbox consentimiento
2. Webhook/script detecta nuevo registro
3. Si consentimiento=true → alta en Acumbamail
4. Log de alta en Stackby para auditoría

---

### 9.1 ID Único de Alumno

**Estado:** Por implementar
**Lógica de deduplicación:**
1. Email como clave primaria
2. Merge de registros duplicados
3. Generación de ID único secuencial
4. Propagación a tablas relacionadas

---

## Resumen de Requisitos por Automatización

| # | Automatización | API Token | IDs/Config | Decisión Humana |
|---|----------------|-----------|------------|-----------------|
| 4.1 | Notificación Miriam | - | Email Miriam | Contenido email |
| 5.2 | Sync OCH | OCH Token | Course IDs, Table ID | Frecuencia sync |
| 2.1 | Leads → Stackby | - | Sheet ID, Column map | - |
| 6.1 | Alta Acumbamail | Acumbamail Token | List ID | Double opt-in? |
| 9.1 | ID único alumno | Stackby Token | Table ID Alumnos | Lógica merge |

---

## Impacto Operativo Estimado

| Automatización | Horas/semana ahorradas | Errores evitados | Tiempo respuesta |
|----------------|------------------------|------------------|------------------|
| Notificación Miriam | 1h | Olvidos de seguimiento | <1 min |
| Sync OCH | 3h | Datos desactualizados | Automático |
| Leads Stackby | 2h | Pérdida de leads | <5 min |
| Alta Acumbamail | 1h | Suscriptores sin alta | Inmediato |
| ID único | 2h | Duplicados, confusión | N/A |

**Total estimado:** ~9 horas/semana de trabajo manual eliminado

---

## Próximos Pasos

1. **Inmediato (hoy):**
   - [ ] Añadir notificación email en publisher.gs
   - [ ] Solicitar credenciales Acumbamail

2. **Esta semana:**
   - [ ] Configurar sync OCH → Stackby
   - [ ] Replicar publisher para leads web

3. **Próxima semana:**
   - [ ] Configurar webhook Stripe
   - [ ] Implementar deduplicación de alumnos

---

*Documento generado automáticamente. Actualizar según avance de implementación.*
