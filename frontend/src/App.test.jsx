import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from './App';
import { listDocuments, uploadDocument } from './services/documentsApi';

vi.mock('./services/documentsApi', () => ({
  listDocuments: vi.fn(),
  uploadDocument: vi.fn(),
  downloadDocument: vi.fn(),
}));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('dms.userId', 'ana');
  listDocuments.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

test('oculta documentos anteriores enquanto carrega outro usuario', async () => {
  let resolveBruno;
  listDocuments.mockImplementation((userId) => userId === 'ana'
    ? Promise.resolve([{ id: '1', originalName: 'privado.txt', size: 10, uploadedAt: '2026-01-01' }])
    : new Promise((resolve) => { resolveBruno = resolve; }));
  render(<App />);

  expect(await screen.findByText('privado.txt')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Identificador do usuário'), { target: { value: 'bruno' } });
  expect(screen.queryByText('privado.txt')).toBeNull();
  expect(screen.getByText('Carregando documentos...')).toBeTruthy();

  await act(async () => resolveBruno([]));
  expect(await screen.findByText('Nenhum documento enviado ainda.')).toBeTruthy();
});

test('descarta resultado de upload iniciado por outro usuario', async () => {
  const user = userEvent.setup();
  let resolveUpload;
  uploadDocument.mockImplementation(() => new Promise((resolve) => { resolveUpload = resolve; }));
  render(<App />);

  await screen.findByText('Nenhum documento enviado ainda.');
  await user.upload(screen.getByLabelText('Arquivo para envio'), new File(['conteudo'], 'arquivo.txt'));
  await user.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(screen.getByRole('button', { name: 'Enviando...' }).disabled).toBe(true);

  fireEvent.change(screen.getByLabelText('Identificador do usuário'), { target: { value: 'bruno' } });
  await waitFor(() => expect(listDocuments).toHaveBeenCalledWith('bruno'));
  expect(screen.getByLabelText('Arquivo para envio').files).toHaveLength(0);
  expect(screen.getByRole('button', { name: 'Enviar' }).disabled).toBe(true);

  await act(async () => resolveUpload({ originalName: 'arquivo.txt' }));
  expect(screen.queryByRole('status')).toBeNull();
  expect(listDocuments).toHaveBeenCalledTimes(2);
});