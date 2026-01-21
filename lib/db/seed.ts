import { db, integrations, skills, users } from './index';
import { AVAILABLE_INTEGRATIONS, INTEGRATION_CATEGORIES } from '../integrations';
import { AVAILABLE_SKILLS } from '../skills';
import { nanoid } from 'nanoid';

export async function seed() {
  console.log('Seeding database...');

  // Create default user (for local/single-user mode)
  const existingUsers = db.select().from(users).all();
  if (existingUsers.length === 0) {
    db.insert(users).values({
      id: 'default-user',
      email: 'user@local.dev',
      name: 'Local User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).run();
    console.log('Created default user');
  }

  // Seed integrations
  const existingIntegrations = db.select().from(integrations).all();
  if (existingIntegrations.length === 0) {
    const integrationValues = AVAILABLE_INTEGRATIONS.map((int) => {
      // Find category for this integration
      const category = INTEGRATION_CATEGORIES.find(c =>
        c.integrations.includes(int.id)
      )?.name || 'Other';

      return {
        id: int.id,
        name: int.name,
        displayName: int.displayName,
        description: int.description,
        icon: undefined,
        category,
      };
    });

    for (const int of integrationValues) {
      db.insert(integrations).values(int).run();
    }
    console.log(`Seeded ${integrationValues.length} integrations`);
  }

  // Seed skills
  const existingSkills = db.select().from(skills).all();
  if (existingSkills.length === 0) {
    const skillValues = AVAILABLE_SKILLS.map((skill) => ({
      id: skill.id,
      name: skill.name,
      displayName: skill.displayName,
      description: skill.description,
      category: skill.category,
    }));

    for (const skill of skillValues) {
      db.insert(skills).values(skill).run();
    }
    console.log(`Seeded ${skillValues.length} skills`);
  }

  console.log('Seeding complete!');
}

// Run if called directly
if (require.main === module) {
  seed();
}
