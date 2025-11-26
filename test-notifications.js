// Script de prueba para el sistema de notificaciones
// Ejecutar con: node test-notifications.js

require('dotenv').config();
const notificationService = require('./services/notifications.service');
const weatherService = require('./services/weather.service');
const NotificationJobs = require('./jobs/notificationJobs');

async function testNotifications() {
  console.log('🧪 Iniciando pruebas del sistema de notificaciones...\n');

  // Test 1: Envío de notificación simple
  console.log('📱 Test 1: Envío de notificación de prueba');
  try {
    const testToken = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]'; // Reemplazar con un token real
    const result = await notificationService.sendNotification(
      testToken,
      '🧪 Test NorthPadel',
      'Notificación de prueba desde el backend',
      {
        type: 'test',
        timestamp: new Date().toISOString(),
      }
    );
    
    if (result.success) {
      console.log('✅ Notificación de prueba enviada exitosamente');
    } else {
      console.log('❌ Error enviando notificación:', result.error || result.reason);
    }
  } catch (error) {
    console.log('❌ Error en test de notificación:', error.message);
  }

  console.log('\n');

  // Test 2: Verificar preferencias de usuario
  console.log('👤 Test 2: Verificación de preferencias de usuario');
  try {
    const testUserId = 'test_user_id'; // Reemplazar con un ID real
    const preferences = await notificationService.getUserPreferences(testUserId);
    
    if (preferences) {
      console.log('✅ Preferencias obtenidas:', preferences);
    } else {
      console.log('⚠️ Usuario no encontrado o sin preferencias');
    }
  } catch (error) {
    console.log('❌ Error obteniendo preferencias:', error.message);
  }

  console.log('\n');

  // Test 3: Obtener clima actual
  console.log('🌤️ Test 3: Obtener clima actual');
  try {
    const weather = await weatherService.getCurrentWeather('Buenos Aires');
    console.log('✅ Clima actual obtenido:', weather);
  } catch (error) {
    console.log('❌ Error obteniendo clima:', error.message);
  }

  console.log('\n');

  // Test 4: Verificar pronóstico del clima
  console.log('📅 Test 4: Verificar pronóstico del clima');
  try {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const forecast = await weatherService.getWeatherForecast('Buenos Aires', tomorrow);
    
    if (forecast.adverseConditions.length > 0) {
      console.log('⚠️ Condiciones adversas detectadas:', forecast.adverseConditions);
    } else {
      console.log('✅ Buen clima pronosticado');
    }
  } catch (error) {
    console.log('❌ Error obteniendo pronóstico:', error.message);
  }

  console.log('\n');

  // Test 5: Ejecutar job manualmente
  console.log('⚙️ Test 5: Ejecutar job de recordatorios manualmente');
  try {
    const jobs = NotificationJobs.start();
    await jobs.runJobManually('reminders');
    console.log('✅ Job de recordatorios ejecutado manualmente');
  } catch (error) {
    console.log('❌ Error ejecutando job:', error.message);
  }

  console.log('\n🎉 Pruebas completadas');
}

// Test de confirmación de reserva
async function testReservaConfirmation() {
  console.log('🏸 Test: Confirmación de reserva');
  
  try {
    const testToken = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]'; // Reemplazar con token real
    const result = await notificationService.sendReservaConfirmation(
      testToken,
      {
        id: 'test_reserva_id',
        canchaNombre: 'Cancha 1',
        fecha: '2024-12-15',
        hora: '18:00',
      },
      'test_user_id'
    );
    
    if (result.success) {
      console.log('✅ Notificación de confirmación de reserva enviada');
    } else {
      console.log('❌ Error enviando confirmación:', result.error || result.reason);
    }
  } catch (error) {
    console.log('❌ Error en test de confirmación:', error.message);
  }
}

// Test de alerta climática
async function testWeatherAlert() {
  console.log('🌧️ Test: Alerta climática');
  
  try {
    const testToken = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]'; // Reemplazar con token real
    const result = await notificationService.sendWeatherAlert(
      testToken,
      'Cancha Central',
      '2024-12-15',
      'Lluvia intensa',
      'test_user_id'
    );
    
    if (result.success) {
      console.log('✅ Alerta climática enviada');
    } else {
      console.log('❌ Error enviando alerta climática:', result.error || result.reason);
    }
  } catch (error) {
    console.log('❌ Error en test de alerta climática:', error.message);
  }
}

// Menú interactivo
async function showMenu() {
  console.log('\n📋 Menú de pruebas - Sistema de Notificaciones NorthPadel');
  console.log('1. Ejecutar todas las pruebas básicas');
  console.log('2. Probar confirmación de reserva');
  console.log('3. Probar alerta climática');
  console.log('4. Salir');
  
  // En un entorno real, aquí podrías usar readline para entrada interactiva
  // Por ahora, ejecutaremos todas las pruebas
  console.log('\nEjecutando todas las pruebas...\n');
  
  await testNotifications();
  console.log('\n' + '='.repeat(50) + '\n');
  await testReservaConfirmation();
  console.log('\n' + '='.repeat(50) + '\n');
  await testWeatherAlert();
}

// Verificar configuración
function checkConfiguration() {
  console.log('🔧 Verificando configuración...\n');
  
  const requiredEnvVars = [
    'JWT_SECRET',
    'NOTIFICATION_ENABLED',
    'WEATHER_API_KEY'
  ];
  
  let configOk = true;
  
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      console.log(`❌ Variable de entorno faltante: ${varName}`);
      configOk = false;
    } else {
      console.log(`✅ ${varName}: ${varName.includes('KEY') ? '***configurada***' : process.env[varName]}`);
    }
  });
  
  if (!configOk) {
    console.log('\n⚠️ Por favor, configura las variables de entorno faltantes en tu archivo .env');
    return false;
  }
  
  console.log('\n✅ Configuración verificada correctamente\n');
  return true;
}

// Ejecutar pruebas
async function main() {
  console.log('🚀 Sistema de Notificaciones - NorthPadel Backend\n');
  
  if (!checkConfiguration()) {
    process.exit(1);
  }
  
  await showMenu();
  
  console.log('\n📝 Notas importantes:');
  console.log('- Reemplaza los tokens de prueba con tokens reales de Expo');
  console.log('- Configura WEATHER_API_KEY con una clave de OpenWeatherMap');
  console.log('- Las notificaciones solo se enviarán a dispositivos reales');
  console.log('- Revisa la consola para ver los logs detallados');
  
  process.exit(0);
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error en las pruebas:', error);
    process.exit(1);
  });
}

module.exports = {
  testNotifications,
  testReservaConfirmation,
  testWeatherAlert,
  checkConfiguration,
};
