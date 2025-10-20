# Real-Time Crypto Tracker

This is a responsive single-page application built with React and Vite that displays real-time cryptocurrency prices from the Binance API. The project was developed as part of a technical build challenge.

## Live Demo

[https://crypto-tracker-challenge.vercel.app/](https://crypto-tracker-challenge.vercel.app/)

## Features

- **Live Market Data**: Displays a list of cryptocurrencies with real-time prices and 24-hour percentage change.
- **Mandatory First Pair**: The Vanry/USDT pair is always displayed as the first item on the list.
- **Detail View**: Clicking any coin opens a detailed view with a 30-day historical price chart.
- **Search & Sort**: Includes a search bar for quick lookups and options to sort by name, price, or 24h change.
- **Responsive Design**: A clean, professional UI built with Tailwind CSS that works on all devices.
- **Dark/Light Mode**: A theme toggle for user preference.

## Tech Stack

- React
- Vite
- Tailwind CSS
- Recharts
- Hosted on Vercel

## How to Run Locally

<details>
<summary><strong>Click to expand instructions</strong></summary>

### Clone the repository

```bash
git clone https://github.com/<YOUR_USERNAME>/crypto-tracker-challenge.git
cd crypto-tracker-challenge
Install dependencies:
bash
Copy code
npm install
Install the charting library:
bash
Copy code
npm install recharts
Run the development server:
bash
Copy code
npm run dev
The application will be available at http://localhost:5173.

</details>
