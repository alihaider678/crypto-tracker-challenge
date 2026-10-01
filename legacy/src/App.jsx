import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- Helper Functions & Constants ---
const API_BASE_URL = 'https://api.binance.com/api/v3';
const REQUIRED_PAIR = 'VANRYUSDT';

// ENHANCED function for getting coin images with a much larger map for tricky symbols
const getCoinImageUrl = (baseAsset) => {
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

// --- React Components (All in one file) ---

const Navbar = ({ isDarkMode, onToggleDarkMode, onTitleClick }) => (
    <nav className="sticky top-0 z-40 w-full backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                    <div 
                        className="flex-shrink-0 cursor-pointer group flex items-center gap-2"
                        onClick={onTitleClick}
                    >
                         <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 7L12 12L22 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 12V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            Crypto Tracker
                        </h1>
                    </div>
                </div>
                <div className="flex items-center">
                     <button
                        onClick={onToggleDarkMode}
                        className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900 shadow-sm hover:scale-105 transition-transform"
                    >
                        {isDarkMode ? '☀️' : '🌙'}
                    </button>
                </div>
            </div>
        </div>
    </nav>
);

const Footer = () => (
    <footer className="bg-white dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="col-span-2 md:col-span-1">
                    <div className="flex items-center gap-2">
                         <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 7L12 12L22 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 12V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Crypto Tracker</h2>
                    </div>
                    <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm">
                        The leading dashboard for real-time crypto market data and analytics.
                    </p>
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 tracking-wider uppercase">Quick Links</h3>
                    <ul className="mt-4 space-y-2">
                        <li><a href="#" className="text-base text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Market</a></li>
                        <li><a href="#" className="text-base text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">About Us</a></li>
                        <li><a href="#" className="text-base text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Contact</a></li>
                    </ul>
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 tracking-wider uppercase">Follow Us</h3>
                    <div className="flex mt-4 space-x-6">
                        <a href="#" className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors">
                            <span className="sr-only">Twitter</span>
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.71v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
                        </a>
                         <a href="#" className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors">
                            <span className="sr-only">GitHub</span>
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.165 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.03 1.595 1.03 2.688 0 3.848-2.338 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0022 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" /></svg>
                        </a>
                    </div>
                </div>
            </div>
            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8 text-center">
                 <p className="text-sm text-gray-500 dark:text-gray-400">&copy; 2025 Crypto Tracker. All rights reserved.</p>
            </div>
        </div>
    </footer>
);


// Skeleton Loader for initial loading state
const SkeletonLoader = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
        {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-gray-200 dark:bg-gray-800 rounded-xl shadow-md p-6 h-40 animate-pulse"></div>
        ))}
    </div>
);

// Crypto Card Item Component
const CryptoCardItem = ({ coin, onSelect }) => {
    const priceChange = parseFloat(coin.priceChangePercent);
    const isPositive = priceChange >= 0;
    const price = parseFloat(coin.lastPrice).toFixed(4);

    const TrendIndicator = () => (
        <svg width="100" height="40" viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 right-0 opacity-20 dark:opacity-10">
            <path d="M0 20 L20 25 L40 15 L60 22 L80 10 L100 18" stroke={isPositive ? "currentColor" : "currentColor"} strokeWidth="2" />
        </svg>
    );

    return (
        <div
            className={`relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col justify-between hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer border border-gray-100 dark:border-gray-700 transform group ${isPositive ? 'hover:shadow-green-500/20' : 'hover:shadow-red-500/20'}`}
            onClick={() => onSelect(coin)}
        >
            <TrendIndicator />
            <div className="flex items-center mb-4 z-10">
                <img
                    src={getCoinImageUrl(coin.baseAsset)}
                    onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/48x48/2a2a4a/ffffff?text=${coin.baseAsset.charAt(0)}&font=montserrat` }}
                    alt={coin.baseAsset}
                    className="w-10 h-10 rounded-full mr-4 shadow-sm"
                />
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{coin.baseAsset}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{coin.quoteAsset}</p>
                </div>
            </div>
            <div className="text-right z-10">
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">${price}</p>
                <p className={`text-md font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositive ? '▲' : '▼'} {priceChange.toFixed(2)}%
                </p>
            </div>
        </div>
    );
};

// Chart Component for Detail View
const ChartComponent = ({ symbol }) => {
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChartData = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/klines?symbol=${symbol}&interval=1d&limit=30`);
                if (!response.ok) throw new Error('Failed to fetch chart data');
                const data = await response.json();
                const formattedData = data.map(item => ({
                    date: new Date(item[0]).toLocaleDateString(),
                    price: parseFloat(item[4]), // Close price
                }));
                setChartData(formattedData);
            } catch (error) {
                console.error('Error fetching chart data:', error);
                setChartData([]);
            } finally {
                setLoading(false);
            }
        };

        if (symbol) {
            fetchChartData();
        }
    }, [symbol]);

    if (loading) {
        return <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">Loading Chart...</div>;
    }

    return (
        <div className="h-64 sm:h-80 w-full mt-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis dataKey="date" tick={{ fill: 'currentColor', fontSize: 12 }} />
                    <YAxis tickFormatter={(value) => `$${value.toFixed(4)}`} tick={{ fill: 'currentColor', fontSize: 12 }} domain={['dataMin', 'dataMax']} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            backdropFilter: 'blur(5px)',
                            border: '1px solid #ccc',
                            borderRadius: '0.5rem',
                            color: '#333',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                        }}
                        labelStyle={{ fontWeight: 'bold' }}
                        formatter={(value) => [`$${value.toFixed(6)}`, 'Price']}
                    />
                    <Line type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

// Detail View Component
const DetailView = ({ coin, onBack }) => {
    if (!coin) return null;

    const metrics = [
        { label: 'Market Cap', value: coin.quoteVolume ? `$${(parseFloat(coin.quoteVolume) * 1000).toLocaleString()}` : 'N/A' }, // Example calculation
        { label: '24h Volume', value: coin.volume ? parseFloat(coin.volume).toLocaleString() : 'N/A' },
        { label: '24h High', value: coin.highPrice ? `$${parseFloat(coin.highPrice).toFixed(4)}` : 'N/A' },
        { label: '24h Low', value: coin.lowPrice ? `$${parseFloat(coin.lowPrice).toFixed(4)}` : 'N/A' },
    ];
    
    const priceChange = parseFloat(coin.priceChangePercent);
    const isPositive = priceChange >= 0;

    return (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 overflow-y-auto animate-fade-in">
            <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
                <button
                    onClick={onBack}
                    className="mb-6 flex items-center text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Back to Market
                </button>

                <div className="flex items-center mb-6">
                     <img
                        src={getCoinImageUrl(coin.baseAsset)}
                        onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/48x48/2a2a4a/ffffff?text=${coin.baseAsset.charAt(0)}&font=montserrat` }}
                        alt={coin.baseAsset}
                        className="w-12 h-12 mr-4 rounded-full shadow-md"
                    />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{coin.baseAsset}</h1>
                        <p className="text-gray-500 dark:text-gray-400">{coin.symbol}</p>
                    </div>
                </div>

                <div className="mb-8">
                    <p className="text-4xl font-bold text-gray-900 dark:text-white">${parseFloat(coin.lastPrice).toFixed(4)}</p>
                    <p className={`text-lg font-semibold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                         {isPositive ? '▲' : '▼'} {priceChange.toFixed(2)}% (24h)
                    </p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {metrics.map(metric => (
                        <div key={metric.label} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                            <p className="text-sm text-gray-500 dark:text-gray-400">{metric.label}</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{metric.value}</p>
                        </div>
                    ))}
                </div>
                
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Price History (30 Days)</h2>
                <ChartComponent symbol={coin.symbol} />
            </div>
        </div>
    );
};


// Main App Component
function App() {
    const [allCoins, setAllCoins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCoin, setSelectedCoin] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name_asc');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const cryptoListRef = useRef(null);

    useEffect(() => {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setIsDarkMode(true);
        }
    }, []);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/ticker/24hr`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
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
                setAllCoins([vanryCoin, ...otherCoins]);
            } else {
                setAllCoins(otherCoins);
            }

        } catch (err) {
            setError('Failed to fetch data. Please try again later.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredAndSortedCoins = useMemo(() => {
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
    }, [allCoins, searchTerm, sortBy]);
    
    const handleSelectCoin = (coin) => {
        setSelectedCoin(coin);
        window.scrollTo(0, 0);
    };

    const handleBack = () => {
        setSelectedCoin(null);
    };

    const handleTitleClick = () => {
        if(selectedCoin) {
            setSelectedCoin(null);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
        fetchData();
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-800 dark:text-gray-200 font-sans transition-colors duration-300">
            {selectedCoin && <DetailView coin={selectedCoin} onBack={handleBack} />}
            
            <div className={`flex flex-col min-h-screen ${selectedCoin ? 'hidden' : ''}`}>
                <Navbar isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} onTitleClick={handleTitleClick} />
                
                <main className="flex-grow">
                    {/* --- Hero Section --- */}
                    <div className="relative text-center py-20 sm:py-32">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 dark:from-indigo-900 dark:via-purple-900 dark:to-gray-900 opacity-50 dark:opacity-30 blur-3xl rounded-b-full"></div>
                        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight drop-shadow-lg animate-fade-in">
                                Track the Pulse of the <span className="text-indigo-600 dark:text-indigo-400">Crypto Market</span>
                            </h1>
                            <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-700 dark:text-gray-300 drop-shadow-sm animate-fade-in-delay-1">
                                Your definitive dashboard for real-time prices, insightful analytics, and seamless market exploration.
                            </p>
                            <div className="mt-10 animate-fade-in-delay-2">
                                <button
                                    onClick={() => cryptoListRef.current?.scrollIntoView({ behavior: 'smooth' })}
                                    className="px-10 py-4 border border-transparent text-lg font-semibold rounded-full text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Explore Market
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* --- Main Content Section --- */}
                    <div ref={cryptoListRef} className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <header className="mb-10 text-center">
                            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white">
                                Market Overview
                            </h2>
                            <p className="text-md text-gray-500 dark:text-gray-400 mt-2">
                                Real-time data for all major currency pairs
                            </p>
                        </header>

                        <div className="flex flex-col md:flex-row gap-4 mb-8">
                            <div className="relative flex-grow">
                                <input
                                    type="text"
                                    placeholder="Search for a currency..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-6 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                />
                                <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm appearance-none"
                            >
                                <option value="name_asc">Sort by Name (A-Z)</option>
                                <option value="name_desc">Sort by Name (Z-A)</option>
                                <option value="price_desc">Sort by Price (High to Low)</option>
                                <option value="price_asc">Sort by Price (Low to High)</option>
                                <option value="change_desc">Sort by Change (High to Low)</option>
                                <option value="change_asc">Sort by Change (Low to High)</option>
                            </select>
                        </div>
                        
                        {error && <div className="text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-4 rounded-lg shadow-md animate-fade-in">{error}</div>}

                        {loading ? <SkeletonLoader /> : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredAndSortedCoins.map(coin => (
                                    <CryptoCardItem key={coin.symbol} coin={coin} onSelect={handleSelectCoin} />
                                ))}
                            </div>
                        )}
                    </div>
                </main>
                <Footer />
            </div>
        </div>
    );
}

export default App;