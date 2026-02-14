#!/usr/bin/env node

/**
 * FAQ Responder — IITD (N35)
 *
 * Motor de respuesta FAQ por pattern-matching (NO IA).
 * Primera linea de respuesta automatica para tickets.
 * Disenado para que en futuro se pueda reemplazar matchFAQ con LLM.
 *
 * Scoring:
 *   - Frase exacta en asunto o mensaje: 95
 *   - 2+ keywords coinciden: 85
 *   - 1 keyword coincide: 60
 *
 * Usage:
 *   node faq-responder.mjs list                                    # Listar FAQs
 *   node faq-responder.mjs test --asunto "..." --mensaje "..."     # Probar matching
 */

export const CONFIDENCE_THRESHOLD = 80;

// =====================================================
// FAQ ENTRIES
// =====================================================

export const FAQ_ENTRIES = [
  {
    id: 'faq-matricula-como',
    categoria: 'matricula',
    keywords: ['matricular', 'matricula', 'inscribir', 'inscripcion', 'apuntar'],
    frases: ['quiero matricularme', 'como me matriculo', 'proceso de matricula'],
    respuesta: 'Para matricularse en nuestros programas, puede hacerlo a traves de nuestra pagina web en institutoteologia.org o contactando con nosotros en informacion@institutoteologia.org. Le enviaremos toda la informacion necesaria sobre plazos, requisitos y documentacion.',
  },
  {
    id: 'faq-matricula-plazos',
    categoria: 'matricula',
    keywords: ['plazo', 'fecha', 'cuando', 'periodo', 'matricula'],
    frases: ['plazo de matricula', 'hasta cuando puedo matricularme', 'fecha limite matricula'],
    respuesta: 'Los plazos de matricula varian segun el programa. Generalmente, el periodo de matricula se abre en septiembre y se cierra en octubre para el primer cuatrimestre. Para informacion actualizada sobre plazos, contacte con informacion@institutoteologia.org.',
  },
  {
    id: 'faq-matricula-precio',
    categoria: 'matricula',
    keywords: ['precio', 'coste', 'cuanto', 'tarifa', 'importe', 'pagar'],
    frases: ['cuanto cuesta', 'precio matricula', 'coste del programa'],
    respuesta: 'Los precios de nuestros programas dependen del tipo y la modalidad elegida. Puede consultar las tarifas actualizadas en nuestra web o solicitarlas escribiendo a informacion@institutoteologia.org. Disponemos de facilidades de pago.',
  },
  {
    id: 'faq-deca-info',
    categoria: 'matricula',
    keywords: ['deca', 'religion', 'habilitacion', 'competencia'],
    frases: ['informacion deca', 'que es deca', 'deca infantil', 'deca eso'],
    respuesta: 'La DECA (Declaracion Eclesiastica de Competencia Academica) habilita para la ensenanza de Religion en centros educativos. Ofrecemos DECA para Infantil y Primaria (9 asignaturas) y DECA para ESO y Bachillerato (9 asignaturas). Mas informacion en informacion@institutoteologia.org.',
  },
  {
    id: 'faq-acceso-plataforma',
    categoria: 'tecnico',
    keywords: ['acceso', 'plataforma', 'campus', 'entrar', 'login', 'contrasena', 'password'],
    frases: ['no puedo acceder', 'problema de acceso', 'he olvidado mi contrasena', 'no me deja entrar'],
    respuesta: 'Si tiene problemas de acceso a la plataforma, pruebe a restablecer su contrasena desde la pagina de login. Si el problema persiste, escribanos a informacion@institutoteologia.org indicando su nombre completo y email de registro para que podamos verificar y restaurar su acceso.',
  },
  {
    id: 'faq-calificaciones',
    categoria: 'calificaciones',
    keywords: ['nota', 'calificacion', 'examen', 'evaluacion', 'resultado', 'aprobado', 'suspenso'],
    frases: ['cuando salen las notas', 'donde veo mis calificaciones', 'resultado del examen'],
    respuesta: 'Las calificaciones se publican en la plataforma una vez el profesor ha completado la evaluacion, normalmente en un plazo de 2-3 semanas tras la entrega. Recibira un email de notificacion cuando esten disponibles. Si tiene dudas sobre una calificacion, contacte con informacion@institutoteologia.org.',
  },
  {
    id: 'faq-certificado',
    categoria: 'certificados',
    keywords: ['certificado', 'diploma', 'titulo', 'acreditacion', 'documento'],
    frases: ['solicitar certificado', 'donde obtengo mi certificado', 'diploma'],
    respuesta: 'Los certificados y diplomas se generan automaticamente al completar todas las asignaturas del programa. Puede solicitarlos escribiendo a informacion@institutoteologia.org indicando su nombre, programa y las asignaturas completadas.',
  },
  {
    id: 'faq-pago-metodo',
    categoria: 'pagos',
    keywords: ['pago', 'transferencia', 'tarjeta', 'banco', 'forma', 'metodo'],
    frases: ['como puedo pagar', 'formas de pago', 'metodos de pago'],
    respuesta: 'Aceptamos pago por transferencia bancaria y tarjeta de credito/debito. Tambien ofrecemos la posibilidad de fraccionar el pago. Para mas informacion sobre las opciones de pago, contacte con informacion@institutoteologia.org.',
  },
  {
    id: 'faq-pago-pendiente',
    categoria: 'pagos',
    keywords: ['pago', 'pendiente', 'recibo', 'factura', 'impago', 'deuda'],
    frases: ['tengo un pago pendiente', 'no he recibido el recibo', 'factura pendiente'],
    respuesta: 'Si tiene un pago pendiente o necesita informacion sobre su estado de cuenta, puede escribirnos a informacion@institutoteologia.org con su nombre y email de registro. Le enviaremos el detalle actualizado de su situacion.',
  },
  {
    id: 'faq-convalidacion',
    categoria: 'matricula',
    keywords: ['convalidar', 'convalidacion', 'reconocimiento', 'creditos', 'asignatura'],
    frases: ['puedo convalidar', 'convalidacion de asignaturas', 'reconocimiento de creditos'],
    respuesta: 'Ofrecemos la posibilidad de convalidar asignaturas si ha cursado estudios similares en otras instituciones reconocidas. Para solicitar una convalidacion, envie su expediente academico y la solicitud a informacion@institutoteologia.org y nuestro equipo academico lo evaluara.',
  },
  {
    id: 'faq-baja',
    categoria: 'matricula',
    keywords: ['baja', 'cancelar', 'anular', 'devolucion', 'desistir'],
    frases: ['quiero darme de baja', 'cancelar matricula', 'solicitar devolucion'],
    respuesta: 'Para solicitar la baja o cancelacion de matricula, envie su solicitud por escrito a informacion@institutoteologia.org indicando sus datos personales y el programa en el que esta matriculado. Le informaremos sobre el procedimiento y las condiciones aplicables.',
  },
  {
    id: 'faq-horario',
    categoria: 'general',
    keywords: ['horario', 'atencion', 'contacto', 'telefono', 'llamar', 'oficina'],
    frases: ['horario de atencion', 'cuando puedo llamar', 'telefono de contacto'],
    respuesta: 'Nuestro horario de atencion es de lunes a viernes de 9:00 a 14:00. Puede contactarnos por email en informacion@institutoteologia.org o por telefono en el 91 401 50 62. Tambien puede escribirnos a traves del formulario de contacto de nuestra web.',
  },
  {
    id: 'faq-material',
    categoria: 'tecnico',
    keywords: ['material', 'contenido', 'libro', 'apuntes', 'recursos', 'descarga'],
    frases: ['donde estan los materiales', 'acceso al material', 'descargar apuntes'],
    respuesta: 'Los materiales del curso estan disponibles en la plataforma virtual. Acceda con sus credenciales y encontrara los contenidos organizados por asignatura. Si tiene problemas para acceder a algun material, escriba a informacion@institutoteologia.org.',
  },
  {
    id: 'faq-rgpd',
    categoria: 'general',
    keywords: ['rgpd', 'datos', 'privacidad', 'derecho', 'supresion', 'portabilidad', 'rectificacion'],
    frases: ['ejercer mis derechos', 'proteccion de datos', 'eliminar mis datos'],
    respuesta: 'Puede ejercer sus derechos de acceso, rectificacion, supresion, portabilidad y oposicion conforme al RGPD a traves de nuestro portal ARCO+ en institutoteologia.org/ejercicio-derechos-rgpd/ o escribiendo a informacion@institutoteologia.org.',
  },
  {
    id: 'faq-programa-info',
    categoria: 'general',
    keywords: ['programa', 'oferta', 'formacion', 'curso', 'sistematica', 'biblica', 'laical'],
    frases: ['que programas ofrecen', 'oferta formativa', 'cursos disponibles'],
    respuesta: 'Ofrecemos los siguientes programas: DECA Infantil y Primaria, DECA ESO y Bachillerato, Formacion Sistematica, Formacion Biblica, Compromiso Laical y Cursos Monograficos. Para mas informacion sobre cada programa, visite institutoteologia.org o escriba a informacion@institutoteologia.org.',
  },
];

// =====================================================
// MATCHING ENGINE
// =====================================================

function normalizeText(text) {
  return (text || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Match a ticket against FAQ entries.
 * @param {string} asunto - Ticket subject
 * @param {string} mensaje - Ticket message body
 * @returns {{ matched: boolean, categoria: string, confianza: number, respuesta: string, faqId: string }}
 */
export function matchFAQ(asunto, mensaje) {
  const asuntoNorm = normalizeText(asunto);
  const mensajeNorm = normalizeText(mensaje);
  const combined = `${asuntoNorm} ${mensajeNorm}`;

  let bestMatch = null;
  let bestScore = 0;

  for (const faq of FAQ_ENTRIES) {
    let score = 0;

    // Check exact phrases (highest score)
    for (const frase of faq.frases) {
      const fraseNorm = normalizeText(frase);
      if (combined.includes(fraseNorm)) {
        score = Math.max(score, 95);
        break;
      }
    }

    // Check keywords
    if (score < 95) {
      const matchedKeywords = faq.keywords.filter(kw => {
        const kwNorm = normalizeText(kw);
        return combined.includes(kwNorm);
      });

      if (matchedKeywords.length >= 2) {
        score = Math.max(score, 85);
      } else if (matchedKeywords.length === 1) {
        score = Math.max(score, 60);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = faq;
    }
  }

  if (!bestMatch || bestScore === 0) {
    return { matched: false, categoria: '', confianza: 0, respuesta: '', faqId: '' };
  }

  return {
    matched: bestScore >= CONFIDENCE_THRESHOLD,
    categoria: bestMatch.categoria,
    confianza: bestScore,
    respuesta: bestMatch.respuesta,
    faqId: bestMatch.id,
  };
}

// =====================================================
// CLI
// =====================================================

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args.find(a => !a.startsWith('--'));

  if (!command || command === 'help' || args.includes('--help')) {
    console.log(`
FAQ Responder IITD (N35)

Comandos:
  list                                         Listar todas las FAQs
  test --asunto "..." --mensaje "..."          Probar matching

Threshold: ${CONFIDENCE_THRESHOLD} (configurable)
FAQs: ${FAQ_ENTRIES.length} entradas
Categorias: ${[...new Set(FAQ_ENTRIES.map(f => f.categoria))].join(', ')}
`);
    return;
  }

  if (command === 'list') {
    console.log(`\nFAQ Entries (${FAQ_ENTRIES.length}):\n`);
    for (const faq of FAQ_ENTRIES) {
      console.log(`  [${faq.id}] (${faq.categoria})`);
      console.log(`    Keywords: ${faq.keywords.join(', ')}`);
      console.log(`    Frases: ${faq.frases.join(' | ')}`);
      console.log(`    Respuesta: ${faq.respuesta.substring(0, 80)}...`);
      console.log();
    }
    return;
  }

  if (command === 'test') {
    const asunto = getArg('--asunto') || '';
    const mensaje = getArg('--mensaje') || '';
    if (!asunto && !mensaje) {
      console.error('Error: --asunto y/o --mensaje son requeridos');
      process.exit(1);
    }

    console.log(`\nFAQ Match Test:`);
    console.log(`  Asunto: "${asunto}"`);
    console.log(`  Mensaje: "${mensaje}"`);
    console.log();

    const result = matchFAQ(asunto, mensaje);
    console.log(`  Matched: ${result.matched ? 'SI' : 'NO'}`);
    console.log(`  Confianza: ${result.confianza}`);
    console.log(`  Categoria: ${result.categoria || '(ninguna)'}`);
    console.log(`  FAQ ID: ${result.faqId || '(ninguno)'}`);
    if (result.respuesta) {
      console.log(`  Respuesta: ${result.respuesta.substring(0, 120)}...`);
    }
    console.log(`  Threshold: ${CONFIDENCE_THRESHOLD}`);
    console.log(`  Auto-respond: ${result.confianza >= CONFIDENCE_THRESHOLD ? 'SI' : 'NO — escalado'}`);
    console.log();
    return;
  }

  console.error(`Comando desconocido: "${command}". Usa --help para ver opciones.`);
  process.exit(1);
}

const isMain = process.argv[1] && (
  process.argv[1].endsWith('faq-responder.mjs') ||
  process.argv[1].endsWith('faq-responder')
);

if (isMain) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
