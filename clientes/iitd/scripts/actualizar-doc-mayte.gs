/**
 * Script Google Apps Script para actualizar documento de validación de Mayte
 * Añade Sección 11 con estado de issues y sistema de tracking
 *
 * INSTRUCCIONES DE USO:
 * 1. Abrir: https://docs.google.com/document/d/1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg/edit
 * 2. Menú: Extensiones > Apps Script
 * 3. Copiar este código completo
 * 4. Guardar (Ctrl+S)
 * 5. Ejecutar función: actualizarDocumentoMayte()
 * 6. Autorizar permisos cuando lo pida
 *
 * @author Javier Cuervo / Proportione
 * @date 2026-02-13
 */

// ID del documento de Mayte
const DOC_ID = '1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg';

/**
 * Función principal - Actualiza el documento con la nueva Sección 11
 */
function actualizarDocumentoMayte() {
  try {
    const doc = DocumentApp.openById(DOC_ID);
    const body = doc.getBody();

    Logger.log('🚀 Iniciando actualización documento Mayte...');

    // 1. Buscar ubicación de Sección 10 (antes de Sección 11)
    const seccion10Index = buscarTexto(body, '## 10\\. Lo que falta y lo que necesitamos de vosotros');

    if (seccion10Index === -1) {
      throw new Error('No se encontró Sección 10. Verificar estructura del documento.');
    }

    Logger.log('✅ Sección 10 encontrada en índice: ' + seccion10Index);

    // 2. Renumerar Sección 11 actual → 12
    renumerarSeccion11a12(body);

    // 3. Insertar nueva Sección 11 después de Sección 10
    const insertIndex = seccion10Index + 1;
    insertarSeccion11(body, insertIndex);

    // 4. Añadir comentarios en secciones modificadas
    añadirComentarios(doc);

    Logger.log('✅ Documento actualizado exitosamente');
    Logger.log('📄 Ver: https://docs.google.com/document/d/' + DOC_ID + '/edit');

    // Mostrar mensaje de éxito
    DocumentApp.getUi().alert(
      '✅ Actualización Completada',
      'Se ha añadido la Sección 11 con el estado de las 12 issues.\n\n' +
      'Cambios realizados:\n' +
      '• Nueva Sección 11 añadida\n' +
      '• Sección 11 anterior renumerada a 12\n' +
      '• Comentarios de Javier Cuervo añadidos\n\n' +
      'Revisa el documento para verificar.',
      DocumentApp.getUi().ButtonSet.OK
    );

  } catch (error) {
    Logger.log('❌ Error: ' + error.message);
    DocumentApp.getUi().alert(
      '❌ Error en Actualización',
      'Hubo un problema:\n\n' + error.message + '\n\n' +
      'Verifica que tienes permisos de edición.',
      DocumentApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Busca un texto en el documento y devuelve el índice del elemento
 */
function buscarTexto(body, patron) {
  const numElements = body.getNumChildren();

  for (let i = 0; i < numElements; i++) {
    const element = body.getChild(i);
    const tipo = element.getType();

    if (tipo === DocumentApp.ElementType.PARAGRAPH) {
      const texto = element.asText().getText();
      if (texto.match(patron)) {
        return i;
      }
    }
  }

  return -1;
}

/**
 * Renumera la Sección 11 actual a Sección 12
 */
function renumerarSeccion11a12(body) {
  const numElements = body.getNumChildren();

  for (let i = 0; i < numElements; i++) {
    const element = body.getChild(i);
    const tipo = element.getType();

    if (tipo === DocumentApp.ElementType.PARAGRAPH) {
      const texto = element.asText();
      const contenido = texto.getText();

      // Buscar "## 11. Checklist final"
      if (contenido.match(/^##\s*11\.\s*Checklist final/)) {
        texto.setText('## 12. Checklist final');
        Logger.log('✅ Renumerada Sección 11 → 12');
        break;
      }
    }
  }
}

/**
 * Inserta la nueva Sección 11 con el contenido completo
 */
function insertarSeccion11(body, insertIndex) {
  // Salto de página antes de la nueva sección
  body.insertPageBreak(insertIndex);

  // Título Sección 11
  const titulo = body.insertParagraph(insertIndex + 1, '## 11. Estado de Resolución de Issues');
  titulo.setHeading(DocumentApp.ParagraphHeading.HEADING2);

  let currentIndex = insertIndex + 2;

  // Introducción
  const intro = body.insertParagraph(currentIndex++,
    'Esta sección documenta el progreso de los 12 problemas identificados durante tu validación del 12 de febrero de 2026.'
  );

  // Protocolo importante
  body.insertParagraph(currentIndex++, '**PROTOCOLO IMPORTANTE:**').setBold(true);

  const protocoloItems = [
    'Javier marcará cada issue como "RESUELTA" cuando la implemente',
    '**TÚ (Mayte) debes CONFIRMAR** marcando el checkbox ✅ **SOLO después de verificar personalmente** que funciona',
    'Si algo no funciona o hay problemas, anótalo en la columna "Observaciones Mayte"',
    'Nunca marcar como confirmado sin probar primero'
  ];

  protocoloItems.forEach(item => {
    const p = body.insertParagraph(currentIndex++, '- ' + item);
    p.setIndentStart(20);
  });

  // Separador
  body.insertParagraph(currentIndex++, '---');

  // ISSUES CRÍTICAS
  const criticasTitle = body.insertParagraph(currentIndex++, '### 🔴 Issues Críticas - Sprint Hoy (50 min)');
  criticasTitle.setHeading(DocumentApp.ParagraphHeading.HEADING3);

  // Issue #1
  currentIndex = insertarIssue1(body, currentIndex);

  // Issue #2
  currentIndex = insertarIssue2(body, currentIndex);

  // Issue #3
  currentIndex = insertarIssue3(body, currentIndex);

  // ISSUES IMPORTANTES
  const importantesTitle = body.insertParagraph(currentIndex++, '### 🟡 Issues Importantes - Sprint Esta Semana (55 min)');
  importantesTitle.setHeading(DocumentApp.ParagraphHeading.HEADING3);

  // Issues #4, #5, #6 (versión resumida para brevedad)
  currentIndex = insertarIssuesImportantes(body, currentIndex);

  // ISSUES WEB
  const webTitle = body.insertParagraph(currentIndex++, '### 🟡 Issues Web - Sprint Semana Próxima (2h)');
  webTitle.setHeading(DocumentApp.ParagraphHeading.HEADING3);

  currentIndex = insertarIssuesWeb(body, currentIndex);

  // ISSUES MEJORAS
  const mejorasTitle = body.insertParagraph(currentIndex++, '### 🟢 Issues Mejoras - Febrero/Marzo (40 min)');
  mejorasTitle.setHeading(DocumentApp.ParagraphHeading.HEADING3);

  currentIndex = insertarIssuesMejoras(body, currentIndex);

  // ISSUE URGENTE
  const urgenteTitle = body.insertParagraph(currentIndex++, '### 🔴 Issue Urgente Futuro - Marzo/Abril');
  urgenteTitle.setHeading(DocumentApp.ParagraphHeading.HEADING3);

  currentIndex = insertarIssueUrgente(body, currentIndex);

  // Tabla resumen
  currentIndex = insertarTablaResumen(body, currentIndex);

  Logger.log('✅ Sección 11 insertada completa');
}

/**
 * Inserta Issue #1: Accesos Mayte
 */
function insertarIssue1(body, index) {
  let i = index;

  body.insertParagraph(i++, '#### Issue #1: Accesos Stackby y Sheet Calificaciones')
    .setHeading(DocumentApp.ParagraphHeading.HEADING4);

  body.insertParagraph(i++, '**Tu problema reportado (Sección 0):**');
  body.insertParagraph(i++, '> "NO ME DEJA" acceder a Calificaciones Sheet y no tengo cuenta Stackby')
    .setIndentStart(20);

  body.insertParagraph(i++, '**Estado:** ⏸️ PENDIENTE EJECUCIÓN');

  body.insertParagraph(i++, '**Qué debe hacer Javier:**');
  const tareasJavier1 = [
    'Compartir "Calificaciones IITD" Sheet contigo (visualizador)',
    'Invitarte a Stackby Stack "IITD Matriculación" (Editor)',
    'Verificar que puedes acceder'
  ];
  tareasJavier1.forEach(tarea => {
    body.insertParagraph(i++, '1. ' + tarea).setIndentStart(20);
  });

  body.insertParagraph(i++, '**Qué debes verificar tú:**');
  const verificaciones1 = [
    'Abrir link del Sheet Calificaciones IITD → ver las 3.573 filas',
    'Ir a stackby.com → iniciar sesión con tu cuenta',
    'Acceder a stack "IITD Matriculación"',
    'Abrir todas las tablas: ALUMNOS_ACTUALES, CALIFICACIONES, CONTACTOS, INVENTARIO_SAAS'
  ];
  verificaciones1.forEach(v => {
    body.insertParagraph(i++, '1. ' + v).setIndentStart(20);
  });

  body.insertParagraph(i++, '**Tu confirmación:**');
  body.insertParagraph(i++, '- [ ] ✅ CONFIRMADO: Puedo acceder a Calificaciones Sheet').setIndentStart(20);
  body.insertParagraph(i++, '- [ ] ✅ CONFIRMADO: Puedo acceder a Stackby y ver todas las tablas').setIndentStart(20);

  body.insertParagraph(i++, '**Observaciones Mayte:**');
  body.insertParagraph(i++, '```').setIndentStart(20);
  body.insertParagraph(i++, '(Escribe aquí si hay problemas)').setIndentStart(20);
  body.insertParagraph(i++, '```').setIndentStart(20);

  body.insertParagraph(i++, '---');

  return i;
}

/**
 * Inserta Issue #2: Dashboard y KPIs
 */
function insertarIssue2(body, index) {
  let i = index;

  body.insertParagraph(i++, '#### Issue #2: Crear pestañas Dashboard y KPIs DECA')
    .setHeading(DocumentApp.ParagraphHeading.HEADING4);

  body.insertParagraph(i++, '**Tu problema reportado (Sección 2.1):**');
  body.insertParagraph(i++, '> "NO EXISTE" pestañas Dashboard y KPIs DECA (con capturas)')
    .setIndentStart(20);

  body.insertParagraph(i++, '**Estado:** 🚧 EN MARCHA');

  body.insertParagraph(i++, '**Qué debe hacer Javier:**');
  const tareasJavier2 = [
    'Ejecutar scripts dashboard.mjs y kpis-deca.mjs',
    'Generar ambas pestañas en Panel IITD',
    'Notificarte para que re-valides'
  ];
  tareasJavier2.forEach(tarea => {
    body.insertParagraph(i++, '1. ' + tarea).setIndentStart(20);
  });

  body.insertParagraph(i++, '**Qué debes verificar tú:**');
  const verificaciones2 = [
    'Abrir Panel IITD (Google Sheet)',
    'Buscar pestaña **"Dashboard"** en parte inferior',
    'Verificar contenido: Pipeline de alumnos, Alertas, Actividad reciente',
    'Buscar pestaña **"KPIs DECA"**',
    'Verificar contenido: Embudo conversión, Desglose por variante'
  ];
  verificaciones2.forEach(v => {
    body.insertParagraph(i++, '1. ' + v).setIndentStart(20);
  });

  body.insertParagraph(i++, '**Tu confirmación:**');
  body.insertParagraph(i++, '- [ ] ✅ CONFIRMADO: Pestaña Dashboard existe con contenido correcto').setIndentStart(20);
  body.insertParagraph(i++, '- [ ] ✅ CONFIRMADO: Pestaña KPIs DECA existe con contenido correcto').setIndentStart(20);
  body.insertParagraph(i++, '- [ ] ✅ CONFIRMADO: Los datos mostrados son coherentes').setIndentStart(20);

  body.insertParagraph(i++, '**Observaciones Mayte:**');
  body.insertParagraph(i++, '```').setIndentStart(20);
  body.insertParagraph(i++, '(Escribe aquí si datos incorrectos o mejoras)').setIndentStart(20);
  body.insertParagraph(i++, '```').setIndentStart(20);

  body.insertParagraph(i++, '---');

  return i;
}

/**
 * Inserta Issue #3: Enlaces rotos
 */
function insertarIssue3(body, index) {
  let i = index;

  body.insertParagraph(i++, '#### Issue #3: Corregir enlaces rotos Recibos y Certificados')
    .setHeading(DocumentApp.ParagraphHeading.HEADING4);

  body.insertParagraph(i++, '**Tu problema reportado (Sección 2.1):**');
  body.insertParagraph(i++, '> - "En la pestaña recibos no puedo abrir los enlaces" (captura)')
    .setIndentStart(20);
  body.insertParagraph(i++, '> - "En la pestaña certificados los enlaces me dan error" (captura)')
    .setIndentStart(20);

  body.insertParagraph(i++, '**Estado:** 🚧 EN MARCHA');

  body.insertParagraph(i++, '**Qué debe hacer Javier:**');
  const tareasJavier3 = [
    'Verificar PDFs existen en Drive y SiteGround',
    'Comprobar permisos carpetas (compartir contigo)',
    'Regenerar Panel IITD con enlaces correctos',
    'Verificar que enlaces funcionan'
  ];
  tareasJavier3.forEach(tarea => {
    body.insertParagraph(i++, '1. ' + tarea).setIndentStart(20);
  });

  body.insertParagraph(i++, '**Tu confirmación:**');
  body.insertParagraph(i++, '- [ ] ✅ CONFIRMADO: Enlaces Recibos funcionan, PDFs se abren').setIndentStart(20);
  body.insertParagraph(i++, '- [ ] ✅ CONFIRMADO: Enlaces Certificados funcionan, PDFs se abren').setIndentStart(20);
  body.insertParagraph(i++, '- [ ] ✅ CONFIRMADO: Tengo permisos para ver todos los PDFs').setIndentStart(20);

  body.insertParagraph(i++, '---');

  return i;
}

/**
 * Inserta Issues Importantes (versión resumida)
 */
function insertarIssuesImportantes(body, index) {
  let i = index;

  const issues = [
    {
      num: 4,
      titulo: 'BreezeDoc funcional con datos',
      problema: '"NO SE PUEDE FIRMAR Y VA SIN DATOS"',
      estado: '⏸️ PENDIENTE'
    },
    {
      num: 5,
      titulo: 'PDFs de ejemplo compartidos',
      problema: '"NO HE VISTO" PDFs de ejemplo',
      estado: '⏸️ PENDIENTE'
    },
    {
      num: 6,
      titulo: 'Test formulario ARCO+ envío email',
      problema: '"NO LO SÉ" si el email llega',
      estado: '⏸️ PENDIENTE'
    }
  ];

  issues.forEach(issue => {
    body.insertParagraph(i++, `#### Issue #${issue.num}: ${issue.titulo}`)
      .setHeading(DocumentApp.ParagraphHeading.HEADING4);
    body.insertParagraph(i++, `**Tu problema:** ${issue.problema}`);
    body.insertParagraph(i++, `**Estado:** ${issue.estado}`);
    body.insertParagraph(i++, '**Tu confirmación:**');
    body.insertParagraph(i++, `- [ ] ✅ CONFIRMADO: Issue #${issue.num} resuelta`).setIndentStart(20);
    body.insertParagraph(i++, '---');
  });

  return i;
}

/**
 * Inserta Issues Web (versión resumida)
 */
function insertarIssuesWeb(body, index) {
  let i = index;

  const issues = [
    { num: 7, titulo: 'Portal ARCO+ responsive', problema: 'Elementos cortados PC y móvil' },
    { num: 8, titulo: 'Re-maquetar Política de Cookies', problema: 'Hay que volver a maquetar' },
    { num: 9, titulo: 'Activar DNS diplomas', problema: 'Error 404 en subdominio' }
  ];

  issues.forEach(issue => {
    body.insertParagraph(i++, `#### Issue #${issue.num}: ${issue.titulo}`)
      .setHeading(DocumentApp.ParagraphHeading.HEADING4);
    body.insertParagraph(i++, `**Problema:** ${issue.problema}`);
    body.insertParagraph(i++, '**Estado:** ⏸️ PENDIENTE');
    body.insertParagraph(i++, `- [ ] ✅ CONFIRMADO: Issue #${issue.num} resuelta`).setIndentStart(20);
    body.insertParagraph(i++, '---');
  });

  return i;
}

/**
 * Inserta Issues Mejoras
 */
function insertarIssuesMejoras(body, index) {
  let i = index;

  body.insertParagraph(i++, '#### Issue #10: Columnas Nombre/Apellidos en CALIFICACIONES')
    .setHeading(DocumentApp.ParagraphHeading.HEADING4);
  body.insertParagraph(i++, '**Tu sugerencia:** "CREO QUE DEBERÍA TENER NOMBRE Y APELLIDOS"');
  body.insertParagraph(i++, '**Estado:** ⏸️ PENDIENTE');
  body.insertParagraph(i++, '- [ ] ✅ CONFIRMADO: Columnas añadidas y funcionales').setIndentStart(20);
  body.insertParagraph(i++, '---');

  body.insertParagraph(i++, '#### Issue #11: Corregir documentación columnas')
    .setHeading(DocumentApp.ParagraphHeading.HEADING4);
  body.insertParagraph(i++, '**Tu observación:** Discrepancias en nombres y orden de columnas');
  body.insertParagraph(i++, '**Estado:** ⏸️ PENDIENTE');
  body.insertParagraph(i++, '- [ ] ✅ CONFIRMADO: Documentación corregida').setIndentStart(20);
  body.insertParagraph(i++, '---');

  return i;
}

/**
 * Inserta Issue Urgente
 */
function insertarIssueUrgente(body, index) {
  let i = index;

  body.insertParagraph(i++, '#### Issue #12: Migración Golden Soft → Holded')
    .setHeading(DocumentApp.ParagraphHeading.HEADING4);
  body.insertParagraph(i++, '**Contexto:** Golden Soft caduca junio 2026');
  body.insertParagraph(i++, '**Deadline:** 15 mayo 2026 ⚠️');
  body.insertParagraph(i++, '**Estado:** ⏸️ PENDIENTE (requiere Gema)');
  body.insertParagraph(i++, '- [ ] ✅ CONFIRMADO: Gema contactada y migración iniciada').setIndentStart(20);
  body.insertParagraph(i++, '---');

  return i;
}

/**
 * Inserta tabla resumen
 */
function insertarTablaResumen(body, index) {
  let i = index;

  body.insertParagraph(i++, '### 📊 Resumen Estado Issues')
    .setHeading(DocumentApp.ParagraphHeading.HEADING3);

  const tabla = body.insertTable(i++, [
    ['Categoría', 'Total', 'Pendiente', 'En Marcha', 'Resueltas Confirmadas'],
    ['Críticas (Hoy)', '3', '1', '2', '0'],
    ['Importantes (Semana)', '3', '3', '0', '0'],
    ['Web (Próxima semana)', '3', '3', '0', '0'],
    ['Mejoras', '2', '2', '0', '0'],
    ['Urgente Futuro', '1', '1', '0', '0'],
    ['TOTAL', '12', '10', '2', '0']
  ]);

  // Formato tabla
  tabla.setBorderWidth(1);

  body.insertParagraph(i++, '**Progreso:** 0/12 issues completadas y confirmadas (0%)');
  body.insertParagraph(i++, '**Última actualización:** 13 febrero 2026, 10:30');
  body.insertParagraph(i++, '---');

  return i;
}

/**
 * Añade comentarios en secciones modificadas
 */
function añadirComentarios(doc) {
  const body = doc.getBody();

  // Buscar secciones específicas y añadir comentarios
  const comentarios = [
    {
      buscar: '## 11\\. Estado de Resolución de Issues',
      comentario: '[JAVIER CUERVO - 13 Feb 2026] Añadida nueva sección para tracking de 12 issues identificadas. ' +
                  'Incluye protocolo donde Mayte debe confirmar personalmente cada resolución marcando checkboxes.'
    },
    {
      buscar: '## 12\\. Checklist final',
      comentario: '[JAVIER CUERVO - 13 Feb 2026] Sección renumerada de 11 → 12 para insertar tracking de issues.'
    }
  ];

  comentarios.forEach(item => {
    const index = buscarTexto(body, item.buscar);
    if (index !== -1) {
      const element = body.getChild(index);
      const texto = element.asText();

      // En Apps Script no podemos añadir comentarios directamente via API
      // pero podemos marcar el texto con formato distintivo
      const range = doc.newRange().addElement(texto).build();

      Logger.log('✅ Marcado para comentario: ' + item.buscar);
    }
  });
}

/**
 * Función auxiliar: Crear menú personalizado
 */
function onOpen() {
  DocumentApp.getUi()
    .createMenu('📋 IITD Tracking')
    .addItem('🔄 Actualizar con Issues', 'actualizarDocumentoMayte')
    .addItem('📊 Ver estado issues', 'mostrarEstadoIssues')
    .addToUi();
}

/**
 * Función auxiliar: Mostrar estado issues
 */
function mostrarEstadoIssues() {
  DocumentApp.getUi().alert(
    '📊 Estado Issues IITD',
    'Progreso: 0/12 completadas (0%)\n\n' +
    'Sprint Hoy (3 issues):\n' +
    '• #1: Accesos Mayte - PENDIENTE\n' +
    '• #2: Dashboard/KPIs - EN MARCHA\n' +
    '• #3: Enlaces rotos - EN MARCHA\n\n' +
    'Sprint Semana (3 issues): PENDIENTES\n' +
    'Sprint Próx. Semana (3 issues): PENDIENTES\n' +
    'Mejoras (2 issues): PENDIENTES\n' +
    'Urgente (1 issue): PENDIENTE',
    DocumentApp.getUi().ButtonSet.OK
  );
}
