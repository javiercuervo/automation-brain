/**
 * Script Google Apps Script para actualizar documento de validación IITD
 * Añade Sección 12 con sistema de tracking multi-usuario (6 validadores)
 *
 * INSTRUCCIONES DE USO:
 * 1. Abrir: https://docs.google.com/document/d/1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg/edit
 * 2. Menú: Extensiones > Apps Script
 * 3. Copiar este código completo
 * 4. Guardar (Ctrl+S)
 * 5. Ejecutar función: actualizarDocValidacionMultiusuario()
 * 6. Autorizar permisos cuando lo pida
 *
 * @author Javier Cuervo / Proportione
 * @date 2026-02-13
 */

// ID del documento de validación IITD
const DOC_ID = '1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg';

/**
 * Función principal - Actualiza el documento con tracking multi-usuario
 */
function actualizarDocValidacionMultiusuario() {
  try {
    const doc = DocumentApp.openById(DOC_ID);
    const body = doc.getBody();

    Logger.log('🚀 Iniciando actualización multi-usuario...');

    // 1. Buscar ubicación de Sección 11 (Checklist final)
    const seccion11Index = buscarTexto(body, '## 11\\. Checklist final');

    if (seccion11Index === -1) {
      throw new Error('No se encontró Sección 11 (Checklist final). Verificar estructura del documento.');
    }

    Logger.log('✅ Sección 11 encontrada en índice: ' + seccion11Index);

    // 2. Buscar ubicación de "## Siguiente paso" (actual Sección 12)
    const siguientePasoIndex = buscarTexto(body, '## Siguiente paso');

    if (siguientePasoIndex === -1) {
      throw new Error('No se encontró sección "Siguiente paso". Verificar estructura.');
    }

    Logger.log('✅ Sección "Siguiente paso" encontrada en índice: ' + siguientePasoIndex);

    // 3. Renumerar "## Siguiente paso" → "## 13. Siguiente paso"
    renumerarSiguientePaso(body, siguientePasoIndex);

    // 4. Insertar nueva Sección 12 ANTES de "Siguiente paso"
    insertarSeccion12MultiUsuario(body, siguientePasoIndex);

    Logger.log('✅ Documento actualizado exitosamente');
    Logger.log('📄 Ver: https://docs.google.com/document/d/' + DOC_ID + '/edit');

    // Mostrar mensaje de éxito
    DocumentApp.getUi().alert(
      '✅ Actualización Completada',
      'Se ha añadido la Sección 12 con tracking multi-usuario.\n\n' +
      'Cambios realizados:\n' +
      '• Nueva Sección 12: Registro de Validación Multi-Usuario\n' +
      '• Tabla con 6 validadores (Sonia, Miriam, José Angel, Josete, Javier, Mayte)\n' +
      '• Sección "Siguiente paso" renumerada a 13\n\n' +
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
 * Renumera "## Siguiente paso" a "## 13. Siguiente paso"
 */
function renumerarSiguientePaso(body, index) {
  const element = body.getChild(index);
  const texto = element.asText();

  texto.setText('## 13. Siguiente paso');
  Logger.log('✅ Renumerada "Siguiente paso" → "13. Siguiente paso"');
}

/**
 * Inserta la nueva Sección 12 con tracking multi-usuario
 */
function insertarSeccion12MultiUsuario(body, insertBeforeIndex) {
  let currentIndex = insertBeforeIndex;

  // Separador antes de la nueva sección
  body.insertParagraph(currentIndex++, '---');

  // Título Sección 12
  const titulo = body.insertParagraph(currentIndex++, '## 12. Registro de Validación Multi-Usuario');
  titulo.setHeading(DocumentApp.ParagraphHeading.HEADING2);

  // Introducción
  body.insertParagraph(currentIndex++,
    'Este proyecto está siendo validado por múltiples personas del equipo IITD. Aquí se registra el progreso de cada validador.'
  );

  body.insertParagraph(currentIndex++, '**Validadores activos:** 6 personas').setBold(true);

  // Crear tabla
  const tabla = body.insertTable(currentIndex++, [
    ['Validador', 'Rol', 'Progreso', 'Última actualización', 'Comentarios/Issues reportados'],
    ['Sonia', '-', '0/24', '-', '-'],
    ['Miriam', 'Secretaria', '0/24', '-', '-'],
    ['José Angel', '-', '0/24', '-', '-'],
    ['Josete', '-', '0/24', '-', '-'],
    ['Javier', 'Coordinador técnico', '0/24', '-', '-'],
    ['Mayte', 'QA', '15/24 (62.5%)', '12 Feb 2026', '12 issues identificados (ver ISSUES-PENDIENTES.md)']
  ]);

  // Formato tabla
  tabla.setBorderWidth(1);

  // Encabezado en negrita
  const headerRow = tabla.getRow(0);
  for (let i = 0; i < 5; i++) {
    headerRow.getCell(i).getChild(0).asText().setBold(true);
  }

  // Notas
  body.insertParagraph(currentIndex++, '**Notas:**').setBold(true);

  const notas = [
    'Cada validador marca su progreso en el Checklist (Sección 11)',
    'Los comentarios se registran en comunicación externa (email/Slack)',
    'Issues críticos se documentan en `/clientes/iitd/docs/ESTADO-ISSUES-MAYTE.md`'
  ];

  notas.forEach(nota => {
    const p = body.insertParagraph(currentIndex++, '- ' + nota);
    p.setIndentStart(20);
  });

  // Separador final
  body.insertParagraph(currentIndex++, '---');

  Logger.log('✅ Sección 12 Multi-Usuario insertada completa');
}

/**
 * Función auxiliar: Crear menú personalizado
 */
function onOpen() {
  DocumentApp.getUi()
    .createMenu('📋 IITD Validación')
    .addItem('🔄 Añadir tracking multi-usuario', 'actualizarDocValidacionMultiusuario')
    .addItem('📊 Ver estado validadores', 'mostrarEstadoValidadores')
    .addToUi();
}

/**
 * Función auxiliar: Mostrar estado validadores
 */
function mostrarEstadoValidadores() {
  DocumentApp.getUi().alert(
    '📊 Estado Validadores IITD',
    'Total validadores activos: 6 personas\n\n' +
    'Progreso actual:\n' +
    '• Sonia: 0/24 (0%)\n' +
    '• Miriam: 0/24 (0%)\n' +
    '• José Angel: 0/24 (0%)\n' +
    '• Josete: 0/24 (0%)\n' +
    '• Javier: 0/24 (0%)\n' +
    '• Mayte: 15/24 (62.5%)\n\n' +
    'Próximo paso: Cada validador debe actualizar su progreso\n' +
    'en la tabla de Sección 12.',
    DocumentApp.getUi().ButtonSet.OK
  );
}
