# ⌚ CHRONOS — 3D Watch Experience

### An Interactive Luxury Watch Showcase

A cinematic, interactive 3D watch website designed to bring the details of luxury watchmaking to life. CHRONOS combines immersive 3D visualization, scroll-driven storytelling, and elegant black-and-gold aesthetics to create a premium digital experience.

> **Project Type:** Interactive 3D Frontend Experience
> **Status:** Completed — future enhancements planned

---

## ✨ Overview

CHRONOS is a luxury watch concept website where users can explore a detailed 3D watch through interactive rotation, scroll-triggered animations, and an exploded-view presentation.

The experience combines modern frontend technologies with 3D rendering and animation to create an engaging product showcase.

## 🚀 Features

* **Interactive 3D Watch:** Explore a detailed 3D watch model directly in the browser.
* **360° Drag-to-Rotate:** Rotate the watch using mouse or touch gestures.
* **Scroll-Driven Animations:** Experience cinematic transitions as you navigate through the website.
* **Exploded View:** Explore the watch's individual components through an animated presentation.
* **Interactive Component Explorer:** Discover watch components and their descriptions.
* **Premium Visual Design:** Minimal black-and-gold styling, elegant typography, and cinematic presentation.
* **Responsive Layout:** Designed to adapt to desktop, tablet, and mobile screens.
* **Registration Modal:** Open a form to enter your interest in the showcased watch.
* **Form Validation:** Validate required fields and display a success message.
* **3D Display Toggle:** Toggle the 3D experience using the website's available control.

## 🛠️ Tech Stack

| Technology        | Purpose                                         |
| ----------------- | ----------------------------------------------- |
| React             | Component-based user interface                  |
| TypeScript        | Type-safe application development               |
| Vite              | Development server and production build         |
| Three.js          | 3D graphics rendering                           |
| React Three Fiber | Three.js integration with React                 |
| React Three Drei  | Helpers for the 3D scene                        |
| GSAP              | Animation and scroll-driven interactions        |
| CSS               | Responsive layouts, styling, and visual effects |

## 🖥️ Getting Started

Follow these steps to run the project locally.

### Prerequisites

* Node.js and npm
* Git
* A code editor such as Visual Studio Code

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/chronos-3d-watch-experience.git
```

Replace `YOUR_USERNAME` with your GitHub username.

### 2. Navigate to the project directory

```bash
cd chronos-3d-watch-experience
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the development server

```bash
npm run dev
```

Open the local URL displayed in your terminal to explore the website.

### 5. Create a production build

```bash
npm run build
```

Vite generates the production files in the `dist` directory.

## 📁 Project Structure

```text
chronos-3d-watch-experience/
├── public/
│   ├── models/
│   │   └── dive-watch.glb
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── sections/
│   │   │   ├── Closing.tsx
│   │   │   ├── RegisterModal.tsx
│   │   │   ├── RegisterModal.css
│   │   │   ├── Hero.tsx
│   │   │   ├── Reveal.tsx
│   │   │   ├── Exploded.tsx
│   │   │   ├── Explorer.tsx
│   │   │   └── Specimen.tsx
│   │   ├── ModelStage.tsx
│   │   ├── WatchModel.tsx
│   │   ├── Annotations.tsx
│   │   ├── Loader.tsx
│   │   └── Nav.tsx
│   ├── hooks/
│   ├── lib/
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 🎮 How to Explore

1. Open the website and experience the introductory hero section.
2. Drag the 3D watch to explore it from different angles.
3. Scroll through the page to experience the animated watch presentation.
4. Explore the exploded view and discover individual components.
5. Visit the specifications section to learn more about the concept.
6. Open the contact section and try the registration form.

## 📝 Registration Form Notice

CHRONOS is a concept website. The registration form currently demonstrates frontend validation and a success state.

**The form is not connected to a backend or database. Submitted details are not transmitted or stored.**

## 🔮 Future Enhancements

Potential improvements include:

* Backend integration for registration submissions.
* Database storage for customer enquiries.
* Further performance optimization for 3D assets.
* Additional watch models and interactive product experiences.
* Enhanced accessibility and mobile interaction testing.

## 🎯 Project Goals

This project explores how modern frontend technologies can be used to build immersive, interactive product experiences.

It demonstrates practical implementation of:

* Component-based React architecture.
* TypeScript in a frontend application.
* Browser-based 3D rendering.
* Interactive 3D model manipulation.
* Scroll-triggered animation workflows.
* Responsive CSS design.
* Form validation and user interaction.
* Production builds with Vite.

## 👨‍💻 Author

**Naveen Kumar**

Frontend Development | React | TypeScript | Three.js

---

*CHRONOS is a conceptual luxury watch experience created for design and development exploration. It is not an official watch manufacturer or an online store.*
