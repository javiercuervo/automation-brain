# OnlineCourseHost API – Knowledge Base

## Tabla de Contenidos
1. [Estado de la API](#1-estado-de-la-api)
2. [Autenticación](#2-autenticación)
3. [Endpoints Disponibles](#3-endpoints-disponibles)
4. [Webhooks & Triggers (Pabbly Native)](#4-webhooks--triggers-pabbly-native)
5. [Limitaciones Conocidas](#5-limitaciones-conocidas)
6. [Arquitectura Recomendada](#6-arquitectura-recomendada)
7. [Code by Pabbly – Implementación Avanzada](#7-code-by-pabbly--implementación-avanzada)
8. [Troubleshooting de Errores Comunes](#8-troubleshooting-de-errores-comunes)
9. [Seguridad & Gestión de Tokens](#9-seguridad--gestión-de-tokens)
10. [Ejemplos Prácticos](#10-ejemplos-prácticos)

---

## 1. Estado de la API

### ¿Existe API pública documentada?
**Respuesta**: Parcialmente. OnlineCourseHost expone **2 endpoints REST públicos** documentados en su help center, pero **no existe documentación exhaustiva** de una API completa.

| Aspecto | Detalles |
|---------|----------|
| **Tipo de API** | REST (no GraphQL, no SOAP) |
| **Documentación Oficial** | Limitada (2 endpoints en help.onlinecoursehost.com) |
| **Estado de Desarrollo** | En evolución; empresa ha anunciado planes para "API independiente" |
| **Acceso** | A través de Pabbly Connect (recomendado) o Zapier |
| **Versión** | No versionada (única endpoint) |

### ¿Está pensada para integraciones externas?
**Respuesta**: Sí, pero con limitaciones por diseño.

**Evidencia**:
- Oficial: "Yes we plan on providing an independent API" (AppSumo Q&A, Oct 2024)
- Actualmente: Enfoque en Pabbly Connect & Zapier como capas intermedias
- Philosophía: White-label LMS → usuarios deben usar plataformas de integración (no conectar directamente)

### Limitaciones Conocidas de Diseño

| Limitación | Impacto | Workaround |
|-----------|--------|-----------|
| **Solo 2 endpoints** | No puedes acceder directamente a datos de estudiantes | Usar triggers de Pabbly (webhook-based) |
| **Sin datos de progreso** | Analytics aún en desarrollo | Exportar manualmente desde OCH Admin |
| **Sin API de pagos** | Solo datos de método de pago en webhook | Conectar directamente a Stripe/PayPal |
| **Rate limit: 400 req/min** | Bulk operations fallan | Implementar queue (HookDeck) |

---

## 2. Autenticación

### Tipo de Autenticación
**Bearer Token** (estilo x-integration-token)

```
Header: X-INTEGRATION-TOKEN: [token-value-aqui]
```

**Características**:
- No es OAuth 2.0
- Token único por cuenta OCH
- Sin expiración aparente (pero rotación recomendada)
- Scope: Acceso total a cuenta (no granular)

### Dónde Generar la Clave

#### Opción 1: Token Pabbly (Recomendado)
```
1. Login a OCH con cuenta Admin
2. Navigate: Admin > Settings > Pabbly Integrations
3. Click: Activate
4. Copy: Pabbly Integration Token
```

#### Opción 2: Token Zapier
```
1. Login a OCH con cuenta Admin
2. Navigate: Admin > Settings > Zapier Integrations
3. Click: Activate
4. Copy: Zapier Integration Token
```

**Nota**: Ambos tokens funcionan para los mismos endpoints; el nombre es solo por convención.

### Headers Requeridos

```http
GET /api/pabbly-tenant-courses HTTP/1.1
Host: api.onlinecoursehost.com
Content-Type: application/json
Accept: application/json
X-INTEGRATION-TOKEN: your-token-here
```

| Header | Requerido | Valor | Nota |
|--------|-----------|-------|------|
| `X-INTEGRATION-TOKEN` | ✅ Sí | Token generado en OCH | Caso-sensible |
| `Content-Type` | ✅ Sí (POST) | `application/json` | Solo para requests con body |
| `Accept` | ✅ Sí | `application/json` | Indicar formato esperado |

### Seguridad y Rotación de Claves

**Recomendaciones** (basadas en estándares OAuth 2.0):

| Práctica | Recomendación | Razón |
|---------|---------------|-------|
| **Frecuencia de rotación** | Cada 30-90 días | Minimizar ventana de exposición |
| **Almacenamiento** | Variables de entorno, nunca hardcodeadas | Evitar exposición en Git/código |
| **Transporte** | HTTPS/TLS 1.3+ | Encriptación en tránsito |
| **Encriptación en reposo** | AES-256 | Proteger contra acceso no autorizado |
| **Plan de contingencia** | Crear nuevo token antes de revocar antiguo | Evitar downtime |

**En Pabbly Connect**: Los tokens se almacenan de forma encriptada en "Connections". No necesitas manejar manualmente en código.

---

## 3. Endpoints Disponibles

### Endpoint 1: List All Courses

Obtiene todos los cursos (publicados, no publicados, borradores) de tu cuenta OCH.

```http
GET /api/pabbly-tenant-courses HTTP/1.1
Host: api.onlinecoursehost.com
X-INTEGRATION-TOKEN: your-token-here
Accept: application/json
```

#### Parámetros
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| — | — | — | **No hay parámetros query** |

#### Response (Ejemplo)

```json
[
  {
    "id": "23dsrdfdf",
    "course": "How to win friends"
  },
  {
    "id": "SCdfddSDGDF",
    "course": "Setting up your online business"
  }
]
```

#### Response Fields

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `id` | string | Unique course ID (use in enroll endpoint) | `"23dsrdfdf"` |
| `course` | string | Course display name | `"How to win friends"` |

#### Códigos HTTP
- `200 OK`: Listado exitoso
- `401 Unauthorized`: Token inválido o expirado
- `429 Too Many Requests`: Rate limit excedido

#### Caso de Uso
- **Objetivo**: Obtener courseIds para usarlos en endpoint de matriculación
- **Frecuencia**: Ejecutar 1 vez al inicio o caché el listado
- **En Pabbly**: Action > "List All Courses REST Endpoint"

---

### Endpoint 2: Enroll Student

Crea una cuenta de estudiante (si no existe) y matricula en un curso específico.

```http
POST /api/zapier-enroll-student-action-webhook HTTP/1.1
Host: api.onlinecoursehost.com
X-INTEGRATION-TOKEN: your-token-here
Content-Type: application/json
Accept: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "courseId": "23dsrdfdf",
  "password": "SecurePassword123!"
}
```

#### Request Body

| Campo | Tipo | Requerido | Descripción | Validación |
|-------|------|-----------|-------------|-----------|
| `email` | string | ✅ Sí | Email del estudiante | RFC 5322 format |
| `courseId` | string | ✅ Sí | ID único del curso | Debe existir (obtener de "List Courses") |
| `password` | string | ✅ Sí | Contraseña del estudiante | Min. 8 caracteres (recomendado) |
| `name` | string | ❌ No | Nombre del estudiante | Máx 255 caracteres |

#### Response (Ejemplo - Exitoso)

```json
{
  "status": "success",
  "studentId": "student-uuid-12345",
  "enrolled": true,
  "message": "Student enrolled successfully"
}
```

#### Códigos HTTP
- `200 OK`: Estudiante matriculado exitosamente
- `400 Bad Request`: Email/courseId/password faltante o inválido
- `401 Unauthorized`: Token inválido
- `409 Conflict`: Email ya existe (pero se matricula en curso si no estaba)
- `429 Too Many Requests`: Rate limit

#### Comportamiento Importante
- **Si el email existe**: OCH NO crea cuenta duplicada; simplemente matricula en el curso
- **Si el email es nuevo**: Crea la cuenta + matricula en un paso
- **Contraseña**: Se envía email al estudiante con credenciales

#### Caso de Uso
- **Objetivo**: Automatizar matriculación desde plataforma de pagos (Razorpay, Stripe, WooCommerce)
- **Trigger**: Pago completado en plataforma externa
- **En Pabbly**: Action > "Enroll Student"

---

### Endpoints NO Disponibles (Limitaciones)

Las siguientes operaciones **NO tienen endpoints públicos**:

| Operación | Por Qué No Está | Workaround |
|-----------|-----------------|-----------|
| **Obtener datos de estudiante** | En desarrollo | Usar trigger "New Student Account" (webhook) |
| **Obtener progreso del curso** | Analytics en desarrollo | Exportar desde OCH Admin > Analytics |
| **Obtener calificaciones/quizzes** | Analytics no completado | Exportar manual desde dashboard |
| **Obtener datos de pago** | Solo acceso a Stripe/PayPal directo | Conectar a Stripe API directamente |
| **Crear lecciones** | OCH restricción por diseño | Usar UI de OCH o futuro SDK |
| **Eliminar estudiante** | No soportado | Deshabilitar acceso desde admin |

---

## 4. Webhooks & Triggers (Pabbly Native)

OnlineCourseHost expone **3 triggers webhook** a través de Pabbly Connect. Estos se disparan automáticamente cuando ocurren eventos.

### Trigger 1: New Student Account

Se dispara cuando un usuario crea una nueva cuenta.

#### Evento que lo Activa
```
Usuario visita OCH → Click "Sign Up" → Completa formulario → Confirma email
```

#### Datos Retornados

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `email` | string | Email del nuevo estudiante | `"student@example.com"` |

#### Payload JSON (Ejemplo)
```json
{
  "event": "student_created",
  "timestamp": "2026-01-28T12:00:00Z",
  "data": {
    "email": "newstudent@example.com"
  }
}
```

#### Casos de Uso
1. **Agregar a newsletter**: Enviar email de bienvenida automático
2. **Sincronizar CRM**: Agregar contacto a HubSpot/Pipedrive
3. **Audit logging**: Registrar todas las creaciones de cuenta

#### En Pabbly
- **Trigger**: OnlineCourseHost > "New Student Account Trigger"
- **Datos disponibles**: Solo email
- **Frecuencia**: Cada vez que alguien se registre

---

### Trigger 2: Course Enrollment

Se dispara cuando un estudiante se matricula en un curso.

#### Evento que lo Activa
```
Usuario compra curso (Stripe/PayPal/etc) 
→ OCH procesa pago
→ Webhook enviado a Pabbly
```

#### Datos Retornados

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `email` | string | Email del estudiante | `"student@example.com"` |
| `courseId` | string | ID único del curso | `"abc123xyz"` |
| `courseTitle` | string | Nombre del curso | `"Python Basics"` |
| `source` | string | Método de pago | `"stripe"`, `"paypal"`, etc |

#### Payload JSON (Ejemplo)
```json
{
  "event": "course_enrolled",
  "timestamp": "2026-01-28T12:30:00Z",
  "data": {
    "email": "student@example.com",
    "courseId": "abc123xyz",
    "courseTitle": "Python Basics",
    "source": "stripe"
  }
}
```

#### Casos de Uso
1. **Agregar a secuencia de email**: Email de bienvenida específico del curso
2. **Logging a base de datos**: Registrar matriculación en Stackby/Google Sheets
3. **Sincronizar a CRM**: Taggear contacto con nombre del curso
4. **Trigger acciones posteriores**: Crear tarea en Asana, notificar instructor

#### En Pabbly
- **Trigger**: OnlineCourseHost > "Course Enrollment Trigger"
- **Datos disponibles**: email, courseId, courseTitle, source
- **Frecuencia**: Cada matriculación (incluyendo MatrículaVía API Enroll)

---

### Trigger 3: Newsletter Subscription

Se dispara cuando un usuario se suscribe a la newsletter de OCH.

#### Evento que lo Activa
```
Usuario visita tu sitio OCH → Ve formulario newsletter → Ingresa email → Suscribe
```

#### Datos Retornados

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `email` | string | Email del suscriptor | `"lead@example.com"` |

#### Casos de Uso
1. **Lead generation**: Capturar emails para campaña de marketing
2. **Sincronizar a MailerLite/Mailchimp**: Agregar a lista de leads
3. **Google Sheets**: Registrar all suscriptores en hoja de cálculo

---

### Comparación: Webhooks vs API Endpoints

| Característica | Webhooks (Triggers) | API REST (Endpoints) |
|---|---|---|
| **Dirección de datos** | OCH → Tu app (push) | Tu app → OCH (pull) |
| **Sincronización** | Real-time cuando ocurra evento | On-demand cuando llames |
| **Necesitas request?** | No, OCH dispara automático | Sí, debes hacer GET/POST |
| **Datos disponibles** | Solo campos en webhook | Puedes querear múltiples cursos |
| **Rate limit** | Depende de actividad del usuario | 400 req/min |
| **Latencia** | Inmediato (segundos) | Tu lógica + OCH latency |

---

## 5. Limitaciones Conocidas

### Datos NO Disponibles via API

| Datos Solicitados | Disponibilidad | Razón | ETA (Estimado) |
|---|---|---|---|
| **Progreso del estudiante** | ❌ No | Analytics en desarrollo | Q2-Q3 2026 |
| **Calificaciones/Quiz scores** | ❌ No | Analytics en desarrollo | Q2-Q3 2026 |
| **Tiempo en lecciones** | ❌ No | Engagement section no completado | Indefinido |
| **Detalles de pago (amount)** | ⚠️ Parcial | Solo método de pago en webhook | Posible futura |
| **Perfil del estudiante (nombre)** | ❌ No | "New Student Account" trigger solo email | Posible futura |
| **Historial de login** | ❌ No | No expuesto | Indefinido |

**Fuente**: OnlineCourseHost Help Center (Enero 2026) + AppSumo Q&A community

### Rate Limiting

| Límite | Valor | Impacto |
|--------|-------|--------|
| **Requests por minuto** | 400 req/min | Bulk operations > 400 enrolls/min fallan |
| **Conexiones simultáneas** | Desconocido | Testar con tuanálisis |
| **Error HTTP** | 429 Too Many Requests | Esperar antes de reintentar |
| **Retry strategy** | Exponential backoff recomendado | Pabbly maneja automático |

**Solución**: Usar HookDeck o Pabbly Hook para rate limiting/queuing

### Scope del Token

| Permiso | Incluido | Notas |
|---------|----------|-------|
| Leer cursos | ✅ Sí | `GET /api/pabbly-tenant-courses` |
| Matricular estudiantes | ✅ Sí | `POST /api/zapier-enroll-student-action-webhook` |
| Eliminar estudiante | ❌ No | No soportado via API |
| Editar curso | ❌ No | No soportado via API |
| Acceder admin settings | ❌ No | No soportado via API |

**Conclusión**: Token tiene permisos **solo para lectura de cursos + matrícula de estudiantes**

---

## 6. Arquitectura Recomendada

### Flujo Completo: OCH → BI

```
┌─────────────────────────────────────────────────────────────┐
│                    TU ARQUITECTURA                           │
└─────────────────────────────────────────────────────────────┘

       OCH (Course Platform)
             │
             ├─ Trigger: Student Enrolled
             │          (email, courseId, courseTitle, source)
             │
             ▼
       Pabbly Connect (Orchestrator)
             │
             ├─ Action 1: Code by Pabbly (JS)
             │            └─ Validar & enriquecer datos
             │
             ├─ Action 2: API to Stackby
             │            └─ POST crear record en base de datos
             │
             ├─ Action 3: Google Sheets
             │            └─ Append row para reporting
             │
             └─ (Optional) Action 4: Enviar email/SMS
                         └─ Notificar instructor
             
             ▼
       Stackby (Operational Database)
             │ [Datos de matriculación]
             │ - Student email
             │ - Course info
             │ - Fecha matriculación
             │ - Fuente de pago
             │
             ▼
       Google Sheets (Reporting)
             │ [Sincronización automática desde Stackby]
             │
             ▼ (Export/Analyze)
       
       Analytics/BI Tools
             │
             ├─ Perplexity/Claude (Q&A sobre datos)
             ├─ Looker/Tableau (Dashboards)
             └─ Custom Python scripts (análisis)
```

### Opción 1: Usando Pabbly Triggers (Recomendado - Simplest)

**Ventajas**:
- ✅ Muy fácil de configurar (UI)
- ✅ Tiempo real (segundos)
- ✅ Manejo automático de errores en Pabbly
- ✅ No necesitas código

**Desventajas**:
- ❌ Solo datos en webhook (no puedes querear histórico)
- ❌ Dependencia de Pabbly como relay

**Cuándo usar**: Matriculaciones nuevas, no necesitas histórico

**Pasos**:
1. Crear trigger "Course Enrollment" en OCH
2. Configurar webhook URL en Pabbly Connect
3. Agregar actions (Stackby, Google Sheets, etc)

---

### Opción 2: Usando API Directo (Advanced)

**Ventajas**:
- ✅ Más control sobre lógica
- ✅ Puedes pollear datos bajo demanda
- ✅ Mejor para batch processing

**Desventajas**:
- ❌ Más complejo de implementar
- ❌ Rate limit: 400 req/min
- ❌ Necesitas polling logic (OCH no notifica)

**Cuándo usar**: Sincronización manual de cursos, reportes programados

**Pasos**:
1. En Pabbly, crear schedule trigger (diario/horario)
2. Usar "API by Pabbly" > GET `/api/pabbly-tenant-courses`
3. Loop sobre cursos y guardar en Stackby

---

### Opción 3: Híbrido (Recomendado para Producción)

Combinar webhooks (real-time) + API polling (periodic sync)

```
Real-time Events:
  Estudiante matricula → Webhook → Pabbly → Stackby (inmediato)

Periodic Reporting:
  Cada noche 2am → Schedule trigger → API call → Get all cursos → Compare/audit
```

---

## 7. Code by Pabbly – Implementación Avanzada

### Qué es Code by Pabbly?

**Tipo**: Acción en Pabbly Connect que ejecuta JavaScript

| Característica | Detalle |
|---|---|
| **Lenguaje** | JavaScript (Node.js) |
| **Runtime** | Node.js env (no browser) |
| **Timeout** | 25 segundos máximo |
| **Memory** | ~128 MB |
| **Packages npm** | ❌ No (seguridad) |
| **HTTP requests** | ❌ No (usar "API by Pabbly" para eso) |

### Casos de Uso para OCH

1. **Validación de datos**: Checkear si email válido
2. **Transformación**: Convertir formato de webhook a formato Stackby
3. **Lógica condicional**: Rutear cursos diferentes a diferentes destinos
4. **String manipulation**: Limpiar nombres, extraer dominios
5. **Timestamp enriquecimiento**: Agregar fecha/hora de procesamiento

### Ejemplo 1: Validación y Enriquecimiento

```javascript
// Recibe webhook desde OCH
// trigger.data = { email, courseId, courseTitle, source }

// Validar datos
if (!trigger.data.email || !trigger.data.courseId) {
  throw new Error("Email or courseId missing");
}

// Enriquecer con datos adicionales
const processed = {
  studentEmail: trigger.data.email.toLowerCase(),
  courseId: trigger.data.courseId,
  courseName: trigger.data.courseTitle,
  paymentMethod: trigger.data.source,
  enrollmentDate: new Date().toISOString(),
  enrollmentMonth: new Date().getMonth() + 1,
  source: "OnlineCourseHost", // Hardcoded para auditoría
  status: "active"
};

// Validar email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(processed.studentEmail)) {
  throw new Error("Invalid email format");
}

return processed;
```

### Ejemplo 2: Ruteo Condicional

```javascript
// Rutear cursos específicos a diferentes bases de datos

const courseRouting = {
  "course-001": "table_free_courses",
  "course-002": "table_premium_courses",
  "course-003": "table_corporate_courses"
};

const tableName = courseRouting[trigger.data.courseId] || "table_default";

return {
  email: trigger.data.email,
  courseId: trigger.data.courseId,
  targetTable: tableName, // Pabbly usará esto para elegir dónde insertar
  enrollmentTime: new Date().toISOString()
};
```

### Limitaciones y Workarounds

| Limitación | Impacto | Workaround |
|---|---|---|
| **No npm packages** | No puedes usar librerías externas | Usar functions built-in de Node.js |
| **No HTTP requests** | No puedes llamar APIs de Code | Agregar step separado "API by Pabbly" después |
| **25 seg timeout** | Operaciones largas fallan | Dividir en múltiples actions |
| **No file system** | No puedes escribir archivos locales | Almacenar en Stackby/Google Sheets |

---

## 8. Troubleshooting de Errores Comunes

### Error 1: "Webhook Not Coming"

**Síntomas**:
- Trigger configurado en Pabbly pero no dispara
- Cuando un estudiante se matricula, no ves datos en Pabbly

**Posibles Causas**:
1. Webhook URL no correctamente copiada en OCH
2. Add-on "Pabbly Connect Webhooks" no instalado en Google Sheets
3. Webhook URL no configurada como "Send on Event"

**Solución Step-by-Step**:

```
1. En OCH Admin > Settings > Pabbly Integrations:
   - ¿Está el webhook URL pegado?
   - ¿Es exactamente igual al que Pabbly te mostró?
   - Revisar no haya espacios extra

2. En Pabbly, en el trigger:
   - Click "Send Test Request"
   - ¿Ves datos en la respuesta?
   - Si no, el webhook no está configurado

3. Si usas Google Sheets como trigger adicional:
   - Verificar que "Pabbly Connect Webhooks" add-on esté instalado
   - Ir a initial setup del add-on
   - Pegar webhook URL ahí también
```

---

### Error 2: "401 Unauthorized - Invalid Token"

**Síntomas**:
- `X-INTEGRATION-TOKEN header invalid` error
- API calls return 401

**Posibles Causas**:
1. Token copiado con espacios extras
2. Token expirado o regenerado en OCH
3. Token es de otra cuenta/workspace

**Solución**:

```
1. Re-copiar token desde OCH:
   Admin > Settings > Pabbly Integrations > Activate
   - Copiar token (sin espacios)

2. En Pabbly, actualizar Connection:
   - Integrations > OnlineCourseHost > Update Connection
   - Pegar token nuevo
   - Test connection

3. Probar con "Send Test Request"
   - Si sigue fallando, token es inválido

4. Rotación token:
   - Si sospechas fue comprometido:
   - Crear nuevo token en OCH
   - Actualizar todas las connections en Pabbly
   - Revocar token viejo
```

---

### Error 3: "429 Too Many Requests"

**Síntomas**:
- Large bulk enrollment falla
- OCH returns HTTP 429
- Workflows get queued/delayed

**Posibles Causas**:
- >400 requests en 60 segundos
- Múltiples workflows ejecutándose simultáneamente
- Pabbly interno rate limiting

**Solución**:

```
1. Implementar HookDeck:
   - Setup Pabbly Hook > HookDeck
   - Configurar rate limit (ej: 50 req/min)
   - Automático retry/queuing

2. O usar delays en Code by Pabbly:
   // Esperar 2 segundos entre requests
   await new Promise(resolve => setTimeout(resolve, 2000));

3. O procesar en batches:
   - En lugar de 100 enrollments simultáneos
   - Procesar 10, luego 10 más, etc
```

---

### Error 4: "409 Conflict - Email Already Exists"

**Síntomas**:
- POST a `/api/zapier-enroll-student-action-webhook` retorna 409
- Email del estudiante ya existe en OCH

**Posibles Causas**:
- Estudiante ya existe pero intenta matricularse nuevamente
- Duplicate webhook execution

**Comportamiento Real**:
- OCH **NO** crea cuenta duplicada
- OCH **SÍ** lo matricula en el curso (si no estaba)
- Respuesta: 200 OK (no error)

**Solución**:
- Ignorar 409 en tus logs (es esperado)
- Agregar check en Code by Pabbly antes de enroll:
  ```javascript
  // Opcional: Checkear si email ya existe
  // Pero OCH de todas formas lo maneja
  ```

---

### Error 5: "Duplicate Webhooks - Múltiples Entries"

**Síntomas**:
- Cuando estudiante se matricula, aparecen 2-3 registros en Stackby
- Datos duplicados en Google Sheets

**Posibles Causas**:
1. Webhook dispara múltiples veces para mismo evento
2. Workflow tiene múltiples triggers para mismo evento
3. Manual test webhook no fue eliminado

**Solución**:

```
1. Revisar Task History en Pabbly:
   - ¿El mismo webhook fue ejecutado 2-3 veces?
   - ¿A qué hora exacta?

2. En Stackby, agregar unique constraint:
   - Campo: Student Email
   - Tipo: Unique
   - Esto previene duplicados

3. En Google Sheets, agregar filter:
   - Fórmula UNIQUE() o verificar duplicados
   - O usar Pabbly sync (evita duplicados)

4. En workflow Pabbly:
   - Verificar solo 1 trigger para "Course Enrollment"
   - Eliminar test webhooks
```

---

## 9. Seguridad & Gestión de Tokens

### Mejores Prácticas (Industry Standard)

| Práctica | Recomendación | Por Qué | Implementación en Pabbly |
|---|---|---|---|
| **Rotación** | Cada 30-90 días | Reduce ventana si comprometido | Crear nuevo token, actualizar Connection |
| **Almacenamiento** | Variables entorno (NO hardcoded) | Evitar exposición en Git | Pabbly maneja automático |
| **Transporte** | HTTPS/TLS 1.3+ | Encriptación en tránsito | Pabbly usa HTTPS |
| **Encriptación reposo** | AES-256 | Proteger si DB hacked | Pabbly ISO 27001 certified |
| **Acceso** | Principle of least privilege | Solo permisos necesarios | Token OCH no tiene granularidad |
| **Monitoreo** | Log todos API calls | Early breach detection | Pabbly Task History |
| **Backup plan** | Crear nuevo antes de revocar viejo | Evitar downtime | Manual process en OCH admin |

### Implementar Rotación de Token

**Procedimiento**:

```
PASO 1: Crear nuevo token en OCH
  1. Login OCH Admin
  2. Settings > Pabbly Integrations
  3. Click "Activate" (genera nuevo token)
  4. Copiar nuevo token

PASO 2: Actualizar en Pabbly
  1. Pabbly > My Integrations
  2. Buscar "OnlineCourseHost"
  3. Click Connection > Edit
  4. Paste nuevo token
  5. Test Connection

PASO 3: Verificar workflows
  1. Ejecutar test en workflows que usan OCH
  2. Monitorear Task History por errores
  
PASO 4: Revocar token viejo (OPCIONAL)
  1. Volver a OCH > Pabbly Integrations
  2. Click "Deactivate" (revoca token viejo)
  3. Esperar confirmación
```

### Cómo Reconocer Compromise

| Indicador | Severidad | Acción |
|---|---|---|
| Intentos fallidos de login repetidos | 🟡 Media | Revisar logs; si es patrón, rotación |
| Requests 401 sin cambios de token | 🔴 Alta | Token fue modificado/robado; rotar inmediato |
| Rate limit 429 sin explicación | 🟡 Media | Alguien más usando mismo token; investigar |
| Matriculaciones a cursos inválidos | 🔴 Alta | Attacker usando endpoint; rotación + audit |

---

## 10. Ejemplos Prácticos

### Ejemplo 1: Setup Básico - Sincronizar Matriculaciones a Google Sheets

**Objetivo**: Cuando estudiante se matricula, agregar fila a Google Sheets automáticamente

**Pasos en Pabbly**:

```
1. TRIGGER: OnlineCourseHost > Course Enrollment
   - Captura: email, courseId, courseTitle, source

2. ACTION: Google Sheets > Append Row
   - Spreadsheet: "Student Enrollments"
   - Sheet: "Data"
   - Columns to map:
     * A (Email): trigger.email
     * B (Course): trigger.courseTitle
     * C (Payment): trigger.source
     * D (Date): hoy (auto)

3. TEST: Crear test workflow en OCH
   - Usar cuenta test: pabbly-tests-student@onlinecoursehost.com
   - Matricularse en curso test
   - Verificar fila aparece en Google Sheets

4. DEPLOY: Activar workflow
```

---

### Ejemplo 2: Datos Enriquecidos a Stackby con Code by Pabbly

**Objetivo**: Matriculación con timestamp, validación, y transformación antes de guardar

**Configuración**:

```
1. TRIGGER: OnlineCourseHost > Course Enrollment

2. ACTION 1: Code by Pabbly (Enriquecimiento)
   
   const enrollmentData = {
     email: trigger.data.email.toLowerCase().trim(),
     courseId: trigger.data.courseId,
     courseName: trigger.data.courseTitle,
     paymentMethod: trigger.data.source,
     enrollmentDatetime: new Date().toISOString(),
     enrollmentDate: new Date().toISOString().split('T')[0],
     enrollmentMonth: new Date().toLocaleString('default', { month: 'long' }),
     dataSource: "OnlineCourseHost",
     recordStatus: "active"
   };

   // Validar email
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   if (!emailRegex.test(enrollmentData.email)) {
     throw new Error(`Invalid email: ${enrollmentData.email}`);
   }

   return enrollmentData;

3. ACTION 2: API by Pabbly > Stackby
   - POST a Stackby API
   - Crear nuevo record
   - Map todos campos del CODE output

4. ACTION 3: Email notification (opcional)
   - Send email to instructor with student info
```

---

### Ejemplo 3: Sync Histórico de Cursos (Schedule-based)

**Objetivo**: Cada noche, sincronizar lista de cursos a Stackby (audit/reporting)

**Configuración**:

```
1. TRIGGER: Schedule
   - Frequency: Daily
   - Time: 2:00 AM UTC

2. ACTION 1: API by Pabbly > OnlineCourseHost
   - Method: GET
   - URL: /api/pabbly-tenant-courses
   - Auth: x-integration-token
   - Response: Array de cursos

3. ACTION 2: Code by Pabbly (Loop y transform)
   - Input: trigger.response (array de cursos)
   
   const courses = trigger.response || [];
   
   // Para cada curso, transformar
   return courses.map(course => ({
     courseId: course.id,
     courseName: course.course,
     syncDate: new Date().toISOString(),
     syncStatus: "synced"
   }));

4. ACTION 3: Loop over transformed array
   - Pabbly > Iterator > Stackby Create Record
   - Para cada curso, crear record en "Courses" table

5. ACTION 4: Email report (opcional)
   - "Synced X courses"
```

---

### Ejemplo 4: Ruteo Avanzado - Diferentes Acciones por Course

**Objetivo**: Cursos Tier-1 van a Stackby premium; Tier-2 a Stackby regular

**Configuración**:

```
1. TRIGGER: OnlineCourseHost > Course Enrollment

2. ACTION: Code by Pabbly (Ruteo)
   
   const tierMapping = {
     "premium-course-id-1": "stackby_table_premium",
     "premium-course-id-2": "stackby_table_premium",
     "free-course-id-1": "stackby_table_free"
   };

   const tier = tierMapping[trigger.data.courseId] || "stackby_table_default";

   return {
     email: trigger.data.email,
     courseId: trigger.data.courseId,
     courseName: trigger.data.courseTitle,
     tier: tier,
     targetTable: tier
   };

3. PATH ROUTING en Pabbly:
   - IF tier == "premium":
     - POST a Stackby Premium table
     - Send email to premium support
   - ELSE:
     - POST a Stackby Free table
     - Add to public newsletter

4. TEST: Matricularse en curso premium y free
   - Verificar registros en tablas correctas
```

---

### Ejemplo 5: Error Handling y Retries

**Objetivo**: Si Stackby falla, reintentar automático con backoff

**Configuración en Pabbly**:

```
1. TRIGGER: OnlineCourseHost > Course Enrollment

2. ACTION: API by Pabbly > Stackby
   - Method: POST
   - URL: Stackby create endpoint
   
   - ERROR HANDLING:
     * Retry: Yes
     * Max Retries: 5
     * Retry Delay: Exponential
       - 1st: 1 segundo
       - 2nd: 2 segundos
       - 3rd: 4 segundos
       - 4th: 8 segundos
       - 5th: 16 segundos

3. ACTION: On Error - Send Alert
   - If all 5 retries fail:
     - Send Slack message: "Stackby API failed for student X"
     - Log to error table
     - Notify admin
```

---

## Conclusión

**OnlineCourseHost API** es **funcional pero limitada**. Está diseñada para **matriculación automática** (caso principal) más que para acceso a **datos analíticos** (aún en desarrollo).

### Para Tu Stack:
- ✅ Usa **webhooks** para real-time enrollments → Stackby → Google Sheets
- ✅ Usa **Code by Pabbly** para transformación de datos
- ⚠️ Ten presente que **progreso/calificaciones** NO están disponibles via API
- 📅 Espera posibles mejoras en 2026 cuando OCH lance analytics

### Próximos Pasos:
1. Generar token OCH
2. Crear workflow Pabbly básico (curso enrollment → Google Sheets)
3. Testar con cuenta prueba
4. Escalar a producción con Stackby + error handling
5. Monitorear y documentar en GitHub

---

**Documento creado**: Enero 28, 2026  
**Fuentes**: OnlineCourseHost Help Center, Pabbly Connect docs, community feedback  
**Versión**: 1.0