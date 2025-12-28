# Onchain Daily Jackpot

This project contains the frontend application and backend management scripts for the Onchain Daily Jackpot smart contract on MerlinChain.

## Project Structure

- `/index.html`: The main entry point for the web application.
- `/index.tsx`: The core React application logic and UI.
- `/constants.tsx`: Shared constants like the contract address, ABI, and network details.
- `/scripts/`: Contains Node.js scripts for managing the smart contract.
  - `deploy.ts`: Script to deploy a new version of the contract.
  - `settle.ts`: The automated "Keeper" script that continuously settles draws.

---

## Owner Quick Start: Automating Draws

To fully automate the settlement process, you will run the Keeper script. This script runs forever, checking every minute to see if a draw needs to be settled.

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

### 2. Start the Automation Keeper

To start the automated process, run the following command in your terminal:

```bash
npm run keeper
```

The script will now run continuously.

**IMPORTANT:** For the automation to work, this script must be left running 24/7. You should run this command in a terminal on a server or a computer that is always on and connected to the internet. For production use, consider tools like `pm2` or `screen` to manage the process.
