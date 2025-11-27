# ✅ Checklist de Setup - NorthPadel Backend

Usa este checklist para asegurarte de que todo está configurado correctamente antes de ejecutar el backend en una nueva computadora.

## 📋 Antes de Comenzar

- [ ] Node.js instalado (v16+): `node --version`
- [ ] npm instalado: `npm --version`
- [ ] Git instalado (si vas a clonar): `git --version`

---

## 📥 Instalación

- [ ] Repositorio clonado o descargado
- [ ] Ejecutado `npm install` sin errores
- [ ] Todas las dependencias instaladas correctamente

---

## 🔐 Archivos Críticos

### serviceAccountKey.json
- [ ] Archivo `serviceAccountKey.json` descargado desde Firebase Console
- [ ] Archivo colocado en la raíz del proyecto
- [ ] **VERIFICAR**: El archivo no está en `.gitignore` (debe estar ignorado)

### .env
- [ ] Archivo `.env` creado (copiar desde `.env.example`)
- [ ] `JWT_SECRET` configurado (debe ser un string aleatorio seguro)
- [ ] `CLOUD_NAME` de Cloudinary configurado
- [ ] `API_KEY` de Cloudinary configurado
- [ ] `API_SECRET` de Cloudinary configurado
- [ ] `NOTIFICATION_ENABLED` configurado (true/false)
- [ ] **VERIFICAR**: El archivo `.env` no está en `.gitignore` (debe estar ignorado)

---

## 🔧 Configuración de Firebase

- [ ] Proyecto de Firebase creado
- [ ] Firestore Database habilitado
- [ ] Authentication habilitado (Email/Password y Google)
- [ ] Credenciales de servicio descargadas (`serviceAccountKey.json`)
- [ ] Reglas de seguridad de Firestore configuradas

---

## ☁️ Configuración de Cloudinary

- [ ] Cuenta de Cloudinary creada
- [ ] Cloud Name obtenido
- [ ] API Key obtenido
- [ ] API Secret obtenido
- [ ] Credenciales copiadas al archivo `.env`

---

## 🚀 Primera Ejecución

- [ ] Ejecutar `npm run dev` o `node index.js`
- [ ] Servidor inicia sin errores
- [ ] Mensaje "Servidor corriendo en el puerto 3000" aparece
- [ ] Firebase se conecta correctamente
- [ ] Abrir navegador en `http://localhost:3000` y ver mensaje de bienvenida

---

## 🧪 Pruebas Básicas

- [ ] Probar endpoint de salud: `GET http://localhost:3000/`
- [ ] Probar registro: `POST /api/auth/register`
- [ ] Probar login: `POST /api/auth/login`
- [ ] Verificar que los logs aparezcan en la consola

---

## ⚠️ Problemas Comunes

Si encuentras errores, revisa:

1. **Error "Cannot find module"**
   - Ejecuta `npm install` de nuevo
   - Verifica que `node_modules` exista

2. **Error de Firebase**
   - Verifica que `serviceAccountKey.json` esté en la raíz
   - Verifica que el path en `.env` sea correcto
   - Verifica que Firestore esté habilitado en Firebase Console

3. **Puerto en uso**
   - El puerto 3000 ya está ocupado
   - Agrega `PORT=3001` en `.env` o mata el proceso

4. **Error de Cloudinary**
   - Verifica credenciales en `.env`
   - Asegúrate de no tener espacios extra

---

## 📊 Estado Final

Una vez completado todo:
- [ ] Backend corriendo sin errores
- [ ] Logs mostrándose correctamente
- [ ] Endpoints respondiendo correctamente
- [ ] Firebase conectado
- [ ] Listo para desarrollo/producción

---

**¡Listo! El backend está configurado correctamente. 🎉**
