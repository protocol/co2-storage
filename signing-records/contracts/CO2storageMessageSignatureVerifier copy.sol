// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract CO2storageSignatureVerifier {
  constructor() {}

  function getContractAddress() public view returns (address) {
    return address(this);
  }

  function getChainId() public view returns (uint256) {
    return block.chainid;
  }

  function geteip712DomainHash () public view returns (bytes32) {
    return
    keccak256(
      abi.encode(
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        ),
        keccak256(bytes("CO2.storage Message")),
        keccak256(bytes("1")),
        block.chainid,
        address(this)
      )
    );
  }

  function gethashStruct(address signer, string memory message) public pure returns (bytes32) {
    return keccak256(
      abi.encode(
          keccak256("Record(address signer,string message)"),
          signer,
          keccak256(abi.encodePacked(message))
        )
    );
  }

  function verifySignature (address signer, string memory message, uint8 v, bytes32 r, bytes32 s)
    public
    view returns (bool) { 
      bytes32 eip712DomainHash = geteip712DomainHash();
      bytes32 hashStruct = gethashStruct(signer, message);
      bytes32 hash = keccak256(abi.encodePacked("\x19\x01", eip712DomainHash, hashStruct));
      address recoveredSigner = ecrecover(hash, v, r, s);
      return recoveredSigner == signer;
  }
}