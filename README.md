# TeknoyCart 🖥️ (Web Admin Dashboard)

The administrative web panel for the **TeknoyCart** campus e-commerce platform. Built with **React** + **Vite** for blazing fast local development and instant hot module replacement (HMR), fully integrated with the shared **Supabase** backend.

---

## 🚀 Getting Started

Follow these steps to run the Web Admin app on your local machine.

### 📋 Prerequisites

Ensure you have the following installed:
- **Node.js** (v18.x or higher recommended)
- **npm** (comes packaged with Node.js)

---

## 🛠️ Installation & Setup

1. Open your terminal and navigate to the web admin directory:
   ```bash
   cd TeknoyCart_Web
   ```

2. Install all required dependencies and node modules:
   ```bash
   npm install
   ```

---

## 🏃 Running the App

Start the Vite local development server:
```bash
npm run dev
```

Once running, navigate to the local address displayed in your terminal (typically **`http://localhost:5173`**).

---

## 🔑 Demo & Presentation Accounts

The app connects to the shared Supabase project. You can log in using the pre-seeded admin/merchant accounts:

- **Email**: `capstone.team45@cit.edu`
- **Password**: `teknoycart2026`

---

## 📂 Project Structure

A quick guide to the main directories inside `src/`:
```
src/
├── assets/         # App logos and design assets
├── components/     # Reusable UI widgets and layout views
├── services/
│   └── supabase.js # Pre-configured Supabase client connection (URL & Anon Key)
├── index.css       # Core Tailwind CSS and premium custom variable tokens
├── main.jsx        # App entry point
└── App.jsx         # Main router, navigation panels, and admin screen sections
```

---

## 🌐 Supabase Integration
The web app is serverless. The endpoint URL and Anon Keys are already configured out of the box in `src/services/supabase.js`. You do **not** need to set up any `.env` file to start developing or running the project.
