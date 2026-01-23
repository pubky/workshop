#!/usr/bin/env node

// A tiny, heavily-commented Pubky SDK workshop CLI.
//
// Goals (end-to-end):
// 1) Signup a new user on a homeserver (with an invite code).
// 2) Store the user's root secret locally (encrypted recovery file).
// 3) Restore that secret later and sign in (session cookie + PKDNS lookup).
// 4) Write data into the Pubky verse (public storage under /pub/...).
// 5) Fetch another user's public data from their homeserver.
//
// This script is intentionally verbose. Each step explains what happens
// under the hood and why it's ✨ supremely cool ✨ in a decentralized world.
//
// Extra learning tools (highly recommended):
// - PKDNS Digger: https://pkdns.net/ → inspect PKDNS/PKARR records and confirm
//   where a pubky identity resolves its homeserver.
// - Pubky Explorer: https://explorer.pubky.app/ → browse public data stored on
//   homeservers using pubky links (great for verifying public writes).

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
import { callout, divider, info } from "./utils.mjs";

const DEFAULT_RECOVERY_FILE = "./pubky.recovery";
const DEFAULT_WRITE_PATH = "/pub/pubky-workshop/hello.json";

/**
 * Parse trivial CLI args (no deps; keep the workshop lightweight).
 * Supported flags:
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
Usage:
  node workshop.mjs [--homeserver <z32>] [--invite <code>] \
    [--recovery <path>] [--passphrase <pass>] [--other <pubky>/<path>] [--log <level>]

Examples:
  node workshop.mjs --homeserver <z32> --invite INVITE-123 --other pubky<z32>/pub/app/file.txt

Tips:
  - You can set PUBKY_PASSPHRASE in the environment to avoid prompting.
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

  // 0) Optional: dial up SDK logging before any Pubky objects are created.
  // This surfaces request traces, PKDNS lookups, and WASM-side logs.
  const logLevel = args.get("log") ?? null;
  if (logLevel) {
    setLogLevel(logLevel);
  }

  // 1) Initialize the SDK facade (mainnet relays + real public-key domains).
  const pubky = new Pubky();
  divider("Pubky Workshop CLI: a tiny tour of decentralized identity + data");
  callout(
    "We will create (or restore) a cryptographic identity, sign in without passwords, write public data, and read it back from any homeserver."
  );

  // 2) Recovery file handling: this is our encrypted root secret.
  // If it exists, we restore the Keypair from it. If not, we create
  // a brand-new keypair and encrypt it into a recovery file.
  const recoveryPath = resolve(args.get("recovery") ?? DEFAULT_RECOVERY_FILE);
  let keypair;

  const hasRecovery = await fileExists(recoveryPath);
  const passphrase =
    args.get("passphrase") ??
    process.env.PUBKY_PASSPHRASE ??
    (await prompt("Recovery passphrase (will be echoed): "));

  if (hasRecovery) {
    // Restore an existing identity.
    const recoveryBytes = await readFileUint8(recoveryPath);
    keypair = Keypair.fromRecoveryFile(recoveryBytes, passphrase);
    divider("Step 1/5  Restore your identity");
    info("Recovery file:", recoveryPath);
    callout("Your keypair stays yours. We only store an encrypted secret locally.");
  } else {
    // If the file doesn't exist, create a new identity.
    divider("Step 1/5  Create a new identity");
    info("Recovery file:", recoveryPath);
    info("Status:", "No recovery file found. Creating one...");

    keypair = Keypair.random();

    // createRecoveryFile() encrypts the secret key with your passphrase.
    const recoveryFile = keypair.createRecoveryFile(passphrase);
    await writeFile(recoveryPath, recoveryFile);

    info("Saved:", "Encrypted recovery file written.");
    callout(
      "This is your root of trust. Anyone with this secret can act as you  keep it safe!"
    );
  }

  // 3) Bind the keypair to a Signer. This is the actor that can sign AuthTokens,
  // approve auth flows, and create authenticated sessions.
  const signer = pubky.signer(keypair);
  divider("Step 2/5  Introduce your Pubky identity");
  info("User identifier (pubky):", keypair.publicKey.toString());
  callout(
    "Your public key IS your username. No central registry required, and it works everywhere."
  );

  // 4) Pick a homeserver: the server that will host our personal data and
  // issue session cookies. In Pubky, homeservers are also identified by
  // public keys (the server's own identity).
  const homeserverInput = args.get("homeserver") ?? "";
  divider("Step 3/5  Choose a homeserver");

  const existingHomeserver = await signer.pkdns.getHomeserver();
  let homeserver = existingHomeserver ?? null;

  if (existingHomeserver) {
    info("Existing homeserver found via PKDNS:", existingHomeserver.toString());
    if (homeserverInput && homeserverInput !== existingHomeserver.toString()) {
      info("Note:", "Using PKDNS homeserver and skipping signup.");
    }
  } else {
    const homeserverString = homeserverInput
      ? homeserverInput
      : await prompt("Homeserver public key (<z32>): ");

    if (!homeserverString) {
      console.error("Missing homeserver. Provide --homeserver.");
      console.error(usage());
      process.exit(1);
    }

    homeserver = PublicKey.from(homeserverString);
    info("Homeserver public key (z32):", homeserver.z32());
    callout(
      "Homeservers are identified by public keys too. That means you can verify who you are talking to without traditional DNS or CA certificates."
    );
  }

  // 5) Signup only if we don't already have a homeserver published.
  // - The invite code is optional on some homeservers; required on others.
  // - The SDK also publishes a _pubky PKARR record after signup, mapping our
  //   user public key to the chosen homeserver.
  divider("Step 4/5  Signup (only if needed)");
  if (existingHomeserver) {
    info("Action:", "Signup skipped (user already exists).");
  } else {
    const inviteCode = args.get("invite") ?? (await prompt("Invite code: "));
    info("Invite code:", inviteCode ? inviteCode : "(none)");
    info("Action:", "Signing up (creates the user + session).");
    const signupSession = await signer.signup(homeserver, inviteCode || null);
    info("Signup completed for:", signupSession.info.publicKey.toString());
    callout(
      "The SDK publishes a _pubky record so anyone can resolve your homeserver from your public key."
    );
  }

  // 6) Signin: prove we control the root key and ask the homeserver for a new
  // session. The SDK resolves the user's homeserver via PKDNS/PKARR, and then
  // makes the authenticated /session request.
  info("Action:", "Signing in (PKDNS lookup + /session exchange).");
  const session = await signer.signinBlocking();
  info("Signin successful. Capabilities:", session.info.capabilities);
  callout(
    "No passwords, no OAuth redirect. Just cryptography proving you control the key."
  );

  // 7) Write data into the Pubky verse. We use /pub/ so anyone can read it.
  // SessionStorage uses the cookie automatically; no manual auth headers needed.
  const payload = {
    message: "Hello from the Pubky workshop CLI!",
    timestamp: new Date().toISOString(),
    user: session.info.publicKey.toString(),
  };

  divider("Step 5/5  Write public data + read it back");
  info("Writing JSON to:", DEFAULT_WRITE_PATH);
  await session.storage.putJson(DEFAULT_WRITE_PATH, payload);
  callout("This write is authenticated with your session cookie and scoped capabilities.");

  // 8) Fetch our own data back publicly to prove the write is visible.
  // PublicStorage uses addressed URIs: pubky<user>/pub/...
  const selfAddress = `${session.info.publicKey.toString()}${DEFAULT_WRITE_PATH}`;
  info("Reading back via public storage:", selfAddress);
  const roundtrip = await pubky.publicStorage.getJson(selfAddress);
  info("Public read success:", JSON.stringify(roundtrip, null, 2));
  callout(
    "Anyone can fetch public content directly from your homeserver  no central gateway required."
  );

  // 9) Fetch another user's data (public read). This demonstrates that any app
  // can read public data without a session, as long as it has the user's pubky.
  const otherResource =
    args.get("other") ??
    (await prompt(
      "Other user resource (pubky<z32>/pub/... or blank to skip): ",
      "",
    ));

  if (otherResource) {
    divider("Bonus  Fetch another user's public data");
    info("Fetching resource:", otherResource);
    const otherText = await pubky.publicStorage.getText(otherResource);
    info("Other user content (text):", otherText);
    callout("This is the open-data superpower: any app can read public data by pubky.");
  } else {
    info("Other-user fetch:", "Skipped.");
  }

  divider("Workshop complete");
  console.log("✅ You now have a Pubky identity, a live session, and public data on-chain.");
  callout("Your identity is portable, your data is addressable, and your apps are decentralizable.");
}

main().catch((error) => {
  console.error("\n❌ Workshop failed:", error);
  process.exit(1);
});
