# Onchain Daily Jackpot

This project contains the frontend application and backend management scripts for the Onchain Daily Jackpot smart contract on MerlinChain.

## Project Structure

- `/index.html`: The main entry point for the web application.
- `/index.tsx`: The core React application logic and UI.
- `/constants.tsx`: Shared constants like the contract address, ABI, and network details.
- `/scripts/`: Contains Node.js scripts for managing the smart contract.
  - `deploy.ts`: Script to deploy a new version of the contract.
  - `settle.ts`: The automated "Keeper" script that continuously settles draws.
- `Dockerfile` & `docker-compose.yml`: Files for professional, 24/7 deployment.

---

## Owner Quick Start: Local Testing

To run the keeper on your local machine for testing.

### 1. First-Time Setup

You only need to do this once.

**A. Create Environment File**

Create a new file named `.env` in the root of the project. Copy the contents of `.env.example` into it and add your wallet's private key.

```
# .env
MERLIN_RPC_URL="https://testnet-rpc.merlinchain.io"
PRIVATE_KEY="YOUR_WALLET_PRIVATE_KEY_HERE"
```

**WARNING:** Never share your `.env` file or commit it to version control. It contains sensitive information.

**B. Install Dependencies**

Open your terminal in the project directory and run:

```bash
npm install
```

### 2. Run the Keeper Locally

```bash
npm run keeper
```

---

## Achieving 24/7 Uptime: The Professional Way

For a real, live application, you cannot run the keeper script on your personal computer. It needs to run on a server that is always on and connected to the internet.

To make this incredibly simple, this project includes a professional setup using **Docker**. This packages the keeper script into a self-contained unit that can be deployed anywhere.

### How to Deploy Your Unstoppable Keeper

Follow these steps on a cloud server (e.g., from DigitalOcean, Vultus, AWS, etc.).

**1. Install Docker on Your Server**

First, you need to install Docker and Docker Compose on your server. [Follow the official Docker instructions for your server's operating system](https://docs.docker.com/engine/install/).

**2. Copy Project Files**

Copy all the project files from your computer to your server.

**3. Create the `.env` File**

On the server, create the `.env` file and add your `MERLIN_RPC_URL` and `PRIVATE_KEY`, just like you did for local testing.

**4. Start the Keeper**

Navigate to your project directory on the server and run this single command:

```bash
docker-compose up --build -d
```

That's it. Your keeper is now running in the background. It will automatically restart if your server reboots, ensuring your jackpot is always settled on time.

To check the logs of your running keeper, you can use `docker-compose logs -f`.
