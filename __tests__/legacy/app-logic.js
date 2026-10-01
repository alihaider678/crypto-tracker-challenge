// Verbatim copies of the data logic in the original Vite app's src/App.jsx
// (removed in Phase 8; see `git show e1d7332:src/App.jsx`), used as the
// reference for parity tests. Do not "fix" them.

export const REQUIRED_PAIR = 'VANRYUSDT';

// App.jsx:9-49
export const getCoinImageUrl = (baseAsset) => {
    // This map helps resolve symbols from the API to the correct image file names.
    const symbolMap = {
        '1000SATS': 'sats',
        '1000PEPE': 'pepe',
        'WIF': 'dogwifcoin',
        'SHIB': 'shiba-inu',
        'BTC': 'btc',
        'ETH': 'eth',
        'SOL': 'sol',
        'XRP': 'xrp',
        'DOGE': 'doge',
        'ADA': 'ada',
        'AVAX': 'avax',
        'TRX': 'trx',
        'DOT': 'dot',
        'LINK': 'link',
        'MATIC': 'matic',
        'ICP': 'icp',
        'LTC': 'ltc',
        'BCH': 'bch',
        'NEAR': 'near',
        'UNI': 'uni',
        'FIL': 'fil',
        'ETC': 'etc',
        'ATOM': 'atom',
        'APT': 'apt',
        'BONK': 'bonk',
        'STX': 'stx',
        'SUI': 'sui',
        'LDO': 'ldo',
        'HBAR': 'hbar',
        'OP': 'op',
        'VET': 'vet',
        'GRT': 'grt',
        'TIA': 'tia',
        'AR': 'ar'
    };
    const mappedSymbol = symbolMap[baseAsset] || baseAsset.toLowerCase();
    return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${mappedSymbol}.png`;
};

// App.jsx:330-345 (fetchData body, minus fetch and setState)
export const processTickers = (data) => {
    const processedData = data
        .filter(coin => coin.symbol.endsWith('USDT'))
        .map(coin => ({
            ...coin,
            baseAsset: coin.symbol.replace('USDT', ''),
            quoteAsset: 'USDT'
        }));

    const vanryCoin = processedData.find(c => c.symbol === REQUIRED_PAIR);
    const otherCoins = processedData.filter(c => c.symbol !== REQUIRED_PAIR);

    if (vanryCoin) {
        return [vanryCoin, ...otherCoins];
    } else {
        return otherCoins;
    }
};

// App.jsx:359-381 (filteredAndSortedCoins memo body)
export const filterAndSort = (allCoins, searchTerm, sortBy) => {
    return allCoins
        .filter(coin =>
            coin.baseAsset.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            switch (sortBy) {
                case 'price_desc':
                    return parseFloat(b.lastPrice) - parseFloat(a.lastPrice);
                case 'price_asc':
                    return parseFloat(a.lastPrice) - parseFloat(b.lastPrice);
                case 'change_desc':
                    return parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent);
                case 'change_asc':
                    return parseFloat(a.priceChangePercent) - parseFloat(b.priceChangePercent);
                case 'name_desc':
                    return b.baseAsset.localeCompare(a.baseAsset);
                case 'name_asc':
                default:
                    return a.baseAsset.localeCompare(b.baseAsset);
            }
        });
};
