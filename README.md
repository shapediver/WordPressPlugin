# ShapeDiver WordPress Plugin

This plugin integrates 3D Configurators built using [ShapeDiver App Builder](https://help.shapediver.com/doc/shapediver-app-builder) into WordPress and WooCommerce. 

The App Builder features of ShapeDiver allow you to create ShapeDiver Apps - flexible, customizable single-page 3D web applications - using only Grasshopper. The ShapeDiver WordPress Plugin allows you to easily integrate ShapeDiver Apps into your WooCommerce store. 

Link ShapeDiver Apps to your products and let your customers configure and visualize your products in 3D. If you have configured a ShapeDiver App for a product, it opens as overlay on the product page. Using the custom “Add To Cart” action component for App Builder, users can play with the configurator and add their configured product to the cart.

<img alt="App Builder Overlay Example" src="resources/app_builder_overlay.png" width="640"/>

## How to use the plugin

Use the plugin manager of WordPress to install the plugin. Although we plan to do so, the plugin is not yet available via the WordPress plugin directory. Therefore please [download](https://github.com/shapediver/WordPressPlugin/releases) the plugin as a zip file, and use `Add New Plugin -> Upload Plugin`. 

### Plugin Settings

Once the plugin has been installed, you can configure global settings by navigating to `Settings -> ShapeDiver`. 
All of the settings are optional.  

The **Add to cart behavior** setting controls what happens after a customer adds a configured product from the overlay:

- **Ignore** (default): leave the configurator open
- **Close the configurator**: close the overlay; the customer stays on the product page
- **Close the configurator and redirect to cart**: close the overlay and go to the WooCommerce cart

<img alt="Plugin Settings" src="resources/plugin_settings.png" width="640"/>

### Product Settings

The plugin exposes settings on the "General" tab of the product edit page. 
Please see the tooltips for an explanation of the available settings. 

Typically you define the `slug` of the model you want to link to the product. As a prerequisite, you need to enable [iframe embedding](https://help.shapediver.com/doc/iframe-settings) for your model. Make sure to whitelist your domain(s) in your [embedding settings](https://help.shapediver.com/doc/setup-domains-for-embedding). 

As an alternative, you can specify `ticket` and `modelViewUrl` instead of the `slug`.  This requires [direct embedding](https://help.shapediver.com/doc/developers-settings) to be enabled for your model, and [strong authorization](https://help.shapediver.com/doc/developers-settings) to be disabled. As a result, the protection of your model will be less strict, but the model will load significantly faster.

The optional `Model State ID` allows you to define a state of parameters that should be loaded initially, instead of the model's default parameter values. 

You can customize the theme used by App Builder by specifying a `Settings JSON URL`. This also provides you with access to several advanced features of App Builder. Read more about the possibilities in our [help center](https://help.shapediver.com/doc/customize-a-theme). 

<img alt="Product Settings" src="resources/product_settings.png" width="640"/>

A button labelled "Customize" will be shown on the product page if a configurator is available. 
The button's label can be changed in the plugin settings. It will be disabled while loading the configurator as 
an iframe in the background. Clicking the button opens the configurator. The configurator overlays the page and
should contain a "Close configurator" button. While developing a configurator this button might be missing. If so, press the Escape
button quickly three times in a row to close the configurator. 

<img alt="Product page" src="resources/product_page_button.png" width="320"/>

### Shortcode for configurator button

When using a custom theme, the plugin might not be able to automatically add the configurator button. In this case, you can use the 
`[sd_configurator_button]` shortcode to place the button on the product page. The shortcode supports the following optional attributes: 

  * `label`: Button text
  * `class`: CSS classes to assign to the button

Example: `[sd_configurator_button label="My button text" class="myclass other-class yet_another_class"]`

## Development Setup

### Prerequisites

- [pnpm](https://pnpm.io/)
- [Node.js v20](https://nodejs.org/en/about/previous-releases)
- Docker and [Docker Compose](https://docs.docker.com/compose/install/)

### Getting Started

1. Clone the repository and run `git submodule update --init`
2. Install dependencies: `pnpm install`
3. Build the plugin: `pnpm run build`
4. Start WordPress: `pnpm run wp:start`
5. Open `http://localhost:8080/wp-admin` (user `admin`, password `admin`)

`wp:start` creates the WordPress and MariaDB containers, installs WordPress and WooCommerce, and activates this plugin from `./dist`.

If you previously used the Bitnami-based stack, run `pnpm run wp:reset` once. The old volumes are incompatible.

After code changes, rebuild the plugin (`pnpm run build`) and refresh the browser. A container restart is optional.

### Development Commands

The following scripts are available for development:

- `pnpm run wp:start`: Start WordPress and run first-time setup if needed
- `pnpm run wp:stop`: Stop the containers
- `pnpm run wp:restart`: Recreate the WordPress and database containers (keeps volumes)
- `pnpm run wp:reset`: CAUTION! Deletes WordPress data volumes and reinstalls from scratch
- `pnpm run wp:status`: Show docker status
- `pnpm run build`: Build and bundle the plugin for production
- `pnpm run start`: Standalone development mode of the plugin (without WordPress)
- `pnpm run optimize`: Optimized build for production

### Docker Environment

The project uses Docker for local development. `docker-compose.yml` sets up:

- Official MariaDB (`mariadb:lts`)
- Official WordPress (`wordpress:php8.3-apache`) with `./dist` mounted as the plugin
- A one-shot WP-CLI setup service that installs WooCommerce and activates the plugin

To access the WordPress site, visit `http://localhost:8080` after starting the development environment.

## Building the Plugin

To build the plugin for production:

1. Run `pnpm run build` or `./build.sh`
2. The script will:
   - Compile TypeScript to JavaScript
   - Copy necessary PHP and CSS files
   - Create a zip archive of the plugin

The resulting zip file can be found in the project root directory.

## Project-specific handler implementations

In case you need to implement custom handlers for the actions that the app running inside 
the iframe may call, check out [src/sd-specific.example.ts](src/sd-specific.example.ts) on
how to implement your custom handlers. You can find the implementation of the default 
handlers [here](src/modules/wordpressapi/api.ts#L180). 

## Updating parameter values 
It is possible to update parameter values of the App Builder app running inside the iframe. 
As an example, this can be used to implement custom UI elements in the product page, which allow to switch between preset configurations. The following code example shows how to initiate the update of parameter values: 

```
globalThis.ecommerceApi.updateParameterValues({
  state: {
    ["default"]: {
      "Position": "5,2,5"
    }
  }
});
```

This updates the value of the parameter called `Position` for the session whose id is `default`
to `5,2,5` and returns a promise which resolves once the parameter update has been completed. Await this promise to check for successful execution and catch potential errors. 

Multiple parameter values for multiple sessions can be updated at the same time. 

The type definition of the arguments of `updateParameterValues` can be found [here](https://github.com/shapediver/AppBuilderShared/blob/95ef6c23c6bf19836387a54e9c63312fef7cce7d/modules/ecommerce/types/ecommerceapi.ts#L262).  

## Creating and importing model states

Model states can be created and imported as shown in the following example. 

```
globalThis.ecommerceApi.createModelState();
```

`createModelState` returns a promise that resolves to the following shape: 

```JSON
{
  modelStateId: 'mVdTbVUO9rBRLWRh', 
  modelViewUrl: 'https://sdr7euc1.eu-central-1.shapediver.com'
}
```

Importing a model state works like this: 

```
globalThis.ecommerceApi.importModelState({modelStateId: "MODEL_STATE_ID"})
```

The type definitions of the arguments of `createModelState` and `importModelState` can be found here: 

  * [`createModelState`](https://github.com/shapediver/AppBuilderShared/blob/b9aecd70d300e3ff3b193fdb2f0e847c1ab9b176/features/model-state/config/createModelState.ts#L33)
  * [`importModelState`](https://github.com/shapediver/AppBuilderShared/blob/b9aecd70d300e3ff3b193fdb2f0e847c1ab9b176/features/model-state/config/importModelState.ts#L14)

## License

This project is licensed under the GPL v2 license.

## Author

ShapeDiver GmbH
