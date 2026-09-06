(() => {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  Promise.resolve(context.registerTool({
    name: 'read_wordeer_library',
    title: '查看 Wordeer 本机词库',
    description: 'Read saved Wordeer words and pending terms in this browser. Does not change the library.',
    inputSchema: { type: 'object', properties: { query: { type: 'string', maxLength: 100 } }, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute(input) {
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => k !== 'query') || (input.query !== undefined && (typeof input.query !== 'string' || input.query.length > 100))) throw new Error('Invalid query');
      const data = JSON.parse(localStorage.getItem('wordeer.web.words.v1') || '{"words":[],"pending":[]}');
      const query = (input.query || '').toLowerCase();
      const words = data.words.filter(w => !query || w.term.toLowerCase().includes(query) || w.meaning.includes(query));
      return { total: words.length, words: words.slice(0, 100), pending: data.pending };
    }
  }, { signal: lifecycle.signal })).catch(() => {});
})();
