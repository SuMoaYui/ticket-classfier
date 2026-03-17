/**
 * Mock LLM Classifier — keyword-based deterministic classifier.
 * Simulates LLM analysis for development and testing without API keys.
 */

// ─── Keyword dictionaries ───────────────────────────────────────────────────

const URGENCY_KEYWORDS = {
  critical: [
    'urgente', 'urgent', 'crítico', 'critical', 'caído', 'down',
    'emergencia', 'emergency', 'inmediatamente', 'immediately',
    'parado', 'bloqueado', 'blocked', 'p1', 'sev1', 'producción',
    'outage', 'fuera de servicio',
  ],
  high: [
    'importante', 'important', 'pronto', 'soon', 'rápido', 'asap',
    'lo antes posible', 'prioridad', 'priority', 'afectando',
    'impactando', 'problema grave', 'serious', 'sev2',
  ],
  low: [
    'consulta', 'inquiry', 'pregunta', 'question', 'información',
    'info', 'cuando puedan', 'sin prisa', 'no urgente', 'sugerencia',
    'suggestion', 'feedback', 'mejora', 'improvement',
  ],
};

const SENTIMENT_KEYWORDS = {
  angry: [
    'furioso', 'furious', 'indignado', 'inaceptable', 'unacceptable',
    'pésimo', 'terrible', 'horrible', 'estafa', 'incompetentes',
    'demanda', 'abogado', 'lawyer', 'denuncia', 'vergüenza',
  ],
  frustrated: [
    'frustrado', 'frustrated', 'cansado', 'harto', 'molesto',
    'decepcionado', 'disappointed', 'otra vez', 'again', 'siempre',
    'nunca funciona', 'no sirve', 'llevo días', 'llevo semanas',
  ],
  satisfied: [
    'gracias', 'thanks', 'excelente', 'excellent', 'perfecto',
    'genial', 'great', 'encantado', 'feliz', 'happy', 'buen servicio',
    'recomiendo', 'satisfecho', 'bien hecho', 'agradecido',
  ],
};

const DEPARTMENT_KEYWORDS = {
  billing: [
    'factura', 'invoice', 'cobro', 'charge', 'pago', 'payment',
    'reembolso', 'refund', 'precio', 'price', 'suscripción',
    'subscription', 'plan', 'tarjeta', 'card', 'cargo',
    'descuento', 'discount', 'crédito', 'credit',
  ],
  engineering: [
    'bug', 'error', 'fallo', 'crash', 'caído', 'down', 'lento',
    'slow', 'no carga', 'no funciona', 'broken', 'api', 'servidor',
    'server', '500', '404', 'timeout', 'rendimiento', 'performance',
    'código', 'base de datos', 'database',
  ],
  sales: [
    'comprar', 'buy', 'adquirir', 'cotización', 'quote', 'demo',
    'prueba', 'trial', 'enterprise', 'precio', 'plan',
    'licencia', 'license', 'volumen', 'contrato', 'contract',
  ],
  support: [
    'ayuda', 'help', 'cómo', 'how', 'configurar', 'setup',
    'instalar', 'install', 'tutorial', 'guía', 'guide',
    'contraseña', 'password', 'acceso', 'access', 'cuenta',
    'account', 'login', 'iniciar sesión',
  ],
  hr: [
    'empleo', 'employment', 'vacante', 'vacancy', 'currículum',
    'resume', 'entrevista', 'interview', 'contratación', 'hiring',
    'recursos humanos', 'human resources', 'puesto', 'position',
  ],
};

// ─── Scoring helpers ────────────────────────────────────────────────────────

function scoreText(text, keywords) {
  const lower = text.toLowerCase();
  let score = 0;
  const matched = [];
  for (const kw of keywords) {
    if (lower.includes(kw)) {
      score++;
      matched.push(kw);
    }
  }
  return { score, matched };
}

function classifyByKeywords(text, dictionary, defaultValue) {
  let best = { key: defaultValue, score: 0, matched: [] };
  for (const [key, keywords] of Object.entries(dictionary)) {
    const result = scoreText(text, keywords);
    if (result.score > best.score) {
      best = { key, score: result.score, matched: result.matched };
    }
  }
  return best;
}

// ─── Main classifier ───────────────────────────────────────────────────────

/**
 * Classify a ticket using keyword matching.
 * @param {string} subject - Ticket subject
 * @param {string} body - Ticket body
 * @returns {Promise<object>} Classification result
 */
export async function classifyWithMock(subject, body) {
  const fullText = `${subject} ${body}`;

  const urgency = classifyByKeywords(fullText, URGENCY_KEYWORDS, 'medium');
  const sentiment = classifyByKeywords(fullText, SENTIMENT_KEYWORDS, 'neutral');
  const department = classifyByKeywords(fullText, DEPARTMENT_KEYWORDS, 'general');

  // Calculate confidence based on keyword match density
  const totalMatches = urgency.score + sentiment.score + department.score;
  const confidence = Math.min(0.95, 0.3 + totalMatches * 0.08);

  const reasoning = buildReasoning(urgency, sentiment, department);

  return {
    urgency: urgency.key,
    sentiment: sentiment.key,
    department: department.key,
    confidence: Math.round(confidence * 100) / 100,
    reasoning,
  };
}

function buildReasoning(urgency, sentiment, department) {
  const parts = [];

  if (urgency.matched.length > 0) {
    parts.push(
      `Urgency set to "${urgency.key}" based on keywords: ${urgency.matched.join(', ')}`
    );
  } else {
    parts.push('Urgency defaulted to "medium" — no strong urgency indicators found.');
  }

  if (sentiment.matched.length > 0) {
    parts.push(
      `Sentiment detected as "${sentiment.key}" from: ${sentiment.matched.join(', ')}`
    );
  } else {
    parts.push('Sentiment defaulted to "neutral" — no emotional keywords detected.');
  }

  if (department.matched.length > 0) {
    parts.push(
      `Routed to "${department.key}" department based on: ${department.matched.join(', ')}`
    );
  } else {
    parts.push('Routed to "general" — no department-specific keywords matched.');
  }

  return parts.join(' | ');
}
