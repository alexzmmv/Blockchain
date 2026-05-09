# CryptoZombies RPG — Setup Guide

## Prerequisites

Make sure you have these installed before starting:

| Tool | Version | Install |
|------|---------|---------|
| Node.js | v18+ | https://nodejs.org |
| pnpm | v8+ | `npm install -g pnpm` |
| MetaMask | Latest | https://metamask.io |
| Git | Any | https://git-scm.com |

---

## 1. Initial Setup

### Clone & install dependencies

```bash
git clone <your-repo-url>
cd Blockchain
pnpm install
pnpm approve-builds   # approve esbuild, keccak, secp256k1 when prompted
```

### Configure your `.env`

Open `.env` in the root and fill in your values:

```env
# Your deployer wallet private key (with 0x prefix)
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Infura Project ID — get from https://infura.io
INFURA_API_KEY=your_infura_project_id

# Etherscan API key — get from https://etherscan.io/myapikey
ETHERSCAN_API_KEY=your_etherscan_api_key

# Sepolia RPC URL (uses your Infura key above)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_infura_project_id

# These are filled in automatically after deployment
CONTRACT_ADDRESS=0x...
PERKS_ADDRESS=0x...
```

> **Warning:** Never commit your `.env` file. It is already in `.gitignore`.

### Compile contracts

```bash
pnpm run compile
```

You should see:
```
Compiled 9 Solidity files successfully (evm target: cancun).
```

---

## 2. Local Deployment

Local deployment uses a temporary in-memory blockchain. **No real ETH needed.**

### Step 1 — Start the local blockchain node

Open **Terminal 1** and run:

```bash
pnpm run node
```

Leave this running. You will see 20 test accounts printed with 10,000 ETH each.

### Step 2 — Deploy contracts

Open **Terminal 2** and run:

```bash
pnpm run deploy:local
```

The output will look like:
```
✓ ZombiePerks deployed to:     0x5FbDB2315678afecb367f032d93F642f64180aa3
✓ ZombieOwnership deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

Update your **root `.env`** with these addresses:
```env
CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
PERKS_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

Update **`frontend/.env`** too:
```env
VITE_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
VITE_PERKS_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### Step 3 — Run tests

```bash
pnpm run test:rpg
```

### Step 4 — Connect MetaMask to local node

1. Open MetaMask → **Add Network**
2. Fill in:
   - **Network name:** `Hardhat Local`
   - **RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency:** `ETH`
3. Import a test account: copy any **Private Key** printed by Terminal 1 (Account #0 is easiest)
4. MetaMask → **Import Account** → paste the private key

### Step 5 — Start the frontend

Open **Terminal 3**:

```bash
cd frontend
pnpm run dev
```

Open **http://localhost:3000** in your browser and click **Connect Wallet**.

### Step 6 — Interact via scripts (optional)

```bash
# Mint a perk to yourself (owner only)
PERKS_ADDRESS=0x... PERK_TYPE=1 pnpm run interact:mintperk

# Equip a perk to your zombie (PERK_TYPE: 1=Fire 2=Water 3=Grass 4=Kitty)
CONTRACT_ADDRESS=0x... PERKS_ADDRESS=0x... ZOMBIE_ID=0 PERK_TYPE=1 pnpm run interact:equipperk

# Attack another zombie
CONTRACT_ADDRESS=0x... ZOMBIE_ID=0 TARGET_ID=1 pnpm run interact:attack

# View your zombie stats and perk inventory
CONTRACT_ADDRESS=0x... PERKS_ADDRESS=0x... pnpm run interact:stats
```

> **Note:** Every time you restart `pnpm run node`, the blockchain resets. You must run `deploy:local` again to get fresh contract addresses.

---

## 3. Sepolia Deployment (Public Testnet)

Sepolia is a public Ethereum testnet. Contracts **persist** after deployment. Real (test) ETH required.

### Step 1 — Set up your wallet

1. Open MetaMask
2. Create a **dedicated deployment account** (do NOT use your main wallet)
3. Go to **Account Details → Export Private Key**
4. Paste it in root `.env`:
   ```env
   PRIVATE_KEY=0xYOUR_METAMASK_PRIVATE_KEY
   ```

### Step 2 — Get Sepolia ETH

Fund your wallet from one of these faucets (you need ~0.05 ETH):

| Faucet | URL |
|--------|-----|
| Google Faucet | https://cloud.google.com/application/web3/faucet/ethereum/sepolia |
| QuickNode | https://faucet.quicknode.com/ethereum/sepolia |
| Alchemy | https://sepoliafaucet.com |

### Step 3 — Configure Infura

1. Go to https://infura.io → create a free account
2. Create a new project → copy the **Project ID**
3. Update root `.env`:
   ```env
   INFURA_API_KEY=your_project_id
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_project_id
   ```

### Step 4 — Deploy to Sepolia

```bash
pnpm run deploy:sepolia
```

The output will print both contract addresses. **Copy and save them.**

Update root `.env`:
```env
CONTRACT_ADDRESS=0xYOUR_ZOMBIE_OWNERSHIP_ADDRESS
PERKS_ADDRESS=0xYOUR_ZOMBIE_PERKS_ADDRESS
```

Update `frontend/.env`:
```env
VITE_CONTRACT_ADDRESS=0xYOUR_ZOMBIE_OWNERSHIP_ADDRESS
VITE_PERKS_ADDRESS=0xYOUR_ZOMBIE_PERKS_ADDRESS
```

### Step 5 — Verify on Etherscan (optional but impressive)

```bash
npx hardhat verify --network sepolia 0xYOUR_ZOMBIE_PERKS_ADDRESS
npx hardhat verify --network sepolia 0xYOUR_ZOMBIE_OWNERSHIP_ADDRESS
```

Contracts will be publicly visible at https://sepolia.etherscan.io.

### Step 6 — Connect MetaMask to Sepolia

MetaMask supports Sepolia by default:
1. Open MetaMask → click the network dropdown
2. Select **Sepolia test network**
3. Make sure you are using the same account you deployed with

### Step 7 — Start the frontend

```bash
cd frontend
pnpm run dev
```

Open **http://localhost:3000** → Connect Wallet. MetaMask must be on **Sepolia**.

---

## 4. Available Commands

| Command | Description |
|---------|-------------|
| `pnpm run compile` | Compile all Solidity contracts |
| `pnpm run test` | Run all tests |
| `pnpm run test:rpg` | Run only the RPG feature tests |
| `pnpm run node` | Start local Hardhat blockchain |
| `pnpm run deploy:local` | Deploy to local node |
| `pnpm run deploy:sepolia` | Deploy to Sepolia testnet |
| `pnpm run interact:stats` | View zombie stats and perk inventory |
| `pnpm run interact:attack` | Attack another zombie |
| `pnpm run interact:mintperk` | Mint a perk token (owner only) |
| `pnpm run interact:equipperk` | Equip a perk to a zombie |
| `pnpm run interact:create` | Create a new zombie |
| `pnpm run interact:get` | List all your zombies |

---

## 5. Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot connect to localhost` | Local node not running | Run `pnpm run node` in a separate terminal first |
| `Calling an account which is not a contract` | Node was restarted without redeploying | Run `pnpm run deploy:local` again |
| `insufficient funds for gas` | Wallet has no ETH on that network | Fund wallet from a faucet |
| `You don't own this perk` | Trying to equip a perk you haven't minted/bought | Mint via `interact:mintperk` or buy in the UI |
| `mcopy not found` | Wrong EVM version in Hardhat config | Ensure `evmVersion: "cancun"` is in `hardhat.config.ts` settings |
| `vite: command not found` | Frontend `node_modules` not installed | Run `pnpm install` from the project root |
| `CONTRACT_ADDRESS not set` | Missing env variable | Add `CONTRACT_ADDRESS=0x...` to your `.env` |
