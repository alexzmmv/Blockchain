// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ZombieFeeding.sol";
import "./ZombiePerks.sol";

contract ZombieHelper is ZombieFeeding {

  uint256 levelUpFee = 0.001 ether;

  ZombiePerks public perksContract;

  modifier aboveLevel(uint256 _level, uint256 _zombieId) {
    require(zombies[_zombieId].level >= _level);
    _;
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  function setPerksContract(address _address) external onlyOwner {
    perksContract = ZombiePerks(_address);
  }

  function withdraw() external onlyOwner {
    address payable _owner = payable(owner());
    (bool success, ) = _owner.call{value: address(this).balance}("");
    require(success, "Transfer failed");
  }

  function setLevelUpFee(uint256 _fee) external onlyOwner {
    levelUpFee = _fee;
  }

  // ─── Existing features ────────────────────────────────────────────────────

  function levelUp(uint256 _zombieId) external payable {
    require(msg.value == levelUpFee);
    zombies[_zombieId].level++;
  }

  function changeName(uint256 _zombieId, string calldata _newName) external aboveLevel(2, _zombieId) onlyOwnerOf(_zombieId) {
    zombies[_zombieId].name = _newName;
  }

  function changeDna(uint256 _zombieId, uint256 _newDna) external aboveLevel(20, _zombieId) onlyOwnerOf(_zombieId) {
    zombies[_zombieId].dna = _newDna;
  }

  function getZombiesByOwner(address _owner) external view returns(uint256[] memory) {
    uint256[] memory result = new uint256[](ownerZombieCount[_owner]);
    uint256 counter = 0;
    for (uint256 i = 0; i < zombies.length; i++) {
      if (zombieToOwner[i] == _owner) {
        result[counter] = i;
        counter++;
      }
    }
    return result;
  }

  // ─── Perk system ──────────────────────────────────────────────────────────

  /// @notice Equip a perk to your zombie. Burns one perk token from your balance.
  /// The perks contract must be approved to transfer on behalf of the user
  /// OR this contract must be approved via setApprovalForAll on ZombiePerks.
  function equipPerk(uint256 _zombieId, uint8 _perkType) external onlyOwnerOf(_zombieId) {
    require(address(perksContract) != address(0), "Perks contract not set");
    require(_perkType >= 1 && _perkType <= 4, "Invalid perk type");
    require(perksContract.ownsPerk(msg.sender, _perkType), "You don't own this perk");

    // Burn one perk token (user must have approved this contract on ZombiePerks)
    perksContract.burnPerk(msg.sender, _perkType);
    zombies[_zombieId].equippedPerkType = _perkType;
  }


  /// @notice Convenience view: returns zombie type, equipped perk, and win chance modifiers
  function getZombieStats(uint256 _zombieId) external view returns (
    uint8 zombieType,
    uint8 equippedPerk,
    string memory typeName,
    string memory perkName
  ) {
    zombieType   = getZombieType(_zombieId);
    equippedPerk = zombies[_zombieId].equippedPerkType;
    typeName     = _typeName(zombieType);
    perkName     = _typeName(equippedPerk);
  }

  function _typeName(uint8 _type) internal pure returns (string memory) {
    if (_type == TYPE_FIRE)  return "Fire";
    if (_type == TYPE_WATER) return "Water";
    if (_type == TYPE_GRASS) return "Grass";
    if (_type == TYPE_KITTY) return "Kitty";
    return "None";
  }
}
