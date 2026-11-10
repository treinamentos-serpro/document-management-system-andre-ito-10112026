export default function ErrorMessage({ message }) {
  if (!message) return null;

  return (
    <p role="alert" className="error-message">
      {message}
    </p>
  );
}
