# Deployment Guide

This guide covers deploying the CryptoZombies smart contracts to different networks.

## 🎮 Game Rules & Features Reference

### Level Requirements
| Action | Min Level | Cost |
|--------|-----------|------|
| Create Zombie | 1 | Free |
| Level Up | Any | 0.001 ETH |
| Change Name | 2+ | Free |
| Mutate DNA | 20+ | Free |
| Battle | Any | Free |
| Equip Perk | Any | Free |

### DNA & Zombie Types
- Zombie type determined by **last 2 digits** of 16-digit DNA
- Types: Fire 🔥 (00-32) | Water 💧 (33-65) | Grass 🌿 (66-98) | Kitty 🐱 (99)
- Type advantages: Fire > Grass > Water > Fire
- Perks (1-4) boost battle win probability

---

## Environment Variables

Your deployment configuration is controlled by the `.env` file at the root of the project.

```env
# Network RPC URL for Sepolia
SEPOLIA_RPC_URL=https://rpc.sepolia.ethpandaops.io

# Your deployer wallet private key (DO NOT commit real keys!)
PRIVATE_KEY=your_private_key_here

# Etherscan API key for contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## Local Hardhat Node Deployment

For development, deploying to a local, persistent node is recommended so you can test frontend integrations easily.

1. **Start the local node:**
   Open a new terminal and run:
   ```bash
   npm run node
   ```
   *Keep this terminal running.*

2. **Deploy the contracts:**
   In another terminal, run:
   ```bash
   npm run deploy:local
   ```
   
   The output will show the deployed addresses. Copy them into your `.env` file like this:
   ```env
   CONTRACT_ADDRESS=0x5DA0e41C7C189aE52201CDf26eA9Ed4b7b448E10
   PERKS_ADDRESS=0xFC401F45Daf6C78Bs555833bCCD1Ae61181f63ad
   MOCK_KITTIES_ADDRESS=0x192b2C06047F45B01392280E5C17b129C9C6C722
   ```

## Testnet (Sepolia) Deployment

When you're ready to test in a live environment, deploy to the Sepolia testnet.

1. **Get Sepolia ETH:**
   Ensure the wallet corresponding to your `PRIVATE_KEY` has enough Sepolia ETH. You can use faucets like the Alchemy Sepolia Faucet.

2. **Run the deployment script:**
   ```bash
   npm run deploy:sepolia
   ```

3. **Update your `.env` file:**
   Take the new contract addresses from the console output and replace the `CONTRACT_ADDRESS`, `PERKS_ADDRESS`, and `MOCK_KITTIES_ADDRESS` in your `.env` file. 

## Mainnet Deployment

If you are ready for production, you must first uncomment the `mainnet` block inside `hardhat.config.ts`. You will also need to add a `MAINNET_RPC_URL` to your `.env` file.

1. Add your real ETH private key to `.env` (Be extremely careful).
2. Run deployment targeting mainnet:
   ```bash
   npx hardhat run scripts/deploy.ts --network mainnet
   ```

## Verifying Contracts on Etherscan

Verification makes your smart contract source code public on Etherscan, allowing users to interact directly through the Etherscan interface.

Run the verify command with your network:
```bash
npm run verify -- --network sepolia
```

Ensure your `ETHERSCAN_API_KEY` is set correctly in `.env` or this step will fail.
