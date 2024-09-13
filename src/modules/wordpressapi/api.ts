import { IWordpressApi, IWordpressApiOptions, IWordPressECommerceApiActionsOptions } from "./types/api";
import { IWordpressAddToCartRequest, IWordpressGetProductDataRequest, WordPressAjaxRequestType } from "./types/request";
import { 
    IWordpressGetProductDataResponse, 
    IWordpressGetUserProfileResponse, 
    IWordpressGetCartResponse, 
    IWordpressAddToCartResponse 
} from "./types/response";
import { 
    IAddItemToCartData,
    IAddItemToCartReply,
	IECommerceApiActions,
    IGetUserProfileReply,
} from "../../shared/modules/ecommerce/types/ecommerceapi";

interface IWordPressAjaxResponse<T> {
    success: boolean
    data?: T
}

export class WordpressApi implements IWordpressApi {

    private ajaxurl: string
    private debug: boolean

    constructor(options: IWordpressApiOptions) {
        this.ajaxurl = options.ajaxUrl;
        this.debug = options.debug ?? false;
    }

    async request<Trequest extends WordPressAjaxRequestType, Tresponse>(
        method: string, 
        action: string, 
        request: Trequest extends any[] ? never : Trequest
    ): Promise<Tresponse> {

        // transform request object: any property that is not a primitive must be JSON stringified
        const _request: WordPressAjaxRequestType = {};
        for (const key in request) {
            if ( key === "action" )
                throw new Error("The request object cannot contain a property named 'action'");

            const value = request[key];
            if (typeof value === 'object' && value !== null) {
                _request[key] = JSON.stringify(value);
            }
            else if (value !== undefined) {
                _request[key] = value;
            }
        }

        const response = await fetch(this.ajaxurl, {
    
            method,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                // CAUTION: This can easily lead to trouble if the request object 
                // includes a property named "action". Therefore checking for this above.
                action,
                ..._request
            }),
        });

        // Handle 4XX or 5XX HTTP statuses
        if (!response.ok) {
            const errorResponse = await response.json();
            const msg = `WordpressApiError: ${response.status} ${response.statusText} ${errorResponse}`;
            this.log(msg);
            throw new Error(msg);
        }

        // TODO validate response using a zod schema
        const ajaxResponse = await response.json() as IWordPressAjaxResponse<Tresponse>;

        if (!ajaxResponse.success) {
            const msg = `WordpressApiError: ${ajaxResponse}`;
            this.log(msg);
            throw new Error(msg);
        }

        if (!ajaxResponse.data) {
            const msg = `WordpressApiError: No data: ${ajaxResponse}`;
            this.log(msg);
            throw new Error(msg);
        }

        return ajaxResponse.data as Tresponse;
    }

    log(...message: any[]): void {
		if (this.debug)
			console.log(`WordpressApi (ajaxurl = "${this.ajaxurl}"):`, ...message);
	}

    getProductData(id: number): Promise<IWordpressGetProductDataResponse> {
        return this.request<IWordpressGetProductDataRequest, IWordpressGetProductDataResponse>('POST', 'get_product_data', { product_id: id });
    }

    getUserProfile(): Promise<IWordpressGetUserProfileResponse> {
        return this.request<WordPressAjaxRequestType, IWordpressGetUserProfileResponse>('GET', 'get_user_profile', {});
    }

    getCart(): Promise<IWordpressGetCartResponse> {
        return this.request<WordPressAjaxRequestType, IWordpressGetCartResponse>('GET', 'get_cart', {});
    }

    addToCart(data: IWordpressAddToCartRequest): Promise<IWordpressAddToCartResponse> {
        return this.request<IWordpressAddToCartRequest, IWordpressAddToCartResponse>('POST', 'add_to_cart', data);
    }
    
}

/**
 * Implementation of the e-commerce API actions for WordPress.
 */
export class WordPressECommerceApiActions implements IECommerceApiActions {

    private wordpressApi: IWordpressApi
    private options: IWordPressECommerceApiActionsOptions
    private debug: boolean

    constructor(wordpressApi: IWordpressApi, options: IWordPressECommerceApiActionsOptions) {
        this.wordpressApi = wordpressApi;
        this.options = options;
        this.debug = options.debug ?? false;
    }

    async closeConfigurator(): Promise<boolean> {
        if (this.options.closeConfiguratorHandler) {
            return await this.options.closeConfiguratorHandler();
        }
        return false;
    }

    log(...message: any[]): void {
		if (this.debug)
			console.log(`WordPressECommerceApiActions (options = "${this.options}"):`, ...message);
	}

    async addItemToCart(data: IAddItemToCartData): Promise<IAddItemToCartReply> {
        
        let product_id: number = this.options.productId;
        if (data.productId) {
            try {
                product_id = parseInt(data.productId);
            }
            catch (e) {
                throw new Error(`Could not parse productId "${data.productId}" to an integer: ${e}`);
            }
        }

        // map request
        const request: IWordpressAddToCartRequest = {
            product_id,
            quantity: data.quantity,
            custom_price: data.price,
            custom_data: {
                model_state_id: data.modelStateId,
                // TODO Juan please implement to use the description when displaying the cart
                description: data.description,
            }
        }
        
        const result = await this.wordpressApi.addToCart(request);

        // map response

        // The ajax handler returns an object without a cart_item_key property in case of error.
        if (typeof result.cart_item_key !== "string" || result.cart_item_key.length === 0) {
            throw new Error(result.message ?? "Unknown error");
        }

        return {
            id: result.cart_item_key
        }
    }

    async getUserProfile(): Promise<IGetUserProfileReply> {
        const result = await this.wordpressApi.getUserProfile();

        // map response
        return {
            id: result.id+"",
            email: result.email,
            name: result.name
        }
    }

}

