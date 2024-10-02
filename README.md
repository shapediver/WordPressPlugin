# ShapeDiver WordPress Plugin

This plugin integrates 3D Configurators built using [ShapeDiver App Builder](https://help.shapediver.com/doc/shapediver-app-builder) into WordPress and WooCommerce. 

## Project Overview

The ShapeDiver WordPress Plugin is designed to enhance WordPress and WooCommerce sites with ShapeDiver's 3D model visualization capabilities. This plugin allows for seamless integration of ShapeDiver's technology into your WordPress environment.

## Features

- Integration with WordPress and WooCommerce
- 3D configuration and visualisation powered by ShapeDiver
- Easy installation and configuration

## Development Setup

### Prerequisites

- [pnpm](https://pnpm.io/)
- [Node.js v20](https://nodejs.org/en/about/previous-releases)
- Docker and [Docker Compose](https://docs.docker.com/compose/install/)

### Getting Started

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Build the plugin: `pnpm run build`
4. Copy `docker-compose.template.yml` to `docker-compose.yml`
5. Create and start the container: `pnpm run wp:start`
6. Navigate to `http://localhost:8080` and wait until WordPress is running
7. Uncomment the line in `docker-compose.yml` that mounts the plugin
8. Restart the container: `pnpm run wp:restart`

### Development Commands

The following scripts are available for development:

- `pnpm run wp:start`: Create the container if it hasn't been created before
- `pnpm run wp:stop`: Stop the container
- `pnpm run wp:restart`: Same as `wp:stop` followed by `wp:start`
- `pnpm run wp:reset`: CAUTION! Recreates the containers, your data stored in WordPress will be lost!
- `pnpm run wp:status`: Show docker status
- `pnpm run dev:status`: Check the status of the development environment
- `pnpm run build`: Build and bundle the plugin for production
- `pnpm run start`: Standalone development mode of the plugin (without WordPress)
- `pnpm run optimize`: Optimized build for production

### Docker Environment

The project uses Docker for local development. The `docker-compose.yml` file sets up:

- A MariaDB database
- A WordPress instance with the plugin directory mounted

To access the WordPress site, visit `http://localhost:8080` after starting the development environment.

## Building the Plugin

To build the plugin for production:

1. Run `pnpm run build` or `./build.sh`
2. The script will:
   - Compile TypeScript to JavaScript
   - Copy necessary PHP and CSS files
   - Create a zip archive of the plugin

The resulting zip file can be found in the project root directory.

## License

This project is licensed under the GPL v2 license.

## Author

ShapeDiver GmbH

# TODO 

  * eslint
  * Configurator button - feedback in case of configurator not connecting
  * development mode - possibility to save model state to product
