import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllData() {
  try {
    console.log('Starting to delete all test data...');
    
    // 1. Delete all quest completions
    const completionsDeleted = await prisma.questCompletion.deleteMany({});
    console.log(`✅ Deleted ${completionsDeleted.count} quest completions`);
    
    // 2. Delete all quest requirements
    const requirementsDeleted = await prisma.questRequirement.deleteMany({});
    console.log(`✅ Deleted ${requirementsDeleted.count} quest requirements`);
    
    // 3. Delete all quests
    const questsDeleted = await prisma.quest.deleteMany({});
    console.log(`✅ Deleted ${questsDeleted.count} quests`);
    
    // 4. Delete all projects (builder spaces)
    const projectsDeleted = await prisma.project.deleteMany({});
    console.log(`✅ Deleted ${projectsDeleted.count} projects`);
    
    // 5. Delete all trust token transactions
    const transactionsDeleted = await prisma.trustTokenTransaction.deleteMany({});
    console.log(`✅ Deleted ${transactionsDeleted.count} trust token transactions`);
    
    // 6. Delete all social connections
    const socialConnectionsDeleted = await prisma.socialConnection.deleteMany({});
    console.log(`✅ Deleted ${socialConnectionsDeleted.count} social connections`);
    
    // 7. Delete all user XP records
    const userXPDeleted = await prisma.userXP.deleteMany({});
    console.log(`✅ Deleted ${userXPDeleted.count} user XP records`);
    
    // 8. Delete all leaderboard entries
    const leaderboardDeleted = await prisma.leaderboard.deleteMany({});
    console.log(`✅ Deleted ${leaderboardDeleted.count} leaderboard entries`);
    
    // 9. Delete all users (builder profiles)
    const usersDeleted = await prisma.user.deleteMany({});
    console.log(`✅ Deleted ${usersDeleted.count} users (builder profiles)`);
    
    console.log('\n🎉 Successfully deleted all test data from database!');
    console.log('\n⚠️  Note: Spaces are stored in localStorage. Run the frontend cleanup script to clear them.');
  } catch (error) {
    console.error('❌ Error deleting data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllData()
  .then(() => {
    console.log('\n✅ Database cleanup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Database cleanup failed:', error);
    process.exit(1);
  });

