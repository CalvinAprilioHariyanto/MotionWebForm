import { useEffect, useMemo, useRef, useState } from 'react'
import AppHeader from './components/AppHeader'
import EmptyState from './components/EmptyState'
import ObserverSetup from './components/ObserverSetup'
import SectionHeader from './components/SectionHeader'
import StudentWorkspace from './components/StudentWorkspace'
import SummaryComposer from './components/SummaryComposer'
import SummaryCard from './components/SummaryCard'
import { getSetting, listSummaries, saveSetting, saveSummary, deleteSummary as dbDeleteSummary } from './db/indexedDB'
import { useToast } from './components/Toast'
import './App.css'

const STORAGE_KEY = 'annotation-observer-name'

const initialSummaryForm = {
  date: '',
  roomNumber: '',
  shift: '',
  studentCount: '',
}

const formatDuration = (totalSeconds) => {
  const safeTotalSeconds = Number(totalSeconds) || 0
  if (safeTotalSeconds <= 0) return '0s'
  const hours = Math.floor(safeTotalSeconds / 3600)
  const minutes = Math.floor((safeTotalSeconds % 3600) / 60)
  const seconds = safeTotalSeconds % 60
  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`)
  return parts.join(' ')
}

const createRecord = (index) => ({
  id: `record-${Date.now()}-${index}`,
  durationSeconds: '',
  evidence: '',
})

const createStudent = (index) => ({
  id: `student-${Date.now()}-${index}`,
  name: '',
  isPresent: true,
  job: '',
  device: '',
  records: Array.from({ length: 5 }, (_, ri) => createRecord(`${index}-${ri}`)),
})

const formatSavedDate = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const sanitizeFilename = (str) => (str || '').replace(/[^a-zA-Z0-9_\-. ]/g, '_').replace(/\s+/g, '_')

const downloadDataURL = (dataUrl, filename) => {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

const getMimeExt = (dataUrl) => {
  const m = dataUrl?.match(/^data:(image\/\w+);/)
  if (!m) return { mime: 'image/jpeg', ext: 'jpg' }
  const mime = m[1]
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'
  return { mime, ext }
}

function App() {
  const { showToast } = useToast()
  const [observerName, setObserverName] = useState('')
  const [draftName, setDraftName] = useState('')
  const [isEditingObserver, setIsEditingObserver] = useState(false)
  const [isCreatingSummary, setIsCreatingSummary] = useState(false)
  const [summaryForm, setSummaryForm] = useState(initialSummaryForm)
  const [activeSummaryMeta, setActiveSummaryMeta] = useState(null)
  const [editingSummaryId, setEditingSummaryId] = useState(null)
  const [students, setStudents] = useState([])
  const [activeStudentId, setActiveStudentId] = useState(null)
  const [savedSummaries, setSavedSummaries] = useState([])
  const [selectedSummaryId, setSelectedSummaryId] = useState(null)
  const [copiedField, setCopiedField] = useState('')
  const [deleteModal, setDeleteModal] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState('newest')
  const [filterMode, setFilterMode] = useState('all')
  const fileInputRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const hydrate = async () => {
      const saved = await getSetting(STORAGE_KEY, '')
      if (!cancelled) { setObserverName(saved); setDraftName(saved) }
    }
    hydrate()
    return () => { cancelled = true }
  }, [])

  useEffect(() => { refreshSummaries() }, [])

  useEffect(() => {
    if (!observerName) return
    saveSetting(STORAGE_KEY, observerName).catch(console.error)
  }, [observerName])

  useEffect(() => {
    if (!copiedField) return undefined
    const tid = window.setTimeout(() => setCopiedField(''), 1400)
    return () => window.clearTimeout(tid)
  }, [copiedField])

  const refreshSummaries = async () => {
    try {
      const list = await listSummaries()
      const sorted = [...list].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
      setSavedSummaries(sorted)
    } catch (e) { console.error('Failed to load saved summaries', e) }
  }

  const handleObserverSubmit = (e) => {
    e.preventDefault()
    const trimmed = draftName.trim()
    if (!trimmed) return
    setObserverName(trimmed)
    setIsEditingObserver(false)
    showToast({ type: 'success', message: 'Observer updated successfully.' })
  }

  const handleSummaryChange = (field, value) => {
    setSummaryForm((c) => ({ ...c, [field]: value }))
  }

  const handleSummarySubmit = (e) => {
    e.preventDefault()
    const fv = {
      date: summaryForm.date,
      roomNumber: summaryForm.roomNumber.trim(),
      shift: summaryForm.shift,
      studentCount: Number(summaryForm.studentCount),
    }
    if (!fv.date || !fv.roomNumber || !fv.shift || !fv.studentCount) return

    const nextStudents = Array.from({ length: fv.studentCount }, (_, i) => {
      return students[i] || createStudent(i)
    })

    setActiveSummaryMeta({ date: fv.date, roomNumber: fv.roomNumber, shift: fv.shift })
    setStudents(nextStudents)
    setActiveStudentId(nextStudents[0]?.id || null)
    setIsCreatingSummary(false)
    setSummaryForm(initialSummaryForm)
  }

  const handleAddStudent = () => {
    const s = createStudent(students.length)
    setStudents((c) => [...c, s])
    setActiveStudentId(s.id)
  }

  const handleRemoveStudent = (sid) => {
    if (students.length <= 1) return
    const filtered = students.filter((s) => s.id !== sid)
    setStudents(filtered)
    if (activeStudentId === sid) setActiveStudentId(filtered[0]?.id || null)
  }

  const handleSetStudentName = (sid, value) => {
    setStudents((c) => c.map((s) => s.id === sid ? { ...s, name: value } : s))
  }

  const handleToggleStudentPresence = (sid, isPresent) => {
    setStudents((c) => c.map((s) => s.id === sid ? { ...s, isPresent } : s))
  }

  const handleUpdateStudentJob = (sid, value) => {
    setStudents((c) => c.map((s) => s.id === sid ? { ...s, job: value } : s))
  }

  const handleUpdateStudentDevice = (sid, value) => {
    setStudents((c) => c.map((s) => s.id === sid ? { ...s, device: value } : s))
  }

  const handleStudentRecordUpdate = (sid, rid, value) => {
    setStudents((c) => c.map((s) => {
      if (s.id !== sid) return s
      return {
        ...s,
        records: s.records.map((r) => {
          if (r.id !== rid) return r
          if (value === '') return { ...r, durationSeconds: '' }
          const num = Number(value)
          if (Number.isNaN(num) || num < 0) return r
          return { ...r, durationSeconds: num }
        }),
      }
    }))
  }

  const handleStudentRecordEvidenceUpload = (sid, rid, file) => {
    if (!file) {
      setStudents((c) => c.map((s) => {
        if (s.id !== sid) return s
        return { ...s, records: s.records.map((r) => r.id === rid ? { ...r, evidence: '' } : r) }
      }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setStudents((c) => c.map((s) => {
        if (s.id !== sid) return s
        return { ...s, records: s.records.map((r) => r.id === rid ? { ...r, evidence: reader.result } : r) }
      }))
    }
    reader.onerror = () => console.error('Failed to read evidence image')
    reader.readAsDataURL(file)
  }

  const handleAddMoreStudentRecords = (sid, count) => {
    const c = Number(count)
    if (!Number.isInteger(c) || c <= 0) return
    setStudents((current) => current.map((s) => {
      if (s.id !== sid) return s
      const next = Array.from({ length: c }, (_, i) => ({
        id: `record-${Date.now()}-${sid}-${i}-${Math.random().toString(16).slice(2)}`,
        durationSeconds: '',
        evidence: '',
      }))
      return { ...s, records: [...(s.records || []), ...next] }
    }))
  }

  const buildPayload = (summaryId) => ({
    summaryId: summaryId || `summary-${Date.now()}`,
    observerName,
    date: activeSummaryMeta.date,
    roomNumber: activeSummaryMeta.roomNumber,
    shift: activeSummaryMeta.shift,
    students: students.map((s, i) => ({
      studentId: s.id,
      name: s.name.trim() || `Student ${i + 1}`,
      isPresent: s.isPresent,
      job: s.job || '',
      device: s.device || '',
      records: s.records.map((r) => ({
        id: r.id,
        durationSeconds: Number(r.durationSeconds) || 0,
        evidence: r.evidence || '',
      })),
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  const handleSaveCurrentSummary = async () => {
    if (!students.length || !activeSummaryMeta) return
    const payload = buildPayload(editingSummaryId)
    if (editingSummaryId) {
      const existing = savedSummaries.find((s) => s.summaryId === editingSummaryId)
      if (existing) payload.createdAt = existing.createdAt
    }
    try {
      const saved = await saveSummary(payload)
      setSavedSummaries((c) => [saved, ...c.filter((s) => s.summaryId !== saved.summaryId)])
      setStudents([])
      setActiveStudentId(null)
      setActiveSummaryMeta(null)
      const isUpdating = !!editingSummaryId
      setEditingSummaryId(null)
      setSummaryForm(initialSummaryForm)
      setSelectedSummaryId(saved.summaryId)
      showToast({ type: 'success', message: isUpdating ? 'Summary updated successfully.' : 'Summary created successfully.' })
    } catch (e) {
      console.error('Failed to save summary', e)
      showToast({ type: 'error', message: 'Unable to save summary. Please try again.' })
    }
  }

  const handleCopyValue = async (key, value) => {
    if (!value || !navigator?.clipboard) return
    try { 
      await navigator.clipboard.writeText(String(value)); 
      setCopiedField(key) 
      showToast({ type: 'success', message: 'Copied to clipboard.' })
    }
    catch (e) { 
      console.error('Clipboard copy failed', e) 
      showToast({ type: 'error', message: 'Unable to copy. Please try again.' })
    }
  }

  const exportOneSummary = (summary) => {
    try {
      const payload = { version: 1, exportedAt: new Date().toISOString(), observerName: summary.observerName, summaries: [summary] }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `annotation-${summary.roomNumber || 'summary'}-${(summary.date || '').slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast({ type: 'success', message: 'Summary exported successfully.' })
    } catch (e) {
      console.error('Export failed', e)
      showToast({ type: 'error', message: 'Export failed. Please try again.' })
    }
  }

  const handleImportFromFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      if (!payload || typeof payload !== 'object') throw new Error('Invalid backup')
      const imported = Array.isArray(payload.summaries) ? payload.summaries : []
      if (!('observerName' in payload) && imported.length === 0) throw new Error('Invalid backup')
      if (imported.length > 0 && !window.confirm(`Import ${imported.length} summary records?`)) {
        event.target.value = ''
        return
      }
      const existingIds = new Set(savedSummaries.map((s) => s.summaryId))
      let warningCount = 0

      const normalized = imported.map((summary, idx) => {
        const base = {
          ...summary,
          summaryId: summary.summaryId || `summary-import-${Date.now()}-${idx}`,
          observerName: summary.observerName || payload.observerName || observerName,
          students: Array.isArray(summary.students) ? summary.students.map((student) => {
            // Backward compatibility for device
            let derivedDevice = student.device || ''
            if (!derivedDevice) {
              if (student.devices?.device1) derivedDevice = student.devices.device1
              else if (Array.isArray(student.records)) {
                const rec = student.records.find(r => r.device)
                if (rec) derivedDevice = rec.device
              }
            }

            let derivedJob = student.job || ''
            if (!derivedJob && student.jobs) {
              derivedJob = student.jobs.job1 || student.jobs.job2 || student.jobs.job3 || ''
            }

            return {
              ...student,
              job: derivedJob,
              device: derivedDevice,
              records: Array.isArray(student.records) ? student.records.map((r) => {
                let evidence = r.evidence || ''
                if (evidence && typeof evidence === 'string' && !evidence.startsWith('data:')) {
                  warningCount++
                  evidence = ''
                }
                return { ...r, durationSeconds: Number(r.durationSeconds) || 0, evidence }
              }) : [],
            }
          }) : [],
          createdAt: summary.createdAt || new Date().toISOString(),
          updatedAt: summary.updatedAt || new Date().toISOString(),
        }
        if (!existingIds.has(base.summaryId)) {
          existingIds.add(base.summaryId)
          return base
        }
        const nid = `summary-import-${Date.now()}-${idx}`
        existingIds.add(nid)
        return { ...base, summaryId: nid }
      })

      const nextObserver = typeof payload.observerName === 'string' && payload.observerName.trim() ? payload.observerName.trim() : observerName
      if (nextObserver) {
        setObserverName(nextObserver)
        await saveSetting(STORAGE_KEY, nextObserver)
      }

      for (const s of normalized) { await saveSummary(s) }
      await refreshSummaries()
      if (normalized[0]) setSelectedSummaryId(normalized[0].summaryId)
      if (warningCount > 0) {
        showToast({ type: 'warning', message: `Import completed, but some evidence images could not be restored.` })
      } else {
        showToast({ type: 'success', message: `${imported.length} summaries imported successfully.` })
      }
    } catch (e) {
      console.error('Import failed', e)
      showToast({ type: 'error', message: 'Import failed. Please check the file and try again.' })
    } finally { event.target.value = '' }
  }

  const handleEditSummary = (summary) => {
    const restoredStudents = (summary.students || []).map((s) => {
      // Backward compatibility for old JSON data structure
      let derivedDevice = s.device || ''
      if (!derivedDevice) {
        if (s.devices?.device1) derivedDevice = s.devices.device1
        else if (Array.isArray(s.records)) {
          const rec = s.records.find(r => r.device)
          if (rec) derivedDevice = rec.device
        }
      }

      let derivedJob = s.job || ''
      if (!derivedJob && s.jobs) {
        derivedJob = s.jobs.job1 || s.jobs.job2 || s.jobs.job3 || ''
      }

      return {
        id: s.studentId || s.id || `student-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: s.name || '',
        isPresent: s.isPresent !== false,
        job: derivedJob,
        device: derivedDevice,
        records: (s.records || []).map((r) => ({
          id: r.id || `record-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          durationSeconds: Number(r.durationSeconds) || 0,
          evidence: r.evidence || '',
        })),
      }
    })
    setEditingSummaryId(summary.summaryId)
    setActiveSummaryMeta({ date: summary.date || '', roomNumber: summary.roomNumber || '', shift: summary.shift || '' })
    setStudents(restoredStudents)
    setActiveStudentId(restoredStudents[0]?.id || null)
    setSelectedSummaryId(null)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal) return
    try {
      await dbDeleteSummary(deleteModal)
      setSavedSummaries((c) => c.filter((s) => s.summaryId !== deleteModal))
      setSelectedSummaryId(null)
      setDeleteModal(null)
      setDeleteError('')
      showToast({ type: 'success', message: 'Summary deleted successfully.' })
    } catch (e) {
      console.error('Delete failed', e)
      showToast({ type: 'error', message: 'Unable to delete summary. Please try again.' })
      setDeleteModal(null)
    }
  }

  // Search / Filter / Sort
  const filteredSummaries = useMemo(() => {
    let list = [...savedSummaries]

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter((s) => {
        const haystack = [
          s.roomNumber, s.observerName, s.shift, s.date,
          ...(s.students || []).flatMap((st) => [
            st.name,
            st.device,
            st.job,
            ...(Object.values(st.jobs || {})),
          ]),
        ].filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(q)
      })
    }

    // Filter
    if (filterMode === 'present') {
      list = list.filter((s) => (s.students || []).every((st) => st.isPresent !== false))
    } else if (filterMode === 'absent') {
      list = list.filter((s) => (s.students || []).some((st) => st.isPresent === false))
    }

    // Sort
    if (sortOrder === 'oldest') {
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    } else {
      list.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    }

    return list
  }, [savedSummaries, searchQuery, filterMode, sortOrder])

  // ---- RENDER ----

  const selectedSummary = savedSummaries.find((s) => s.summaryId === selectedSummaryId)

  // Delete confirmation modal
  const renderDeleteModal = () => {
    if (!deleteModal) return null
    return (
      <div className="modal-overlay" onClick={() => { setDeleteModal(null); setDeleteError('') }}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h3>Delete this summary?</h3>
          <p>This will permanently delete this observation summary and its associated evidence. This action cannot be undone.</p>
          {deleteError && <p className="modal-error">{deleteError}</p>}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={() => { setDeleteModal(null); setDeleteError('') }}>Cancel</button>
            <button type="button" className="danger-button" onClick={handleDeleteConfirm}>Delete Summary</button>
          </div>
        </div>
      </div>
    )
  }

  // DETAIL VIEW
  if (selectedSummary) {
    return (
      <div className="app-shell">
        <AppHeader brandName="Motion Form Helper" />
        {renderDeleteModal()}

        <main className="detail-shell">
          <div className="detail-action-bar">
            <button type="button" className="link-button" onClick={() => setSelectedSummaryId(null)}>
              ← Back to summaries
            </button>
            <div className="detail-action-bar__actions">
              <button type="button" className="primary-button" onClick={() => handleEditSummary(selectedSummary)}>Edit Summary</button>
              <button type="button" className="secondary-button" onClick={() => exportOneSummary(selectedSummary)}>Export</button>
              <button type="button" className="danger-button" onClick={() => setDeleteModal(selectedSummary.summaryId)}>Delete Summary</button>
            </div>
          </div>

          <section className="detail-panel">
            <div className="detail-panel__header">
              <div>
                <p className="eyebrow">Summary</p>
                <h1>{selectedSummary.date ? formatSavedDate(selectedSummary.date) : 'Summary detail'}</h1>
              </div>
            </div>

            <div className="summary-detail-grid">
              <div className="detail-card">
                <h3>Summary</h3>
                <dl>
                  {[
                    ['Observer', selectedSummary.observerName, 'observer'],
                    ['Date', formatSavedDate(selectedSummary.date), 'date'],
                    ['Room', selectedSummary.roomNumber, 'room'],
                    ['Shift', selectedSummary.shift, 'shift'],
                  ].map(([label, val, key]) => (
                    <div className="field-with-copy" key={key}>
                      <dt>{label}</dt>
                      <dd>
                        <span>{val || '—'}</span>
                        <button type="button" className="copy-button" onClick={() => handleCopyValue(key, val)}>
                          {copiedField === key ? 'Copied!' : 'Copy'}
                        </button>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="detail-card detail-card--wide">
                <h3>Students</h3>
                {(selectedSummary.students || []).map((student, index) => {
                  const totalDur = (student.records || []).reduce((t, r) => t + (Number(r.durationSeconds) || 0), 0)
                  
                  // Handle legacy data where device might be in devices or records.
                  let studentDevice = student.device || ''
                  if (!studentDevice) {
                    if (student.devices?.device1) studentDevice = student.devices.device1
                    else if (Array.isArray(student.records)) {
                      const rec = student.records.find(r => r.device)
                      if (rec) studentDevice = rec.device
                    }
                  }

                  let studentJob = student.job || ''
                  if (!studentJob && student.jobs) {
                    studentJob = student.jobs.job1 || student.jobs.job2 || student.jobs.job3 || ''
                  }

                  return (
                    <div key={student.studentId || index} className="detail-student">
                      <div className="detail-student__head">
                        <div className="detail-student__identity">
                          <strong>{student.name}</strong>
                        </div>
                        <span className={`status-pill ${student.isPresent !== false ? 'status-pill--success' : 'status-pill--muted'}`}>
                          {student.isPresent !== false ? 'Present' : 'Absent'}
                        </span>
                      </div>

                      {(studentJob || studentDevice) && (
                        <div className="detail-student__meta">
                          {studentDevice && <span>Device: {studentDevice}</span>}
                          {studentJob && <span>Job: {studentJob}</span>}
                        </div>
                      )}

                      <div className="detail-student__meta">
                        <span>{(student.records || []).length} records</span>
                        <span>{formatDuration(totalDur)} total</span>
                      </div>

                      <ul className="detail-record-list">
                        {(student.records || []).map((record, ri) => {
                          const dur = Number(record.durationSeconds) || 0
                          const studentName = sanitizeFilename(student.name || `student-${index + 1}`)
                          const { ext } = getMimeExt(record.evidence)

                          return (
                            <li key={record.id || ri}>
                              <span>Record #{ri + 1}</span>
                              <div className="record-copy-row">
                                <span>{formatDuration(dur)}</span>
                              </div>
                              {record.evidence ? (
                                <div className="detail-evidence">
                                  <img src={record.evidence} alt={`Evidence record ${ri + 1}`} />
                                  <button
                                    type="button"
                                    className="secondary-button detail-evidence__download"
                                    onClick={() => {
                                      try {
                                        downloadDataURL(record.evidence, `${studentName}-record-${ri + 1}.${ext}`)
                                        showToast({ type: 'success', message: 'Image downloaded.' })
                                      } catch(e) {
                                        showToast({ type: 'error', message: 'Unable to download image.' })
                                      }
                                    }}
                                  >
                                    Download Image
                                  </button>
                                </div>
                              ) : (
                                <span className="detail-no-evidence">No evidence</span>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </main>
      </div>
    )
  }

  // OBSERVER SETUP
  if (!observerName || isEditingObserver) {
    return (
      <ObserverSetup
        value={draftName}
        onChange={setDraftName}
        onSubmit={handleObserverSubmit}
      />
    )
  }

  // CREATE SUMMARY FORM
  if (isCreatingSummary) {
    return (
      <SummaryComposer
        formData={summaryForm}
        onChange={handleSummaryChange}
        onSubmit={handleSummarySubmit}
        onBack={() => setIsCreatingSummary(false)}
      />
    )
  }

  // MAIN HOMEPAGE
  return (
    <div className="app-shell">
      <AppHeader brandName="Motion Form Helper" />
      {renderDeleteModal()}

      <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImportFromFile} />

      <div className="toolbar-row">
        <div className="observer-chip" aria-live="polite">
          <span className="observer-chip__label">Observer</span>
          <strong>{observerName}</strong>
        </div>
        <div className="toolbar-actions">
          {savedSummaries.length > 0 && (
            <button type="button" className="primary-button" onClick={() => setIsCreatingSummary(true)}>+ New Summary</button>
          )}
          <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()}>Import</button>
          <button type="button" className="text-button" onClick={() => { setDraftName(observerName); setIsEditingObserver(true) }}>Change observer</button>
        </div>
      </div>

      <main className="page-content">
        {students.length > 0 ? (
          <StudentWorkspace
            students={students}
            activeStudentId={activeStudentId}
            onSelectStudent={setActiveStudentId}
            onSetStudentName={handleSetStudentName}
            onToggleStudentPresence={handleToggleStudentPresence}
            onAddStudent={handleAddStudent}
            onRemoveStudent={handleRemoveStudent}
            onUpdateStudentRecord={handleStudentRecordUpdate}
            onUpdateStudentEvidence={handleStudentRecordEvidenceUpload}
            onUpdateStudentJob={handleUpdateStudentJob}
            onUpdateStudentDevice={handleUpdateStudentDevice}
            onAddMoreStudentRecords={handleAddMoreStudentRecords}
            onSaveSummary={handleSaveCurrentSummary}
            observerName={observerName}
            roomNumber={activeSummaryMeta?.roomNumber || ''}
            date={activeSummaryMeta?.date || ''}
            shift={activeSummaryMeta?.shift || ''}
          />
        ) : (
          <>
            <section className="page-intro" aria-labelledby="page-title">
              <div>
                <p className="eyebrow">Overview</p>
                <h1 id="page-title">Motion Form Helper</h1>
              </div>
              <p className="page-subtitle">Record and review observational sessions.</p>
            </section>

            <section className="summary-panel" aria-labelledby="recent-summaries-title">
              <SectionHeader title="Recent Summaries" />

              {savedSummaries.length > 0 && (
                <div className="summary-toolbar">
                  <input
                    type="text"
                    className="summary-search"
                    placeholder="Search summaries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <select className="summary-filter" value={filterMode} onChange={(e) => setFilterMode(e.target.value)}>
                    <option value="all">All</option>
                    <option value="present">All present</option>
                    <option value="absent">Has absent</option>
                  </select>
                  <select className="summary-sort" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                </div>
              )}

              {filteredSummaries.length > 0 ? (
                <div className="summary-grid">
                  {filteredSummaries.map((summary) => (
                    <SummaryCard
                      key={summary.summaryId}
                      summary={summary}
                      onOpen={() => setSelectedSummaryId(summary.summaryId)}
                    />
                  ))}
                </div>
              ) : savedSummaries.length > 0 ? (
                <EmptyState
                  title="No summaries match"
                  description="Try changing your search or filter."
                />
              ) : (
                <EmptyState
                  title="No summaries yet"
                  description="Create your first annotation summary to begin recording observations."
                  action={
                    <button type="button" className="primary-button" onClick={() => setIsCreatingSummary(true)}>
                      + New Summary
                    </button>
                  }
                />
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default App
