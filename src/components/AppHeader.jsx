function AppHeader({
  brandName = 'Motion Form Helper',
}) {
  return (
    <header className="app-header">
      <div className="brand" aria-label="Application brand">
        <div className="brand__mark" aria-hidden="true">AR</div>
        <div>
          <span className="brand__eyebrow">Observation</span>
          <strong>{brandName}</strong>
        </div>
      </div>
    </header>
  )
}

export default AppHeader
