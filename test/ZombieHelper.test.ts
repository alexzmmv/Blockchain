import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ZombieOwnership, MockCryptoKitties } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ZombieHelper", function () {
  let zombieOwnership: ZombieOwnership;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  let addr2: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const ZombieOwnership = await ethers.getContractFactory("ZombieOwnership");
    zombieOwnership = await ZombieOwnership.deploy() as unknown as ZombieOwnership;

    // Create zombies
    await zombieOwnership.connect(owner).createRandomZombie("OwnerZombie");
    await zombieOwnership.connect(addr1).createRandomZombie("Addr1Zombie");
  });

  describe("levelUp", function () {
    it("Should level up zombie when correct fee is paid", async function () {
      const zombieBefore = await zombieOwnership.zombies(0);
      const levelUpFee = ethers.parseEther("0.001");

      await zombieOwnership.levelUp(0, { value: levelUpFee });

      const zombieAfter = await zombieOwnership.zombies(0);
      expect(zombieAfter.level).to.equal(zombieBefore.level + 1n);
    });

    it("Should revert if incorrect fee is paid", async function () {
      const wrongFee = ethers.parseEther("0.0005");

      await expect(
        zombieOwnership.levelUp(0, { value: wrongFee })
      ).to.be.reverted;
    });

    it("Should revert if no fee is paid", async function () {
      await expect(zombieOwnership.levelUp(0)).to.be.reverted;
    });
  });

  describe("setLevelUpFee", function () {
    it("Should allow owner to change level up fee", async function () {
      const newFee = ethers.parseEther("0.002");

      await zombieOwnership.setLevelUpFee(newFee);

      // Try to level up with new fee
      await zombieOwnership.levelUp(0, { value: newFee });

      const zombie = await zombieOwnership.zombies(0);
      expect(zombie.level).to.equal(2);
    });

    it("Should not allow non-owner to change fee", async function () {
      const newFee = ethers.parseEther("0.002");

      await expect(
        zombieOwnership.connect(addr1).setLevelUpFee(newFee)
      ).to.be.reverted;
    });
  });

  describe("withdraw", function () {
    it("Should allow owner to withdraw funds", async function () {
      // Level up to add funds to contract
      const levelUpFee = ethers.parseEther("0.001");
      await zombieOwnership.levelUp(0, { value: levelUpFee });

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      const tx = await zombieOwnership.withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      // Owner should receive the levelUpFee minus gas costs
      expect(ownerBalanceAfter).to.be.closeTo(
        ownerBalanceBefore + levelUpFee - gasUsed,
        ethers.parseEther("0.0001") // Small tolerance for gas variations
      );
    });

    it("Should not allow non-owner to withdraw", async function () {
      await expect(
        zombieOwnership.connect(addr1).withdraw()
      ).to.be.reverted;
    });
  });

  describe("changeName", function () {
    it("Should allow changing name for level 2+ zombies", async function () {
      // Level up zombie to level 2
      const levelUpFee = ethers.parseEther("0.001");
      await zombieOwnership.levelUp(0, { value: levelUpFee });

      const newName = "SuperZombie";
      await zombieOwnership.changeName(0, newName);

      const zombie = await zombieOwnership.zombies(0);
      expect(zombie.name).to.equal(newName);
    });

    it("Should not allow changing name for level 1 zombies", async function () {
      await expect(
        zombieOwnership.changeName(0, "NewName")
      ).to.be.reverted;
    });

    it("Should only allow owner of zombie to change name", async function () {
      const levelUpFee = ethers.parseEther("0.001");
      await zombieOwnership.levelUp(0, { value: levelUpFee });

      await expect(
        zombieOwnership.connect(addr1).changeName(0, "NewName")
      ).to.be.reverted;
    });
  });

  describe("changeDna", function () {
    it("Should allow changing DNA for level 20+ zombies", async function () {
      // Level up zombie to level 20
      const levelUpFee = ethers.parseEther("0.001");
      for (let i = 0; i < 19; i++) {
        await zombieOwnership.levelUp(0, { value: levelUpFee });
      }

      const newDna = 9999999999999999n;
      await zombieOwnership.changeDna(0, newDna);

      const zombie = await zombieOwnership.zombies(0);
      expect(zombie.dna).to.equal(newDna);
    });

    it("Should not allow changing DNA for zombies below level 20", async function () {
      const levelUpFee = ethers.parseEther("0.001");
      await zombieOwnership.levelUp(0, { value: levelUpFee });

      await expect(
        zombieOwnership.changeDna(0, 1234567890123456n)
      ).to.be.reverted;
    });

    it("Should only allow owner of zombie to change DNA", async function () {
      const levelUpFee = ethers.parseEther("0.001");
      for (let i = 0; i < 19; i++) {
        await zombieOwnership.levelUp(0, { value: levelUpFee });
      }

      await expect(
        zombieOwnership.connect(addr1).changeDna(0, 1234567890123456n)
      ).to.be.reverted;
    });
  });

  describe("getZombiesByOwner", function () {
    it("Should return correct zombies for owner", async function () {
      const ownerZombies = await zombieOwnership.getZombiesByOwner(owner.address);
      const addr1Zombies = await zombieOwnership.getZombiesByOwner(addr1.address);

      expect(ownerZombies.length).to.equal(1);
      expect(addr1Zombies.length).to.equal(1);
      expect(ownerZombies[0]).to.equal(0n);
      expect(addr1Zombies[0]).to.equal(1n);
    });

    it("Should return empty array for address with no zombies", async function () {
      const addr2Zombies = await zombieOwnership.getZombiesByOwner(addr2.address);
      expect(addr2Zombies.length).to.equal(0);
    });

    it("Should return multiple zombies if owner has many", async function () {
      // Create another zombie by attacking and winning
      let ownerZombies = await zombieOwnership.getZombiesByOwner(owner.address);
      for (let i = 0; i < 30 && ownerZombies.length === 1; i++) {
        await time.increase(86400);
        try {
          await zombieOwnership.attack(0, 1);
        } catch (e) {
          // Ignore revert if cooldown etc
        }
        ownerZombies = await zombieOwnership.getZombiesByOwner(owner.address);
      }

      expect(ownerZombies.length).to.equal(2);
    });
  });
});
