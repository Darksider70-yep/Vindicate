// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title VindicateReputationBadge
/// @notice Non-transferable reputation badge NFT for institutions, verifiers, and developers.
contract VindicateReputationBadge is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public nextTokenId;

    mapping(uint256 => string) private _tokenUris;
    mapping(uint256 => bytes32) public tokenTier;

    event BadgeMinted(uint256 indexed tokenId, address indexed recipient, bytes32 tier);

    error TransfersDisabled();

    constructor(address admin) ERC721("Vindicate Reputation Badge", "VRB") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        nextTokenId = 1;
    }

    function mintBadge(address recipient, bytes32 tier, string calldata metadataUri) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        require(recipient != address(0), "INVALID_RECIPIENT");

        tokenId = nextTokenId;
        nextTokenId += 1;

        _safeMint(recipient, tokenId);
        _tokenUris[tokenId] = metadataUri;
        tokenTier[tokenId] = tier;

        emit BadgeMinted(tokenId, recipient, tier);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _tokenUris[tokenId];
    }

    function approve(address, uint256) public pure override {
        revert TransfersDisabled();
    }

    function setApprovalForAll(address, bool) public pure override {
        revert TransfersDisabled();
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address previousOwner = _ownerOf(tokenId);
        if (previousOwner != address(0) && to != address(0)) {
            revert TransfersDisabled();
        }
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
