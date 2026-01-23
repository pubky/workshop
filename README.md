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

---

## Workshop flow

<!--
**0–5 min: Setup**

- Install dependencies
- Add homeserver URL + invite code
- Start the dev server

**5–15 min: Connect with pubky-sdk**

- Initialize the client
- Create or join a user session

**15–30 min: Build the app**

- Read user profile data
- Write a small entry (e.g., a status or note)

**30–40 min: Add polish**

- Handle loading + error states
- Add a simple UI improvement

**40–45 min: Wrap up**

- Share where to go next
- Q&A -->

---

## What we are building

A tiny app that:

- Signup a new user to an existing homeserver with an invite code.
- Stores and restores your id secret.
- Signin into the homeserver.
- Lets you write data into the pubky verse.
- Fetches other users data from their homeserver.

---

## Code of conduct

Be kind, ask questions, and help each other. 💜

---

## License

This workshop material is licensed under MIT.
