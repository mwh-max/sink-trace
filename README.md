# SinkTrace

**SinkTrace** is a lightweight simulator for visualizing pressure fluctuations in municipal water grids. Designed for solo development and exploration, it helps detect possible infrastructure damage, silent leaks, and reversed flow behavior in junction nodes.

Built in Vite + React, SinkTrace runs a diagnostic loop every few seconds, updates flagged pressure drops, and renders a dynamic pressure-loss log—all within an intuitive layout that blends technical clarity with emotional urgency.

---

## Features

- 🧠 Real-time pressure simulation using modular diagnostic logic
- 💧 Flow behavior tracking with visual alerts for unsafe conditions
- 📝 Rolling log of flagged junctions and timestamps
- 📊 Live grid map powered by semantic styling and responsive design

---

## Getting Started

### Install dependencies:
```bash
npm install


# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

