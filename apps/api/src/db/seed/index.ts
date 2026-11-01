import { DEMO_PROJECTS } from "@dokimos/shared";
import { ProjectEntity } from "../../modules/projects/entities.js";
import { UserEntity } from "../../modules/users/entities.js";
import { dataSource } from "../data-source.js";
import { seedProjects } from "./projects.js";
import { seedSuppliers } from "./suppliers.js";
import { seedUsers } from "./users.js";
import { seedWorkflow } from "./workflow.js";

// The only seeder (`npm run db:seed`): the complete demonstration dataset. Every step
// only adds what is missing, so reseeding never resets credentials, activation,
// configured CoAs or progressed orders.
async function seed(): Promise<void> {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Refusing demo seeding in production without ALLOW_DEMO_SEED=true");
  }

  await dataSource.initialize();
  try {
    // First-run mode for container deployments: a database that already has users is
    // left alone, so redeploys never re-create demo rows an administrator removed.
    if (process.argv.includes("--if-empty") && (await dataSource.getRepository(UserEntity).exist())) {
      console.log("Database already has users; skipping first-run seed.");
      return;
    }

    // Order matters: projects need the users, and the workflow needs all three.
    const users = await seedUsers();
    await seedProjects(users);
    await seedSuppliers(users.find((user) => user.role === "ADMIN")?.id ?? null);

    for (const demo of DEMO_PROJECTS) {
      const project = await dataSource.getRepository(ProjectEntity).findOneByOrFail({ name: demo.name });
      await seedWorkflow(project, demo);
    }
    console.log(
      "Seeded identities, projects, memberships, suppliers and cumulative CoA/PO examples (preserving existing changes).",
    );
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
