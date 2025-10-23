# Configuración de Cloudinary - NorthPadel Backend

## Variables de Entorno Requeridas

Asegúrate de tener las siguientes variables en tu archivo `.env`:

```env
CLOUD_NAME=tu_cloud_name
API_KEY=tu_api_key
API_SECRET=tu_api_secret
JWT_SECRET=tu_jwt_secret
```

## Endpoints Implementados

### 1. Generar Firma de Cloudinary (Protegido)
**POST** `/api/admin/generate-cloudinary-signature`

**Headers:**
```json
{
  "Authorization": "Bearer <token_jwt>"
}
```

**Respuesta exitosa (200):**
```json
{
  "timestamp": 1697812345,
  "signature": "a1b2c3d4e5f6...",
  "folder": "northpadel/canchas",
  "api_key": "123456789012345"
}
```

**Uso:** Este endpoint genera una firma segura para que el frontend pueda subir imágenes directamente a Cloudinary de forma segura.

---

### 2. Crear Cancha (Protegido)
**POST** `/api/admin/canchas`

**Headers:**
```json
{
  "Authorization": "Bearer <token_jwt>",
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "nombre": "Cancha 1",
  "precioHora": 5000,
  "imagenUrl": "https://res.cloudinary.com/northpadel/image/upload/v123/northpadel/canchas/cancha1.jpg",
  "descripcion": "Cancha techada con piso de césped sintético de última generación",
  "esTechada": true,
  "vendePelotitas": true
}
```

**Campos:**
- `nombre` (string, requerido): Nombre de la cancha
- `precioHora` (number, requerido): Precio por hora en pesos
- `imagenUrl` (string, requerido): URL de la imagen en Cloudinary
- `descripcion` (string, opcional): Descripción detallada de la cancha
- `esTechada` (boolean, opcional, default: false): Si la cancha está techada
- `vendePelotitas` (boolean, opcional, default: false): Si vende pelotitas

**Respuesta exitosa (201):**
```json
{
  "message": "Cancha creada exitosamente",
  "cancha": {
    "id": "cancha-1697812345678",
    "nombre": "Cancha 1",
    "precioHora": 5000,
    "imagenUrl": "https://res.cloudinary.com/...",
    "descripcion": "Cancha techada con piso de césped sintético...",
    "esTechada": true,
    "vendePelotitas": true,
    "publicada": true
  }
}
```

---

### 3. Obtener Canchas del Complejo (Protegido)
**GET** `/api/admin/canchas`

**Headers:**
```json
{
  "Authorization": "Bearer <token_jwt>"
}
```

**Respuesta exitosa (200):**
```json
[
  {
    "id": "cancha-1697812345678",
    "nombre": "Cancha 1",
    "precioHora": 5000,
    "imagenUrl": "https://res.cloudinary.com/...",
    "descripcion": "Cancha techada...",
    "esTechada": true,
    "vendePelotitas": true,
    "publicada": true
  }
]
```

---

### 4. Cambiar Estado de Publicación (Protegido)
**PUT** `/api/admin/canchas/:canchaId/toggle-status`

**Headers:**
```json
{
  "Authorization": "Bearer <token_jwt>",
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "publicada": false
}
```

**Respuesta exitosa (200):**
```json
{
  "message": "Estado de la cancha actualizado exitosamente."
}
```

---

## Flujo de Trabajo Completo

1. **Autenticación:** El admin inicia sesión y obtiene un token JWT
2. **Solicitar firma:** Llama a `/api/admin/generate-cloudinary-signature` para obtener los parámetros de firma
3. **Subir imagen:** El frontend usa los parámetros para subir la imagen directamente a Cloudinary
4. **Crear cancha:** Con la URL de la imagen devuelta por Cloudinary, llama a `/api/admin/canchas` para crear la cancha
5. **Gestionar canchas:** Puede listar y cambiar el estado de publicación de las canchas

## Seguridad

- Todos los endpoints están protegidos con el middleware `protect` que valida el JWT
- La firma de Cloudinary se genera en el backend usando el API_SECRET, nunca se expone al frontend
- Solo administradores con `complejoId` asignado pueden crear canchas
