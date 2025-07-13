# Octopus Spain Monitor

Extract and cache Octopus Energy consumption data.

## Features

- Extracts daily energy consumption data from the Octopus Energy API.
- Caches data locally in JSON files.
- Provides an API to generate consumption reports.

## Prerequisites

- Node.js
- An Octopus Energy account

## Installation

1.  Clone the repository:
    ```sh
    git clone https://github.com/jdvr/octopus-spain-monitor.git
    cd octopus-spain-monitor
    ```
2.  Install dependencies:
    ```sh
    npm install
    ```

## Configuration

1.  Create a `.env` file by copying the sample file:
    ```sh
    cp .env.sample .env
    ```
2.  Edit the `.env` file and add your Octopus Energy credentials and property details:
    ```
    API_URL=https://api.octopusenergy.es
    OCTOPUS_EMAIL=your-email@example.com
    OCTOPUS_PASSWORD=your-password
    OCTOPUS_PROPERTY_ID=your-property-id
    ```

## Usage

### Running the Application

To start the server, run:

```sh
npm start
```

The server will start on `http://localhost:7000`.

### API Endpoints

- `GET /update?year=<year>&month=<month>`: Extracts and caches consumption data for the specified month and year. If `year` and `month` are not provided, it will use the current month and year.
- `GET /report/last/:days/days`: Returns a consumption report for the last `n` days.
- `GET /report/:year`: Returns a consumption report for the specified year.
- `GET /report/:year/:month`: Returns a consumption report for the specified month and year.

### Running Tests

To run the test suite, use:

```sh
npm test
```

### Linting

To check the code for linting errors, run:

```sh
npm run lint
```

To automatically fix linting errors, run:

```sh
npm run lint:fix
```
