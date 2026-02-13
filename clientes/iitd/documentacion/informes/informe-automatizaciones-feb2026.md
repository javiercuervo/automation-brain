# Informe de Automatizaciones IITD

**Fecha:** Febrero 2026
**Para:** Dirección del Instituto Internacional de Teología a Distancia

---

## Resumen ejecutivo

Se ha implementado un sistema de automatizaciones que conecta las herramientas del Instituto (formularios web, Stackby, email, pagos) para reducir trabajo manual y evitar errores.

**Resultado principal:** Las solicitudes de matriculación DECA ahora llegan automáticamente a Stackby y se envía una notificación por email en tiempo real.

---

## Qué se ha conseguido

### 1. Inscripciones DECA automatizadas
- Cuando alguien rellena el formulario de inscripción DECA, los datos aparecen automáticamente en Stackby
- Se envía un email de aviso con los datos del solicitante
- Ya no es necesario copiar datos manualmente del formulario

### 2. Control de alumnos simplificado
- Miriam puede marcar "Sí" en una columna del Excel para confirmar que alguien es alumno
- El sistema crea automáticamente el registro en la tabla de Alumnos
- Se guarda la fecha de cuándo se hizo la confirmación

### 3. Preparado para el futuro
- Sistema de pagos Stripe listo para conectar (actualiza el estado automáticamente cuando alguien paga)
- Conexión con el LMS (OnlineCourseHost) preparada para sincronizar matriculaciones
- Alta automática en listas de email marketing (Acumbamail)

---

## Beneficios para el Instituto

| Antes | Ahora |
|-------|-------|
| Copiar datos del formulario a mano | Llegan solos a Stackby |
| Comprobar si hay nuevas solicitudes | Aviso por email inmediato |
| Crear alumno manualmente | Un clic en "Sí" y se crea solo |
| Riesgo de olvidar una solicitud | Registro automático de todo |

**Ahorro estimado:** 5-10 horas semanales de trabajo administrativo repetitivo

---

## Estado actual

| Funcionalidad | Estado |
|--------------|--------|
| Inscripciones DECA automáticas | Funcionando |
| Notificaciones por email | Funcionando |
| Marcar alumno con "Sí" | Funcionando |
| Pagos con Stripe | Preparado (pendiente activar) |
| Sincronización con LMS | Preparado (pendiente configurar) |
| Email marketing | Preparado (pendiente activar) |

---

## Próximos pasos recomendados

1. **Activar los pagos automáticos** - Cuando alguien pague con Stripe, se actualiza solo su estado
2. **Conectar el LMS** - Ver qué alumnos están matriculados y su progreso
3. **Revisar el email de notificación** - Confirmar que llega a las personas correctas

---

## Contacto técnico

Para dudas o incidencias técnicas, contactar con el equipo de desarrollo.

---

*Este informe forma parte del proyecto de automatización administrativa del IITD.*
