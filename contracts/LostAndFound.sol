// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract LostAndFound {

    enum Status { Reported, Found, Claimed, Returned }

    struct Item {
        uint256 id;
        string  name;
        string  description;
        string  location;
        address reporter;
        address claimant;
        Status  status;
        uint256 reportedAt;
        uint256 lastUpdatedAt;
    }

    uint256 private itemCounter;
    address public  admin;
    mapping(uint256 => Item) public items;
    uint256[] public itemIds;

    event ItemReported(uint256 indexed itemId, address indexed reporter, string name, uint256 timestamp);
    event StatusUpdated(uint256 indexed itemId, Status oldStatus, Status newStatus, address indexed actor, uint256 timestamp);
    event ClaimFiled(uint256 indexed itemId, address indexed claimant, uint256 timestamp);
    event ItemReturned(uint256 indexed itemId, address indexed claimant, uint256 timestamp);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this"); _;
    }
    modifier itemExists(uint256 itemId) {
        require(itemId > 0 && itemId <= itemCounter, "Item does not exist"); _;
    }

    constructor() { admin = msg.sender; }

    function reportItem(string calldata name, string calldata description, string calldata location)
        external returns (uint256) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(location).length > 0, "Location cannot be empty");
        itemCounter++;
        uint256 newId = itemCounter;
        items[newId] = Item(newId, name, description, location, msg.sender, address(0), Status.Reported, block.timestamp, block.timestamp);
        itemIds.push(newId);
        emit ItemReported(newId, msg.sender, name, block.timestamp);
        return newId;
    }

    function markAsFound(uint256 itemId) external onlyAdmin itemExists(itemId) {
        Item storage item = items[itemId];
        require(item.status == Status.Reported, "Must be Reported status");
        Status old = item.status;
        item.status = Status.Found;
        item.lastUpdatedAt = block.timestamp;
        emit StatusUpdated(itemId, old, Status.Found, msg.sender, block.timestamp);
    }

    function fileClaim(uint256 itemId) external itemExists(itemId) {
        Item storage item = items[itemId];
        require(item.status == Status.Found, "Must be Found status to claim");
        require(msg.sender != item.reporter, "Reporter cannot claim own item");
        Status old = item.status;
        item.claimant = msg.sender;
        item.status = Status.Claimed;
        item.lastUpdatedAt = block.timestamp;
        emit ClaimFiled(itemId, msg.sender, block.timestamp);
        emit StatusUpdated(itemId, old, Status.Claimed, msg.sender, block.timestamp);
    }

    function confirmReturn(uint256 itemId) external onlyAdmin itemExists(itemId) {
        Item storage item = items[itemId];
        require(item.status == Status.Claimed, "Must be Claimed status");
        Status old = item.status;
        item.status = Status.Returned;
        item.lastUpdatedAt = block.timestamp;
        emit ItemReturned(itemId, item.claimant, block.timestamp);
        emit StatusUpdated(itemId, old, Status.Returned, msg.sender, block.timestamp);
    }

    function getItem(uint256 itemId) external view itemExists(itemId) returns (Item memory) {
        return items[itemId];
    }
    function getTotalItems() external view returns (uint256) { return itemCounter; }
    function getAllItemIds() external view returns (uint256[] memory) { return itemIds; }
}