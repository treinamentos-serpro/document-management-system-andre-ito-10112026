const API_BASE_URL = '/api';

const NETWORK_ERROR_MESSAGE = 'Não foi possível conectar ao servidor. Tente novamente.';
const UNEXPECTED_ERROR_MESSAGE = 'Não foi possível concluir a operação.';

export class ApiError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

async function toApiError(response) {
  try {
    const body = await response.json();
    return new ApiError(body.error?.message ?? UNEXPECTED_ERROR_MESSAGE, body.error?.code);
  } catch {
    return new ApiError(UNEXPECTED_ERROR_MESSAGE, 'UNKNOWN_ERROR');
  }
}

async function request(path, { userId, headers, ...options } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { ...headers, 'X-User-Id': userId?.trim() ?? '' },
    });
  } catch {
    throw new ApiError(NETWORK_ERROR_MESSAGE, 'NETWORK_ERROR');
  }

  if (!response.ok) {
    throw await toApiError(response);
  }
  return response;
}

export async function uploadDocument(userId, file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request('/upload', { userId, method: 'POST', body: formData });
  return response.json();
}

export async function listDocuments(userId) {
  const response = await request('/documents', { userId });
  const body = await response.json();
  return body.items;
}

export async function downloadDocument(userId, documentId) {
  const response = await request(`/documents/${encodeURIComponent(documentId)}/download`, {
    userId,
  });
  return response.blob();
}
