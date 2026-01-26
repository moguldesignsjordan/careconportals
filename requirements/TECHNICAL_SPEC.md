# Technical Specification

## Tech Stack
- **Framework**: React 19.2.3
- **Styling**: Tailwind CSS (Utility-first architecture)
- **Icons**: Lucide React
- **Charts**: Recharts (for project progress and financial tracking)
- **Deployment**: Vite (Standard for high-performance React apps)

## Component Architecture
- **Sidebar.tsx**: Central navigation with role-based visibility.
- **Messaging.tsx**: Real-time chat simulation with @mention tagging system.
- **ProjectDetails.tsx**: Heavy-duty view handling the project timeline, status updates, and lead contact.
- **Dashboard[Role].tsx**: Role-specific views ensuring data security and relevant context.

## State Management
- **Current**: Local React state (`useState`) with simulated API calls using `simulateApi` utility in `App.tsx`.
- **Planned**: Integration with Firebase for real-time database synchronization and Google Authentication.

## Design System
- **Primary Color**: `#F15A2B` (Care Orange)
- **Secondary Color**: `#1A1A1A` (Deep Dark)
- **Font**: Inter (Modern sans-serif)
- **Aesthetics**: High-contrast, card-based UI with "Glassmorphism" elements in headers.
