import { useEffect, useState } from 'react';
import UploadComponent from './components/UploadComponent';
import DocumentList from './components/DocumentList';
import { listDocuments } from './services/documentsApi';

const USER_ID_STORAGE_KEY = 'dms.userId';

export default function App() {
  const [userId, setUserId] = useState(() => localStorage.getItem(USER_ID_STORAGE_KEY) ?? '');
  const [refreshKey, setRefreshKey] = useState(0);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const currentUserId = userId.trim();

  useEffect(() => {
    localStorage.setItem(USER_ID_STORAGE_KEY, userId);
  }, [userId]);

  useEffect(() => {
    if (!currentUserId) {
      setDocuments([]);
      setLoadError('');
      return undefined;
    }

    // Ignora respostas antigas quando o usuário muda antes do fim da requisição.
    let isCurrent = true;
    setIsLoading(true);
    setLoadError('');

    listDocuments(currentUserId)
      .then((items) => {
        if (isCurrent) setDocuments(items);
      })
      .catch((error) => {
        if (!isCurrent) return;
        setDocuments([]);
        setLoadError(error.message);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [currentUserId, refreshKey]);

  function handleUploaded() {
    setRefreshKey((key) => key + 1);
  }

  return (
    <main className="app">
      <h1>Document Management System</h1>

      <section className="card">
        <label htmlFor="user-id">Identificador do usuário </label>
        <input
          id="user-id"
          type="text"
          value={userId}
          placeholder="ex.: maria@exemplo.com"
          onChange={(event) => setUserId(event.target.value)}
        />
      </section>

      <UploadComponent userId={currentUserId} onUploaded={handleUploaded} />

      <DocumentList
        userId={currentUserId}
        documents={documents}
        isLoading={isLoading}
        error={loadError}
      />
    </main>
  );
}
