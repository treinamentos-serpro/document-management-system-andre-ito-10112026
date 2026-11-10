import { useState } from 'react';
import { downloadDocument } from '../services/documentsApi';
import ErrorMessage from './ErrorMessage';

export default function DownloadButton({ userId, documentId, fileName }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    setIsDownloading(true);
    setError('');
    try {
      const blob = await downloadDocument(userId, documentId);
      saveBlob(blob, fileName);
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={handleClick} disabled={isDownloading}>
        {isDownloading ? 'Baixando...' : 'Baixar'}
      </button>
      <ErrorMessage message={error} />
    </>
  );
}

function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Adiado para o navegador iniciar o download antes de liberar a URL.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
