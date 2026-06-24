// Agent avatari — dicebear URL yoki emoji
// className prop (Tailwind) yoki size prop (px) dan birini ishlating

function dicebearUrl(seed: string) {
  return `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

interface AgentAvatarProps {
  value: string;
  className?: string;
  size?: number;
}

export function AgentAvatar({ value, className, size }: AgentAvatarProps) {
  const style = size ? { width: size, height: size, borderRadius: '50%' } : undefined;
  const cls = className ?? 'w-8 h-8';

  if (value?.startsWith('dicebear:')) {
    const seed = value.split(':')[2] || 'Felix';
    return (
      <img
        src={dicebearUrl(seed)}
        alt="avatar"
        className={style ? undefined : cls}
        style={style}
      />
    );
  }

  return (
    <span
      className={style ? undefined : 'leading-none'}
      style={style ? { fontSize: size! * 0.65, lineHeight: 1 } : undefined}
    >
      {value}
    </span>
  );
}
