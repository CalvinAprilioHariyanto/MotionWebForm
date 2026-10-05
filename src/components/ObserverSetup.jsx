import Button from './Button'

function ObserverSetup({ value, onChange, onSubmit }) {
  return (
    <div className="observer-setup">
      <div className="observer-card">
        <p className="observer-kicker">Observer setup</p>
        <h1>Welcome</h1>
        <p className="observer-copy">
          To begin recording observational summaries, please enter your name.
        </p>

        <form onSubmit={onSubmit} className="observer-form">
          <label htmlFor="observer-name">Observer Name</label>
          <input
            id="observer-name"
            name="observerName"
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Enter observer name"
            autoFocus
          />

          <Button type="submit" variant="primary" disabled={!value.trim()}>
            Continue
          </Button>
        </form>
      </div>
    </div>
  )
}

export default ObserverSetup
