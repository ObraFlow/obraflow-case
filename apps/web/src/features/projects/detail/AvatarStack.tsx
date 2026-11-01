import { AvatarFrame, UserAvatar } from "@/components/UserAvatar";
import styles from "./AvatarStack.module.css";

export function AvatarStack({
  people,
  limit = 2,
}: {
  people: readonly { id: string; username: string; displayName: string }[];
  limit?: number;
}) {
  return (
    <span className={styles.stack} aria-hidden="true">
      {people.slice(0, limit).map((person) => (
        <span className={styles.avatar} key={person.id}>
          <UserAvatar username={person.username} displayName={person.displayName} size={32} />
        </span>
      ))}
      {people.length > limit && (
        <span className={styles.overflow}>
          <AvatarFrame size={32}>+{people.length - limit}</AvatarFrame>
        </span>
      )}
    </span>
  );
}
