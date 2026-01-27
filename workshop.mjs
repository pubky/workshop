#!/usr/bin/env node

// Un CLI diminuto del taller del Pubky SDK, con muchísimos comentarios.
//
// Objetivos (de punta a punta):
// 1) Registrar un usuario nuevo en un homeserver (con un código de invitación).
// 2) Guardar el secreto semilla del usuario localmente (archivo de recuperación cifrado).
// 3) Restaurar ese secreto más tarde e iniciar sesión (cookie de sesión + búsqueda en PKDNS).
// 4) Escribir datos en el Pubkyverso (almacenamiento público bajo /pub/...).
// 5) Obtener datos públicos de otro usuario desde su homeserver.
//
// Este script es intencionalmente verboso. Cada paso explica qué ocurre
// por debajo y por qué es ✨ extremadamente genial ✨ en un mundo descentralizado.
//
// Herramientas extra para aprender (muy recomendadas):
// - PKDNS Digger: https://pkdns.net/ → inspecciona registros PKDNS/PKARR y confirma
//   a qué homeserver resuelve una identidad pubky.
// - Pubky Explorer: https://explorer.pubky.app/ → explora datos públicos almacenados en
//   homeservers usando enlaces pubky (ideal para verificar escrituras públicas).

import {
  Pubky,
  Keypair,
  PublicKey,
  setLogLevel,
} from "@synonymdev/pubky";
import { access, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { callout, divider, info, explorerUrl, pkdnsUrl } from "./utils.mjs";

const DEFAULT_RECOVERY_FILE = "./pubky.recovery";
const DEFAULT_WRITE_PATH = "/pub/pubky-workshop/hello.json";

/**
 * Parsear argumentos triviales del CLI (sin dependencias; mantener el taller liviano).
 * Flags soportados:
 *   --homeserver <pubky>
 *   --invite <code>
 *   --recovery <path>
 *   --passphrase <pass>
 *   --other <pubky>[/abs/path]
 *   --log <error|warn|info|debug|trace>
 */
function parseArgs(argv) {
  const args = new Map();
  const flags = new Set();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args.set(key, next);
      i += 1;
    } else {
      flags.add(key);
    }
  }
  return { args, flags };
}

function usage() {
  return `\
Uso:
  node workshop.mjs [--homeserver <z32>] [--invite <code>] \
    [--recovery <path>] [--passphrase <pass>] [--other <pubky>/<path>] [--log <level>]

Ejemplos:
  node workshop.mjs --homeserver <z32> --invite INVITE-123 --other pubky<z32>/pub/app/file.txt

Consejos:
  - Puedes definir PUBKY_PASSPHRASE en el entorno para evitar el prompt.
`;
}

async function prompt(question, fallback = "") {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(question);
    return answer.trim() || fallback;
  } finally {
    rl.close();
  }
}

async function readFileUint8(path) {
  const buf = await readFile(path);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const { args, flags } = parseArgs(process.argv.slice(2));

  if (flags.has("help")) {
    console.log(usage());
    return;
  }

  
  // 0) Opcional: subir el nivel de logging del SDK antes de crear cualquier objeto Pubky.
  // Esto muestra trazas de requests, búsquedas PKDNS y logs del lado de WASM.
  const logLevel = args.get("log") ?? null;
  if (logLevel) {
    setLogLevel(logLevel);
  }

  // 1) Inicializar la fachada del SDK (relays de mainnet + dominios reales de clave pública).
  const pubky = new Pubky();
  divider("Pubky Workshop CLI: un mini tour por identidad + datos descentralizados");
  callout(
    "Vamos a crear (o restaurar) una identidad criptográfica, iniciar sesión sin contraseñas, escribir datos públicos y leerlos de vuelta desde cualquier homeserver."
  );

  // 2) Manejo del archivo de recuperación: este es nuestro secreto raíz cifrado.
  // Si existe, restauramos el Keypair desde ahí. Si no, creamos
  // un par de claves totalmente nuevo y lo ciframos en un archivo de recuperación.
  const recoveryPath = resolve(args.get("recovery") ?? DEFAULT_RECOVERY_FILE);
  let keypair;

  const hasRecovery = await fileExists(recoveryPath);
  const passphrase =
    args.get("passphrase") ??
    process.env.PUBKY_PASSPHRASE ??
    (await prompt("Passphrase de recuperación (se mostrará): "));

  if (hasRecovery) {
    // Restaurar una identidad existente.
    const recoveryBytes = await readFileUint8(recoveryPath);
    keypair = Keypair.fromRecoveryFile(recoveryBytes, passphrase);
    divider("Paso 1/5  Restaura tu identidad");
    info("Archivo de recuperación:", recoveryPath);
    callout("Tu keypair sigue siendo tuyo. Solo almacenamos un secreto cifrado localmente.");
  } else {
    // Si el archivo no existe, crear una identidad nueva.
    divider("Paso 1/5  Crea una identidad nueva");
    info("Archivo de recuperación:", recoveryPath);
    info("Estado:", "No se encontró archivo de recuperación. Creando uno...");

    keypair = Keypair.random();

    // createRecoveryFile() cifra la clave secreta con tu passphrase.
    const recoveryFile = keypair.createRecoveryFile(passphrase);
    await writeFile(recoveryPath, recoveryFile);

    info("Guardado:", "Archivo de recuperación cifrado escrito.");
    callout(
      "Esta es tu raíz de confianza. Cualquiera con este secreto puede actuar como tú  ¡mantenlo seguro!"
    );
  }

  // 3) Vincula el keypair a un Signer. Este es el actor que puede firmar AuthTokens,
  // aprobar flujos de auth y crear sesiones autenticadas.
  const signer = pubky.signer(keypair);
  divider("Paso 2/5  Presenta tu identidad Pubky");
  info("Identificador de usuario (pubky):", keypair.publicKey.toString());
  info("URL de consulta PKDNS:", pkdnsUrl(keypair.publicKey.z32()));
  callout(
    "Tu clave pública ES tu nombre de usuario. No hace falta un registro central, y funciona en todas partes."
  );

  // 4) Elegir un homeserver: el servidor que alojará nuestros datos personales y
  // emitirá cookies de sesión. En Pubky, los homeservers también se identifican por
  // claves públicas (la identidad propia del servidor).
  const homeserverInput = args.get("homeserver") ?? "";
  divider("Paso 3/5  Elige un homeserver");

  const existingHomeserver = await signer.pkdns.getHomeserver();
  let homeserver = existingHomeserver ?? null;

  if (existingHomeserver) {
    info("Homeserver existente encontrado vía PKDNS:", existingHomeserver.toString());
    if (homeserverInput && homeserverInput !== existingHomeserver.toString()) {
      info("Nota:", "Usando el homeserver de PKDNS y omitiendo el signup.");
    }
  } else {
    const homeserverString = homeserverInput
      ? homeserverInput
      : await prompt("Clave pública del homeserver (<z32>): ");

    if (!homeserverString) {
      console.error("Falta el homeserver. Proporciona --homeserver.");
      console.error(usage());
      process.exit(1);
    }

    homeserver = PublicKey.from(homeserverString);
    info("Clave pública del homeserver (z32):", homeserver.z32());
    callout(
      "Los homeservers también se identifican por claves públicas. Eso significa que puedes verificar con quién estás hablando sin DNS tradicional ni certificados de CA."
    );
  }

  // 5) Hacer signup solo si todavía no tenemos un homeserver publicado.
  // - El código de invitación es opcional en algunos homeservers; obligatorio en otros.
  // - El SDK también publica un registro PKARR _pubky después del signup, mapeando
  //   la clave pública del usuario al homeserver elegido.
  divider("Paso 4/5  Signup (solo si hace falta)");
  if (existingHomeserver) {
    info("Acción:", "Signup omitido (el usuario ya existe).");
  } else {
    const inviteCode = args.get("invite") ?? (await prompt("Código de invitación: "));
    info("Código de invitación:", inviteCode ? inviteCode : "(ninguno)");
    info("Acción:", "Haciendo signup (crea el usuario + la sesión).");
    const signupSession = await signer.signup(homeserver, inviteCode || null);
    info("Signup completado para:", signupSession.info.publicKey.toString());
    callout(
      "El SDK publica un registro _pubky para que cualquiera pueda resolver tu homeserver a partir de tu clave pública."
    );
  }

  // 6) Signin: demostrar que controlamos la clave raíz y pedir al homeserver una nueva
  // sesión. El SDK resuelve el homeserver del usuario vía PKDNS/PKARR, y luego
  // hace el request autenticado a /session.
  info("Acción:", "Haciendo signin (consulta PKDNS + intercambio /session).");
  const session = await signer.signinBlocking();
  info("Signin exitoso. Capabilities:", session.info.capabilities);
  callout(
    "Sin contraseñas, sin redirección OAuth. Solo criptografía demostrando que controlas la clave."
  );

  // 7) Escribir datos en el Pubkyverso. Usamos /pub/ para que cualquiera pueda leerlo.
  // SessionStorage usa la cookie automáticamente; no hacen falta headers de auth manuales.
  const payload = {
    message: "¡Hola desde el CLI del taller de Pubky!",
    timestamp: new Date().toISOString(),
    user: session.info.publicKey.toString(),
  };

  divider("Paso 5/5  Escribe datos públicos + léelos de vuelta");
  info("Escribiendo JSON en:", DEFAULT_WRITE_PATH);
  await session.storage.putJson(DEFAULT_WRITE_PATH, payload);
  callout("Esta escritura se autentica con tu cookie de sesión y capabilities.");

  // 8) Obtener nuestros propios datos de vuelta públicamente para demostrar que la escritura es visible.
  // PublicStorage usa URIs direccionadas: pubky<user>/pub/...
  const selfAddress = `${session.info.publicKey.toString()}${DEFAULT_WRITE_PATH}`;
  info("Leyendo de vuelta vía almacenamiento público:", selfAddress);
  info("URL de Pubky Explorer:", explorerUrl(selfAddress));
  const roundtrip = await pubky.publicStorage.getJson(selfAddress);
  info("Lectura pública OK:", JSON.stringify(roundtrip, null, 2));
  callout(
    "Cualquiera puede obtener contenido público directamente desde tu homeserver  no hace falta un gateway central."
  );

  // 9) Obtener datos de otro usuario (lectura pública). Esto demuestra que cualquier app
  // puede leer datos públicos sin una sesión, mientras tenga el pubky del usuario.
  const otherResource =
    args.get("other") ??
    (await prompt(
      "Recurso de otro usuario (pubky<z32>/pub/... o vacío para omitir): ",
      "",
    ));

  if (otherResource) {
    divider("Bonus  Obtener datos públicos de otro usuario");
    info("Obteniendo recurso:", otherResource);
    const otherText = await pubky.publicStorage.getText(otherResource);
    info("Contenido del otro usuario (texto):", otherText);
    callout("Este es el superpoder de los datos abiertos: cualquier app puede leer datos públicos por pubky.");
  } else {
    info("Lectura de otro usuario:", "Omitida.");
  }

  divider("Taller completo");
  console.log("✅ Ahora tienes una identidad Pubky, una sesión activa y datos públicos.");
  callout("Tu identidad es portable, tus datos son direccionables y tus apps son descentralizables.");
}

main().catch((error) => {
  console.error("\n❌ El taller falló:", error);
  process.exit(1);
});

