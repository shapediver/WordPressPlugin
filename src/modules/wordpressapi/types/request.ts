
/**
 * ShapeDiver Wordpress API request body for "add_to_cart" request
 */
export interface IWordpressAddToCartRequest {
    /** 
     * Id of the product to be added.
     */
    product_id: number

    /**
     * Quantity of the product to be added.
     */
    quantity?: number

    /**
     * Optional id of the production variation to use.
     * 
     * For an explanation of the distinction between product and production variation 
     * in WooCommerce @see https://chatgpt.com/share/e/0d8513f5-5285-493c-a6fc-b95b75761628
     */
    variation_id?: number

    /**
     * TODO: Type this, maybe using a type parameter.
     */
    custom_data?: Record<string, string>

    /**
     * Price of the product to be added.
     * TODO: Clarify if this can be optional.
     */
    custom_price?: number
}

export interface IWordpressGetProductDataRequest {
    /**
     * Id of the product.
     */
    product_id: number
}