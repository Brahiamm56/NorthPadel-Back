# 🔥 Índices de Firestore Requeridos

## ⚠️ IMPORTANTE
El sistema de notificaciones requiere estos índices para funcionar. Los jobs están **temporalmente desactivados** hasta que los crees.

---

## 📋 Índices a Crear

### **Índice 1: Recordatorios Pendientes**
**Para:** Query de recordatorios cada hora

```
Collection: reservas
Fields:
  - fechaHora (Ascending)
  - estado (Ascending)
Query scope: Collection
```

### **Índice 2: Reservas Próximas**
**Para:** Query de reservas inminentes (< 30 min)

```
Collection: reservas
Fields:
  - fechaHora (Ascending)
  - estado (Ascending)
  - imminentNotificationSent (Ascending)
Query scope: Collection
```

### **Índice 3: Reprogramación de Recordatorios** (Opcional si no usas ordenamiento)
**Para:** Reprogramar recordatorios al reiniciar servidor

```
Collection: reservas
Fields:
  - estado (Ascending)
  - fechaHora (Ascending)
Query scope: Collection
```

---

## 🚀 Cómo Crear los Índices

### **Método 1: Usar el Enlace del Error (Más Rápido)**

Cuando ejecutas el código y sale el error, copia el enlace que aparece:

```
https://console.firebase.google.com/v1/r/project/northpadel-5a21e/firestore/indexes?create_composite=...
```

1. Pega el enlace en tu navegador
2. Click en **"Create"**
3. Espera 1-2 minutos

### **Método 2: Crear Manualmente**

1. **Ir a Firebase Console:**
   https://console.firebase.google.com/project/northpadel-5a21e/firestore/indexes

2. **Click en "Create Index"**

3. **Para cada índice:**
   - Collection ID: `reservas`
   - Add fields según la tabla de arriba
   - Query scope: `Collection`
   - Click **"Create"**

4. **Esperar a que se construyan** (1-3 minutos cada uno)
   - Estado: "Building" → "Enabled"

---

## ✅ Después de Crear los Índices

1. **Descomentar el código en `jobs/notificationJobs.js`:**

```javascript
// Línea 20: Descomentar
instance.reprogramarRecordatoriosAlIniciar();

// Línea 26: Descomentar
await instance.checkPendingReminders();

// Línea 52: Descomentar
await instance.checkUpcomingReservas();
```

2. **Reiniciar el servidor:**
```bash
npm run dev
```

3. **Verificar logs:**
```
✅ X recordatorios reprogramados exitosamente
✅ Jobs programados iniciados
```

---

## 🧪 Probar que Funcionan

### **Test 1: Crear una Reserva**
```bash
POST /api/reservas
# Deberías recibir confirmación inmediata
```

### **Test 2: Verificar Recordatorio Manual**
```bash
# En el código, puedes ejecutar manualmente:
const jobs = NotificationJobs.start();
await jobs.runJobManually('reminders');
```

---

## 📊 Estado Actual

| Job | Estado | Requiere Índice |
|-----|--------|-----------------|
| Reprogramación inicial | ❌ Desactivado | ✅ Sí |
| Recordatorios cada hora | ❌ Desactivado | ✅ Sí |
| Clima diario | ✅ Activo | ❌ No |
| Limpieza tokens | ✅ Activo | ❌ No |
| Reservas próximas | ❌ Desactivado | ✅ Sí |

---

## 🐛 Troubleshooting

### Error: "The query requires an index"
**Solución:** Usa el enlace del error o crea el índice manualmente

### Los índices no aparecen
**Solución:** Espera 2-3 minutos. Pueden tardar en construirse.

### El índice está en "Building"
**Solución:** Espera. No reinicies el proceso.

### El índice falló
**Solución:** 
1. Elimina el índice fallido
2. Créalo de nuevo
3. Verifica que los nombres de campos sean exactos

---

## 🔗 Enlaces Útiles

- **Firebase Console:** https://console.firebase.google.com/project/northpadel-5a21e
- **Firestore Indexes:** https://console.firebase.google.com/project/northpadel-5a21e/firestore/indexes
- **Documentación:** https://firebase.google.com/docs/firestore/query-data/indexing

---

✅ Una vez creados los índices, el sistema de notificaciones funcionará completamente!
