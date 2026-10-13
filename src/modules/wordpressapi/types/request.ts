export type WordPressAjaxRequestType = {
	[key: string]: object | string | number | boolean | undefined;
};

/**
 * ShapeDiver Wordpress API request body for "add_to_cart" request
 */
export interface IWordpressAddToCartRequest extends WordPressAjaxRequestType {
	/**
	 * Id of the product to be added.
	 */
	product_id: number;

	/**
	 * Quantity of the product to be added.
	 */
	quantity?: number;

	/**
	 * Optional id of the product variation to use.
	 *
	 * For an explanation of the distinction between product and product variation
	 * in WooCommerce @see https://chatgpt.com/share/e/0d8513f5-5285-493c-a6fc-b95b75761628
	 */
	variation_id?: number;

	/**
	 * Custom data to be assigned to the cart item.
	 */
	custom_data?: IWordpressAddToCartCustomData;

	/**
	 * Price of the product to be added.
	 * TODO: Clarify if this can be optional.
	 */
	custom_price?: number;
}

/**
 * Custom data that can be added to a cart item.
 * Further keys are string line item properties from the e-commerce API.
 * `model_state_id` and `description` are reserved for the dedicated fields.
 */
export interface IWordpressAddToCartCustomData {
	/**
	 * The id of the ShapeDiver model state that should be linked to the cart item
	 */
	model_state_id?: string;

	/**
	 * The description of the cart (line) item to be added.
	 */
	description?: string;

	[key: string]: string | undefined;
}

export interface IWordpressGetProductDataRequest extends WordPressAjaxRequestType {
	/**
	 * Id of the product.
	 */
	product_id: number;
}
