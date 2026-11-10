import { useEffect, useRef, useState } from 'react';
import { uploadDocument } from '../services/documentsApi';
import ErrorMessage from './ErrorMessage';

export default function UploadComponent({ userId, onUploaded }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;

    setIsUploading(true);
    setError('');
    setSuccessMessage('');
    try {
      const document = await uploadDocument(userId, selectedFile);
      if (!isMounted.current) return;
      setSuccessMessage(`Documento "${document.originalName}" enviado com sucesso.`);
      setSelectedFile(null);
      form.reset();
      onUploaded?.(document);
    } catch (uploadError) {
      if (isMounted.current) setError(uploadError.message);
    } finally {
      if (isMounted.current) setIsUploading(false);
    }
  }

  return (
    <section className="card">
      <h2>Enviar documento</h2>
      {!userId && <p>Informe o identificador do usuário para enviar documentos.</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          name="file"
          aria-label="Arquivo para envio"
          disabled={!userId || isUploading}
          onChange={(event) => setSelectedFile(event.target.files[0] ?? null)}
        />
        <button type="submit" disabled={!userId || !selectedFile || isUploading}>
          {isUploading ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
      <ErrorMessage message={error} />
      {successMessage && (
        <p role="status" className="success-message">
          {successMessage}
        </p>
      )}
    </section>
  );
}
