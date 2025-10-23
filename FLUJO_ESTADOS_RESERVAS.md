# Flujo de Estados de Reservas - NorthPadel Backend

## 📋 Descripción General

El sistema implementa un flujo de estados donde las reservas se crean como **"Pendiente"** y el administrador las confirma manualmente. Solo las reservas **"Confirmadas"** bloquean horarios.

---

## 🔄 Estados de Reserva

| Estado | Descripción | Bloquea Horario |
|--------|-------------|-----------------|
| **Pendiente** | Reserva creada por usuario, esperando confirmación del admin | ❌ NO |
| **Confirmada** | Reserva confirmada por el administrador | ✅ SÍ |
| **Cancelada** | Reserva cancelada por el administrador o usuario | ❌ NO |

---

## 🛣️ Flujo Completo

```
1. Usuario crea reserva
   └─> Estado: "Pendiente"
   └─> Horario queda DISPONIBLE para otros usuarios

2. Admin ve reserva en panel
   └─> Aparece como "Pendiente"

3. Admin confirma reserva
   └─> Estado cambia a: "Confirmada"
   └─> Horario ahora queda BLOQUEADO
   └─> Se registra: confirmedBy, confirmedAt

4. Usuario ve su reserva confirmada
   └─> Puede ver todos los detalles
```

---

## 📡 Endpoints Actualizados

### 1. Crear Reserva (Usuario)

**POST** `/api/reservas`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "complejoId": "complejo-xxx",
  "canchaId": "cancha-xxx",
  "fecha": "2025-10-23",
  "hora": "14:00"
}
```

**Respuesta (201):**
```json
{
  "id": "reserva-xxx",
  "complejoId": "complejo-xxx",
  "canchaId": "cancha-xxx",
  "canchaNombre": "Cancha 1",
  "canchaImagenUrl": "https://...",
  "fecha": "2025-10-23",
  "hora": "14:00",
  "estado": "Pendiente",
  "usuarioId": "user-xxx",
  "usuarioNombre": "Juan Pérez",
  "usuarioEmail": "juan@example.com",
  "createdAt": "2025-10-22T...",
  "updatedAt": "2025-10-22T...",
  "message": "Reserva creada exitosamente. Pendiente de confirmación del administrador."
}
```

**Validaciones:**
- ✅ Verifica que complejo y cancha existan
- ✅ Solo bloquea si hay reserva **Confirmada** en ese horario
- ✅ Permite crear si solo hay reservas Pendientes o Canceladas
- ✅ Estado por defecto: "Pendiente"

---

### 2. Confirmar Reserva (Admin)

**PUT** `/api/admin/reservas/:reservaId/confirmar`

**Headers:**
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Respuesta (200):**
```json
{
  "id": "reserva-xxx",
  "estado": "Confirmada",
  "confirmedBy": "admin-uid",
  "confirmedAt": "2025-10-22T...",
  "updatedAt": "2025-10-22T...",
  "...demás campos de la reserva...",
  "message": "Reserva confirmada exitosamente."
}
```

**Validaciones:**
- ✅ Solo admin puede confirmar
- ❌ No se puede confirmar si está Cancelada
- ❌ No se puede confirmar si está Completada
- ❌ No se puede confirmar si ya está Confirmada

---

### 3. Cancelar Reserva (Admin)

**PUT** `/api/admin/reservas/:reservaId/cancelar`

**Headers:**
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Body (Opcional):**
```json
{
  "motivo": "Cliente solicitó cancelación"
}
```

**Respuesta (200):**
```json
{
  "id": "reserva-xxx",
  "estado": "Cancelada",
  "canceledBy": "admin-uid",
  "canceledAt": "2025-10-22T...",
  "motivo": "Cliente solicitó cancelación",
  "updatedAt": "2025-10-22T...",
  "...demás campos...",
  "message": "Reserva cancelada exitosamente."
}
```

**Validaciones:**
- ✅ Solo admin puede cancelar
- ❌ No se puede cancelar si está Completada
- ❌ No se puede cancelar si ya está Cancelada

---

### 4. Listar Reservas (Admin)

**GET** `/api/admin/reservas`

**Query Parameters (Opcionales):**
- `fecha`: Filtrar por fecha (YYYY-MM-DD)
- `estado`: Filtrar por estado (Pendiente|Confirmada|Cancelada)

**Ejemplos:**
```
GET /api/admin/reservas
GET /api/admin/reservas?fecha=2025-10-23
GET /api/admin/reservas?estado=Pendiente
GET /api/admin/reservas?fecha=2025-10-23&estado=Confirmada
```

**Respuesta (200):**
```json
[
  {
    "id": "reserva-1",
    "estado": "Pendiente",
    "fecha": "2025-10-23",
    "hora": "14:00",
    "usuarioNombre": "Juan Pérez",
    "canchaNombre": "Cancha 1",
    "canchaImagenUrl": "https://...",
    "...demás campos..."
  },
  {
    "id": "reserva-2",
    "estado": "Confirmada",
    "confirmedBy": "admin-uid",
    "confirmedAt": "2025-10-22T...",
    "...demás campos..."
  }
]
```

---

### 5. Consultar Disponibilidad (Público/Admin)

**GET** `/api/canchas/:complejoId/:canchaId?fecha=YYYY-MM-DD`  
**GET** `/api/admin/canchas/:canchaId/disponibilidad?fecha=YYYY-MM-DD`

**Respuesta (200):**
```json
{
  "id": "cancha-xxx",
  "nombre": "Cancha 1",
  "horaInicio": "08:00",
  "horaFin": "23:00",
  "horariosOcupados": ["10:00", "14:00", "18:00"],
  "...demás campos..."
}
```

**Importante:**
- ✅ Solo devuelve horarios de reservas **Confirmadas**
- ✅ Las reservas Pendientes NO aparecen como ocupadas
- ✅ Las reservas Canceladas NO aparecen como ocupadas

---

## 📊 Estructura de Datos en Firestore

### Colección: `reservas`

```javascript
{
  // Identificación
  id: "auto-generated",
  
  // Información de la reserva
  complejoId: "complejo-xxx",
  canchaId: "cancha-xxx",
  canchaNombre: "Cancha 1",
  canchaImagenUrl: "https://...",
  fecha: "2025-10-23",
  hora: "14:00",
  
  // Estado (IMPORTANTE)
  estado: "Pendiente" | "Confirmada" | "Cancelada",
  
  // Información del usuario
  usuarioId: "user-xxx",
  usuarioNombre: "Juan Pérez",
  usuarioEmail: "juan@example.com",
  
  // Auditoría
  createdAt: Timestamp,
  updatedAt: Timestamp,
  
  // Campos de confirmación (si está confirmada)
  confirmedBy: "admin-uid",
  confirmedAt: Timestamp,
  
  // Campos de cancelación (si está cancelada)
  canceledBy: "admin-uid",
  canceledAt: Timestamp,
  motivo: "string"
}
```

---

## 🔍 Índices Recomendados en Firestore

Para optimizar las consultas, crear estos índices compuestos:

1. **Disponibilidad de canchas:**
   - `canchaId` + `fecha` + `estado` (ASC, ASC, ASC)

2. **Reservas del usuario:**
   - `usuarioId` + `fecha` (ASC, DESC)

3. **Reservas del admin:**
   - `complejoId` + `fecha` + `estado` (ASC, DESC, ASC)

---

## ✅ Validaciones Implementadas

### Al Crear Reserva:
- ✅ Verifica que la cancha existe
- ✅ Verifica que no hay otra reserva **Confirmada** en ese horario
- ✅ Permite crear si solo hay reservas Pendientes o Canceladas
- ✅ Usa estado "Pendiente" por defecto

### Al Confirmar Reserva:
- ✅ Solo admin puede confirmar
- ✅ No se puede confirmar una reserva Cancelada
- ✅ No se puede confirmar una reserva Completada
- ✅ No se puede confirmar una reserva ya Confirmada
- ✅ Verifica que la reserva pertenece al complejo del admin

### Al Consultar Disponibilidad:
- ✅ Solo devolver horarios de reservas Confirmadas
- ✅ Las Pendientes no bloquean el horario para otros usuarios
- ✅ Las Canceladas no bloquean el horario

---

## 🎯 Casos de Uso

### Caso 1: Usuario Reserva un Horario

1. Usuario selecciona cancha, fecha y hora
2. Sistema verifica que no haya reserva **Confirmada** en ese horario
3. Se crea reserva con estado "Pendiente"
4. Horario sigue DISPONIBLE para otros usuarios
5. Usuario recibe notificación: "Reserva pendiente de confirmación"

### Caso 2: Admin Confirma Reserva

1. Admin ve lista de reservas Pendientes
2. Admin hace clic en "Confirmar"
3. Sistema actualiza estado a "Confirmada"
4. Horario ahora queda BLOQUEADO
5. Usuario recibe notificación: "Tu reserva ha sido confirmada"

### Caso 3: Múltiples Usuarios Reservan el Mismo Horario

1. Usuario A crea reserva → Estado: Pendiente
2. Usuario B ve el horario como DISPONIBLE
3. Usuario B también crea reserva → Estado: Pendiente
4. Admin confirma reserva de Usuario A → Estado: Confirmada
5. Sistema intenta confirmar reserva de Usuario B → ERROR: Horario ocupado
6. Admin debe cancelar reserva de Usuario B

---

## 🚨 Manejo de Conflictos

Si dos usuarios crean reservas Pendientes para el mismo horario:

1. El admin DEBE confirmar solo UNA
2. La otra debe ser CANCELADA con motivo claro
3. Se recomienda implementar notificaciones para informar al usuario

**Recomendación:** Implementar sistema de "primera reserva confirmada" en el frontend del admin.

---

## 📝 Notas Importantes

- Los estados usan **PascalCase**: "Pendiente", "Confirmada", "Cancelada"
- Los timestamps usan **camelCase**: `createdAt`, `updatedAt`, `confirmedAt`, `canceledAt`
- Los campos de auditoría usan sufijo "By": `confirmedBy`, `canceledBy`
- Todas las fechas deben estar en formato **ISO 8601**
- Las horas deben estar en formato **HH:MM** (24 horas)

---

## 🔐 Seguridad

- ✅ Todos los endpoints requieren autenticación (middleware `protect`)
- ✅ Los endpoints de admin verifican rol y complejoId
- ✅ Las reservas solo pueden ser confirmadas/canceladas por el admin del complejo correspondiente
- ✅ Los usuarios solo pueden ver sus propias reservas

---

## 📞 Soporte

Para dudas o problemas con el flujo de reservas, contactar al equipo de desarrollo.

**Última actualización:** 22 de Octubre, 2025
