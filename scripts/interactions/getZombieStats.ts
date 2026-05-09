import { ethers } from "hardhat";

// Usage: CONTRACT_ADDRESS=0x... PERKS_ADDRESS=0x... npx hardhat run scripts/interactions/getZombieStats.ts --network localhost

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const perksAddress    = process.env.PERKS_ADDRESS;

  if (!contractAddress) throw new Error("CONTRACT_ADDRESS environment variable not set");

  console.log("📊 Getting Zombie Stats...\n");
  console.log("Contract address:", contractAddress);

  const [signer] = await ethers.getSigners();
  const ZombieOwnership = await ethers.getContractAt("ZombieOwnership", contractAddress, signer);

  const zombieIds: bigint[] = await ZombieOwnership.getZombiesByOwner(signer.address);

  if (zombieIds.length === 0) {
    console.log("⚠️  No zombies found for", signer.address);
    return;
  }

  const typeNames = ["None", "🔥 Fire", "💧 Water", "🌿 Grass", "🐱 Kitty"];

  for (const id of zombieIds) {
    const zombie = await ZombieOwnership.zombies(id);
    const [zombieType, equippedPerk, typeName, perkName] = await ZombieOwnership.getZombieStats(id);

    console.log(`\n──── Zombie #${id} ────`);
    console.log(`  Name:          ${zombie.name}`);
    console.log(`  Level:         ${zombie.level}`);
    console.log(`  DNA:           ${zombie.dna}`);
    console.log(`  Type:          ${typeNames[zombieType] ?? typeName}`);
    console.log(`  Equipped Perk: ${equippedPerk === 0n ? "None" : typeNames[Number(equippedPerk)]}`);
    console.log(`  Wins:          ${zombie.winCount}`);
    console.log(`  Losses:        ${zombie.lossCount}`);

    if (perksAddress) {
      const ZombiePerks = await ethers.getContractAt("ZombiePerks", perksAddress, signer);
      const fire  = await ZombiePerks.balanceOf(signer.address, 1);
      const water = await ZombiePerks.balanceOf(signer.address, 2);
      const grass = await ZombiePerks.balanceOf(signer.address, 3);
      const kitty = await ZombiePerks.balanceOf(signer.address, 4);
      console.log(`\n  Perk Inventory:`);
      console.log(`    🔥 Fire Essence:  ${fire}`);
      console.log(`    💧 Water Essence: ${water}`);
      console.log(`    🌿 Grass Essence: ${grass}`);
      console.log(`    🐱 Kitty Essence: ${kitty}`);
    }
  }
}

main().catch((e) => { console.error("❌ Error:", e.message); process.exit(1); });
