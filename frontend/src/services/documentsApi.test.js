import { afterEach, expect, test, vi } from 'vitest';
import { downloadDocument, listDocuments, uploadDocument } from './documentsApi';

afterEach(() => {
  vi.unstubAllGlobals();
});

test('envia arquivo e identificador normalizado', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: '1' }) });
  vi.stubGlobal('fetch', fetchMock);
  const file = new File(['conteudo'], 'arquivo.txt');

  expect(await uploadDocument(' ana ', file)).toEqual({ id: '1' });
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe('/api/upload');
  expect(options.method).toBe('POST');
  expect(options.headers['X-User-Id']).toBe('ana');
  expect(options.body.get('file')).toBe(file);
});

test('lista documentos e codifica o identificador no download', async () => {
  const blob = new Blob(['conteudo']);
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ id: '1' }] }) })
    .mockResolvedValueOnce({ ok: true, blob: async () => blob });
  vi.stubGlobal('fetch', fetchMock);

  expect(await listDocuments('ana')).toEqual([{ id: '1' }]);
  expect(await downloadDocument('ana', 'id/1')).toBe(blob);
  expect(fetchMock.mock.calls[1][0]).toBe('/api/documents/id%2F1/download');
});

test('apresenta erros da API e falhas de rede', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { code: 'INVALID_UPLOAD', message: 'Arquivo inválido.' } }),
    })
    .mockRejectedValueOnce(new Error('offline'));
  vi.stubGlobal('fetch', fetchMock);

  await expect(listDocuments('ana')).rejects.toMatchObject({
    name: 'ApiError', code: 'INVALID_UPLOAD', message: 'Arquivo inválido.',
  });
  await expect(listDocuments('ana')).rejects.toMatchObject({
    name: 'ApiError', code: 'NETWORK_ERROR',
  });
});