import { IECommerceApiConnector } from "shared/modules/ecommerce/types/ecommerceapi";

/**
 * Options for loading a configurator.
 */
export interface IConfiguratorLoaderOptions {

    /** 
     * Id of the product whose configurator should be loaded. 
     */
    productId: string

    /** 
     * Optional id of the ShapeDiver model state to start the configurator with. 
     * If provided, this overrides the default model state id that might be defined by the product.
     */
    modelStateId?: string

    /**
     * The configurator base URL. This is the fallback (globally defined) base URL 
     * that may be overridden by the product data.
     */
    baseUrl: string

    /**
     * Context to be passed to the configurator. Typical values: 
     *   * undefined (default)
     *   * "cart" (opened from the cart)
     *   * "order" (opened from an order)
     */
    context?: string
}

/**
 * Loader for configurators.
 */
export interface IConfiguratorLoader {

    /**
     * Load the configurator defined by the provided options into the given iframe. 
     * In case the provided options do not result in a change of the configurator,
     * the iframe will not be reloaded.
     * 
     * @param iframe 
     * @param options 
     */
    load(iframe: HTMLIFrameElement, options: IConfiguratorLoaderOptions): Promise<IECommerceApiConnector | undefined>

}

