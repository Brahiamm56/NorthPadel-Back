# 📱 Sistema de Notificaciones Push - NorthPadel Backend

## 🚀 Descripción General

Sistema completo de notificaciones push programadas y automáticas para la aplicación NorthPadel. Incluye confirmaciones de reservas, recordatorios automáticos y alertas climáticas.

## ✅ Características Implementadas

### 🎯 Notificaciones Automáticas
- **Confirmación de reserva**: Notificación inmediata al confirmar una reserva
- **Recordatorios**: 2 horas antes de la reserva y 30 minutos antes
- **Alertas climáticas**: Verificación diaria del clima para reservas del día siguiente
- **Cancelaciones**: Notificación cuando una reserva es cancelada

### 🛠️ Gestión de Preferencias
- Activar/desactivar notificaciones por usuario
- Preferencias granulares (recordatorios, confirmaciones, alertas climáticas)
- Rate limiting para evitar spam

### ⚙️ Jobs Programados
- **Reprogramación al iniciar**: Restablece recordatorios perdidos por reinicio del servidor
- **Recordatorios**: Cada hora (xx:00)
- **Clima**: Todos los días a las 8:00 AM
- **Limpieza**: Domingos a las 2:00 AM
- **Próximas**: Cada 30 minutos

## 📋 Configuración Inicial

### 1. Variables de Entorno

Copia `.env.example` a `.env` y configura:

```bash
# Variables existentes...
GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"
JWT_SECRET=your_jwt_secret_here

# Variables de notificaciones
NOTIFICATION_ENABLED=true
WEATHER_API_KEY=your_openweather_api_key_here
EXPO_ACCESS_TOKEN=your_expo_access_token_here  # Opcional
```

### 2. Obtener API Key de OpenWeatherMap

1. Regístrate en [OpenWeatherMap](https://openweathermap.org/api)
2. Obtén tu API Key gratuita
3. Agrégala a tu archivo `.env`

### 3. Instalar Dependencias

```bash
npm install expo-server-sdk node-cron axios
```

## 🔧 Endpoints de API

### Gestión de Tokens

#### Registrar Push Token
```http
POST /api/notifications/register-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "pushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "userId": "user_id"
}
```

#### Eliminar Push Token
```http
DELETE /api/notifications/token
Authorization: Bearer <token>
```

### Preferencias de Usuario

#### Actualizar Preferencias
```http
PUT /api/notifications/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "preferences": {
    "reminders": true,
    "confirmations": true,
    "weatherAlerts": false
  }
}
```

#### Obtener Preferencias
```http
GET /api/notifications/preferences
Authorization: Bearer <token>
```

#### Estado de Notificaciones
```http
GET /api/notifications/status
Authorization: Bearer <token>
```

### Control de Notificaciones

#### Habilitar/Deshabilitar
```http
POST /api/notifications/enable
POST /api/notifications/disable
Authorization: Bearer <token>
```

#### Notificación de Prueba
```http
POST /api/notifications/test
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user_id",
  "message": "Notificación de prueba",
  "title": "🧪 Test"
}
```

### Endpoints de Admin

#### Clima por Ubicación
```http
GET /api/notifications/weather/Buenos%20Aires?date=2024-12-15
Authorization: Bearer <admin_token>
```

#### Ejecutar Jobs Manualmente
```http
POST /api/notifications/jobs/reminders/run
POST /api/notifications/jobs/weather/run
POST /api/notifications/jobs/cleanup/run
Authorization: Bearer <admin_token>
```

## 🔄 Integración con Reservas

### Nuevos Campos en Modelo de Usuario

```javascript
{
  // campos existentes...
  pushToken: string,              // Token de Expo
  notificationsEnabled: boolean,  // true por defecto
  notificationPreferences: {
    reminders: boolean,           // true por defecto
    confirmations: boolean,       // true por defecto
    weatherAlerts: boolean        // true por defecto
  }
}
```

### Nuevos Campos en Modelo de Reserva

```javascript
{
  // campos existentes...
  fechaHora: Date,               // Para cálculos de tiempo
  reminderSent: boolean,         // Control de recordatorios
  imminentNotificationSent: boolean,
  confirmedAt: string,           // Timestamp de confirmación
  cancelledAt: string           // Timestamp de cancelación
}
```

### Endpoints Actualizados

#### Confirmar Reserva (Admin)
```http
PUT /api/reservas/:id/confirm
Authorization: Bearer <admin_token>
```

#### Cancelar Reserva
```http
PUT /api/reservas/:id/cancel
Authorization: Bearer <token>
```

## 🧪 Testing

### Script de Pruebas

Ejecuta el script de pruebas completo:

```bash
node test-notifications.js
```

### Pruebas Manuales

1. **Obtener Token de Expo desde la App Móvil**
   ```javascript
   // En tu app React Native/Expo
   import * as Notifications from 'expo-notifications';
   
   const token = await Notifications.getExpoPushTokenAsync();
   console.log(token.data); // Copia este token
   ```

2. **Probar Notificación de Prueba**
   ```bash
   curl -X POST http://localhost:3000/api/notifications/test \
     -H "Authorization: Bearer <your_jwt_token>" \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "your_user_id",
       "message": "Test desde backend",
       "title": "🧪 Notificación de Prueba"
     }'
   ```

## 📱 Flujo Completo de Notificaciones

### 1. Registro del Usuario
```
Usuario abre app → App obtiene token → App envía token a /api/notifications/register-token
```

### 2. Creación de Reserva
```
Usuario hace reserva → Estado inicial: "Pendiente" → Admin confirma → 
Backend envía confirmación → Backend programa recordatorios
```

### 3. Recordatorios Automáticos
```
Job verifica cada hora → Encuentra reservas en 2 horas → 
Verifica preferencias → Envía recordatorio → Marca como enviado
```

### 4. Alertas Climáticas
```
Job ejecuta a las 8 AM → Obtiene reservas de mañana → 
Consulta clima → Si hay condiciones adversas → Envía alertas
```

## 🔍 Monitoreo y Logs

### Logs Importantes

```bash
# Inicio del sistema
✅ Sistema de notificaciones programadas iniciado correctamente

# Envío exitoso
✅ Notificación enviada exitosamente

# Recordatorio programado
✅ Recordatorio programado para 2024-12-15T16:00:00.000Z

# Alerta climática
🌧️ Alerta climática enviada para reserva abc123

# Error en token
❌ Token inválido removido de 1 usuarios
```

### Métricas a Monitorear

- Tasa de entrega de notificaciones
- Tokens inválidos y limpiezas
- Ejecución de jobs programados
- Alertas climáticas enviadas

## 🛡️ Consideraciones de Seguridad

### Rate Limiting
- Máximo 1 notificación por minuto por usuario
- Máximo 3 notificaciones de prueba por 5 minutos

### Validación de Tokens
- Verificación de formato de tokens de Expo
- Remoción automática de tokens inválidos

### Permisos
- Solo admins pueden ejecutar jobs manualmente
- Los usuarios solo pueden administrar sus propias notificaciones

## 🔄 Sistema de Reprogramación de Recordatorios

### ¿Por qué es necesario?

Cuando usas `setTimeout` para programar recordatorios, estos se almacenan solo en memoria. Si el servidor se reinicia, todos los recordatorios programados se pierden.

### ¿Cómo funciona?

Al iniciar el servidor:

1. **Consulta reservas futuras**: Busca todas las reservas confirmadas en las próximas 48 horas
2. **Verifica estado**: Omite reservas que ya tienen recordatorio enviado
3. **Obtiene preferencias**: Verifica que el usuario tenga notificaciones habilitadas
4. **Reprograma**: Crea nuevos `setTimeout` para cada recordatorio pendiente

### Logs de Reprogramación

```bash
🔄 Reprogramando recordatorios existentes...
✅ 5 recordatorios reprogramados exitosamente
```

### Consideraciones

- Solo reprograma reservas en las próximas **48 horas**
- Omite reservas con `reminderSent: true`
- Se ejecuta automáticamente al iniciar el servidor
- No envía notificaciones duplicadas

### Para Producción

Para mayor robustez en producción, considera usar:
- **Bull Queue** o **BeeQueue**: Colas persistentes con Redis
- **Agenda**: Sistema de jobs con MongoDB
- **Cloud Functions**: Notificaciones programadas con Firebase

## 🚨 Solución de Problemas

### Notificaciones No Llegan

1. **Verificar Token**
   ```bash
   # El token debe comenzar con "ExponentPushToken["
   node -e "console.log(require('expo-server-sdk').Expo.isExpoPushToken('ExponentPushToken[xxx]'))"
   ```

2. **Verificar Variables de Entorno**
   ```bash
   node -e "console.log('NOTIFICATION_ENABLED:', process.env.NOTIFICATION_ENABLED)"
   node -e "console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Configurada' : 'Faltante')"
   ```

3. **Revisar Logs del Servidor**
   ```bash
   npm start | grep -E "(✅|❌|📱|⏰|🌧️)"
   ```

### Jobs No Se Ejecutan

1. **Verificar que el servidor esté corriendo**
2. **Revisar NOTIFICATION_ENABLED=true**
3. **Ejecutar job manualmente para testing**

### API de Clima No Funciona

1. **Verificar WEATHER_API_KEY válida**
2. **Probar manualmente:**
   ```bash
   curl "https://api.openweathermap.org/data/2.5/weather?q=Buenos Aires&appid=YOUR_KEY&units=metric"
   ```

## 📈 Optimizaciones Futuras

- [ ] Dashboard de monitoreo de notificaciones
- [ ] Plantillas de notificaciones personalizables
- [ ] Integración con más proveedores de clima
- [ ] Analytics de apertura de notificaciones
- [ ] Soporte para múltiples idiomas
- [ ] Notificaciones por WhatsApp/SMS

## 📞 Soporte

Si encuentras algún problema:

1. Revisa los logs del servidor
2. Ejecuta el script de pruebas
3. Verifica la configuración de variables de entorno
4. Contacta al equipo de desarrollo

---

**🎉 ¡Sistema de notificaciones listo para producción!**
