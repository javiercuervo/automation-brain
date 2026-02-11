# Manual de Usuario - Automatizaciones IITD

**Para:** Miriam y equipo de operaciones
**Ultima actualizacion:** 11 de febrero de 2026

---

## 1. Nuevas solicitudes DECA

### Que pasa automaticamente
Cuando alguien rellena el formulario de inscripcion DECA en la web:

1. Los datos se guardan en el Google Sheet "Deca Inscripcion"
2. Cada 5 minutos, el sistema envia los datos a Stackby
3. Recibes un email con el asunto **"[DECA] Nueva solicitud: Nombre del solicitante"**

### Que tienes que hacer
- **Nada.** Los datos llegan solos.
- Revisa el email para ver los datos basicos
- Entra en Stackby para ver el registro completo

### Donde ver las solicitudes
- **Stackby:** Tabla "SOLICITUDES_DECA"
- **Google Sheets:** Hoja "Deca Inscripcion" (datos originales)

---

## 2. Marcar a alguien como alumno

### Cuando hacerlo
Cuando hayas verificado que una persona:
- Ha sido admitida
- Ha enviado la documentacion
- Procede crear su registro como alumno

### Como hacerlo

1. **Abre el Google Sheet** "Deca Inscripcion"
2. **Busca la fila** de la persona
3. **Ve a la columna AB** (titulada "Es alumno")
4. **Escribe "Si"** (con o sin acento)
5. **Espera unos minutos** - el sistema creara el registro en la tabla ALUMNOS

### Como saber que funciono
- La columna AC ("alumno_created_at") mostrara la fecha y hora
- En Stackby, aparecera el registro en la tabla ALUMNOS_ACTUALES

---

## 3. Panel IITD (Google Sheet)

El Sheet **"Panel IITD"** es el centro de informacion. Tiene varias pestanas:

| Pestana | Que muestra |
|---------|-------------|
| **DECA** | Alumnos del programa DECA |
| **Evangelizadores** | Alumnos del programa Evangelizadores |
| **Formacion Sistematica** | Alumnos de Formacion Sistematica |
| **Formacion Biblica** | Alumnos de Formacion Biblica |
| **Compromiso Laical** | Alumnos de Compromiso Laical |
| **Otros** | Programas restantes |
| **Resumen** | Totales por programa y estado |
| **Dashboard** | Pipeline de alumnos, alertas, actividad reciente |
| **KPIs DECA** | Funnel DECA, tasas de conversion, historico |
| **Validacion** | Problemas detectados en los datos |

### Dashboard (pestana "Dashboard")
Muestra automaticamente:
- Cuantos alumnos hay en cada etapa (solicitud, admitido, pagado, enrolado, activo, baja)
- Desglose por programa
- **Alertas**: solicitudes pendientes mas de 7 dias, admitidos sin pago mas de 14 dias
- Actividad de los ultimos 7 dias

Se actualiza ejecutando: `node dashboard.mjs`

### KPIs DECA (pestana "KPIs DECA")
Muestra:
- Funnel acumulativo: cuantos han pasado por cada etapa
- Tasas de conversion entre etapas
- Split por variante (Infantil y Primaria vs ESO y Bachillerato)
- Tabla historica (una fila por cada vez que se ejecuta, para ver tendencias)

Se actualiza ejecutando: `node kpis-deca.mjs`

---

## 4. Calificaciones

### Como funciona
Las calificaciones se gestionan en el Google Sheet **"Calificaciones IITD"**. Tiene una fila por cada alumno y asignatura.

### Estructura del Sheet
| Columna | Quien la rellena |
|---------|-----------------|
| Email alumno | Pre-rellenado |
| Nombre | Pre-rellenado |
| Apellidos | Pre-rellenado |
| Programa | Pre-rellenado |
| Asignatura | Pre-rellenado (9 modulos DECA) |
| Nota evaluacion | **Profesor** |
| Nota examen | **Profesor** |
| Calificacion final | **Profesor** |
| Profesor | **Profesor** |
| Convalidada | **Miriam** (Si/No) |

### Flujo
1. El Sheet ya tiene 3.573 filas preparadas (397 alumnos DECA x 9 modulos)
2. Los profesores rellenan las columnas de notas
3. Proportione ejecuta `node sync-calificaciones.mjs` para sincronizar a Stackby
4. Las notas quedan en Stackby (tabla CALIFICACIONES) para certificados

### Consultar notas de un alumno
Pedir a Proportione que ejecute:
```
node calificaciones-client.mjs find alumno@email.com
```

---

## 5. Recibos de matricula

### Como generar un recibo
Pedir a Proportione que ejecute:
```
node recibo-pdf.mjs --email alumno@email.com --upload
```

Esto genera un PDF con los datos del alumno y del IITD, lo sube a la carpeta "Recibos IITD" en Drive, y lo registra en la pestana "Recibos" del Panel IITD.

### Donde encontrar los recibos
- **Drive:** Carpeta "Recibos IITD"
- **Panel IITD:** Pestana "Recibos"

---

## 6. Certificados DECA

### Como generar un certificado
Pedir a Proportione que ejecute:
```
node certificado-pdf.mjs --email alumno@email.com --upload
```

### Que genera
- **Certificado academico**: tabla de notas por asignatura
- **Diploma de finalizacion**: documento formal
- Ambos con **codigo QR** que enlaza a la version verificable online
- Se suben a `diplomas.institutoteologia.org`
- Se registran en la pestana "Certificados" del Panel IITD

### Verificacion de certificados
Cualquier persona puede escanear el QR del certificado. Redirige a la URL publica donde se puede descargar el PDF original.

---

## 7. Listados de alumnos

### En el Panel IITD
Las pestanas por programa ya estan preparadas. Se pueden filtrar por estado, programa, etc.

### Listados personalizados
Pedir a Proportione:
```
node listados.mjs --programa DECA --estado activo --csv
```
Genera un CSV descargable con los filtros aplicados.

---

## 8. Validacion de datos

Para comprobar la calidad de los datos de alumnos:
```
node validar-datos.mjs
```

Detecta: emails vacios o invalidos, duplicados, estados incorrectos, alumnos activos sin programa.

El resultado se escribe en la pestana "Validacion" del Panel IITD.

---

## 9. Contratos y firma electronica (BreezeDoc)

Para enviar un contrato de matricula, convenio o consentimiento RGPD a un alumno para que lo firme electronicamente:
```
node breezedoc-enrollment.mjs --email alumno@email.com --template matricula
```

Templates disponibles: `matricula`, `convenio`, `rgpd`

El alumno recibe un email con el documento para firmar.

---

## 10. Si algo no funciona

| Problema | Que hacer |
|----------|-----------|
| El email de notificacion no llega | Revisar spam. Si persiste, avisar a Proportione |
| Los datos no aparecen en Stackby | Esperar 5-10 minutos. Mirar columna Y del Sheet |
| Las notas no se sincronizan | Avisar a Proportione para ejecutar sync |
| No se genera un certificado | Verificar que el alumno tiene notas en Stackby |
| Problema tecnico general | Contactar con Proportione |

---

## Resumen rapido

| Tarea | Donde |
|-------|-------|
| Ver nueva solicitud | Email o Stackby → SOLICITUDES_DECA |
| Ver alumnos por programa | Panel IITD → pestana del programa |
| Ver dashboard | Panel IITD → pestana Dashboard |
| Ver KPIs | Panel IITD → pestana KPIs DECA |
| Ver notas de un alumno | Pedir a Proportione: `calificaciones-client.mjs find email` |
| Generar recibo | Pedir a Proportione: `recibo-pdf.mjs --email X --upload` |
| Generar certificado | Pedir a Proportione: `certificado-pdf.mjs --email X --upload` |
| Enviar contrato a firmar | Pedir a Proportione: `breezedoc-enrollment.mjs --email X --template Y` |

---

*Para dudas sobre este manual, contactar con Proportione.*
