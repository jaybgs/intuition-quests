import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a sample project
  const project = await prisma.project.upsert({
    where: { id: 'default-project' },
    update: {},
    create: {
      id: 'default-project',
      name: 'Default Project',
      description: 'A default project for testing',
      owner: '0x0000000000000000000000000000000000000000',
    },
  });

  console.log('✅ Created default project:', project.name);

  // Create sample quests
  const sampleQuests = [
    {
      id: 'sample-quest-1',
      title: 'Welcome Quest',
      description: 'Complete your first quest to get started!',
      projectId: project.id,
      creatorId: '', // Will be set after user creation
      xpReward: 100,
      trustReward: 10,
      status: 'ACTIVE' as const,
      requirements: {
        create: [
          {
            type: 'VERIFY_WALLET' as const,
            description: 'Verify your wallet ownership',
            verificationData: { message: 'Welcome to TrustQuests' },
            order: 0,
          },
        ],
      },
    },
    {
      id: 'sample-quest-2',
      title: 'Follow on Twitter',
      description: 'Follow our Twitter account to stay updated',
      projectId: project.id,
      creatorId: '',
      xpReward: 50,
      status: 'ACTIVE' as const,
      requirements: {
        create: [
          {
            type: 'FOLLOW' as const,
            description: 'Follow @TrustQuests on Twitter',
            verificationData: { accountToFollow: '@TrustQuests' },
            order: 0,
          },
        ],
      },
    },
  ];

  // Note: We'll create quests after we have a user
  // For now, just log that seeding is complete
  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

