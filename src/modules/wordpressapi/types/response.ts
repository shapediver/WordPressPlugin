
/**
 * ShapeDiver Wordpress API response body for "get_user_profile" request
 * @see https://developer.wordpress.org/reference/classes/wp_user/
 */
export interface IWordpressGetUserProfileResponse {
    /** 
     * Wordpress user ID. 
     * TODO clarify the value of this field for anonymous users.
     */
    id: number
    /**
     * User email.
     * TODO clarify the value of this field for anonymous users.
     */
    email: string
    /**
     * Name of the user.
     * TODO clarify the value of this field for anonymous users.
     */
    name: string
}

/**
 * ShapeDiver Wordpress API response body for "get_product_data" request
 * @see https://woocommerce.github.io/code-reference/classes/WC-Product.html
 */
export interface IWordpressGetProductDataResponse {
    /** WooCommerce product id */
    id: number
    name: string
    price: string
    embedding_ticket?: string
    model_view_url?: string
    slug?: string
    model_state_id?: string
    /**
     * Optional URL (relative or absolute) to a configurator.
     * Overrides the default configurator URL.
     */
    configurator_url?: string,
    /**
     * Optional URL (relative or absolute) to a settings JSON file.
     */
    settings_url?: string,
}

/**
 * A cart item.
 */
export interface IWordpressCartItem {
    /**
     * The key of the cart item.
     */
    key: string
    /**
     * The id of the product.
     * @see https://woocommerce.github.io/code-reference/classes/WC-Product.html
     */
    product_id: number
    /**
     * Optional id of the production variation.
     * 
     * For an explanation of the distinction between product and production variation 
     * in WooCommerce @see https://chatgpt.com/share/e/0d8513f5-5285-493c-a6fc-b95b75761628
     */
    variation_id?: number
    /**
     * Quantity of the cart item.
     */
    quantity: number
    /**
     * The name of the product.
     * @see https://woocommerce.github.io/code-reference/classes/WC-Product.html#method_get_name
     */
    product_name: string
    /**
     * The product's active price.
     * @see https://woocommerce.github.io/code-reference/classes/WC-Product.html#method_get_price
     */
    product_price: string
    /**
     * TODO type this
     */
    custom_data?: Record<string, string>
    /**
     * The custom price used to override the product's price.
     */
    custom_price?: number
}

/**
 * The totals of the cart.
 */
export interface IWordpressCartTotals {
    /**
     * Cart sub total (after calculation).
     * @see https://woocommerce.github.io/code-reference/classes/WC-Cart.html#method_get_subtotal
     */
    subtotal: string
    /**
     * Cart total after calculation.
     * @see https://woocommerce.github.io/code-reference/classes/WC-Cart.html#method_get_total
     */
    total: string
}

/**
 * ShapeDiver Wordpress API response body for "get_cart" request
 */
export interface IWordpressGetCartResponse {
    /**
     * The cart items.
     */
    items: IWordpressCartItem[]
    /**
     * The cart totals.
     */
    totals: IWordpressCartTotals
}

/**
 * ShapeDiver Wordpress API response body for "add_to_cart" request
 * @see https://woocommerce.github.io/code-reference/classes/WC-Cart.html#method_add_to_cart
 */
export interface IWordpressAddToCartResponse {
    /**
     * Message from the add_to_cart request handler. 
     * This is set both on success and failure.
     */
    message: string
    /**
     * The cart item key.
     * This is set on success.
     */
    cart_item_key?: string
}

