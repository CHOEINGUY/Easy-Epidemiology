# 🔬 Easy Epidemiology

> **역학조사 데이터 분석 웹 애플리케이션**  
> A web-based epidemiological investigation data analysis tool for public health professionals.

[![CI Pipeline](https://github.com/CHOEINGUY/Easy-Epidemiology/actions/workflows/ci.yml/badge.svg)](https://github.com/CHOEINGUY/Easy-Epidemiology/actions/workflows/ci.yml)
[![Vue 3](https://img.shields.io/badge/Vue-3.2-4FC08D?style=flat-square&logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Pinia](https://img.shields.io/badge/Pinia-3.0-FFDD57?style=flat-square)](https://pinia.vuejs.org/)
[![Vuetify](https://img.shields.io/badge/Vuetify-3.7-1867C0?style=flat-square&logo=vuetify)](https://vuetifyjs.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

---

## 📖 Overview

Easy Epidemiology is a comprehensive web application designed to streamline epidemiological investigation workflows. It provides epidemiologists and public health officials with tools to:

- Input and manage outbreak investigation data
- Perform statistical analyses (Case-Control, Cohort, Case Series studies)
- Visualize epidemic curves and clinical symptom distributions
- Auto-generate standardized investigation reports (HWPX format)

### 🎯 Target Users

- **역학조사관** (Epidemiological Investigators)
- **보건소 담당자** (Public Health Center Staff)
- **감염병 연구원** (Infectious Disease Researchers)

---

## ✨ Key Features

| Feature                        | Description                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------- |
| 📊 **Virtual Scroll Grid**     | High-performance data input with virtualized rendering for thousands of records |
| 👤 **Patient Characteristics** | Demographic analysis with age/sex distribution charts                           |
| 📈 **Epidemic Curve**          | Interactive epidemic curve visualization with incubation period analysis        |
| 🩺 **Clinical Symptoms**       | Attack rate analysis and symptom frequency charts                               |
| 🔬 **Case-Control Study**      | Odds Ratio (OR) calculation with 95% CI and chi-square test                     |
| 📋 **Cohort Study**            | Risk Ratio (RR) calculation with attributable risk analysis                     |
| 📁 **Case Series**             | Individual exposure time analysis for outbreak investigation                    |
| 📝 **Report Generator**        | Automated HWPX (Korean Word Processor) report generation                        |
| 🌐 **Multilingual**            | Korean (한국어) and English support via vue-i18n                                |
| 💾 **Offline Mode**            | Works without internet via Service Worker (file:// protocol)                    |

---

## 🛠️ Tech Stack

### Frontend

- **Framework**: Vue 3 (Composition API + `<script setup>`)
- **Language**: TypeScript 5.9
- **State Management**: Pinia 3.0
- **Routing**: Vue Router 4
- **UI Framework**: Vuetify 3 + TailwindCSS 3.4
- **Charts**: Chart.js + ECharts
- **i18n**: vue-i18n 9

### Data Processing

- **Statistics**: jstat (statistical calculations)
- **Excel**: xlsx (import/export)
- **Document**: JSZip + hwp.js (HWPX report generation)
- **Data Grid**: tui-grid + vue-virtual-scroller

### Development

- **Build Tool**: Vue CLI 5
- **Testing**: Jest + Vue Test Utils + Playwright
- **Linting**: ESLint + Prettier
- **CSS**: PostCSS + Autoprefixer

### Backend (Optional)

- **Auth API**: Cloudflare Workers (TypeScript)
- **Database**: Cloudflare D1 (SQLite)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/CHOEINGUY/Easy-Epidemiology.git
cd Easy-Epidemiology

# Install dependencies (automatically downloads Material Icons)
npm install
```

### Development

```bash
# Start development server (auth mode)
npm run serve

# Start development server (no auth mode - public access)
npm run serve:noauth
```

The app will be available at `http://localhost:8080`

---

## 📦 Build Modes

| Command                | Mode              | Description                                |
| ---------------------- | ----------------- | ------------------------------------------ |
| `npm run build`        | Production (Auth) | Requires Cloudflare Workers authentication |
| `npm run build:noauth` | No Auth           | Public access without login                |

### Build for Deployment

```bash
# Cloudflare Pages (auth required)
npm run build:auth

# Static hosting (no auth)
npm run build:noauth
```

---

## 📁 Project Structure

```
webpage_office/
├── public/                     # Static assets
│   ├── fonts/                  # Pretendard, Material Icons
│   ├── demo/                   # Sample data files
│   └── report_template*.zip    # HWPX report templates
├── src/
│   ├── auth/                   # Authentication (AuthManager, UserManager)
│   ├── components/
│   │   ├── AdminPanel/         # Admin dashboard
│   │   ├── AuthScreen/         # Login/Register UI
│   │   ├── CaseControl/        # Case-Control analysis
│   │   ├── CaseSeries/         # Case Series analysis
│   │   ├── ClinicalSymptoms/   # Symptom analysis
│   │   ├── CohortStudy/        # Cohort study analysis
│   │   ├── DataInputVirtualScroll/  # Main data grid (53 files)
│   │   ├── EpidemicCurve/      # Epidemic curve charts
│   │   ├── PatientCharacteristics/  # Demographics
│   │   ├── ReportWriter/       # HWPX report generator
│   │   └── UserManual/         # User guide
│   ├── i18n/                   # Translations (ko, en)
│   ├── stores/                 # Pinia stores
│   ├── types/                  # TypeScript definitions
│   ├── utils/                  # Utility functions
│   └── validation/             # Data validation logic
├── tests/                      # Jest unit tests
├── worker/                     # Cloudflare Workers (Auth API)
└── e2e/                        # Playwright E2E tests (TBD)
```

---

## 🧪 Testing

```bash
# Run all unit tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- --testPathPattern="gridStore"
```

### Current Test Coverage

| Area                           | Status               |
| ------------------------------ | -------------------- |
| Stores (dataLogic, gridStore)  | ✅ Covered           |
| Validation Logic               | ✅ Covered           |
| Composables (useEpidemicStats) | ✅ Covered           |
| Components                     | ✅ Covered (via E2E) |
| E2E Scenarios                  | ✅ Covered           |

---

## 📄 Available Scripts

| Script                    | Description                             |
| ------------------------- | --------------------------------------- |
| `npm run serve`           | Start dev server (auth mode)            |
| `npm run serve:noauth`    | Start dev server (no auth)              |
| `npm run build`           | Production build                        |
| `npm run lint`            | Run ESLint                              |
| `npm test`                | Run Jest tests                          |
| `npm run download-icons`  | Download Material Icons for offline use |
| `npm run embed-templates` | Embed report templates as Base64        |

---

## 🌐 Internationalization

The app supports:

- 🇰🇷 **Korean** (한국어) - Default
- 🇺🇸 **English**

Language can be switched via the UI language switcher.

Translation files are located in `src/i18n/locales/`.

---

## 🔐 Authentication Modes

### Auth Mode (Default)

- Requires Cloudflare Workers backend
- User registration with admin approval
- Role-based access control (admin, support, user)

### No Auth Mode

- Public access without login
- All features available
- Suitable for demonstrations or internal use

---

## 📊 Statistical Methods

### Case-Control Study

- **Odds Ratio (OR)** with 95% Confidence Interval
- Chi-square test with p-value
- Fisher's exact test for small samples

### Cohort Study

- **Risk Ratio (RR)** with 95% CI
- Attack Rate comparison
- Attributable Risk (AR)

### Epidemic Curve Analysis

- Incubation period estimation (median, range)
- Outbreak timeline visualization
- Peak detection

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is developed for public health research and education purposes.

---

## 👨‍💻 Author

**최인규 (Ingyu Choi)**

- Epidemiological Investigator & Full-Stack Developer
- Building tools to modernize public health workflows

---

<p align="center">
  <sub>Built with ❤️ for public health professionals</sub>
</p>
