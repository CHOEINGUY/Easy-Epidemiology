# Easy-Epidemiology Web

This is the web application for Easy-Epidemiology, a tool for epidemiological analysis.

## Development Setup

### Prerequisites

*   Node.js (v16 or higher recommended)
*   npm (v8 or higher recommended)

### Installation

1.  Clone the repository.
2.  Install the dependencies:
    ```bash
    npm install
    ```

## Development Server

To run the application in development mode with hot-reloading, use the following command:

```bash
npm run serve
```

This will start the server at `http://localhost:8080`.

There are also modes for running without authentication:

```bash
npm run serve:noauth
```

## Code Quality

### Linting

This project uses ESLint to enforce code style and catch common errors. To run the linter, use:

```bash
npm run lint
```

### Code Formatting

This project uses Prettier for automatic code formatting. To format the entire codebase, run:

```bash
npm run format
```

**Note:** The first time you run this command, it may modify a large number of files.

## Testing

This project is set up to use Jest for unit testing. To run the tests, use:

```bash
npm test
```

**Note:** Currently, there are no tests implemented in the project. This is a key area for future improvement.

## Building for Production

To create a production-ready build of the application, use the following command:

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory. There are several build modes available in `package.json` for different deployment scenarios (e.g., `build:noauth`, `build:offline`).
