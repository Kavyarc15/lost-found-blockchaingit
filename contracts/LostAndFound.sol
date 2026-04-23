// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title LostAndFound — Decentralised Lost-and-Found Registry
/// @notice Anyone who finds a lost item creates a report (with an IPFS image).
///         The rightful owner files a claim.  After the physical handover the
///         owner uploads a confirmation photo and the contract marks the item
///         as Returned.  An admin can intervene to dispute / resolve.
contract LostAndFound {

    // ──────────────────── Enums ────────────────────
    enum Status { Reported, Claimed, Returned, Disputed }

    // ──────────────────── Structs ──────────────────
    struct Item {
        uint256 id;
        string  name;
        string  description;
        string  location;
        string  imageHash;          // IPFS CID uploaded by the finder
        string  confirmImageHash;   // IPFS CID uploaded by the owner on receipt
        address finder;             // person who found the item
        address owner;              // person who claims ownership
        Status  status;
        uint256 reportedAt;
        uint256 claimedAt;
        uint256 returnedAt;
    }

    // ──────────────────── State ────────────────────
    uint256 private itemCounter;
    address public  admin;

    mapping(uint256 => Item) public items;
    uint256[] public itemIds;

    // finder  => list of item IDs they registered
    mapping(address => uint256[]) private finderItems;
    // owner   => list of item IDs they claimed
    mapping(address => uint256[]) private ownerItems;

    // ──────────────────── Events ───────────────────
    event ItemReported(
        uint256 indexed itemId,
        address indexed finder,
        string  name,
        string  imageHash,
        uint256 timestamp
    );
    event ClaimFiled(
        uint256 indexed itemId,
        address indexed owner,
        uint256 timestamp
    );
    event ItemReturned(
        uint256 indexed itemId,
        address indexed owner,
        string  confirmImageHash,
        uint256 timestamp
    );
    event ItemDisputed(
        uint256 indexed itemId,
        address indexed admin,
        uint256 timestamp
    );
    event DisputeResolved(
        uint256 indexed itemId,
        Status  newStatus,
        address indexed admin,
        uint256 timestamp
    );

    // ──────────────────── Modifiers ────────────────
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }
    modifier itemExists(uint256 itemId) {
        require(itemId > 0 && itemId <= itemCounter, "Item does not exist");
        _;
    }

    // ──────────────────── Constructor ──────────────
    constructor() {
        admin = msg.sender;
    }

    // ──────────────────── Core Functions ───────────

    /// @notice Register a found item with details and an IPFS image hash.
    function reportItem(
        string calldata name,
        string calldata description,
        string calldata location,
        string calldata imageHash
    ) external returns (uint256) {
        require(bytes(name).length > 0,      "Name cannot be empty");
        require(bytes(location).length > 0,  "Location cannot be empty");
        require(bytes(imageHash).length > 0, "Image hash cannot be empty");

        itemCounter++;
        uint256 newId = itemCounter;

        items[newId] = Item({
            id:               newId,
            name:             name,
            description:      description,
            location:         location,
            imageHash:        imageHash,
            confirmImageHash: "",
            finder:           msg.sender,
            owner:            address(0),
            status:           Status.Reported,
            reportedAt:       block.timestamp,
            claimedAt:        0,
            returnedAt:       0
        });

        itemIds.push(newId);
        finderItems[msg.sender].push(newId);

        emit ItemReported(newId, msg.sender, name, imageHash, block.timestamp);
        return newId;
    }

    /// @notice Original owner claims the item. Cannot be the finder.
    function fileClaim(uint256 itemId) external itemExists(itemId) {
        Item storage item = items[itemId];
        require(item.status == Status.Reported, "Item must be in Reported status");
        require(msg.sender != item.finder,      "Finder cannot claim own item");

        item.owner     = msg.sender;
        item.status    = Status.Claimed;
        item.claimedAt = block.timestamp;

        ownerItems[msg.sender].push(itemId);

        emit ClaimFiled(itemId, msg.sender, block.timestamp);
    }

    /// @notice Owner confirms they received the item and uploads a photo.
    function confirmReturn(
        uint256 itemId,
        string calldata confirmImageHash
    ) external itemExists(itemId) {
        Item storage item = items[itemId];
        require(item.status == Status.Claimed,          "Item must be in Claimed status");
        require(msg.sender == item.owner,               "Only the claimant can confirm return");
        require(bytes(confirmImageHash).length > 0,     "Confirmation image hash required");

        item.confirmImageHash = confirmImageHash;
        item.status           = Status.Returned;
        item.returnedAt       = block.timestamp;

        emit ItemReturned(itemId, msg.sender, confirmImageHash, block.timestamp);
    }

    // ──────────────────── Admin Functions ──────────

    /// @notice Admin flags a suspicious item.
    function disputeItem(uint256 itemId) external onlyAdmin itemExists(itemId) {
        Item storage item = items[itemId];
        require(
            item.status == Status.Reported || item.status == Status.Claimed,
            "Can only dispute Reported or Claimed items"
        );

        item.status = Status.Disputed;
        emit ItemDisputed(itemId, msg.sender, block.timestamp);
    }

    /// @notice Admin resolves a dispute — can set to Reported or Claimed.
    function resolveDispute(
        uint256 itemId,
        Status newStatus
    ) external onlyAdmin itemExists(itemId) {
        Item storage item = items[itemId];
        require(item.status == Status.Disputed, "Item must be in Disputed status");
        require(
            newStatus == Status.Reported || newStatus == Status.Claimed,
            "Can only resolve to Reported or Claimed"
        );

        item.status = newStatus;
        // If resolving back to Reported, clear the claimant
        if (newStatus == Status.Reported) {
            item.owner     = address(0);
            item.claimedAt = 0;
        }

        emit DisputeResolved(itemId, newStatus, msg.sender, block.timestamp);
    }

    // ──────────────────── View Functions ───────────

    function getItem(uint256 itemId)
        external view itemExists(itemId) returns (Item memory)
    {
        return items[itemId];
    }

    function getTotalItems() external view returns (uint256) {
        return itemCounter;
    }

    function getAllItemIds() external view returns (uint256[] memory) {
        return itemIds;
    }

    function getItemsByFinder(address finder)
        external view returns (uint256[] memory)
    {
        return finderItems[finder];
    }

    function getItemsByOwner(address owner)
        external view returns (uint256[] memory)
    {
        return ownerItems[owner];
    }
}