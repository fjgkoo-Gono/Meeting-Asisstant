# Cómo crear un APK con EAS Build

## Requisitos previos

1. **Cuenta en Expo** — créala en [expo.dev](https://expo.dev) (gratis)
2. **EAS CLI** ya está instalado en el entorno Replit (`eas-cli`)

---

## Paso 1 — Iniciar sesión en Expo

```bash
cd artifacts/meeting-mobile
eas login
```

Ingresa tu email y contraseña de expo.dev.

---

## Paso 2 — Vincular el proyecto a tu cuenta Expo

```bash
eas project:init
```

Esto crea un proyecto en tu cuenta de Expo y guarda el `extra.eas.projectId` en `app.json` automáticamente.

---

## Paso 3 — Configurar la URL del API

En `eas.json`, reemplaza `REPLACE_WITH_YOUR_API_DOMAIN` con el dominio de tu API desplegada.

**Ejemplo:** si tu API está en `https://mi-api.replit.app`, escribe solo el dominio:

```json
"EXPO_PUBLIC_DOMAIN": "mi-api.replit.app"
```

Haz esto en los tres perfiles (`development`, `preview`, `production`).

> **Nota:** Para que el APK funcione fuera del entorno Replit, la API debe estar desplegada (publicada). Ve a la sección "API Server" en Replit y pulsa **Deploy**.

---

## Paso 4 — Crear el APK

### APK de prueba (instalable directamente en Android)

```bash
cd artifacts/meeting-mobile
eas build --platform android --profile preview
```

El build tarda ~10–15 minutos en los servidores de Expo. Al terminar recibes un enlace de descarga del APK.

### Bundle para Play Store (AAB)

```bash
eas build --platform android --profile production
```

---

## Perfiles disponibles

| Perfil | Tipo | Uso |
|--------|------|-----|
| `development` | APK debug | Para desarrollo con Expo Dev Client |
| `preview` | APK release | Para pruebas en dispositivos reales |
| `production` | AAB release | Para subir a Google Play Store |

---

## Instalar el APK en un teléfono Android

1. Descarga el `.apk` desde el enlace que te da Expo al terminar el build
2. Envíalo al teléfono (WhatsApp, Drive, cable USB, etc.)
3. Abre el archivo en Android — puede pedir permiso para instalar apps de fuentes desconocidas
4. Acepta e instala

---

## Solución de problemas comunes

- **"Android package name already taken"** → Cambia `package` en `app.json` a algo único, ej. `com.tuempresa.meetingassistant`
- **La app abre pero no carga datos** → Verifica que `EXPO_PUBLIC_DOMAIN` apunta a la API desplegada (no a `localhost`)
- **Error de certificado / keystore** → En el primer build, EAS genera y guarda el keystore automáticamente en sus servidores
