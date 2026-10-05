import Button from './Button'

function SummaryComposer({ formData, onChange, onSubmit, onBack }) {
  return (
    <div className="summary-composer-shell">
      <div className="summary-composer">
        <div className="summary-composer__header">
          <div>
            <p className="summary-kicker">Create summary</p>
            <h1>New Summary Shift</h1>
          </div>
          <button type="button" className="text-button" onClick={onBack}>
            Back to dashboard
          </button>
        </div>

        <form onSubmit={onSubmit} className="summary-form">
          <div className="form-grid">
            <div className="field-group">
              <label htmlFor="summary-date">Date</label>
              <input
                id="summary-date"
                type="date"
                value={formData.date}
                onChange={(event) => onChange('date', event.target.value)}
              />
            </div>

            <div className="field-group">
              <label htmlFor="summary-room">Room Number</label>
              <input
                id="summary-room"
                type="text"
                value={formData.roomNumber}
                onChange={(event) => onChange('roomNumber', event.target.value)}
                placeholder="e.g. 204"
              />
            </div>

            <div className="field-group">
              <label htmlFor="summary-shift">Shift</label>
              <select
                id="summary-shift"
                value={formData.shift}
                onChange={(event) => onChange('shift', event.target.value)}
              >
                <option value="">Select a shift</option>
                <option value="16:15–18:15">16:15–18:15</option>
                <option value="18:15–20:15">18:15–20:15</option>
                <option value="07:00–09:00">07:00–09:00</option>
                <option value="09:00–11:00">09:00–11:00</option>
                <option value="11:00–13:00">11:00–13:00</option>
                <option value="13:00–15:00">13:00–15:00</option>
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="summary-student-count">Number of Students</label>
              <input
                id="summary-student-count"
                type="number"
                min="1"
                step="1"
                value={formData.studentCount}
                onChange={(event) => onChange('studentCount', event.target.value)}
                placeholder="3"
              />
            </div>
          </div>

          <div className="form-actions">
            <Button type="submit" variant="primary" disabled={!formData.date || !formData.roomNumber || !formData.shift || !formData.studentCount}>
              Create Summary
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SummaryComposer
