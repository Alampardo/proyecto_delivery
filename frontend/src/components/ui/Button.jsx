const variants = {
  primary:   'bg-orange-500 hover:bg-orange-600 text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800',
  danger:    'bg-red-500 hover:bg-red-600 text-white',
  green:     'bg-green-500 hover:bg-green-600 text-white',
  outline:   'border-2 border-orange-500 text-orange-500 hover:bg-orange-50',
  ghost:     'text-gray-600 hover:bg-gray-100',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-lg',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  ...props
}) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl font-semibold
        transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
