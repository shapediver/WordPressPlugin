# ShapeDiver WordPress Plugin

This plugin integrates ShapeDiver functionality into WordPress and WooCommerce.

## Project Overview

The ShapeDiver WordPress Plugin is designed to enhance WordPress and WooCommerce sites with ShapeDiver's 3D model visualization capabilities. This plugin allows for seamless integration of ShapeDiver's technology into your WordPress environment.

## Features

- Integration with WordPress and WooCommerce
- 3D model visualization powered by ShapeDiver
- Easy installation and configuration

## Development Setup

### Prerequisites

- Docker and Docker Compose
- Node.js and npm

### Getting Started

1. Clone the repository
2. Install dependencies: `npm install`

### Development Commands

The following npm scripts are available for development:

- `npm run dev:start`: Start the development environment in detached mode
- `npm run dev:stop`: Stop the development environment
- `npm run dev`: Start the development environment and watch for changes
- `npm run dev:reset`: Reset the development environment (removes volumes)
- `npm run dev:status`: Check the status of the development environment
- `npm run build`: Build the plugin for production

### Docker Environment

The project uses Docker for local development. The `docker-compose.yml` file sets up:

- A MariaDB database
- A WordPress instance with the plugin directory mounted

To access the WordPress site, visit `http://localhost:3000` after starting the development environment.

## Building the Plugin

To build the plugin for production:

1. Run `npm run build` or `./build.sh`
2. The script will:
   - Compile TypeScript to JavaScript
   - Copy necessary PHP and CSS files
   - Create a zip archive of the plugin

The resulting zip file can be found in the project root directory.

## License

This project is licensed under the MIT license.

## Author

ShapeDiver GmbH

TODO 
eslint
