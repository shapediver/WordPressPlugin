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
