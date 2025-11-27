# 🎾 NorthPadel Backend

Backend API para la aplicación de reservas de canchas de pádel NorthPadel.

## 📋 Tabla de Contenidos

- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Ejecución](#ejecución)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Endpoints Disponibles](#endpoints-disponibles)
- [Solución de Problemas](#solución-de-problemas)

---

## 🔧 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (versión 16 o superior) - [Descargar aquí](https://nodejs.org/)
- **npm** (viene con Node.js)
- **Git** (para clonar el repositorio)
- Una cuenta de **Firebase** con Firestore configurado
- Una cuenta de **Cloudinary** (para subida de imágenes)

---

## 📦 Instalación

### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/NorthPadel-Backend.git
cd NorthPadel-Backend
```

### 2. Instalar Dependencias

```bash
npm install
```

Esto instalará todas las dependencias necesarias especificadas en `package.json`:
- express
- firebase-admin
- cors
- dotenv
- bcryptjs
- jsonwebtoken
- cloudinary
- expo-server-sdk
- axios
- joi
- node-cron

---

## ⚙️ Configuración

### 1. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto copiando el archivo `.env.example`:

```bash
cp .env.example .env
```

Luego edita el archivo `.env` con tus propias credenciales:

```env
# Firebase
GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"

# Cloudinary
CLOUD_NAME=tu_cloud_name
API_KEY=tu_api_key
API_SECRET=tu_api_secret

# JWT
JWT_SECRET=tu_secreto_jwt_muy_seguro_aqui

# Notificaciones Push
NOTIFICATION_ENABLED=true

# API de Clima (Opcional)
WEATHER_API_KEY=tu_openweather_api_key

# Expo (Opcional)
EXPO_ACCESS_TOKEN=tu_expo_access_token
```

### 2. Configurar Firebase

1. Ve a la [Consola de Firebase](https://console.firebase.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **Configuración del proyecto** > **Cuentas de servicio**
4. Haz clic en **Generar nueva clave privada**
5. Descarga el archivo JSON y **renómbralo como `serviceAccountKey.json`**
6. **Coloca el archivo `serviceAccountKey.json` en la raíz del proyecto**

> ⚠️ **IMPORTANTE**: Nunca subas `serviceAccountKey.json` a Git. Ya está incluido en `.gitignore`.

### 3. Configurar Cloudinary

1. Ve a [Cloudinary](https://cloudinary.com/) y crea una cuenta
2. En el Dashboard, encontrarás:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
3. Copia estos valores al archivo `.env`

### 4. Generar JWT Secret

Genera un secreto seguro para JWT:

```bash
# En Windows (PowerShell)
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# En Linux/Mac
openssl rand -base64 32
```

Copia el resultado y pégalo en `JWT_SECRET` en el archivo `.env`.

---

## 🚀 Ejecución

### Modo Desarrollo (con auto-reload)

```bash
npm run dev
```

Esto iniciará el servidor con `nodemon`, que reiniciará automáticamente cuando detecte cambios en los archivos.

### Modo Producción

```bash
node index.js
```

El servidor se ejecutará en `http://localhost:3000` por defecto.

Para cambiar el puerto, puedes agregar `PORT=XXXX` en tu archivo `.env`.

---

## 📁 Estructura del Proyecto

```
NorthPadel-Backend/
├── config/
│   └── firebase.js           # Configuración de Firebase
├── controllers/
│   ├── admin.controller.js   # Controladores de admin
│   ├── auth.controller.js    # Controladores de autenticación
│   ├── canchas.controller.js # Controladores de canchas públicas
│   ├── reservas.controller.js# Controladores de reservas
│   └── users.controller.js   # Controladores de usuarios
├── middlewares/
│   └── authMiddleware.js     # Middleware de autenticación JWT
├── repositories/
│   ├── complejos.repository.js
│   └── users.repository.js   # Acceso a datos de usuarios
├── routes/
│   ├── admin.js              # Rutas de administración
│   ├── auth.js               # Rutas de autenticación
│   ├── canchas.js            # Rutas públicas de canchas
│   ├── notifications.js      # Rutas de notificaciones
│   ├── reservas.js           # Rutas de reservas
│   └── users.js              # Rutas de perfil de usuario
├── services/
│   ├── admin/                # Servicios de admin
│   ├── auth/                 # Servicios de autenticación
│   ├── reservas/             # Servicios de reservas
│   └── users/                # Servicios de usuarios
├── .env                      # Variables de entorno (NO SUBIR A GIT)
├── .env.example              # Ejemplo de variables de entorno
├── .gitignore                # Archivos ignorados por Git
├── index.js                  # Punto de entrada principal
├── package.json              # Dependencias y scripts
├── serviceAccountKey.json    # Credenciales de Firebase (NO SUBIR A GIT)
└── README.md                 # Este archivo
```

---

## 🌐 Endpoints Disponibles

### Autenticación
- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/google-login` - Login con Google

### Canchas Públicas (sin autenticación)
- `GET /api/canchas` - Listar todos los complejos
- `GET /api/canchas/:complejoId/:canchaId?fecha=YYYY-MM-DD` - Detalle de cancha

### Reservas (requiere autenticación)
- `GET /api/reservas` - Listar reservas del usuario
- `POST /api/reservas` - Crear nueva reserva
- `PUT /api/reservas/:id/confirm` - Confirmar reserva (admin)
- `PUT /api/reservas/:id/cancel` - Cancelar reserva

### Perfil de Usuario (requiere autenticación)
- `GET /api/users/profile` - Obtener perfil del usuario
- `PUT /api/users/profile` - Actualizar perfil
- `POST /api/users/upload-signature` - Obtener firma de Cloudinary

### Admin - Canchas (requiere rol admin)
- `GET /api/admin/canchas` - Listar canchas del complejo
- `POST /api/admin/canchas` - Crear cancha
- `PUT /api/admin/canchas/:canchaId` - Actualizar cancha
- `DELETE /api/admin/canchas/:canchaId` - Eliminar cancha
- `PUT /api/admin/canchas/:canchaId/toggle-status` - Activar/desactivar cancha
- `PATCH /api/admin/canchas/:canchaId` - Actualización parcial
- `POST /api/admin/canchas/:canchaId/bloquear` - Bloquear horario
- `POST /api/admin/canchas/:canchaId/desbloquear` - Desbloquear horario
- `GET /api/admin/canchas/:canchaId/disponibilidad?fecha=YYYY-MM-DD` - Ver disponibilidad

### Admin - Reservas (requiere rol admin)
- `GET /api/admin/reservas` - Listar todas las reservas
- `PUT /api/admin/reservas/:reservaId/confirmar` - Confirmar reserva
- `PUT /api/admin/reservas/:reservaId/cancelar` - Cancelar reserva
- `GET /api/admin/reservas/:reservaId/diagnostico` - Diagnóstico de reserva

### Admin - Perfil
- `GET /api/admin/perfil-complejo` - Obtener info del complejo

---

## 🔧 Solución de Problemas

### Error: "Cannot find module './serviceAccountKey.json'"

**Solución**: Asegúrate de haber descargado el archivo de credenciales de Firebase y colocarlo en la raíz del proyecto con el nombre exacto `serviceAccountKey.json`.

### Error: "PORT 3000 is already in use"

**Solución**: 
1. Cambia el puerto en `.env`:
   ```env
   PORT=3001
   ```
2. O detén el proceso que está usando el puerto 3000:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # Linux/Mac
   lsof -ti:3000 | xargs kill
   ```

### Error: "Firebase configuration error"

**Solución**: 
1. Verifica que `serviceAccountKey.json` sea válido
2. Asegúrate de que `GOOGLE_APPLICATION_CREDENTIALS` en `.env` apunte al archivo correcto
3. Verifica que Firebase Firestore esté habilitado en tu proyecto

### Error: "Cloudinary upload failed"

**Solución**: 
1. Verifica que las credenciales de Cloudinary en `.env` sean correctas
2. Asegúrate de que `CLOUD_NAME`, `API_KEY` y `API_SECRET` estén configurados

### El servidor no responde

**Solución**:
1. Verifica que el servidor esté corriendo: `npm run dev`
2. Verifica que no haya errores en la consola
3. Prueba con: `curl http://localhost:3000` o abre en el navegador
4. Revisa tu firewall o antivirus

---

## 📝 Notas Adicionales

### Seguridad

- **NUNCA** subas los archivos `.env` o `serviceAccountKey.json` a Git
- Cambia `JWT_SECRET` en producción a un valor seguro y único
- Usa HTTPS en producción
- Configura CORS apropiadamente para tu dominio en producción

### Desarrollo

- Los logs de todas las peticiones se muestran en la consola
- Usa `npm run dev` durante el desarrollo para auto-reload
- Revisa la consola para ver errores detallados

### Base de Datos (Firebase Firestore)

Colecciones principales:
- `users` - Usuarios del sistema
- `complejos` - Complejos deportivos
- `reservas` - Reservas de canchas

---

## 🤝 Contribuir

1. Crea un nuevo branch: `git checkout -b feature/nueva-funcionalidad`
2. Haz commit de tus cambios: `git commit -m 'Agregar nueva funcionalidad'`
3. Push al branch: `git push origin feature/nueva-funcionalidad`
4. Abre un Pull Request

---

## 📄 Licencia

Este proyecto es privado y no tiene licencia pública.

---

## 👥 Autor

**Proyecto NorthPadel**

---

## 📞 Soporte

Si tienes problemas, revisa la sección [Solución de Problemas](#solución-de-problemas) o contacta al equipo de desarrollo.
