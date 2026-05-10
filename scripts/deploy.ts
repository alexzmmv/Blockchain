import { ethers } from "hardhat";

async function main() {
  console.log("Starting CryptoZombies deployment...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // 1. Deploy ZombiePerks
  console.log("Deploying ZombiePerks contract...");
  const ZombiePerks = await ethers.getContractFactory("ZombiePerks");
  const zombiePerks = await ZombiePerks.deploy();
  await zombiePerks.waitForDeployment();
  const perksAddress = await zombiePerks.getAddress();
  console.log("✓ ZombiePerks deployed to:", perksAddress);

  // 2. Deploy ZombieOwnership (main contract)
  console.log("\nDeploying ZombieOwnership contract...");
  const ZombieOwnership = await ethers.getContractFactory("ZombieOwnership");
  const zombieOwnership = await ZombieOwnership.deploy();
  await zombieOwnership.waitForDeployment();
  const mainAddress = await zombieOwnership.getAddress();
  console.log("✓ ZombieOwnership deployed to:", mainAddress);

  // 3. Link perks contract
  console.log("\nLinking contracts...");
  await zombieOwnership.setPerksContract(perksAddress);
  console.log("✓ Perks contract linked to ZombieOwnership");

  // 4. Deploy MockCryptoKitties (Sepolia has no real CryptoKitties)
  console.log("\nDeploying MockCryptoKitties...");
  const MockKitties = await ethers.getContractFactory("MockCryptoKitties");
  const mockKitties = await MockKitties.deploy();
  await mockKitties.waitForDeployment();
  const mockKittiesAddress = await mockKitties.getAddress();
  console.log("✓ MockCryptoKitties deployed to:", mockKittiesAddress);

  await zombieOwnership.setKittyContractAddress(mockKittiesAddress);
  console.log("✓ Kitty contract linked to ZombieOwnership");

  console.log("\n" + "=".repeat(60));
  console.log("Deployment Summary");
  console.log("=".repeat(60));
  console.log("ZombieOwnership:   ", mainAddress);
  console.log("ZombiePerks:       ", perksAddress);
  console.log("MockCryptoKitties: ", mockKittiesAddress);
  console.log("Network:           ", (await ethers.provider.getNetwork()).name);
  console.log("Deployer:          ", deployer.address);
  console.log("=".repeat(60) + "\n");

  console.log("✓ Update your .env:");
  console.log(`  CONTRACT_ADDRESS=${mainAddress}`);
  console.log(`  PERKS_ADDRESS=${perksAddress}`);
  console.log(`  MOCK_KITTIES_ADDRESS=${mockKittiesAddress}`);

  console.log("\nNext steps:");
  console.log("1. mint a perk:  PERKS_ADDRESS=... PERK_TYPE=1 npm run interact:mintperk");
  console.log("2. equip a perk: CONTRACT_ADDRESS=... PERKS_ADDRESS=... ZOMBIE_ID=0 PERK_TYPE=1 npm run interact:equipperk");
  console.log("3. attack:       CONTRACT_ADDRESS=... ZOMBIE_ID=0 TARGET_ID=1 npm run interact:attack");
}

main()
  .then(() => { console.log("\n✓ Deployment completed successfully!"); process.exit(0); })
  .catch((error) => { console.error("\n✗ Deployment failed:", error); process.exit(1); });
