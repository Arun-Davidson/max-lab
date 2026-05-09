import { Candidate, sequelize } from './src/models';

async function debugUser(email: string) {
  console.log(`Checking user with email: ${email}`);
  
  const candidate = await Candidate.findOne({ where: { email } });
  
  if (candidate) {
    console.log('Original avatar:', candidate.avatar);
    candidate.avatar = 'test_avatar_path_' + Date.now();
    console.log('Setting avatar to:', candidate.avatar);
    
    const changed = candidate.changed();
    console.log('Sequelize changed() result:', changed);
    
    await candidate.save();
    console.log('Save completed.');
    
    const reloaded = await Candidate.findOne({ where: { email } });
    console.log('Reloaded avatar:', reloaded?.avatar);
  } else {
    console.log('Candidate not found');
  }
  
  await sequelize.close();
}

const email = process.argv[2] || 'candidate@example.com';
debugUser(email).catch(console.error);
