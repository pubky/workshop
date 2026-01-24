# From Zero to Pubky: Your First Pubky Application.

Welcome! This repo is the companion for a live workshop where we code a small app together using the **pubky-sdk** JavaScript client.

We will provide:

- A hosted Pubky homeserver for the workshop.
- Invitation codes for attendees.

This README contains everything you need to follow along.

---

## Workshop goals

By the end of the session you will:

- Initialize a JavaScript project using the pubky-sdk client.
- Connect to a hosted Pubky homeserver.
- Authenticate with an invitation code.
- Build a tiny app that reads and writes user data.
- Ship a working demo you can extend after the workshop.

Want to explore Pubky identities and public data while you learn? Try these:

- **PKDNS Digger**: https://pkdns.net/ inspect PKDNS/PKARR records to see
  which homeserver a Pubky identity resolves to.
- **Pubky Explorer**: https://explorer.pubky.app/ browse public data on
  homeservers using Pubky links (helpful for validating your public writes).

---

## Prerequisites

- **Node.js** 22+ (LTS recommended)
- **npm**
- Your **invite code** (provided at the workshop)

---

## Quick start

> The instructor will provide the homeserver id and invite code during the session.

1. **Clone this repo**

   ```bash
   git clone <this-repo-url>
   cd pubky-workshop
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run the workshop CLI**

   ```bash
   npm run workshop -- --homeserver pubky<z32> --invite INVITE-123
   ```

   Optional flags:
   - `--recovery ./path/to/file.recovery` (persist/reuse your encrypted keypair)
   - `--passphrase "your passphrase"` or `PUBKY_PASSPHRASE=...` (avoid prompts)
   - `--other pubky<z32>/pub/app/file.txt` (fetch another user's public data)
   - `--log debug` (enable SDK logs)

---

## What we are building

A tiny app that:

- Signs up a new user on an existing homeserver using an invite code.  
- Stores and restores your ID secret.  
- Signs in to the homeserver.  
- Lets you write data to the Pubky verse.  
- Fetches other users’ data from their homeservers.  

---

## Code of conduct

Be kind, ask questions, and help each other. 💜

---

## License

This workshop material is licensed under MIT.
