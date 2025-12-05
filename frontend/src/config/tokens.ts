import { type Address } from "viem";

/**
 * Token contract addresses on Intuition Network (Chain ID: 1155)
 * Source: intuition-contracts-v2 SetupScript.s.sol
 */
export const TOKEN_ADDRESSES: Record<string, Address> = {
  // TRUST token on Intuition Network L3 (Mainnet)
  TRUST: (import.meta.env.VITE_TRUST_TOKEN_ADDRESS || "0x6cd905df2ed214b22e0d48ff17cd4200c1c6d8a3") as Address,
};

/**
 * ERC20 ABI for token operations (approve, transfer, balanceOf)
 */
export const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
] as const;


/**
 * Token contract addresses on Intuition Network (Chain ID: 1155)
 * Source: intuition-contracts-v2 SetupScript.s.sol
 */
export const TOKEN_ADDRESSES: Record<string, Address> = {
  // TRUST token on Intuition Network L3 (Mainnet)
  TRUST: (import.meta.env.VITE_TRUST_TOKEN_ADDRESS || "0x6cd905df2ed214b22e0d48ff17cd4200c1c6d8a3") as Address,
};

/**
 * ERC20 ABI for token operations (approve, transfer, balanceOf)
 */
export const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
] as const;


/**
 * Token contract addresses on Intuition Network (Chain ID: 1155)
 * Source: intuition-contracts-v2 SetupScript.s.sol
 */
export const TOKEN_ADDRESSES: Record<string, Address> = {
  // TRUST token on Intuition Network L3 (Mainnet)
  TRUST: (import.meta.env.VITE_TRUST_TOKEN_ADDRESS || "0x6cd905df2ed214b22e0d48ff17cd4200c1c6d8a3") as Address,
};

/**
 * ERC20 ABI for token operations (approve, transfer, balanceOf)
 */
export const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
] as const;


/**
 * Token contract addresses on Intuition Network (Chain ID: 1155)
 * Source: intuition-contracts-v2 SetupScript.s.sol
 */
export const TOKEN_ADDRESSES: Record<string, Address> = {
  // TRUST token on Intuition Network L3 (Mainnet)
  TRUST: (import.meta.env.VITE_TRUST_TOKEN_ADDRESS || "0x6cd905df2ed214b22e0d48ff17cd4200c1c6d8a3") as Address,
};

/**
 * ERC20 ABI for token operations (approve, transfer, balanceOf)
 */
export const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
] as const;


/**
 * Token contract addresses on Intuition Network (Chain ID: 1155)
 * Source: intuition-contracts-v2 SetupScript.s.sol
 */
export const TOKEN_ADDRESSES: Record<string, Address> = {
  // TRUST token on Intuition Network L3 (Mainnet)
  TRUST: (import.meta.env.VITE_TRUST_TOKEN_ADDRESS || "0x6cd905df2ed214b22e0d48ff17cd4200c1c6d8a3") as Address,
};

/**
 * ERC20 ABI for token operations (approve, transfer, balanceOf)
 */
export const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
] as const;


/**
 * Token contract addresses on Intuition Network (Chain ID: 1155)
 * Source: intuition-contracts-v2 SetupScript.s.sol
 */
export const TOKEN_ADDRESSES: Record<string, Address> = {
  // TRUST token on Intuition Network L3 (Mainnet)
  TRUST: (import.meta.env.VITE_TRUST_TOKEN_ADDRESS || "0x6cd905df2ed214b22e0d48ff17cd4200c1c6d8a3") as Address,
};

/**
 * ERC20 ABI for token operations (approve, transfer, balanceOf)
 */
export const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
] as const;


/**
 * Token contract addresses on Intuition Network (Chain ID: 1155)
 * Source: intuition-contracts-v2 SetupScript.s.sol
 */
export const TOKEN_ADDRESSES: Record<string, Address> = {
  // TRUST token on Intuition Network L3 (Mainnet)
  TRUST: (import.meta.env.VITE_TRUST_TOKEN_ADDRESS || "0x6cd905df2ed214b22e0d48ff17cd4200c1c6d8a3") as Address,
};

/**
 * ERC20 ABI for token operations (approve, transfer, balanceOf)
 */
export const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
] as const;


/**
 * Token contract addresses on Intuition Network (Chain ID: 1155)
 * Source: intuition-contracts-v2 SetupScript.s.sol
 */
export const TOKEN_ADDRESSES: Record<string, Address> = {
  // TRUST token on Intuition Network L3 (Mainnet)
  TRUST: (import.meta.env.VITE_TRUST_TOKEN_ADDRESS || "0x6cd905df2ed214b22e0d48ff17cd4200c1c6d8a3") as Address,
};

/**
 * ERC20 ABI for token operations (approve, transfer, balanceOf)
 */
export const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
] as const;