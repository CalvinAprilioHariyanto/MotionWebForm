function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state" role="status" aria-live="polite">
      <div className="empty-state__icon" aria-hidden="true">•</div>
      <h3>{title || 'No summaries yet'}</h3>
      <p>{description || 'Create your first annotation summary to begin recording observations.'}</p>
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  )
}

export default EmptyState
