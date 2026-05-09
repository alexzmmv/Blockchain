// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ZombieFactory is Ownable {

  event NewZombie(uint256 zombieId, string name, uint256 dna);

  uint256 dnaDigits = 16;
  uint256 dnaModulus = 10 ** dnaDigits;
  uint256 cooldownTime = 30 seconds;

  // Elemental types
  uint8 constant TYPE_NONE  = 0;
  uint8 constant TYPE_FIRE  = 1;
  uint8 constant TYPE_WATER = 2;
  uint8 constant TYPE_GRASS = 3;
  uint8 constant TYPE_KITTY = 4;

  struct Zombie {
    string name;
    uint256 dna;
    uint32 level;
    uint32 readyTime;
    uint16 winCount;
    uint16 lossCount;
    uint8 equippedPerkType; // 0 = none, 1-4 = elemental type
  }

  Zombie[] public zombies;

  mapping (uint256 => address) public zombieToOwner;
  mapping (address => uint256) ownerZombieCount;

  function _createZombie(string memory _name, uint256 _dna) internal {
    zombies.push(Zombie(_name, _dna, 1, uint32(block.timestamp + cooldownTime), 0, 0, 0));
    uint256 id = zombies.length - 1;
    zombieToOwner[id] = msg.sender;
    ownerZombieCount[msg.sender]++;
    emit NewZombie(id, _name, _dna);
  }

  function _generateRandomDna(string memory _str) private view returns (uint256) {
    uint256 rand = uint256(keccak256(abi.encodePacked(_str)));
    return rand % dnaModulus;
  }

  function createRandomZombie(string memory _name) public {
    require(ownerZombieCount[msg.sender] == 0);
    uint256 randDna = _generateRandomDna(_name);
    randDna = randDna - randDna % 100;
    _createZombie(_name, randDna);
  }

  /// @notice Returns the elemental type of a zombie based on its DNA.
  /// The last 2 digits of the DNA determine the type:
  ///   00-32 => Fire, 33-65 => Water, 66-98 => Grass, 99 => Kitty
  function getZombieType(uint256 _zombieId) public view returns (uint8) {
    uint256 tail = zombies[_zombieId].dna % 100;
    if (tail == 99)      return TYPE_KITTY;
    if (tail >= 66)      return TYPE_GRASS;
    if (tail >= 33)      return TYPE_WATER;
    return TYPE_FIRE;
  }


  // ─── Internal Burn ────────────────────────────────────────────────────────

  /// @notice Permanently delete a zombie. Clears storage and ownership accounting.
  /// Emitted via ZombieBurned event which is declared in ZombieOwnership to avoid
  /// forward-declaration issues — internal burn is safe to call from ZombieAttack.
  function _burnZombie(uint256 _zombieId) internal {
    require(_zombieId < zombies.length, "Zombie does not exist");
    address previousOwner = zombieToOwner[_zombieId];
    require(previousOwner != address(0), "Zombie already burned");

    ownerZombieCount[previousOwner]--;
    zombieToOwner[_zombieId] = address(0);
    delete zombies[_zombieId];
  }

  constructor() Ownable(msg.sender) {}

}
