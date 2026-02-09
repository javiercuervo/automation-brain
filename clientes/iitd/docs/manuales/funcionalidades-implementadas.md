# Funcionalidades Implementadas - IITD

**Fecha:** Febrero 2026
**Versión:** 1.0

---

## Resumen visual

```
FORMULARIO WEB          STACKBY              ACCIONES
     |                     |                    |
     v                     v                    v
[Inscripción] ──────> [SOLICITUDES] ──────> [Email aviso]
     DECA                 DECA                   │
                           │                     │
                           v                     │
                    [ALUMNOS] <── Miriam marca "Sí"
```

---

## Estado de cada funcionalidad

### Funcionando ahora

| # | Funcionalidad | Qué hace | Cómo se usa |
|---|--------------|----------|-------------|
| 1 | **Inscripciones DECA** | Formulario → Stackby automático | Automático |
| 2 | **Notificaciones email** | Aviso cuando hay solicitud nueva | Automático |
| 3 | **Crear alumno** | Registro en tabla ALUMNOS | Escribir "Sí" en Sheet |
| 4 | **Detección duplicados** | No crea registros repetidos | Automático |
| 5 | **Reintentos automáticos** | Si falla, lo intenta de nuevo | Automático |

### Listo para activar

| # | Funcionalidad | Qué hace | Qué falta |
|---|--------------|----------|-----------|
| 6 | **Pagos Stripe** | Actualiza estado al pagar | Configurar webhook |
| 7 | **Email marketing** | Alta en Acumbamail | Activar integración |
| 8 | **Sync con LMS** | Trae datos de cursos | Configurar cron |

### Documentado (requiere configuración manual)

| # | Funcionalidad | Qué hace | Dónde configurar |
|---|--------------|----------|------------------|
| 9 | **Dashboard** | Vistas filtradas en Stackby | En Stackby directamente |
| 10 | **Migración POLAR** | Importar datos históricos | Script Node.js |

---

## Detalle de cada funcionalidad

### 1. Inscripciones DECA automáticas
- **Origen:** Formulario Getformly en la web
- **Destino:** Tabla SOLICITUDES_DECA en Stackby
- **Frecuencia:** Cada 5 minutos
- **Campos:** Todos los del formulario (nombre, email, programa, documentos, etc.)

### 2. Notificaciones por email
- **Destinatario:** proportione@institutoteologia.org (cambiar a alumnos@ cuando esté listo)
- **Asunto:** [DECA] Nueva solicitud: Nombre del solicitante
- **Contenido:** Datos básicos + programa solicitado + centro

### 3. Crear alumno desde solicitud
- **Trigger:** Miriam escribe "Sí" en columna AB del Sheet
- **Resultado:** Registro en tabla ALUMNOS_ACTUALES
- **Datos copiados:** Email, nombre, apellidos, teléfono, DNI, programa

### 4. Detección de duplicados
- **Criterio:** Email del solicitante
- **Comportamiento:** Actualiza el registro existente en lugar de crear duplicado

### 5. Reintentos automáticos
- **Máximo:** 5 intentos
- **Espera:** Progresiva (1s, 2s, 4s, 8s, 16s)
- **Si falla todo:** Queda marcado en columna AA con el error

---

## Integraciones preparadas

### 6. Pagos Stripe
```
Cliente paga → Stripe → Webhook → Stackby actualiza estado
```
- Cambia "Estado pago" a "Pagado"
- Registra fecha e importe
- Guarda referencia de Stripe

### 7. Email marketing (Acumbamail)
```
Nuevo alumno + consentimiento → Alta en lista de emails
```
- Lista configurada: ID 1214096
- Campos: email, nombre, origen, fecha

### 8. Sincronización LMS (OnlineCourseHost)
```
Alumno matriculado en OCH → Registro actualizado en Stackby
```
- Trae: cursos, progreso, última actividad
- Frecuencia recomendada: Diaria (6:00 AM)

---

## Tablas en Stackby

| Tabla | Propósito | Estado |
|-------|-----------|--------|
| SOLICITUDES_DECA | Solicitudes de inscripción | Activa |
| ALUMNOS_ACTUALES | Registro de alumnos confirmados | Activa |

---

## Archivos del sistema

| Componente | Ubicación | Tecnología |
|------------|-----------|------------|
| Publisher DECA | Google Apps Script | JavaScript |
| Cliente Acumbamail | Node.js | JavaScript |
| Sync OCH | Node.js | JavaScript |
| Webhook Stripe | Node.js | JavaScript |

---

## Métricas de uso

- **Solicitudes procesadas:** Todas las que lleguen al formulario
- **Tiempo de procesamiento:** < 5 minutos desde el envío
- **Tasa de éxito:** > 99% (con reintentos automáticos)

---

## Contacto

Para incidencias o mejoras, contactar al equipo técnico.

---

*Documento generado como parte del proyecto de automatización IITD.*
