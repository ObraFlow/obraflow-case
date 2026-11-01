import argon2 from "argon2";
import { DEMO_PASSWORDS, DEMO_PERSONAS, type DemoPersona } from "@dokimos/shared";
import { UserEntity, type User } from "../../modules/users/entities.js";
import { dataSource } from "../data-source.js";

// The environment overrides the public demo passwords for deployed demos.
const passwordFor = (role: DemoPersona["role"]) =>
  role === "ADMIN"
    ? (process.env.SEED_ADMIN_PASSWORD ?? DEMO_PASSWORDS.ADMIN)
    : (process.env.SEED_USER_PASSWORD ?? DEMO_PASSWORDS.USER);

async function createDemoUser(persona: DemoPersona): Promise<void> {
  const passwordHash = await argon2.hash(passwordFor(persona.role), { type: argon2.argon2id });
  await dataSource.transaction(async (manager) => {
    const repository = manager.getRepository(UserEntity);
    const user = await repository.save(
      repository.create({
        username: persona.username,
        displayName: persona.displayName,
        passwordHash,
        role: persona.role,
        isActive: true,
      }),
    );
    // Raw insert: the repository helper only records user actors, and the seed is a SYSTEM actor.
    await manager.query(
      "INSERT INTO user_lifecycle_events (target_user_id, actor_kind, action) VALUES ($1, 'SYSTEM', 'CREATED')",
      [user.id],
    );
  });
}

// seedUsers: creates the missing demo identities and returns all of them. An existing
// user is left untouched, so reseeding never resets a changed password or deactivation.
export async function seedUsers(): Promise<User[]> {
  const repository = dataSource.getRepository(UserEntity);
  for (const persona of DEMO_PERSONAS) {
    const existing = await repository.findOneBy({ username: persona.username });
    if (!existing) await createDemoUser(persona);
    else if (existing.role !== persona.role) throw new Error(`Seed role conflict for ${persona.username}`);
  }
  return repository.find({ where: DEMO_PERSONAS.map(({ username }) => ({ username })) });
}
