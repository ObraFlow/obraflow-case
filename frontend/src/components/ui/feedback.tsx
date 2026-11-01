export function LoadingState() {
  return (
    <div className="loading">
      <span className="spinner" />
      Carregando dados...
    </div>
  );
}

export function EmptyState({ children }: { children: string }) {
  return <div className="empty">{children}</div>;
}

export function Feedback({
  error,
  notice,
  onRetry,
}: {
  error: string;
  notice: string;
  onRetry: () => void;
}) {
  return (
    <>
      {error && (
        <div className="alert error">
          <strong>Não foi possível carregar os dados.</strong>
          <span>{error}</span>
          <button onClick={onRetry}>Tentar novamente</button>
        </div>
      )}
      {notice && <div className="alert success">{notice}</div>}
    </>
  );
}
