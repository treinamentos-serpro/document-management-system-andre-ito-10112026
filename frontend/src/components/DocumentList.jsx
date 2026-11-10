import DownloadButton from './DownloadButton';
import ErrorMessage from './ErrorMessage';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleString('pt-BR');
}

export default function DocumentList({ userId, documents, isLoading, error }) {
  if (!userId) {
    return (
      <section className="card">
        <h2>Meus documentos</h2>
        <p>Informe o identificador do usuário para ver seus documentos.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Meus documentos</h2>
      <ErrorMessage message={error} />
      {isLoading && <p>Carregando documentos...</p>}
      {!isLoading && !error && documents.length === 0 && <p>Nenhum documento enviado ainda.</p>}
      {documents.length > 0 && (
        <ul className="document-list">
          {documents.map((document) => (
            <li key={document.id} className="document-item">
              <span>
                <strong>{document.originalName}</strong>
                <span className="document-meta">
                  {' '}— {formatBytes(document.size)} — {formatDate(document.uploadedAt)}
                </span>
              </span>
              <DownloadButton
                userId={userId}
                documentId={document.id}
                fileName={document.originalName}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
