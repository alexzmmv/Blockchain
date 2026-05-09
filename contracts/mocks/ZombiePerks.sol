// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ZombiePerks — Tradeable elemental perk tokens for CryptoZombies
/// Implements a minimal multi-token balance system (ERC-1155 inspired)
/// without importing OZ's ERC1155 (which requires the Cancun EVM for mcopy).
///
/// Perk types:
///   1 = Fire Essence 🔥
///   2 = Water Essence 💧
///   3 = Grass Essence 🌿
///   4 = Kitty Essence 🐱 (rare — costs 5x)
contract ZombiePerks is Ownable {

  uint8 constant TYPE_FIRE  = 1;
  uint8 constant TYPE_WATER = 2;
  uint8 constant TYPE_GRASS = 3;
  uint8 constant TYPE_KITTY = 4;

  uint256 public perkPrice = 0.001 ether;

  // owner => perkType => balance
  mapping(address => mapping(uint8 => uint256)) private _balances;

  // owner => operator => approved
  mapping(address => mapping(address => bool)) private _operatorApprovals;

  event PerkBought(address indexed buyer, uint8 perkType, uint256 amount);
  event PerkMinted(address indexed to, uint8 perkType, uint256 amount);
  event PerkTransferred(address indexed from, address indexed to, uint8 perkType, uint256 amount);
  event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

  constructor() Ownable(msg.sender) {}

  // ─── Admin ────────────────────────────────────────────────────────────────

  /// @notice Mint perks for free (owner only, used for setup / testing)
  function mintPerk(address _to, uint8 _perkType, uint256 _amount) external onlyOwner {
    require(_perkType >= 1 && _perkType <= 4, "Invalid perk type");
    _balances[_to][_perkType] += _amount;
    emit PerkMinted(_to, _perkType, _amount);
  }

  function setPerkPrice(uint256 _price) external onlyOwner {
    perkPrice = _price;
  }

  function withdraw() external onlyOwner {
    address payable _owner = payable(owner());
    (bool success, ) = _owner.call{value: address(this).balance}("");
    require(success, "Transfer failed");
  }

  // ─── Public ───────────────────────────────────────────────────────────────

  /// @notice Buy a perk with ETH. Kitty Essence costs 5x more.
  function buyPerk(uint8 _perkType) external payable {
    require(_perkType >= 1 && _perkType <= 4, "Invalid perk type");
    uint256 price = _perkType == TYPE_KITTY ? perkPrice * 5 : perkPrice;
    require(msg.value >= price, "Insufficient ETH");
    _balances[msg.sender][_perkType] += 1;
    emit PerkBought(msg.sender, _perkType, 1);
  }

  /// @notice Approve an operator to manage all your perks (needed for equipping)
  function setApprovalForAll(address _operator, bool _approved) external {
    _operatorApprovals[msg.sender][_operator] = _approved;
    emit ApprovalForAll(msg.sender, _operator, _approved);
  }

  function isApprovedForAll(address _owner, address _operator) public view returns (bool) {
    return _operatorApprovals[_owner][_operator];
  }

  /// @notice Transfer perks to another user (trade mechanic)
  function safeTransfer(address _to, uint8 _perkType, uint256 _amount) external {
    require(_to != address(0), "Transfer to zero address");
    require(_balances[msg.sender][_perkType] >= _amount, "Insufficient perk balance");
    _balances[msg.sender][_perkType] -= _amount;
    _balances[_to][_perkType] += _amount;
    emit PerkTransferred(msg.sender, _to, _perkType, _amount);
  }

  /// @notice Transfer perks on behalf of another user (used by main contract when equipping)
  function safeTransferFrom(address _from, address _to, uint8 _perkType, uint256 _amount) external {
    require(
      _from == msg.sender || isApprovedForAll(_from, msg.sender),
      "Not approved"
    );
    require(_balances[_from][_perkType] >= _amount, "Insufficient perk balance");
    _balances[_from][_perkType] -= _amount;
    _balances[_to][_perkType] += _amount;
    emit PerkTransferred(_from, _to, _perkType, _amount);
  }

  // ─── Views ────────────────────────────────────────────────────────────────

  function balanceOf(address _owner, uint8 _perkType) external view returns (uint256) {
    return _balances[_owner][_perkType];
  }

  function ownsPerk(address _owner, uint8 _perkType) external view returns (bool) {
    return _balances[_owner][_perkType] > 0;
  }

  // ─── Called by main contract ──────────────────────────────────────────────

  /// @notice Burn one perk token from a user (called by ZombieHelper when equipping).
  /// Requires the main contract to be approved via setApprovalForAll.
  function burnPerk(address _from, uint8 _perkType) external {
    require(
      _from == msg.sender || isApprovedForAll(_from, msg.sender),
      "Not approved"
    );
    require(_balances[_from][_perkType] >= 1, "No perk to burn");
    _balances[_from][_perkType] -= 1;
  }
}
