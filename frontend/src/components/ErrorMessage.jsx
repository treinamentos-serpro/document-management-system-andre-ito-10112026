export default function ErrorMessage({ message }) {
  if (!message) return null;

  return (
    <p role="alert" style={{ color: '#b00020' }}>
      {message}
    </p>
  );
}
