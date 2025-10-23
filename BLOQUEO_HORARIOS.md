# Sistema de Bloqueo de Horarios - NorthPadel Backend

## 📋 Descripción General

El sistema permite a los administradores bloquear horarios específicos de canchas, impidiendo que los usuarios creen reservas en esos slots. Los bloqueos son independientes de las reservas y se gestionan de forma separada.

---

## 🎯 Casos de Uso

### ¿Cuándo bloquear un horario?

- 🔧 **Mantenimiento programado** de la cancha
- 🎪 **Eventos especiales** o torneos
- 🌧️ **Condiciones climáticas** adversas
- 👥 **Reserva del complejo** para uso privado
- 🚧 **Reparaciones** o mejoras en instalaciones

---

## 🔄 Tipos de Bloqueos

| Tipo | Descripción | Visualización |
|------|-------------|---------------|
| **Reservas Confirmadas** | Horarios ocupados por usuarios | Gris/Ocupado |
| **Bloqueos Administrativos** | Horarios bloqueados por el admin | Rojo/Bloqueado |

---

## 📡 Endpoints Implementados

### 1. Bloquear Horario

**POST** `/api/admin/canchas/:canchaId/bloquear`

**Headers:**
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Parámetros de Ruta:**
- `canchaId`: ID de la cancha a bloquear

**Body:**
```json
{
  "fecha": "2025-10-23",
  "hora": "14:00"
}
```

**Respuesta (200):**
```json
{
  "message": "Horario bloqueado exitosamente",
  "fecha": "2025-10-23",
  "hora": "14:00"
}
```

**Validaciones:**
- ✅ Solo admin puede bloquear
- ✅ Admin debe tener complejoId asignado
- ✅ Cancha debe existir en el complejo
- ✅ No se crean bloqueos duplicados

**Errores:**
- **400**: Fecha u hora no proporcionados
- **403**: Admin no válido o sin complejo
- **404**: Cancha no encontrada
- **500**: Error interno del servidor

---

### 2. Desbloquear Horario

**POST** `/api/admin/canchas/:canchaId/desbloquear`

**Headers:**
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Parámetros de Ruta:**
- `canchaId`: ID de la cancha a desbloquear

**Body:**
```json
{
  "fecha": "2025-10-23",
  "hora": "14:00"
}
```

**Respuesta (200):**
```json
{
  "message": "Horario desbloqueado exitosamente",
  "fecha": "2025-10-23",
  "hora": "14:00"
}
```

**Validaciones:**
- ✅ Solo admin puede desbloquear
- ✅ Admin debe tener complejoId asignado
- ✅ Cancha debe existir en el complejo

**Errores:**
- **400**: Fecha u hora no proporcionados
- **403**: Admin no válido o sin complejo
- **404**: Cancha no encontrada
- **500**: Error interno del servidor

---

### 3. Consultar Disponibilidad (Admin)

**GET** `/api/admin/canchas/:canchaId/disponibilidad?fecha=YYYY-MM-DD`

**Headers:**
```
Authorization: Bearer {admin_token}
```

**Query Parameters:**
- `fecha`: Fecha a consultar (formato YYYY-MM-DD)

**Respuesta (200):**
```json
{
  "horariosReservados": ["10:00", "14:00", "18:00"],
  "horariosBloqueados": ["12:00", "16:00", "20:00"]
}
```

**Descripción:**
- `horariosReservados`: Horas con reservas **Confirmadas**
- `horariosBloqueados`: Horas bloqueadas por el admin

---

### 4. Consultar Disponibilidad (Usuario/Público)

**GET** `/api/canchas/:complejoId/:canchaId?fecha=YYYY-MM-DD`

**Query Parameters:**
- `fecha`: Fecha a consultar (formato YYYY-MM-DD)

**Respuesta (200):**
```json
{
  "id": "cancha-xxx",
  "nombre": "Cancha 1",
  "precioHora": "2000",
  "imagenUrl": "https://...",
  "horaInicio": "08:00",
  "horaFin": "23:00",
  "complejoNombre": "North Padel",
  "caracteristicas": ["Techada", "Blindex", "Iluminación LED"],
  "horariosReservados": ["10:00", "14:00"],
  "horariosBloqueados": ["12:00", "16:00"]
}
```

**Campos Clave:**
- `horariosReservados`: Array de horas con reservas confirmadas
- `horariosBloqueados`: Array de horas bloqueadas por admin

---

## 📊 Estructura de Datos en Firestore

### Colección: `complejos`

Cada cancha dentro del array `canchas` puede tener un campo `bloqueos`:

```javascript
{
  id: "complejo-xxx",
  nombre: "North Padel",
  canchas: [
    {
      id: "cancha-xxx",
      nombre: "Cancha 1",
      precioHora: "2000",
      imagenUrl: "https://...",
      horaInicio: "08:00",
      horaFin: "23:00",
      publicada: true,
      // Array de bloqueos
      bloqueos: [
        {
          fecha: "2025-10-23",
          hora: "12:00"
        },
        {
          fecha: "2025-10-23",
          hora: "16:00"
        },
        {
          fecha: "2025-10-24",
          hora: "14:00"
        }
      ]
    }
  ]
}
```

**Nota:** El campo `bloqueos` se crea automáticamente cuando se agrega el primer bloqueo.

---

## 🔍 Lógica de Disponibilidad

### Frontend: Construcción de Slots Disponibles

```javascript
// 1. Obtener datos de la cancha
const { horaInicio, horaFin, horariosReservados, horariosBloqueados } = canchaDetalle;

// 2. Generar todos los horarios posibles
const todosLosHorarios = generarHorarios(horaInicio, horaFin); // ["08:00", "09:00", ...]

// 3. Filtrar horarios disponibles
const horariosDisponibles = todosLosHorarios.filter(hora => {
  const estaReservado = horariosReservados.includes(hora);
  const estaBloqueado = horariosBloqueados.includes(hora);
  
  return !estaReservado && !estaBloqueado;
});

// 4. Marcar estado de cada horario para visualización
const horariosConEstado = todosLosHorarios.map(hora => {
  if (horariosBloqueados.includes(hora)) {
    return { hora, estado: 'bloqueado', color: 'red' };
  }
  if (horariosReservados.includes(hora)) {
    return { hora, estado: 'reservado', color: 'gray' };
  }
  return { hora, estado: 'disponible', color: 'green' };
});
```

---

## 🎨 Visualización en el Frontend

### Para Usuarios (Vista de Reserva)

```
Horarios Disponibles para el 23/10/2025

08:00 ✅ Disponible
09:00 ✅ Disponible
10:00 ⚫ Reservado
11:00 ✅ Disponible
12:00 🚫 No disponible (bloqueado)
13:00 ✅ Disponible
14:00 ⚫ Reservado
15:00 ✅ Disponible
16:00 🚫 No disponible (bloqueado)
```

### Para Administradores (Panel de Admin)

```
Gestión de Horarios - Cancha 1 - 23/10/2025

08:00 [ Disponible ] [Bloquear]
09:00 [ Disponible ] [Bloquear]
10:00 [ Reservado  ] (Juan Pérez) [Cancelar]
11:00 [ Disponible ] [Bloquear]
12:00 [ BLOQUEADO ] [Desbloquear]
13:00 [ Disponible ] [Bloquear]
14:00 [ Reservado  ] (María García) [Cancelar]
15:00 [ Disponible ] [Bloquear]
16:00 [ BLOQUEADO ] [Desbloquear]
```

---

## 🔄 Flujo de Trabajo Completo

### Escenario: Admin bloquea un horario para mantenimiento

```
1. Admin accede al panel de gestión de canchas
   └─> Selecciona "Cancha 1"
   └─> Selecciona fecha: 2025-10-23

2. Ve los horarios disponibles y reservados
   └─> 14:00 está disponible
   └─> Hace clic en "Bloquear"

3. POST /api/admin/canchas/cancha-xxx/bloquear
   └─> Body: { fecha: "2025-10-23", hora: "14:00" }
   └─> Se agrega a array bloqueos de la cancha

4. El horario 14:00 ahora aparece como "BLOQUEADO"
   └─> Los usuarios NO pueden reservar ese slot
   └─> Aparece en rojo en la vista de usuarios

5. Después del mantenimiento, admin desbloquea
   └─> POST /api/admin/canchas/cancha-xxx/desbloquear
   └─> Se elimina del array bloqueos
   └─> Horario vuelve a estar disponible
```

---

## ✅ Validaciones Implementadas

### Al Bloquear:
- ✅ Verifica autenticación y rol admin
- ✅ Valida que existan fecha y hora
- ✅ Verifica que la cancha pertenezca al complejo del admin
- ✅ Previene bloqueos duplicados
- ✅ Crea campo `bloqueos` si no existe

### Al Desbloquear:
- ✅ Verifica autenticación y rol admin
- ✅ Valida que existan fecha y hora
- ✅ Verifica que la cancha pertenezca al complejo del admin
- ✅ Elimina solo el bloqueo específico (fecha + hora)

### Al Consultar Disponibilidad:
- ✅ Filtra bloqueos solo para la fecha solicitada
- ✅ Devuelve arrays separados (reservados vs bloqueados)
- ✅ Las reservas Pendientes no aparecen como ocupadas

---

## 🚀 Ejemplos de Uso

### Ejemplo 1: Bloquear Múltiples Horarios para Torneo

```bash
# Bloquear toda la tarde del sábado para torneo
curl -X POST http://localhost:3000/api/admin/canchas/cancha-123/bloquear \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fecha": "2025-10-25", "hora": "14:00"}'

curl -X POST http://localhost:3000/api/admin/canchas/cancha-123/bloquear \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fecha": "2025-10-25", "hora": "15:00"}'

curl -X POST http://localhost:3000/api/admin/canchas/cancha-123/bloquear \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fecha": "2025-10-25", "hora": "16:00"}'
```

### Ejemplo 2: Consultar Disponibilidad

```bash
# Ver disponibilidad de una cancha
curl -X GET "http://localhost:3000/api/admin/canchas/cancha-123/disponibilidad?fecha=2025-10-25" \
  -H "Authorization: Bearer TOKEN"

# Respuesta:
{
  "horariosReservados": ["10:00", "11:00"],
  "horariosBloqueados": ["14:00", "15:00", "16:00"]
}
```

### Ejemplo 3: Desbloquear Después del Evento

```bash
# Desbloquear horarios después del torneo
curl -X POST http://localhost:3000/api/admin/canchas/cancha-123/desbloquear \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fecha": "2025-10-25", "hora": "14:00"}'
```

---

## 📝 Diferencias: Bloqueos vs Reservas

| Característica | Reservas | Bloqueos |
|----------------|----------|----------|
| **Creado por** | Usuarios | Solo Admin |
| **Propósito** | Reservar cancha para jugar | Impedir reservas temporalmente |
| **Estados** | Pendiente/Confirmada/Cancelada | Activo/Inactivo |
| **Gestión** | Admin confirma/cancela | Admin bloquea/desbloquea |
| **Visibilidad** | Visible en "Mis Reservas" | Solo visible en disponibilidad |
| **Datos asociados** | Usuario, precio, etc. | Solo fecha y hora |
| **Almacenamiento** | Colección `reservas` | Array `bloqueos` en cancha |

---

## 🔐 Seguridad

- ✅ Solo administradores pueden bloquear/desbloquear
- ✅ Admin solo puede gestionar canchas de su complejo
- ✅ Validación de autenticación en todos los endpoints
- ✅ Validación de pertenencia de cancha al complejo

---

## 💡 Recomendaciones

### Para Administradores:
1. **Bloquear con anticipación**: Planificar bloqueos para eventos con tiempo
2. **Comunicar bloqueos**: Informar a usuarios sobre horarios no disponibles
3. **Desbloquear a tiempo**: Liberar horarios cuando ya no sean necesarios
4. **Revisar regularmente**: Verificar bloqueos antiguos y eliminarlos

### Para el Sistema:
1. **Implementar notificaciones**: Alertar a usuarios cuando se bloquea un horario que intentaban reservar
2. **Historial de bloqueos**: Mantener registro de bloqueos pasados para análisis
3. **Bloqueos masivos**: Crear interfaz para bloquear múltiples horarios a la vez
4. **Plantillas de bloqueo**: Guardar patrones comunes (ej: "todos los lunes de 12-14")

---

## 🎯 Próximos Pasos (Mejoras Futuras)

- [ ] Endpoint para bloqueos masivos (múltiples horarios de una vez)
- [ ] Campo "motivo" en bloqueos para documentar la razón
- [ ] Bloqueos recurrentes (ej: todos los lunes)
- [ ] Historial de bloqueos (auditoría)
- [ ] Notificaciones automáticas cuando se bloquea un horario
- [ ] Dashboard con estadísticas de bloqueos

---

## 📞 Soporte

Para dudas o problemas con el sistema de bloqueo de horarios, contactar al equipo de desarrollo.

**Última actualización:** 22 de Octubre, 2025
