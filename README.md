# De cero a Pubky: tu primera aplicación Pubky.

¡Bienvenido/a! Este repo es el material de apoyo para un taller en vivo donde programamos una app pequeña juntos usando el cliente JavaScript **pubky-sdk**.

Proveeremos:

- Un homeserver Pubky hosteado para el taller.
- Códigos de invitación a ese homeserver.

Este README contiene todo lo que necesitas para seguir el taller.

---

## Objetivos del taller

Al final de la sesión vas a:

- Inicializar un proyecto JavaScript usando el cliente pubky-sdk.
- Conectarte a un homeserver Pubky.
- Autenticarte con un código de invitación.
- Construir una app pequeñita que lee y escribe datos de usuario.
- Entregar una demo funcional que puedas extender después del taller.

¿Quieres explorar identidades Pubky y datos públicos mientras aprendes? Prueba estos:

- **PKDNS Digger**: https://pkdns.net/ inspecciona registros PKDNS/PKARR para ver
  a qué homeserver resuelve una identidad Pubky.
- **Pubky Explorer**: https://explorer.pubky.app/ navega datos públicos en
  homeservers usando enlaces Pubky (útil para validar los datos que vas a escribir publicamente).

---

## Material

- **[Pubky SDK npm.js](https://www.npmjs.com/package/@synonymdev/pubky/v/0.6.0)**
- Tu **[código de invitación](https://docs.google.com/spreadsheets/d/1QQFcFnzZP7V3eNFbTF6iZAdjMxPBGqExHYmmibmRjdw/edit?gid=0#gid=0)** : escoge un codigo de este Google Sheet y eliminalo para evitar que otros usen un codigo invalido.
- **Identidad del Homeserver de practicas:**: `ufibwbmed6jeq9k4p583go95wofakh9fwpp4k734trq79pd9u1uy`
- **[Diapositivas de la presentación](https://docs.google.com/presentation/d/1r5CW8erOf5mRWnjreVpIveTtMVPFCmi7A5ES4pLH_2o/edit?slide=id.p15#slide=id.p15)**

Requisitos previos:

- **Node.js** 22+
- **npm**

---

## Inicio rápido

> Toma el id del homeserver y el código de desde [este Google Doc](https://docs.google.com/spreadsheets/d/1QQFcFnzZP7V3eNFbTF6iZAdjMxPBGqExHYmmibmRjdw/edit?gid=0#gid=0).

1. **Clona este repo**

   ```bash
   git clone <this-repo-url>
   cd pubky-workshop
   ```

2. **Instala las dependencias**

   ```bash
   npm install
   ```

3. **Ejecuta el CLI del taller**

   ```bash
   npm run workshop -- --homeserver pubky<z32> --invite INVITE-123
   ```

   Flags opcionales:
   - `--recovery ./path/to/file.recovery` (persistir/reutilizar tu par de claves cifrado)
   - `--passphrase "your passphrase"` o `PUBKY_PASSPHRASE=...` (evitar prompts)
   - `--other pubky<z32>/pub/app/file.txt` (obtener datos públicos de otro usuario)
   - `--log debug` (habilitar logs del SDK)

---

## Qué estamos construyendo

Una app pequeñita que:

- Registra a un usuario nuevo en un homeserver existente usando un código de invitación.
- Guarda y restaura tu secreto de ID.
- Inicia sesión en el homeserver.
- Te permite escribir datos en Pubky.
- Obtiene datos de otros usuarios usando URLs Pubky.

---

## Código de conducta

Sé amable, haz preguntas y ayúdense entre ustedes. 💜

---

## Licencia

Este material del taller está licenciado bajo MIT.
