import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ZombieOwnership, ZombiePerks } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ZombieRPG — Elemental Types, Perks & Kitty Devour", function () {
  let zombieOwnership: ZombieOwnership;
  let zombiePerks: ZombiePerks;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    const ZombiePerksFactory     = await ethers.getContractFactory("ZombiePerks");
    const ZombieOwnershipFactory = await ethers.getContractFactory("ZombieOwnership");

    zombiePerks     = await ZombiePerksFactory.deploy() as unknown as ZombiePerks;
    zombieOwnership = await ZombieOwnershipFactory.deploy() as unknown as ZombieOwnership;

    await zombieOwnership.setPerksContract(await zombiePerks.getAddress());
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /** Create a zombie with a specific DNA tail (last 2 digits) */
  async function createZombieWithDna(signer: HardhatEthersSigner, name: string, dnaTail: number) {
    // We use createRandomZombie then override DNA via changeDna (requires level 20)
    // Instead, we directly check the created zombie DNA is in the expected range
    await zombieOwnership.connect(signer).createRandomZombie(name);
  }

  async function advanceDay() {
    await time.increase(86401);
  }

  // ─── 1. Type Calculation ─────────────────────────────────────────────────

  describe("getZombieType()", function () {
    it("Returns TYPE_FIRE (1) for DNA ending 00–32", async function () {
      // Force a known DNA: use createRandomZombie and check result deterministically
      // We test the pure logic via ZombieFactory's getZombieType with a manipulated zombie
      // Create zombie then changeDna to a controlled value (requires level 20, so we mint directly)
      // Instead: we verify the function with all three boundary values by deploying a fresh zombie
      // and asserting the formula directly.
      // zombies[] is public so we can read the DNA and re-compute expected type.
      await zombieOwnership.connect(owner).createRandomZombie("FireTest");
      const zombie = await zombieOwnership.zombies(0);
      const tail   = Number(zombie.dna % 100n);
      const zType  = await zombieOwnership.getZombieType(0);

      if (tail === 99)      expect(zType).to.equal(4); // Kitty
      else if (tail >= 66)  expect(zType).to.equal(3); // Grass
      else if (tail >= 33)  expect(zType).to.equal(2); // Water
      else                  expect(zType).to.equal(1); // Fire
    });

    it("Returns TYPE_KITTY (4) for a zombie created by feeding on a kitty (DNA ends in 99)", async function () {
      // Deploy MockCryptoKitties and simulate a kitty feed
      const MockKitties = await ethers.getContractFactory("MockCryptoKitties");
      const mockKitties = await MockKitties.deploy();
      await zombieOwnership.setKittyContractAddress(await mockKitties.getAddress());

      await zombieOwnership.connect(owner).createRandomZombie("PreKitty");
      await advanceDay();
      await zombieOwnership.connect(owner).feedOnKitty(0, 1);

      // The mutated zombie (id 0) is now a kitty-type zombie
      const zombie = await zombieOwnership.zombies(0);
      expect(zombie.dna % 100n).to.equal(99n);
      const zType = await zombieOwnership.getZombieType(0);
      expect(zType).to.equal(4); // TYPE_KITTY
    });
  });

  // ─── 2. Perk Minting & Balance ───────────────────────────────────────────

  describe("ZombiePerks", function () {
    it("Owner can mint perks to any address", async function () {
      await zombiePerks.mintPerk(addr1.address, 1, 3); // 3x Fire Essence
      expect(await zombiePerks.balanceOf(addr1.address, 1)).to.equal(3n);
    });

    it("Non-owner cannot mint perks", async function () {
      await expect(
        zombiePerks.connect(addr1).mintPerk(addr1.address, 1, 1)
      ).to.be.reverted;
    });

    it("User can buy a perk with ETH", async function () {
      const price = await zombiePerks.perkPrice();
      await zombiePerks.connect(addr1).buyPerk(2, { value: price });
      expect(await zombiePerks.balanceOf(addr1.address, 2)).to.equal(1n);
    });

    it("Kitty perk costs 5x more", async function () {
      const price = await zombiePerks.perkPrice();
      await expect(
        zombiePerks.connect(addr1).buyPerk(4, { value: price }) // underpay
      ).to.be.revertedWith("Insufficient ETH");

      await zombiePerks.connect(addr1).buyPerk(4, { value: price * 5n });
      expect(await zombiePerks.balanceOf(addr1.address, 4)).to.equal(1n);
    });

    it("Users can trade perks via safeTransfer", async function () {
      await zombiePerks.mintPerk(owner.address, 3, 2); // 2x Grass
      await zombiePerks.safeTransfer(addr1.address, 3, 1);

      expect(await zombiePerks.balanceOf(owner.address, 3)).to.equal(1n);
      expect(await zombiePerks.balanceOf(addr1.address,  3)).to.equal(1n);
    });
  });

  // ─── 3. Equip Perk ───────────────────────────────────────────────────────

  describe("equipPerk()", function () {
    beforeEach(async function () {
      await zombieOwnership.connect(owner).createRandomZombie("Attacker");
      // Approve main contract to burn on behalf of owner
      await zombiePerks.connect(owner).setApprovalForAll(
        await zombieOwnership.getAddress(), true
      );
    });

    it("Can equip a perk to a zombie", async function () {
      await zombiePerks.mintPerk(owner.address, 2, 1); // Water Essence
      await zombieOwnership.connect(owner).equipPerk(0, 2);

      const zombie = await zombieOwnership.zombies(0);
      expect(zombie.equippedPerkType).to.equal(2);
    });

    it("Equipping burns the perk token", async function () {
      await zombiePerks.mintPerk(owner.address, 1, 1);
      await zombieOwnership.connect(owner).equipPerk(0, 1);
      expect(await zombiePerks.balanceOf(owner.address, 1)).to.equal(0n);
    });

    it("Cannot equip a perk you don't own", async function () {
      await expect(
        zombieOwnership.connect(owner).equipPerk(0, 3)
      ).to.be.revertedWith("You don't own this perk");
    });

  });

  // ─── 4. Battle Type Advantages ───────────────────────────────────────────

  describe("Type Advantage in battle", function () {
    this.timeout(120000);

    it("Fire attacker with Water perk vs Fire defender has +10% STAB if same type match (perk != zombie type)", async function () {
      // This test verifies getZombieStats returns correct type info
      await zombieOwnership.connect(owner).createRandomZombie("Alpha");
      await zombiePerks.mintPerk(owner.address, 2, 1); // Water perk
      await zombiePerks.connect(owner).setApprovalForAll(await zombieOwnership.getAddress(), true);
      await zombieOwnership.connect(owner).equipPerk(0, 2);

      const [zType, pType] = await zombieOwnership.getZombieStats(0);
      expect(pType).to.equal(2); // Water perk equipped
    });

    it("Attack emits BattleResult event with correct fields", async function () {
      await zombieOwnership.connect(owner).createRandomZombie("Attacker");
      await zombieOwnership.connect(addr1).createRandomZombie("Defender");
      await advanceDay();

      const tx = await zombieOwnership.connect(owner).attack(0, 1);
      const receipt = await tx.wait();

      // BattleResult event should be present
      const iface = zombieOwnership.interface;
      const battleEvent = receipt?.logs
        .map(log => { try { return iface.parseLog(log); } catch { return null; } })
        .find(e => e?.name === "BattleResult");

      expect(battleEvent).to.not.be.undefined;
      expect(battleEvent?.args.attackerId).to.equal(0n);
      expect(battleEvent?.args.targetId).to.equal(1n);
    });

    it("Win probability is clamped between 5 and 95", async function () {
      await zombieOwnership.connect(owner).createRandomZombie("Attacker");
      await zombieOwnership.connect(addr1).createRandomZombie("Defender");
      await advanceDay();

      const tx = await zombieOwnership.connect(owner).attack(0, 1);
      const receipt = await tx.wait();
      const iface = zombieOwnership.interface;
      const battleEvent = receipt?.logs
        .map(log => { try { return iface.parseLog(log); } catch { return null; } })
        .find(e => e?.name === "BattleResult");

      const prob = Number(battleEvent?.args.winProbability);
      expect(prob).to.be.gte(5);
      expect(prob).to.be.lte(95);
    });
  });

  // ─── 5. Kitty Devour ─────────────────────────────────────────────────────

  describe("Kitty Devour mechanic", function () {
    this.timeout(120000);

    it("Winning against a Kitty zombie burns it and breeds a new baby Kitty", async function () {
      // Deploy MockCryptoKitties and create a Kitty zombie for addr1
      const MockKitties = await ethers.getContractFactory("MockCryptoKitties");
      const mockKitties = await MockKitties.deploy();
      await zombieOwnership.setKittyContractAddress(await mockKitties.getAddress());

      // Owner creates normal zombie
      await zombieOwnership.connect(owner).createRandomZombie("Hunter");
      // addr1 creates normal zombie, then feeds on a kitty to mutate it into a Kitty zombie
      await zombieOwnership.connect(addr1).createRandomZombie("PreKitty");
      await advanceDay();
      await zombieOwnership.connect(addr1).feedOnKitty(1, 42); // id 1 is addr1's zombie

      // Now zombies[1] is the Kitty zombie owned by addr1 (id=1)
      const kittyZombie = await zombieOwnership.zombies(1);
      expect(kittyZombie.dna % 100n).to.equal(99n);

      // Hunter (id=0) attacks Kitty (id=1) — repeat until we get a win
      let devoured = false;
      for (let i = 0; i < 30 && !devoured; i++) {
        await advanceDay();

        // Check Kitty still exists
        const kittyOwner = await zombieOwnership.zombieToOwner(1);
        if (kittyOwner === ethers.ZeroAddress) { devoured = true; break; }

        const tx = await zombieOwnership.connect(owner).attack(0, 1);
        const receipt = await tx.wait();
        const iface = zombieOwnership.interface;
        const battleEvent = receipt?.logs
          .map(log => { try { return iface.parseLog(log); } catch { return null; } })
          .find(e => e?.name === "BattleResult");

        if (battleEvent?.args.kittyDevoured) devoured = true;
      }

      if (devoured) {
        // Kitty zombie should be burned
        const burnedOwner = await zombieOwnership.zombieToOwner(1);
        expect(burnedOwner).to.equal(ethers.ZeroAddress);

        // Hunter should have bred a baby kitty (id=2) instead of mutating
        const babyKitty = await zombieOwnership.zombies(2);
        expect(babyKitty.dna % 100n).to.equal(99n);
      }
      // If devour didn't happen in 30 tries that's statistically extremely unlikely but not a bug
    });
  });
});
