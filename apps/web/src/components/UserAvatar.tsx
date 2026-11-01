import { useState, type ReactNode } from "react";
import styles from "./UserAvatar.module.css";

/** Shared frame for profile photos, initials and stacked-avatar counters. */
export function AvatarFrame({
  children,
  size = 40,
  className = "",
}: {
  children: ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <span className={`${styles.avatar} ${className}`} style={{ width: size, height: size }}>
      {children}
    </span>
  );
}

function avatarUrl(username: string) {
  return `https://i.pravatar.cc/150?u=${encodeURIComponent(`${username.trim().toLowerCase()}@obraflow.demo`)}`;
}
export function UserAvatar({
  username,
  displayName,
  size = 40,
}: {
  username: string;
  displayName: string;
  size?: number;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const src = avatarUrl(username);
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((name) => name[0])
    .join("")
    .toUpperCase();
  return (
    <AvatarFrame className="user-avatar" size={size}>
      <span aria-hidden="true" data-initials={initials} />
      <img src={src} alt="" hidden={failed === src} referrerPolicy="no-referrer" onError={() => setFailed(src)} />
    </AvatarFrame>
  );
}
