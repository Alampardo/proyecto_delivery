export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <input
        className={`
          w-full px-4 py-2.5 rounded-xl border text-sm transition-colors
          ${error
            ? 'border-red-400 focus:ring-red-300'
            : 'border-gray-300 focus:border-orange-400 focus:ring-orange-200'
          }
          focus:outline-none focus:ring-2
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
