const bcrypt = require('bcryptjs');
const { db } = require('../config/firebase');

async function updateAdminPassword() {
  try {
    const email = 'brahiamiserre10@gmail.com';
    const newPassword = 'brahiamiserre';
    
    console.log(`\n🔍 Buscando usuario con email: ${email}...`);
    
    // Buscar el usuario por email
    const userQuery = await db.collection('users').where('email', '==', email.toLowerCase()).get();
    
    if (userQuery.empty) {
      console.error('❌ Usuario no encontrado');
      return;
    }
    
    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();
    
    console.log(`✅ Usuario encontrado: ${userData.nombre} ${userData.apellido}`);
    console.log(`📧 Email: ${userData.email}`);
    console.log(`👤 Role: ${userData.role}`);
    console.log(`🔑 Password actual (texto plano): ${userData.password}`);
    
    // Generar hash de la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    console.log(`\n🔐 Nuevo hash generado: ${hashedPassword}`);
    
    // Actualizar el documento en Firestore
    await db.collection('users').doc(userDoc.id).update({
      password: hashedPassword,
      updatedAt: new Date()
    });
    
    console.log('\n✅ Contraseña actualizada exitosamente!');
    console.log('🎉 Ahora puedes iniciar sesión con la contraseña hasheada\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al actualizar contraseña:', error);
    process.exit(1);
  }
}

updateAdminPassword();
