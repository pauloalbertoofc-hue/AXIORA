/* Google Sheets transport. Access tokens are supplied by OAuth and kept in memory. */
window.AxioraSync = class {
  constructor(sheetId, token) {
    if (!/^[a-zA-Z0-9_-]+$/.test(sheetId)) throw new Error('ID de planilha inválido');
    this.url = 'https://sheets.googleapis.com/v4/spreadsheets/' + sheetId + '/values/' + encodeURIComponent('snapshot!A1');
    this.token = token;
  }
  async request(method, body) {
    const res = await fetch(this.url + (method === 'PUT' ? '?valueInputOption=RAW' : ''), {
      method, headers: {Authorization: 'Bearer ' + this.token, 'Content-Type':'application/json'},
      ...(body ? {body: JSON.stringify(body)} : {})
    });
    if (!res.ok) throw new Error('Google Sheets: HTTP ' + res.status);
    return res.json();
  }
  async read() {
    const result = await this.request('GET');
    const raw = result.values?.[0]?.[0];
    return raw ? JSON.parse(raw) : null;
  }
  async write(snapshot, expectedRevision) {
    const current = await this.read();
    if ((current?.revision ?? null) !== expectedRevision) throw new Error('Conflito: consulte a versão remota antes de salvar.');
    const next = {revision:crypto.randomUUID(), updatedAt:new Date().toISOString(), data:snapshot};
    const raw = JSON.stringify(next);
    if(raw.length > 45000) throw new Error('Limite do snapshot atingido.');
    await this.request('PUT',{values:[[raw]]});
    return next;
  }
};
// Revision checking is best-effort, not an atomic compare-and-swap.
