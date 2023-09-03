// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";
import { SD59x18, sd } from "@prb/math/src/SD59x18.sol";
import { UD60x18, ud } from "@prb/math/src/UD60x18.sol";

import "./SLW.sol";
import "./Ship.sol";
import "./Star.sol";

contract Metaverse is AccessControl {

  uint256 randNonce = 0;

  using EnumerableMap for EnumerableMap.UintToUintMap;
  
  mapping(uint256 => uint256[]) private shipTargets;

  mapping(uint256 => uint256) private shipCounts;

  EnumerableMap.UintToUintMap private shipOrbits;

  EnumerableMap.UintToUintMap private harvestTimes;

  mapping(uint256 => uint256) private starLuminosities;

  event ShipOrbited(uint256 _ship, uint256 _star);

  event ShipDeparted(uint256 _ship, uint256 _star, uint256 _arrivalTime);

  event SLWHarvested(uint256 _ship, uint256 _amountShip, address _starOwner, uint256 _amountTax);

  event AttackLost(uint256 _attacker, uint256 _target);
  
  SLW public slw;
  Ship public ship;
  Star public star;

  constructor(
    address _slwContractAddress,
    address _shipContractAddress,
    address _starContractAddress) {
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    slw = SLW(_slwContractAddress);
    ship = Ship(_shipContractAddress);
    star = Star(_starContractAddress);
  }

  function randMod(uint _modulus) internal returns(uint256) {
    // increase nonce
    randNonce++;
    return uint256(keccak256(abi.encodePacked(block.timestamp,msg.sender,randNonce))) % _modulus;
  }

  function claimStar(uint256 _star, address _newOwner) public onlyRole(DEFAULT_ADMIN_ROLE) {
    address owner = star.ownerOf(_star);
    star.safeTransferFrom(owner, _newOwner, _star);
  }

  function setStarLuminosity(uint256 _star, uint256 _luminosity) public onlyRole(DEFAULT_ADMIN_ROLE) {
    starLuminosities[_star] = _luminosity;
  }

  function setShipCount(uint256 _star, uint256 _count) public onlyRole(DEFAULT_ADMIN_ROLE) {
    shipCounts[_star] = _count;
  }

  function enterOrbit(uint256 _ship, uint256 _star) public onlyRole(DEFAULT_ADMIN_ROLE) {
    require(shipTargets[_ship].length == 0 || shipTargets[_ship][1] < block.timestamp, "Ship is in transit");
    delete shipTargets[_ship];
    shipOrbits.set(_ship, _star);
    harvestTimes.set(_ship, block.timestamp);
    shipCounts[_star] += 1;
  }

  function sendShip(uint256 _ship, uint256 _star, uint256 _distance, uint256 _fuel) public onlyRole(DEFAULT_ADMIN_ROLE) {
    address shipOwner = ship.ownerOf(_ship);
    uint256 fuel = _fuel * 1e18;
    require(slw.balanceOf(shipOwner) >= fuel, "Insufficient fuel");
    uint256 fuelRef = 1 * 24 * 60 * 60;
    uint256 travelTime = (_distance * fuelRef) / fuel;
    uint256 arrivalTime = block.timestamp + travelTime;
    uint256 currentStar = shipOrbits.get(_ship);
    shipOrbits.remove(_ship);
    shipCounts[currentStar] -= 1;
    shipTargets[_ship] = [_star, arrivalTime];
    slw.burn(shipOwner, fuel);
    emit ShipDeparted(_ship, _star, arrivalTime);
  }

  function sendShipFfwd(uint256 _ship, uint256 _star, uint256 _distance, uint256 _fuel) public onlyRole(DEFAULT_ADMIN_ROLE) {
    address shipOwner = ship.ownerOf(_ship);
    uint256 fuel = _fuel * 1e18;
    require(slw.balanceOf(shipOwner) >= fuel, "Insufficient fuel");
    uint256 fuelRef = 1;
    uint256 travelTime = (_distance * fuelRef) / fuel;
    uint256 arrivalTime = block.timestamp + travelTime;
    uint256 currentStar = shipOrbits.get(_ship);
    shipOrbits.remove(_ship);
    shipCounts[currentStar] -= 1;
    shipTargets[_ship] = [_star, arrivalTime];
    slw.burn(shipOwner, fuel);
    emit ShipDeparted(_ship, _star, arrivalTime);
  }

  function teleportShip(uint256 _ship, uint256 _star) public onlyRole(DEFAULT_ADMIN_ROLE) {
    delete shipTargets[_ship];
    enterOrbit(_ship, _star);
  }

  function harvestSlw(uint256 _ship, uint256 _harvester) public onlyRole(DEFAULT_ADMIN_ROLE) {
      
      require(shipOrbits.contains(_ship), "Ship not in orbit");
      uint256 sinceLastHarvest = block.timestamp - harvestTimes.get(_ship);

      uint256 orbitedStar = shipOrbits.get(_ship);
      require(starLuminosities[orbitedStar] > 0, "Star luminosity not set");
      
      SD59x18 starOutput = ud(starLuminosities[orbitedStar] * 1e6).intoSD59x18();
      SD59x18 starOutputLog2 = starOutput.log2();
      SD59x18 multiplier = starOutputLog2.lt(sd(0)) ? sd(1e18).div(sd(1e18).add(starOutputLog2.abs())) : sd(1e18).add(starOutputLog2);
      UD60x18 slwGenerated = multiplier.intoUD60x18().mul(ud(sinceLastHarvest));
      UD60x18 slwHarvested = slwGenerated.div(ud(1 + shipCounts[orbitedStar] * 1e18).log2());

      harvestTimes.set(_ship, block.timestamp);
      address shipOwner = ship.ownerOf(_harvester);
      uint256 slwHarvestUint256 = slwHarvested.intoUint256() * 1e18;
      slw.mint(shipOwner, slwHarvestUint256);

      address starOwner = star.ownerOf(orbitedStar);

      uint256 taxAmountUint256 = slwHarvestUint256 / 100;
      slw.mint(starOwner, taxAmountUint256);

      emit SLWHarvested(_ship, slwHarvestUint256, starOwner, taxAmountUint256);

  }


  function attackShip(uint256 _attacker, uint256 _target, uint256 _power) public onlyRole(DEFAULT_ADMIN_ROLE) {
      
      address shipOwner = ship.ownerOf(_attacker);
      uint256 fuel = _power * 1e18;
      require(slw.balanceOf(shipOwner) >= fuel, "Insufficient fuel for attack");

      uint256 rand = randMod(100);

      UD60x18 power = ud(fuel);
      UD60x18 powerLog = _power > 172800 ? power.log2() : power.log10();
      int256 powerThreshhold = 50 - (int256(powerLog.intoUint256()) / 1e18);

      if (int256(rand) > powerThreshhold) {
        harvestSlw(_target, _attacker);
      } else {
        emit AttackLost(_attacker, _target);
      }

      slw.burn(shipOwner, fuel);

  }

  function burnSlw(address _address, uint256 _amount) public onlyRole(DEFAULT_ADMIN_ROLE) {
    slw.burn(_address, _amount);
  }

  function mintSlw(address _address, uint256 _amount) public onlyRole(DEFAULT_ADMIN_ROLE) {
    slw.mint(_address, _amount);
  }

}