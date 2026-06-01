import {IAppBuilderUrlBuilderData} from "@AppBuilderShared/shared/lib/urlbuilder";
import {
	IECommerceApiActions,
	IECommerceApiConnector,
} from "@AppBuilderShared/features/ecommerce/config/ecommerceapi";

/**
 * Options for loading a configurator.
 */
export interface IConfiguratorLoaderOptions {
	/**
	 * Id of the product whose configurator should be loaded.
	 */
	productId: string;

	/**
	 * Optional id of the ShapeDiver model state to start the configurator with.
	 * If provided, this overrides the default model state id that might be defined by the product.
	 */
	modelStateId?: string;

	/**
	 * The configurator base URL. This is the fallback (globally defined) base URL
	 * that may be overridden by the product data.
	 */
	baseUrl: string;

	/**
	 * Context to be passed to the configurator. Typical values:
	 *   * undefined (default)
	 *   * "cart" (opened from the cart)
	 *   * "order" (opened from an order)
	 */
	context?: string;

	/**
	 * Optional settings for building the configurator URL. If provided these
	 * options override the other settings provided as part of this objects,
	 * as well as any settings configured for the product in WordPress.
	 */
	urlBuilderOptions?: IAppBuilderUrlBuilderData;

	/**
	 * Optional factory for API actions to use instead of the default WordPressECommerceApiActions.
	 */
	apiActionsFactory?: (
		defaultActions: IECommerceApiActions,
	) => IECommerceApiActions;
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
	load(
		iframe: HTMLIFrameElement,
		options: IConfiguratorLoaderOptions,
	): Promise<IECommerceApiConnector | undefined>;
}
