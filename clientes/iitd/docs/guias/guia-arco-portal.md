# Guia operativa: Portal ARCO+ (N43)

## Que es

Formulario web para que alumnos y usuarios ejerzan sus derechos RGPD (Art. 15-22):
acceso, rectificacion, supresion, portabilidad, oposicion y limitacion.

El formulario envia la solicitud a `informacion@institutoteologia.org`.

---

## Como publicar en WordPress

### Opcion A: Pagina HTML directa

1. Ir al panel WordPress > **Paginas** > **Anadir nueva**
2. Titulo: "Ejercicio de Derechos RGPD"
3. Cambiar al editor **HTML** (icono `<>` en Gutenberg)
4. Copiar el contenido de `arco-portal.html` (solo el `<form>` y los estilos)
5. Publicar en la URL: `institutoteologia.org/ejercicio-derechos-rgpd/`

### Opcion B: Contact Form 7

Si ya se usa Contact Form 7 en la web, crear un formulario con estos campos:

```
[text* nombre placeholder "Nombre completo"]
[email* email placeholder "Correo electronico"]
[text dni placeholder "DNI/NIE (opcional)"]
[select* derecho "Acceso" "Rectificacion" "Supresion" "Portabilidad" "Oposicion" "Limitacion"]
[textarea mensaje placeholder "Detalle de su solicitud"]
[acceptance acepto] He leido y acepto la Politica de Privacidad [/acceptance]
[submit "Enviar solicitud"]
```

Configurar envio a: `informacion@institutoteologia.org`

---

## Que hacer al recibir una solicitud

### Plazos

- **30 dias naturales** para responder desde la recepcion
- Prorroga de **2 meses** si la solicitud es compleja (notificar al solicitante en el primer mes)

### Verificacion de identidad

1. Comprobar que el email coincide con un alumno registrado en Stackby
2. Si hay DNI, verificar que coincide con el registro
3. Si no se puede verificar, solicitar copia del DNI por email

### Tramitacion por tipo de derecho

| Derecho | Que hacer | Script / herramienta |
|---------|-----------|---------------------|
| **Acceso** | Exportar datos del alumno y enviar por email | `node exportar-alumno.mjs --email alumno@email.com --all` |
| **Rectificacion** | Corregir datos en Stackby manualmente | Stackby UI > tabla ALUMNOS |
| **Supresion** | Anonimizar datos (respetar plazos legales) | `node rgpd-retencion.mjs --purge --dry-run` primero, luego `--confirm` |
| **Portabilidad** | Exportar en JSON + CSV y enviar | `node exportar-alumno.mjs --email alumno@email.com --all` |
| **Oposicion** | Dejar de enviar comunicaciones comerciales | Dar de baja en Acumbamail + marcar en Stackby |
| **Limitacion** | Marcar registro como "limitado" en Stackby | Anadir nota en campo Observaciones |

---

## Plantillas de respuesta

### Acceso / Portabilidad

```
Asunto: Respuesta a su solicitud de [acceso/portabilidad] — IITD

Estimado/a [nombre],

En respuesta a su solicitud de [acceso/portabilidad] recibida el [fecha],
le adjuntamos los datos personales que obran en nuestros archivos en
formato [JSON/CSV].

Si tiene alguna duda, no dude en contactarnos.

Atentamente,
Instituto Internacional de Teologia a Distancia
informacion@institutoteologia.org
```

### Rectificacion

```
Asunto: Confirmacion de rectificacion de datos — IITD

Estimado/a [nombre],

Le confirmamos que hemos procedido a rectificar los siguientes datos
en nuestros registros:

- [Campo]: [valor anterior] -> [valor nuevo]

Si detecta algun error adicional, no dude en comunicarnoslo.

Atentamente,
Instituto Internacional de Teologia a Distancia
```

### Supresion

```
Asunto: Confirmacion de supresion de datos — IITD

Estimado/a [nombre],

Le confirmamos que hemos procedido a la supresion/anonimizacion de
sus datos personales conforme a su solicitud.

Nota: Determinados datos podran conservarse durante los plazos legales
establecidos (obligaciones fiscales: 4 anos; responsabilidad civil: 5 anos).

Atentamente,
Instituto Internacional de Teologia a Distancia
```

### Oposicion

```
Asunto: Confirmacion de oposicion al tratamiento — IITD

Estimado/a [nombre],

Le confirmamos que hemos cesado el tratamiento de sus datos para los
fines indicados en su solicitud. No recibira mas comunicaciones
comerciales de nuestra parte.

Atentamente,
Instituto Internacional de Teologia a Distancia
```

---

## Registro de solicitudes

Registrar cada solicitud en un documento/tabla con:
- Fecha de recepcion
- Nombre y email del solicitante
- Tipo de derecho
- Fecha de respuesta
- Resultado (aceptada, denegada parcial, denegada)

Esto es obligatorio para demostrar cumplimiento ante la AEPD.
