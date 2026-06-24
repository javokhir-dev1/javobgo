// Foydalanuvchi avatari — rasm bo'lsa ko'rsatadi, bo'lmasa harf + rang
const COLORS = [
  '#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444',
  '#06B6D4','#F97316','#84CC16','#EC4899','#6366F1',
];

export function avatarColor(username: string): string {
  let hash = 0;
  for (const ch of username) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

interface AvatarProps {
  username: string;
  profilePic?: string | null;
  size?: number;
}

export function Avatar({ username, profilePic, size = 40 }: AvatarProps) {
  if (profilePic) {
    return (
      <img
        src={profilePic}
        alt={username}
        referrerPolicy="no-referrer"
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }

  const letter = (username || '?')[0].toUpperCase();
  const bg = avatarColor(username || '?');

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', backgroundColor: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 600, fontSize: size * 0.4, flexShrink: 0,
    }}>
      {letter}
    </div>
  );
}
