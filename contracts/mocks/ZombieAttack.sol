// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ZombieHelper.sol";

contract ZombieAttack is ZombieHelper {
  uint256 randNonce = 0;
  uint256 baseVictoryProbability = 70;

  event BattleResult(
    uint256 indexed attackerId,
    uint256 indexed targetId,
    bool attackerWon,
    uint8 attackerEffectiveType,
    uint8 targetType,
    uint256 winProbability,
    bool kittyDevoured
  );

  function randMod(uint256 _modulus) internal returns(uint256) {
    randNonce++;
    return uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, randNonce))) % _modulus;
  }

  // ─── Type Logic ───────────────────────────────────────────────────────────

  /// @notice Returns the effective attack type for a zombie.
  /// If the zombie has an equipped perk it fights as the perk's type;
  /// otherwise it uses its own DNA type.
  function _getEffectiveType(uint256 _zombieId) internal view returns (uint8) {
    uint8 perk = zombies[_zombieId].equippedPerkType;
    return perk != TYPE_NONE ? perk : getZombieType(_zombieId);
  }

  /// @notice Calculates the win-probability modifier.
  /// Returns a signed int: positive = bonus, negative = penalty (in percentage points).
  function _calculateModifier(uint256 _attackerId, uint256 _targetId) internal view returns (int256) {
    uint8 attackType = _getEffectiveType(_attackerId);
    uint8 defenseType = getZombieType(_targetId); // defender's own type always applies
    int256 modifier_ = 0;

    // STAB: +10% if zombie's own type matches its equipped perk
    if (zombies[_attackerId].equippedPerkType != TYPE_NONE &&
        zombies[_attackerId].equippedPerkType == getZombieType(_attackerId)) {
      modifier_ += 10;
    }

    // Type advantage triangle: Fire > Grass > Water > Fire
    if (attackType == TYPE_FIRE  && defenseType == TYPE_GRASS)  modifier_ += 20;
    if (attackType == TYPE_GRASS && defenseType == TYPE_WATER)  modifier_ += 20;
    if (attackType == TYPE_WATER && defenseType == TYPE_FIRE)   modifier_ += 20;

    // Type disadvantage (reverse of the above)
    if (attackType == TYPE_FIRE  && defenseType == TYPE_WATER)  modifier_ -= 20;
    if (attackType == TYPE_GRASS && defenseType == TYPE_FIRE)   modifier_ -= 20;
    if (attackType == TYPE_WATER && defenseType == TYPE_GRASS)  modifier_ -= 20;

    // Kitty attacker: never suffers a disadvantage + flat +5%
    if (attackType == TYPE_KITTY) {
      if (modifier_ < 0) modifier_ = 0;
      modifier_ += 5;
    }

    return modifier_;
  }

  // ─── Attack ───────────────────────────────────────────────────────────────

  function attack(uint256 _zombieId, uint256 _targetId) external onlyOwnerOf(_zombieId) {
    Zombie storage myZombie = zombies[_zombieId];
    require(_isReady(myZombie), "Zombie not ready to attack");
    require(_zombieId != _targetId, "Cannot attack yourself");
    require(_targetId < zombies.length, "Target does not exist");

    Zombie storage enemyZombie = zombies[_targetId];

    int256 mod = _calculateModifier(_zombieId, _targetId);
    uint256 effectiveProbability = uint256(int256(baseVictoryProbability) + mod);
    // Clamp to [5, 95] to keep it interesting
    if (effectiveProbability > 95) effectiveProbability = 95;
    if (effectiveProbability < 5)  effectiveProbability = 5;

    uint256 rand = randMod(100);
    bool attackerWon = rand <= effectiveProbability;
    bool kittyDevoured = false;

    uint8 attackerEffType = _getEffectiveType(_zombieId);
    uint8 targetType      = getZombieType(_targetId);

    if (attackerWon) {
      myZombie.winCount++;
      myZombie.level++;
      enemyZombie.lossCount++;

      // ── Kitty Devour ────────────────────────────────────────────────────
      // If the target is a Kitty-type zombie, burn it and breed a new kitty
      if (targetType == TYPE_KITTY) {
        kittyDevoured = true;
        // Breed a new baby zombie but force its DNA to Kitty type
        feedAndMultiply(_zombieId, enemyZombie.dna, "kitty");
        // Burn the devoured Kitty zombie
        _burnZombie(_targetId);
      } else {
        // Standard win: breed a new zombie
        feedAndMultiply(_zombieId, enemyZombie.dna, "zombie");
      }
    } else {
      myZombie.lossCount++;
      enemyZombie.winCount++;
      _triggerCooldown(myZombie);
    }

    emit BattleResult(_zombieId, _targetId, attackerWon, attackerEffType, targetType, effectiveProbability, kittyDevoured);
  }
}
