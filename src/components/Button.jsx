function Button({ children, variant = 'primary', type = 'button', ...props }) {
  return (
    <button type={type} className={`button button--${variant}`} {...props}>
      {children}
    </button>
  )
}

export default Button
