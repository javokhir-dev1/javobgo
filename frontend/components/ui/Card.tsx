interface CardProps {
  title: string;
  desc?: string;
  children: React.ReactNode;
}

export function Card({ title, desc, children }: CardProps) {
  return (
    <div className="bg-surface border border-outline-variant/30 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant/20">
        <h2 className="text-sm font-semibold text-on-surface">{title}</h2>
        {desc && <p className="text-xs text-on-surface-variant mt-0.5">{desc}</p>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
