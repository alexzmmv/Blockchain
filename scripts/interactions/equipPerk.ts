import { ethers } from "hardhat";

// Usage:
//   CONTRACT_ADDRESS=0x... PERKS_ADDRESS=0x... ZOMBIE_ID=0 PERK_TYPE=2 \
//     npx hardhat run scripts/interactions/equipPerk.ts --network localhost
//
// This script:
//   1. Approves the main contract to burn perks on your behalf (one-time)
//   2. Calls equipPerk on ZombieOwnership

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const perksAddress    = process.env.PERKS_ADDRESS;
  const zombieId        = process.env.ZOMBIE_ID;
  const perkType        = process.env.PERK_TYPE ? parseInt(process.env.PERK_TYPE) : null;

  if (!contractAddress) throw new Error("CONTRACT_ADDRESS not set");
  if (!perksAddress)    throw new Error("PERKS_ADDRESS not set");
  if (zombieId === undefined) throw new Error("ZOMBIE_ID not set");
  if (!perkType || perkType < 1 || perkType > 4) throw new Error("PERK_TYPE must be 1-4");

  const typeNames = ["", "🔥 Fire", "💧 Water", "🌿 Grass", "🐱 Kitty"];
  const [signer] = await ethers.getSigners();

  const ZombiePerks     = await ethers.getContractAt("ZombiePerks",     perksAddress,    signer);
  const ZombieOwnership = await ethers.getContractAt("ZombieOwnership", contractAddress, signer);

  // Check perk balance
  const balance = await ZombiePerks.balanceOf(signer.address, perkType);
  if (balance === 0n) {
    console.error(`❌ You don't own any ${typeNames[perkType]} Essence. Buy or mint one first.`);
    process.exit(1);
  }

  // Step 1: Approve main contract if not already approved
  const approved = await ZombiePerks.isApprovedForAll(signer.address, contractAddress);
  if (!approved) {
    console.log("⏳ Approving main contract to manage your perks...");
    const approveTx = await ZombiePerks.setApprovalForAll(contractAddress, true);
    await approveTx.wait();
    console.log("✓ Approved");
  }

  // Step 2: Equip
  console.log(`\n⚙️  Equipping ${typeNames[perkType]} Essence on Zombie #${zombieId}...`);
  const tx = await ZombieOwnership.equipPerk(parseInt(zombieId), perkType);
  await tx.wait();

  const zombie = await ZombieOwnership.zombies(parseInt(zombieId));
  console.log(`✓ Done! Zombie #${zombieId} (${zombie.name}) now has ${typeNames[perkType]} Essence equipped.`);
}

main().catch((e) => { console.error("❌ Error:", e.message); process.exit(1); });
