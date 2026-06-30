'use client';

interface Props {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}

export default function Topbar({ title, subtitle, action }: Props) {
  return (
    <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30 px-8 py-5 flex items-center justify-between">
      <div>
        <h2 className="text-[22px] font-bold text-on-surface tracking-tight">{title}</h2>
        {subtitle && <p className="text-[13px] text-on-surface-variant mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}
