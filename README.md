# Project D 🏎️

**Project D** is a high-performance, client-side vehicle datalog visualization tool inspired by Initial D. It allows automotive enthusiasts and tuners to analyze performance metrics from CSV logs with a premium, focused interface.

## Features

- **📊 Interactive Visualization**: Responsive line charts using Recharts with zoom and tooltips.
- **🔄 Unit Conversion**: Real-time conversion for global units:
  - **Pressure**: psig ↔ bar ↔ kPa
  - **Speed**: mph ↔ km/h
  - **Temperature**: °F ↔ °C
  - **Torque**: Nm ↔ kgfm
- **📈 Smart Statistics**: Automatic calculation of Min, Max, and Average values for visible data.
- **🎨 Static Color Mapping**: Consistent colors for data series that don't shift when toggling visibility.
- **🌗 Dark Mode**: Sleek dark mode support for late-night tuning sessions.
- **⚡ Client-Side Processing**: Fast parsing using Papaparse; data never leaves your browser.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4
- **UI Library**: ShadCN UI
- **Charts**: Recharts
- **Parsing**: Papaparse

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

3. **Open the app**:
   Navigate to [http://localhost:3000](http://localhost:3000).

## Usage

1. **Upload**: Drag and drop your datalog CSV file.
2. **Analyze**: Use the sidebar to toggle metrics. The chart and stats verify update instantly.
3. **Configure**: Use the "Units" dropdown in the header to switch preferred units.

## License

MIT
