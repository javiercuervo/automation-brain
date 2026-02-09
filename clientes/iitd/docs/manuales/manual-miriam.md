# Manual de Usuario - Automatizaciones IITD

**Para:** Miriam y equipo de operaciones
**Última actualización:** Febrero 2026

---

## 1. Nuevas solicitudes DECA

### Qué pasa automáticamente
Cuando alguien rellena el formulario de inscripción DECA en la web:

1. Los datos se guardan en el Google Sheet "Deca Inscripción"
2. Cada 5 minutos, el sistema envía los datos a Stackby
3. Recibes un email con el asunto **"[DECA] Nueva solicitud: Nombre del solicitante"**

### Qué tienes que hacer
- **Nada.** Los datos llegan solos.
- Revisa el email para ver los datos básicos
- Entra en Stackby para ver el registro completo

### Dónde ver las solicitudes
- **Stackby:** Tabla "SOLICITUDES_DECA"
- **Google Sheets:** Hoja "Deca Inscripción" (datos originales)

---

## 2. Marcar a alguien como alumno

### Cuándo hacerlo
Cuando hayas verificado que una persona:
- Ha sido admitida
- Ha enviado la documentación
- Procede crear su registro como alumno

### Cómo hacerlo

1. **Abre el Google Sheet** "Deca Inscripción"
2. **Busca la fila** de la persona
3. **Ve a la columna AB** (titulada "Es alumno")
4. **Escribe "Sí"** (con acento)
5. **Espera unos minutos** - el sistema creará el registro en la tabla ALUMNOS

### Cómo saber que funcionó
- La columna AC ("alumno_created_at") mostrará la fecha y hora
- En Stackby, aparecerá el registro en la tabla ALUMNOS_ACTUALES

### Valores que puedes poner en la columna AB
| Valor | Resultado |
|-------|-----------|
| **Sí** | Se crea registro de alumno |
| **No** | No se crea nada (solicitud rechazada) |
| *(vacío)* | Pendiente de decisión |

---

## 3. Ver el estado de las solicitudes

### En el Google Sheet

| Columna | Qué significa |
|---------|---------------|
| **Y - published_at** | Fecha/hora en que se envió a Stackby |
| **Z - publish_attempts** | Número de intentos (normalmente 1) |
| **AA - last_error** | Si hubo algún error, aparece aquí |
| **AB - Es alumno** | Tu decisión (Sí/No/vacío) |
| **AC - alumno_created_at** | Cuándo se creó el alumno |

### Estados posibles

| Estado en columna Y | Significado |
|--------------------|-------------|
| Tiene fecha | Enviado correctamente a Stackby |
| Vacío | Pendiente de enviar |

### Si hay un error
1. Mira la columna AA para ver qué pasó
2. Si el error persiste, avisa a soporte técnico
3. El sistema reintenta automáticamente hasta 5 veces

---

## 4. Qué hacer si algo no funciona

### El email de notificación no llega
- Revisa la carpeta de spam
- Comprueba que el email "proportione@institutoteologia.org" no está bloqueado
- Si sigue sin llegar, avisa a soporte

### Los datos no aparecen en Stackby
- Espera 5-10 minutos (el sistema procesa cada 5 minutos)
- Mira la columna Y del Sheet - si está vacía, aún no se ha procesado
- Si hay error en columna AA, avisa a soporte

### Marqué "Sí" pero no se creó el alumno
- Verifica que escribiste exactamente "Sí" (con acento)
- Espera 10 minutos
- Mira si la columna AC tiene fecha
- Si no aparece, avisa a soporte

---

## 5. Preguntas frecuentes

### ¿Puedo modificar los datos en Stackby?
Sí, puedes modificar los datos en Stackby sin problema. Los cambios NO se sobrescriben.

### ¿Qué pasa si alguien envía el formulario dos veces?
El sistema detecta duplicados por email y actualiza el registro existente en lugar de crear uno nuevo.

### ¿Cómo cambio de "No" a "Sí" si me equivoqué?
Simplemente borra "No" y escribe "Sí". El sistema creará el alumno en el siguiente ciclo.

### ¿A qué hora se procesan las solicitudes?
Cada 5 minutos, las 24 horas del día.

---

## Resumen rápido

| Tarea | Acción |
|-------|--------|
| Ver nueva solicitud | Revisa el email o Stackby |
| Crear alumno | Escribe "Sí" en columna AB del Sheet |
| Ver si hubo error | Mira columna AA del Sheet |
| Problema técnico | Contacta a soporte |

---

*Para dudas sobre este manual, contacta con el equipo de soporte técnico.*
