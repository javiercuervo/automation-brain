# Tareas Pendientes IITD

**Última actualización:** 2026-02-02
**Para retomar:** Preguntar "¿Cómo seguimos?"

---

## Tareas de aplicación directa (por orden)

### 1. Deduplicación de alumnos
- **Qué:** Script que detecte emails duplicados en tabla ALUMNOS
- **Tiempo:** 10 min
- **Estado:** Listo para hacer

### 2. Integrar Acumbamail en flujo DECA
- **Qué:** Al crear alumno con "Es alumno = Sí" → alta automática en lista de emails
- **Tiempo:** 15 min
- **Estado:** Listo para hacer

### 3. Actualizar matriz de automatizaciones
- **Qué:** Reflejar limitaciones reales de OCH y estado corregido de Stripe
- **Tiempo:** 5 min
- **Estado:** Listo para hacer

---

## Tareas que necesitan un dato

### 4. Leads web → Stackby
- **Necesito:** ID del Google Sheet de leads
- **Qué haré:** Copiar publisher.gs adaptado para ese formulario

### 5. Onboarding curso gratuito
- **Necesito:** ID del curso gratuito en OCH
- **Qué haré:** Auto-matricular cuando alguien se registre

---

## Tareas que requieren UI manual

### 6. Dashboard operativo en Stackby
- **Qué:** Crear vistas filtradas (pendientes, inactivos, sin pago)
- **Dónde:** Interfaz web de Stackby
- **Instrucciones:** En `integraciones/README.md`

### 7. CRM contactos institucionales
- **Qué:** Crear tabla nueva para contactos (DG Educación, Ministerio, etc.)
- **Dónde:** Interfaz web de Stackby

---

## Estado actual del proyecto

### Funcionando ✅
- Publisher DECA (Getformly → Sheets → Stackby)
- Notificaciones email a Miriam
- syncAlumnos (marcar "Sí" → crear alumno)
- Cliente Acumbamail (8 listas disponibles)
- Webhook Stripe (crea/actualiza alumnos)
- Conexión OCH (listar cursos, matricular)

### Limitaciones conocidas ⚠️
- **OCH:** API no permite obtener estudiantes (solo matricular)
- **Stripe webhook:** Pendiente desplegar en producción
- **Email notificación:** Actualmente va a proportione@ (cambiar a alumnos@)

### Pendiente de probar en Google Apps Script
- `testConfig()` - Verificar configuración
- `testSync()` - Procesar fila de prueba
- `testNotification()` - Enviar email de prueba
- `testSyncAlumnos()` - Crear alumno de prueba

---

## Repositorio

**GitHub:** https://github.com/Proportione/Stackby (privado)

**Credenciales:** `/Users/javiercuervolopez/code/Stackby/credentials.env` (local, no versionado)

---

*Documento para retomar la sesión de trabajo*
