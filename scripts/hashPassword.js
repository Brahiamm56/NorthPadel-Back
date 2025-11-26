const bcrypt = require('bcryptjs');

async function hashPassword() {
  const password = 'brahiamiserre';
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  console.log('\n🔐 Password hasheada:');
  console.log(hashedPassword);
  console.log('\n📋 Copia este hash y actualiza el campo "password" del usuario admin en Firestore\n');
}

hashPassword();
