function SummaryCard({ summary, onOpen }) {
  const studentNames = summary.students?.map((student) => student.name || 'Unnamed student') || []
  const presentCount = summary.students?.filter((student) => student.isPresent).length || 0

  return (
    <button type="button" className="summary-card" onClick={onOpen}>
      <div className="summary-card__header">
        <div>
          <p className="summary-card__label">Summary</p>
          <strong>{summary.date || 'Untitled summary'}</strong>
        </div>
        <span className="summary-card__badge">{summary.students?.length || 0} students</span>
      </div>

      <dl className="summary-card__meta">
        <div>
          <dt>Room</dt>
          <dd>{summary.roomNumber || '—'}</dd>
        </div>
        <div>
          <dt>Observer</dt>
          <dd>{summary.observerName || '—'}</dd>
        </div>
        <div>
          <dt>Shift</dt>
          <dd>{summary.shift || '—'}</dd>
        </div>
      </dl>

      <div className="summary-card__students">
        <span className="summary-card__label">Students</span>
        <p>{studentNames.length > 0 ? studentNames.join(', ') : 'No students recorded'}</p>
      </div>

      <div className="summary-card__footer">
        <span>{presentCount} present</span>
        <span>{(summary.students?.length || 0) - presentCount} absent</span>
      </div>
    </button>
  )
}

export default SummaryCard
