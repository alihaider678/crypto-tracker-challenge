/** Raw GET /api/v3/ticker/24hr item. Binance sends decimals as strings. */
export type BinanceTicker24hr = {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
};

/** One item of the !miniTicker@arr stream. */
export type BinanceMiniTicker = {
  e: "24hrMiniTicker";
  /** Event time (ms) */
  E: number;
  s: string;
  /** Close (last) price */
  c: string;
  o: string;
  h: string;
  l: string;
  /** Base asset volume */
  v: string;
  /** Quote asset volume */
  q: string;
};

/**
 * Raw GET /api/v3/klines row:
 * [openTime, open, high, low, close, volume, closeTime, quoteVolume,
 *  trades, takerBuyBase, takerBuyQuote, ignore]
 */
export type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

/** A ticker as the app uses it: parsed numbers plus derived fields. */
export type Ticker = {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  /** Full coin name, or the base asset when we don't know it. */
  name: string;
  lastPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  priceChange: number;
  priceChangePercent: number;
  /** 24h volume in the base asset */
  volume: number;
  /** 24h volume in the quote asset */
  quoteVolume: number;
  /** 24h trade count. Not in the mini-ticker stream, so it only refreshes via REST. */
  tradeCount: number;
  /** Time of the latest update (ms) */
  updatedAt: number;
  /** No trades for more than 24h: delisted or trading suspended. */
  halted: boolean;
};

export type Candle = {
  /** Candle open time (ms) */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
  trades: number;
  closeTime: number;
};
