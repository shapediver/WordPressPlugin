import { IWordpressAddToCartRequest } from "./request";
import { 
	IWordpressAddToCartResponse, 
	IWordpressGetCartResponse, 
	IWordpressGetProductDataResponse, 
	IWordpressGetUserProfileResponse 
} from "./response";

/**
 * ShapeDiver Wordpress API
 */
export interface IWordpressApi {
   
    /**
     * Get product data.
     * @param id The WooCommerce product id.
     */
    getProductData(id: number): Promise<IWordpressGetProductDataResponse>

    /**
     * Get the user profile.
     * TODO: Clarify how to differentiate between anonymous and authenticated users.
     */
    getUserProfile(): Promise<IWordpressGetUserProfileResponse>

    /**
     * Get the cart.
     */
    getCart(): Promise<IWordpressGetCartResponse>

    /**
     * Add an item to the cart.
     * @param data 
     */
    addToCart(data: IWordpressAddToCartRequest): Promise<IWordpressAddToCartResponse>

}

/**
 * Options for WordPressECommerceApiActions.
 */
export interface IWordPressECommerceApiActionsOptions {

    /** 
     * Id of the WooCommerce product to be used by default. 
     */
    productId: number

    /** 
     * Optional id of the ShapeDiver model state to start the configurator with. 
     * If provided, this overrides the default model state id that might be defined by the product.
     */
    modelStateId?: string

    /** Debug flag. */
    debug?: boolean

    /**
     * Handler for closing the configurator modal / window.
     */
    closeConfiguratorHandler: () => Promise<boolean>
}


/**
 * Options for creating a WordPress API.
 */
export interface IWordpressApiOptions {
    /**
     * Debug flag.
     */
	debug?: boolean

    /**
     * The URL of the WordPress API.
     */
    ajaxUrl: string

   
}

/**
 * Options for WordPressConfiguratorLoader.
 */
export type IWordPressConfiguratorLoaderOptions = 
    Partial<IWordpressApiOptions> &
    Pick<IWordPressECommerceApiActionsOptions, "closeConfiguratorHandler"> &
    {
        /**
         * Default URL of the JSON file defining the App Builder settings of the configurator.
         */
        defaultSettingsUrl: string | undefined
    }
