/**
 * Quote assets of currently TRADING Binance spot pairs (checked against
 * /api/v3/exchangeInfo on 2026-10-01: all 1,374 trading pairs parse
 * correctly). Longest first, so "FDUSD" wins over "USD" and "USDT" over "U".
 *
 * Retired quotes (AEUR, BIDR, BUSD, TUSD, PAX, ...) are deliberately left
 * out: they are suffixes of live quotes and would mis-parse pairs like
 * ADAEUR (-> AEUR) or BNBUSD (-> BUSD). Pairs that only trade against a
 * retired quote are halted anyway and get hidden from listings.
 */
export const KNOWN_QUOTES = [
  "FDUSD",
  "RLUSD",
  "EURI",
  "USD1",
  "USDC",
  "USDS",
  "USDT",
  "AED",
  "ARS",
  "BNB",
  "BRL",
  "BTC",
  "COP",
  "ETH",
  "EUR",
  "IDR",
  "JPY",
  "KZT",
  "MXN",
  "SOL",
  "THB",
  "TRY",
  "USD",
  "XRP",
  "ZAR",
  "U",
] as const;

/** Quotes whose prices read naturally in dollars. */
const USD_QUOTES = new Set<string>([
  "USDT",
  "USDC",
  "FDUSD",
  "USD",
  "USD1",
  "RLUSD",
  "USDS",
]);

/** Stablecoins (dollar and euro pegged), current and retired. */
const STABLECOINS = new Set<string>([
  "USDT",
  "USDC",
  "FDUSD",
  "USD1",
  "RLUSD",
  "USDS",
  "USDP",
  "TUSD",
  "BUSD",
  "DAI",
  "PYUSD",
  "EURI",
  "AEUR",
]);

export function isStablecoin(asset: string): boolean {
  return STABLECOINS.has(asset);
}

/**
 * A stablecoin priced in a stablecoin or plain USD (USDC/USDT, USDT/USD).
 * These barely move and dominate volume, so top movers skip them.
 */
export function isStablePair({ baseAsset, quoteAsset }: ParsedSymbol): boolean {
  return (
    isStablecoin(baseAsset) && (isStablecoin(quoteAsset) || quoteAsset === "USD")
  );
}

export type ParsedSymbol = { baseAsset: string; quoteAsset: string };

const SYMBOL_PATTERN = /^[A-Z0-9]+$/;

/**
 * Splits a Binance pair into base and quote by matching the longest known
 * quote suffix. For USDT pairs this is identical to the legacy
 * `symbol.replace('USDT', '')`. Returns null for unknown quotes.
 */
export function parseSymbol(symbol: string): ParsedSymbol | null {
  const upper = symbol.toUpperCase();
  if (!SYMBOL_PATTERN.test(upper)) return null;

  for (const quote of KNOWN_QUOTES) {
    if (upper.length > quote.length && upper.endsWith(quote)) {
      return {
        baseAsset: upper.slice(0, -quote.length),
        quoteAsset: quote,
      };
    }
  }
  return null;
}

export function pairLabel({ baseAsset, quoteAsset }: ParsedSymbol): string {
  return `${baseAsset}/${quoteAsset}`;
}

export function isUsdQuote(quoteAsset: string): boolean {
  return USD_QUOTES.has(quoteAsset);
}

/**
 * Base asset -> file name in spothq/cryptocurrency-icons. Copied as-is from
 * the legacy getCoinImageUrl (see __tests__/legacy/app-logic.js). Unmapped assets fall back
 * to the lowercase ticker.
 */
export const ICON_SLUG_MAP: Readonly<Record<string, string>> = {
  "1000SATS": "sats",
  "1000PEPE": "pepe",
  WIF: "dogwifcoin",
  SHIB: "shiba-inu",
  BTC: "btc",
  ETH: "eth",
  SOL: "sol",
  XRP: "xrp",
  DOGE: "doge",
  ADA: "ada",
  AVAX: "avax",
  TRX: "trx",
  DOT: "dot",
  LINK: "link",
  MATIC: "matic",
  ICP: "icp",
  LTC: "ltc",
  BCH: "bch",
  NEAR: "near",
  UNI: "uni",
  FIL: "fil",
  ETC: "etc",
  ATOM: "atom",
  APT: "apt",
  BONK: "bonk",
  STX: "stx",
  SUI: "sui",
  LDO: "ldo",
  HBAR: "hbar",
  OP: "op",
  VET: "vet",
  GRT: "grt",
  TIA: "tia",
  AR: "ar",
};

const ICON_BASE_URL = "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master";

/**
 * Icon URL for a base asset. The set has 32px and 128px PNGs (128 is the
 * legacy default). It's old, so many newer coins 404; CoinIcon shows a
 * fallback avatar for those.
 */
export function coinIconUrl(baseAsset: string, size: 32 | 128 = 128): string {
  const slug = ICON_SLUG_MAP[baseAsset] || baseAsset.toLowerCase();
  return `${ICON_BASE_URL}/${size}/color/${slug}.png`;
}

/** Base asset -> display name, for roughly the top 100 coins on Binance. */
export const SYMBOL_NAME_MAP: Readonly<Record<string, string>> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  USDT: "Tether",
  BNB: "BNB",
  SOL: "Solana",
  XRP: "XRP",
  USDC: "USD Coin",
  DOGE: "Dogecoin",
  ADA: "Cardano",
  TRX: "TRON",
  AVAX: "Avalanche",
  SHIB: "Shiba Inu",
  TON: "Toncoin",
  LINK: "Chainlink",
  DOT: "Polkadot",
  BCH: "Bitcoin Cash",
  NEAR: "NEAR Protocol",
  POL: "Polygon",
  MATIC: "Polygon",
  LTC: "Litecoin",
  ICP: "Internet Computer",
  UNI: "Uniswap",
  DAI: "Dai",
  PEPE: "Pepe",
  "1000PEPE": "Pepe",
  "1000SATS": "SATS (Ordinals)",
  APT: "Aptos",
  ETC: "Ethereum Classic",
  FET: "Artificial Superintelligence Alliance",
  HBAR: "Hedera",
  STX: "Stacks",
  FIL: "Filecoin",
  ATOM: "Cosmos",
  ARB: "Arbitrum",
  OP: "Optimism",
  IMX: "Immutable",
  RENDER: "Render",
  INJ: "Injective",
  SUI: "Sui",
  TIA: "Celestia",
  SEI: "Sei",
  VET: "VeChain",
  GRT: "The Graph",
  LDO: "Lido DAO",
  AAVE: "Aave",
  ALGO: "Algorand",
  FLOW: "Flow",
  XLM: "Stellar",
  BONK: "Bonk",
  WIF: "dogwifhat",
  FLOKI: "FLOKI",
  JUP: "Jupiter",
  PYTH: "Pyth Network",
  THETA: "Theta Network",
  SAND: "The Sandbox",
  MANA: "Decentraland",
  AXS: "Axie Infinity",
  GALA: "Gala",
  APE: "ApeCoin",
  CHZ: "Chiliz",
  EGLD: "MultiversX",
  XTZ: "Tezos",
  KAVA: "Kava",
  NEO: "Neo",
  IOTA: "IOTA",
  ZEC: "Zcash",
  DASH: "Dash",
  CRV: "Curve DAO",
  SNX: "Synthetix",
  COMP: "Compound",
  SUSHI: "SushiSwap",
  "1INCH": "1inch",
  CAKE: "PancakeSwap",
  RUNE: "THORChain",
  KSM: "Kusama",
  QNT: "Quant",
  ENS: "Ethereum Name Service",
  LRC: "Loopring",
  ZIL: "Zilliqa",
  ENJ: "Enjin Coin",
  BAT: "Basic Attention Token",
  ROSE: "Oasis",
  MINA: "Mina",
  WLD: "Worldcoin",
  ENA: "Ethena",
  ONDO: "Ondo",
  PENDLE: "Pendle",
  STRK: "Starknet",
  JTO: "Jito",
  W: "Wormhole",
  ORDI: "ORDI",
  NOT: "Notcoin",
  TRUMP: "Official Trump",
  FDUSD: "First Digital USD",
  TAO: "Bittensor",
  AR: "Arweave",
  CFX: "Conflux",
  GMT: "STEPN",
  S: "Sonic",
  TWT: "Trust Wallet Token",
  PAXG: "PAX Gold",
  USD1: "World Liberty Financial USD",
  WLFI: "World Liberty Financial",
  VANRY: "Vanar Chain",
};

export function coinName(baseAsset: string): string {
  return SYMBOL_NAME_MAP[baseAsset] ?? baseAsset;
}
