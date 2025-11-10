/*
 * Custom SuperCollider language definition for highlight.js v11+.
 * Derived from highlightjs-supercollider but adapted to avoid mutating
 * frozen core mode objects in modern highlight.js releases.
 */

// export the language factory so callers can register manually if needed
export function supercollider(hljs) {
  const KEYWORDS = {
    keyword: 'arg classvar|10 const super this var|2',
    built_in: [
      'false',
      'inf|2',
      'nil|2',
      'true',
      'thisFunction|10',
      'thisFunctionDef|10',
      'thisMethod|10',
      'thisProcess|10',
      'thisThread|10',
      'currentEnvironment|10',
      'topEnvironment|10'
    ].join(' ')
  };

  const CLASS = {
    className: 'type',
    begin: '\\b[A-Z]\\w*\\b',
    relevance: 0
  };

  const PRIMITIVE = {
    className: 'meta',
    begin: '_\\w+',
    relevance: 0
  };

  const CHAR_LITERAL = {
    className: 'literal',
    begin: '\\$\\\\?.'
  };

  const ENV_VAR = {
    className: 'title',
    begin: '~\\w+',
    relevance: 2
  };

  const NUMBER_RADIX_RE = '\\b\\d+r[0-9a-zA-Z]*(\\.[0-9A-Z]*)?\\b';
  const NUMBER_FLOAT_RE = '\\b((\\d+(\\.\\d+)?([eE][-+]?\\d+)?(pi)?)|pi)\\b';
  const NUMBER_INT_RE = '\\b0x[a-fA-F0-9]+\\b';
  const NUMBER_SCALE_RE = /\\b\\d+(s+|b+|[sb]\\d+)\\b/;
  const NUMBER = {
    className: 'number',
    variants: [
      { begin: NUMBER_RADIX_RE },
      { begin: NUMBER_SCALE_RE },
      { begin: NUMBER_FLOAT_RE },
      { begin: NUMBER_INT_RE }
    ],
    relevance: 0
  };

  const BACKSLASH_SYMBOL_RE = '\\\\w+';
  const SYMBOL_SELECTOR_RE = '[A-Za-z_]\\w*\\:';

  const BLOCK_COMMENT = hljs.COMMENT('/\\*', '\\*/', { contains: ['self'] });

  return {
    aliases: ['supercollider', 'sc'],
    keywords: KEYWORDS,
    contains: [
      {
        className: 'type',
        begin: /\\b(Synth|SynthDef)\\b/,
        relevance: 10
      },
      CLASS,
      PRIMITIVE,
      CHAR_LITERAL,
      ENV_VAR,
      NUMBER,
      {
        className: 'symbol',
        variants: [
          { begin: BACKSLASH_SYMBOL_RE, relevance: 5 },
          hljs.APOS_STRING_MODE,
          { begin: SYMBOL_SELECTOR_RE, relevance: 0 }
        ]
      },
      hljs.QUOTE_STRING_MODE,
      hljs.C_LINE_COMMENT_MODE,
      BLOCK_COMMENT
    ],
    illegal: /\\bclass\\s+[A-Z]/
  };
}

export default function register(hljs) {
  hljs.registerLanguage('supercollider', supercollider);
}
