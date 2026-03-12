# Specification: IoT Smart Solutions Website Refactor

## 1. Overview
Refactor the existing `www.hktlora.com/index.html` to a high-end, professional IoT/SaaS product landing page using **Tailwind CSS**. The goal is to elevate the visual quality, improve user experience, and ensure mobile responsiveness.

## 2. Design System

### 2.1 Color Palette
- **Primary**: `slate-900` (#0f172a) - Deep background for Hero/Footer.
- **Accent**: `blue-600` (#2563eb) - Primary buttons, links, highlights.
- **Secondary**: `slate-50` (#f8fafc) - Section backgrounds.
- **Text**: `slate-700` (#334155) - Body text.
- **Success/Warning**: Standard Tailwind semantic colors.

### 2.2 Typography
- **Font Family**: 'Inter', sans-serif (Google Fonts).
- **Headings**: Bold, tight tracking.
- **Body**: Readable, relaxed line height.

### 2.3 Frameworks & Libraries
- **Tailwind CSS**: via CDN (v3.4) for rapid, utility-first styling.
- **Swiper**: Existing dependency, retained for carousels.
- **Google Fonts**: Inter.
- **Icons**: Heroicons (SVG inline) or FontAwesome (CDN).

## 3. Section Redesign

### 3.1 Header (Navbar)
- **Style**: Sticky, backdrop-blur (glassmorphism), white background with subtle border.
- **Layout**: Logo (Left), Nav Links (Center/Right), "Contact" CTA (Right).
- **Mobile**: Hamburger menu with slide-down drawer.

### 3.2 Hero Section
- **Style**: Dark theme (`slate-900`).
- **Content**: Large headline ("Intelligent IoT Solutions"), subheadline, dual CTA ("Get Started", "View Demo").
- **Visual**: Abstract tech background (CSS gradient/grid pattern).

### 3.3 Features (Core Advantages)
- **Layout**: 4-column grid.
- **Card**: White background, shadow-sm, hover:shadow-lg, hover:-translate-y-1 transition.
- **Icon**: Colored background circle with icon inside.

### 3.4 Products (Carousel)
- **Layout**: Swiper carousel.
- **Card**: Image area (placeholder/gradient), Title, Key Specs list, "Learn More" link.
- **Interaction**: Hover effect on card.

### 3.5 Solutions
- **Layout**: Grid of cards.
- **Card**: Prominent Title, "Core Value" highlight box, clear CTA button.

### 3.6 Trust (Social Proof)
- **Certifications**: Flex row of badges/text.
- **Partners**: Grayscale logo grid, opacity 50% -> 100% on hover.
- **Testimonials**: Cards with quote icon, text, author info.

### 3.7 Footer
- **Style**: Dark (`slate-900`).
- **Content**: Logo, Description, Link Columns (Product, Company, Resources), Copyright.

## 4. Technical Implementation
- **Single File**: Keep as `index.html`.
- **Clean Code**: Semantic HTML5 tags (`header`, `section`, `article`, `footer`).
- **Comments**: Class and function level comments (Author: 伍志勇).
