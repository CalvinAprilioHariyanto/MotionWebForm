import { useRef, useState } from 'react'
import Button from './Button'

const JOB_OPTIONS = ['Bedroom', 'Living Room', 'Kitchen']

const isGoPro = (device) => {
  if (!device || typeof device !== 'string') return false
  return device.trim().toLowerCase() === 'gopro'
}

const formatDuration = (totalSeconds) => {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '0s'
  }
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`)
  return parts.join(' ')
}

function EvidenceUpload({ record, index, studentId, isPresent, onUpdateEvidence }) {
  const fileInputRef = useRef(null)

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    onUpdateEvidence(studentId, record.id, file)
    event.target.value = ''
  }

  const handleRemove = () => {
    onUpdateEvidence(studentId, record.id, null)
  }

  if (record.evidence) {
    return (
      <div className="record-evidence">
        <label className="record-evidence__label">Evidence</label>
        <div className="record-evidence__body">
          <div className="record-evidence__preview-wrap">
            <img
              src={record.evidence}
              alt={`Evidence for record ${index + 1}`}
              className="record-evidence__preview"
            />
          </div>
          <div className="record-evidence__info">
            <div className="record-evidence__actions">
              <button
                type="button"
                className="record-evidence__action-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={!isPresent}
              >
                Replace
              </button>
              <button
                type="button"
                className="record-evidence__action-btn record-evidence__action-btn--danger"
                onClick={handleRemove}
                disabled={!isPresent}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={!isPresent}
          hidden
        />
      </div>
    )
  }

  return (
    <div className="record-evidence">
      <label className="record-evidence__label">Evidence</label>
      <div className="record-evidence__body record-evidence__body--empty">
        <div className="record-evidence__placeholder">
          <span>Upload evidence</span>
          <span className="record-evidence__placeholder-text">JPG, PNG or WebP · Max 10 MB</span>
        </div>
        <button
          type="button"
          className="record-evidence__action-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={!isPresent}
        >
          Choose image
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={!isPresent}
        hidden
      />
    </div>
  )
}

function StudentWorkspace({
  students,
  activeStudentId,
  onSelectStudent,
  onSetStudentName,
  onToggleStudentPresence,
  onAddStudent,
  onRemoveStudent,
  onUpdateStudentRecord,
  onUpdateStudentEvidence,
  onUpdateStudentJob,
  onUpdateStudentDevice,
  onAddMoreStudentRecords,
  onSaveSummary,
  observerName,
  roomNumber,
  date,
  shift,
}) {
  const [moreTakeChoice, setMoreTakeChoice] = useState(null)
  const [additionalTakeCount, setAdditionalTakeCount] = useState('')

  const activeStudent = students.find((s) => s.id === activeStudentId) || students[0]

  if (!activeStudent) {
    return null
  }

  const records = activeStudent.records || []
  const totalDurationSeconds = records.reduce((total, record) => {
    const value = Number(record.durationSeconds)
    return total + (Number.isFinite(value) && value >= 0 ? value : 0)
  }, 0)

  const remainingSeconds = 5400 - totalDurationSeconds
  const durationStatus =
    totalDurationSeconds === 5400
      ? '90-minute limit reached'
      : totalDurationSeconds > 5400
        ? `Over limit by ${formatDuration(totalDurationSeconds - 5400)}`
        : `Remaining: ${formatDuration(Math.max(remainingSeconds, 0))}`

  const handleAddMoreRecords = () => {
    const count = Number(additionalTakeCount)
    if (count > 0) {
      onAddMoreStudentRecords(activeStudent.id, count)
      setAdditionalTakeCount('')
      setMoreTakeChoice('done')
    }
  }

  const shouldPromptForMore = records.length >= 5 && moreTakeChoice !== 'no' && moreTakeChoice !== 'done'

  const studentDevice = activeStudent.device || ''

  const getDisplayValue = (record) => {
    const sec = Number(record.durationSeconds)
    if (!Number.isFinite(sec) || sec === 0) return ''
    if (isGoPro(studentDevice)) {
      return String(sec / 60)
    }
    return String(sec)
  }

  const handleDurationInput = (recordId, rawValue) => {
    if (rawValue === '') {
      onUpdateStudentRecord(activeStudent.id, recordId, '')
      return
    }
    const num = Number(rawValue)
    if (Number.isNaN(num) || num < 0) return
    const seconds = isGoPro(studentDevice) ? Math.round(num * 60) : Math.round(num)
    onUpdateStudentRecord(activeStudent.id, recordId, seconds)
  }

  return (
    <div className="student-workspace">
      <div className="student-tabs" role="tablist" aria-label="Student tabs">
        {students.map((student, index) => (
          <button
            key={student.id}
            type="button"
            role="tab"
            aria-selected={student.id === activeStudent.id}
            className={`student-tab ${student.id === activeStudent.id ? 'student-tab--active' : ''}`}
            onClick={() => onSelectStudent(student.id)}
          >
            {student.name || `Student ${index + 1}`}
          </button>
        ))}
        <button type="button" className="student-tab student-tab--add" onClick={onAddStudent}>
          + Add Student
        </button>
      </div>

      <div className="student-panel">
        <div className="student-panel__header">
          <div>
            <p className="student-panel__eyebrow">Student</p>
            <h2>{activeStudent.name || 'Student Name'}</h2>
          </div>
          <div className="presence-toggle" role="group" aria-label="Student presence">
            <button
              type="button"
              className={activeStudent.isPresent ? 'presence-option is-selected' : 'presence-option'}
              onClick={() => onToggleStudentPresence(activeStudent.id, true)}
            >
              Present
            </button>
            <button
              type="button"
              className={!activeStudent.isPresent ? 'presence-option is-selected' : 'presence-option'}
              onClick={() => onToggleStudentPresence(activeStudent.id, false)}
            >
              Absent
            </button>
          </div>
        </div>

        <div className="student-form-grid">
          <div className="student-field">
            <label htmlFor={`student-name-${activeStudent.id}`}>Full Name</label>
            <input
              id={`student-name-${activeStudent.id}`}
              type="text"
              value={activeStudent.name}
              onChange={(e) => onSetStudentName(activeStudent.id, e.target.value)}
              placeholder="Student name"
              disabled={!activeStudent.isPresent}
            />
          </div>
          <div className="student-field">
            <label htmlFor={`student-observer-${activeStudent.id}`}>Observer</label>
            <input id={`student-observer-${activeStudent.id}`} type="text" value={observerName} readOnly />
          </div>
          <div className="student-field">
            <label htmlFor={`student-room-${activeStudent.id}`}>Room</label>
            <input id={`student-room-${activeStudent.id}`} type="text" value={roomNumber} readOnly />
          </div>
          <div className="student-field">
            <label htmlFor={`student-date-${activeStudent.id}`}>Date</label>
            <input id={`student-date-${activeStudent.id}`} type="date" value={date} readOnly />
          </div>
          <div className="student-field">
            <label htmlFor={`student-shift-${activeStudent.id}`}>Shift</label>
            <input id={`student-shift-${activeStudent.id}`} type="text" value={shift} readOnly />
          </div>
        </div>

        {/* Device + Job inputs */}
        <div className="device-section">
          <h3 className="device-section__title">Observation Details</h3>
          <div className="device-grid">
            <div className="device-field">
              <label htmlFor={`job-${activeStudent.id}`}>Job</label>
              <select
                id={`job-${activeStudent.id}`}
                value={activeStudent.job || ''}
                onChange={(e) => onUpdateStudentJob(activeStudent.id, e.target.value)}
                disabled={!activeStudent.isPresent}
              >
                <option value="">Select job</option>
                {JOB_OPTIONS.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </div>
            <div className="device-field">
              <label htmlFor={`device-${activeStudent.id}`}>Device name</label>
              <input
                id={`device-${activeStudent.id}`}
                type="text"
                placeholder="e.g. GoPro, ZY Black, ZY White"
                value={studentDevice}
                onChange={(e) => onUpdateStudentDevice(activeStudent.id, e.target.value)}
                disabled={!activeStudent.isPresent}
              />
            </div>
          </div>
        </div>

        <div className="record-section">
          <div className="record-section__header">
            <h3>Recording Input</h3>
            <div className="duration-summary">
              <span>Total: {formatDuration(totalDurationSeconds)}</span>
              <strong>{durationStatus}</strong>
            </div>
          </div>

          <div className="record-list">
            {records.map((record, index) => {
              const unitLabel = isGoPro(studentDevice) ? 'minutes' : 'seconds'
              const displayVal = getDisplayValue(record)
              const durationSec = Number(record.durationSeconds) || 0

              return (
                <div className="record-card" key={record.id}>
                  <div className="record-card__title">Record #{index + 1}</div>

                  <label htmlFor={`record-duration-${record.id}`}>
                    Duration{studentDevice ? ` (${unitLabel})` : ''}
                  </label>
                  <div className="record-duration-row">
                    <input
                      id={`record-duration-${record.id}`}
                      type="number"
                      min="0"
                      step={isGoPro(studentDevice) ? '0.5' : '1'}
                      value={displayVal}
                      onChange={(e) => handleDurationInput(record.id, e.target.value)}
                      disabled={!activeStudent.isPresent}
                      placeholder="0"
                    />
                    <span className="record-duration-unit">{unitLabel}</span>
                  </div>
                  <div className="record-preview">
                    {formatDuration(durationSec)}
                  </div>

                  <EvidenceUpload
                    record={record}
                    index={index}
                    studentId={activeStudent.id}
                    isPresent={activeStudent.isPresent}
                    onUpdateEvidence={onUpdateStudentEvidence}
                  />
                </div>
              )
            })}
          </div>

          {shouldPromptForMore && moreTakeChoice !== 'yes' && (
            <div className="more-takes">
              <p>Are there more than 5 takes?</p>
              <div className="more-takes__actions">
                <button type="button" className="secondary-button" onClick={() => setMoreTakeChoice('no')}>No</button>
                <button type="button" className="primary-button" onClick={() => setMoreTakeChoice('yes')}>Yes</button>
              </div>
            </div>
          )}

          {moreTakeChoice === 'yes' && (
            <div className="more-takes more-takes--expanded">
              <label htmlFor={`additional-takes-${activeStudent.id}`}>How many additional takes?</label>
              <div className="more-takes__input-row">
                <input
                  id={`additional-takes-${activeStudent.id}`}
                  type="number"
                  min="1"
                  step="1"
                  value={additionalTakeCount}
                  onChange={(e) => setAdditionalTakeCount(e.target.value)}
                />
                <button type="button" className="primary-button" onClick={handleAddMoreRecords}>Add records</button>
              </div>
            </div>
          )}
        </div>

        <div className="student-panel__footer">
          <div className="student-panel__footer-actions">
            {students.length > 1 && (
              <Button type="button" variant="secondary" onClick={() => onRemoveStudent(activeStudent.id)}>
                Remove Student
              </Button>
            )}
            <Button type="button" variant="primary" onClick={onSaveSummary}>
              Save Summary
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentWorkspace
