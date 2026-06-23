'use client';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}

export default function Toggle({ checked, onChange, label, description }: Props) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-outline-variant/30 mb-5">
      <div className="flex-1 pr-4">
        <div className="text-sm font-semibold text-on-surface">{label}</div>
        {description && (
          <div className="text-xs text-on-surface-variant mt-0.5">{description}</div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: '36px',
          height: '20px',
          borderRadius: '10px',
          padding: '2px',
          border: 'none',
          cursor: 'pointer',
          transition: 'background-color 0.25s ease',
          backgroundColor: checked ? '#3B82F6' : '#E5E7EB',
          boxShadow: checked
            ? 'inset 0 1px 3px rgba(0,0,0,0.15)'
            : 'inset 0 1px 3px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          outline: 'none',
        }}
      >
        <span
          style={{
            display: 'block',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            transform: checked ? 'translateX(16px)' : 'translateX(0px)',
            transition: 'transform 0.25s ease',
            flexShrink: 0,
          }}
        />
      </button>
    </div>
  );
}
