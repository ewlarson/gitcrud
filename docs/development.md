# Development Guide

This document provides instructions for setting up the development environment, running tests, and maintaining code quality for the Aardvark Web project.

## Getting Started

1.  Navigate to the `web` directory:
    ```bash
    cd web
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```

## Testing

This project uses [Vitest](https://vitest.dev/) for unit testing. The test environment is configured to use `jsdom` for React component testing.

-   **Run all tests**:
    ```bash
    npm test
    ```
-   **Run with coverage reports**:
    ```bash
    npm run coverage
    ```

## Linting & Formatting

We use [ESLint](https://eslint.org/) for static analysis and [Prettier](https://prettier.io/) for code formatting.

-   **Check for lint errors**:
    ```bash
    npm run lint
    ```
-   **Auto-fix lint errors**:
    ```bash
    npm run lint:fix
    ```
-   **Check formatting**:
    ```bash
    npm run format:check
    ```
-   **Auto-format code**:
    ```bash
    npm run format
    ```

## Code Quality Tools

### Duplicate Code Detection
We use [jscpd](https://github.com/kucherenko/jscpd) to identify and tracking copy-pasted code blocks.

-   **Run duplication detection**:
    ```bash
    npx jscpd src
    ```
    *Note: This command scans the `src` directory and reports any clones found along with a duplication percentage.*

### Cyclomatic Complexity
We use `eslint-plugin-complexity` to monitor cyclomatic complexity. While usually disabled for daily work to reduce noise, it is useful for periodic audits.

**To run a complexity audit:**

1.  Open `web/eslint.config.mjs`.
2.  Uncomment or add the complexity rule in the `rules` object:
    ```javascript
    rules: {
        // ... existing rules
        'complexity': ['warn', 10], // Warns if complexity > 10
    }
    ```
3.  Run the linter:
    ```bash
    npm run lint
    ```

## Project Structure

-   **`src/aardvark/`**: TypeScript interfaces and mapping logic for the OGM Aardvark metadata schema.
-   **`src/duckdb/`**: Client interface for DuckDB WASM, handling all in-browser database operations and SQL queries.
-   **`src/github/`**: Lightweight GitHub REST API client for fetching metadata trees and file content.
-   **`src/services/`**: logic for external integrations (e.g., `ImageService` for IIIF/Thumbnail resolution).
-   **`src/ui/`**: React components.
    -   **`src/ui/shared/`**: Common, reusable UI components like Tables, Pagination, and Headers.
