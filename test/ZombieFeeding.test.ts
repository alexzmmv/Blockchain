import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ZombieOwnership, MockCryptoKitties } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ZombieFeeding", function () {
  let zombieOwnership: ZombieOwnership;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    const ZombieOwnership = await ethers.getContractFactory("ZombieOwnership");
    zombieOwnership = await ZombieOwnership.deploy() as unknown as ZombieOwnership;

    // Create initial zombies
    await zombieOwnership.connect(owner).createRandomZombie("OwnerZombie");
    await zombieOwnership.connect(addr1).createRandomZombie("Addr1Zombie");
  });

  describe("Cooldown mechanism", function () {
    it("Should set cooldown after zombie creation", async function () {
      const zombie = await zombieOwnership.zombies(0);
      const currentTime = await time.latest();

      expect(zombie.readyTime).to.be.gt(currentTime);
    });

    it("Should allow feeding after cooldown expires", async function () {
      // Fast forward time by 1 day
      await time.increase(86400);

      const zombie = await zombieOwnership.zombies(0);
      const currentTime = await time.latest();

      expect(zombie.readyTime).to.be.lte(currentTime);
    });
  });

  describe("KittyInterface", function () {
    let mockKittyContract: MockCryptoKitties;

    beforeEach(async function () {
      // Deploy a mock CryptoKitties contract
      const MockKitty = await ethers.getContractFactory("MockCryptoKitties");
      mockKittyContract = await MockKitty.deploy() as unknown as MockCryptoKitties;

      await zombieOwnership.setKittyContractAddress(await mockKittyContract.getAddress());
    });

    it("Should only allow owner to set kitty contract address", async function () {
      const newAddress = ethers.Wallet.createRandom().address;

      await expect(
        zombieOwnership.connect(addr1).setKittyContractAddress(newAddress)
      ).to.be.reverted;

      await zombieOwnership.connect(owner).setKittyContractAddress(newAddress);
    });

    it("Should feed on kitty and mutate existing zombie with kitty DNA", async function () {
      // Fast forward time to pass cooldown
      await time.increase(86400);

      const zombiesBefore = await zombieOwnership.getZombiesByOwner(owner.address);
      expect(zombiesBefore.length).to.equal(1);

      // Feed on kitty (kitty ID 1 in mock has genes ending in ...123)
      await zombieOwnership.feedOnKitty(0, 1);

      const zombiesAfter = await zombieOwnership.getZombiesByOwner(owner.address);
      expect(zombiesAfter.length).to.equal(1);

      const mutatedZombie = await zombieOwnership.zombies(0);

      // Kitty DNA should be processed (ending in 99)
      const dna = mutatedZombie.dna.toString();
      expect(Number(dna) % 100).to.equal(99);
    });

    it("Should trigger cooldown after feeding", async function () {
      await time.increase(86400);

      await zombieOwnership.feedOnKitty(0, 1);

      const zombie = await zombieOwnership.zombies(0);
      const currentTime = await time.latest();

      expect(zombie.readyTime).to.be.gt(currentTime);
    });

    it("Should only allow owner of zombie to feed", async function () {
      await time.increase(86400);

      // addr1 doesn't own zombie 0
      await expect(
        zombieOwnership.connect(addr1).feedOnKitty(0, 1)
      ).to.be.reverted;
    });

    it("Should not allow feeding before cooldown", async function () {
      // Don't fast forward time
      await expect(
        zombieOwnership.feedOnKitty(0, 1)
      ).to.be.reverted;
    });
  });
});
