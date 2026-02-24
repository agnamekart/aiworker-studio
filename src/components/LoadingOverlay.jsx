export default function LoadingOverlay({ visible, message = "Loading..." }) {
  if (!visible) {
    return null;
  }

  return (
    <div className="loading-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-orbital">
        <span className="loading-ring loading-ring-one" />
        <span className="loading-ring loading-ring-two" />
        <span className="loading-core" />
      </div>
      <p className="loading-title">AI Worker Studio</p>
      <p className="loading-message">{message}</p>
    </div>
  );
}
