import { IWordpressApi } from "./types/api";
import { IWordpressAddToCartRequest, IWordpressGetProductDataRequest } from "./types/request";
import { 
    IWordpressGetProductDataResponse, 
    IWordpressGetUserProfileResponse, 
    IWordpressGetCartResponse, 
    IWordpressAddToCartResponse 
} from "./types/response";


export class WordpressApi implements IWordpressApi {

    private ajaxurl: string

    constructor(ajaxurl: string) {
        this.ajaxurl = ajaxurl
    }

    async request<Trequest extends object, Tresponse>(
        method: string, 
        action: string, 
        request: Trequest extends any[] ? never : Trequest
    ): Promise<Tresponse> {

        const response = await fetch(this.ajaxurl, {
    
            method,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                // TODO this is weird and can easily lead to trouble if the request object 
                // includes a property named "action". 
                // to be refactored
                action,
                ...request
            }),
        });

        // Handle 4XX or 5XX HTTP statuses
        if (!response.ok) {
            const errorResponse = await response.json();
            throw new Error(`WordpressApiError: ${response.status} ${response.statusText} ${errorResponse}`);
        }

        return await response.json();
    }

    getProductData(id: number): Promise<IWordpressGetProductDataResponse> {
        return this.request<IWordpressGetProductDataRequest, IWordpressGetProductDataResponse>('POST', 'get_product_data', { product_id: id });
    }

    getUserProfile(): Promise<IWordpressGetUserProfileResponse> {
        return this.request<object, IWordpressGetUserProfileResponse>('GET', 'get_user_profile', {});
    }

    getCart(): Promise<IWordpressGetCartResponse> {
        return this.request<object, IWordpressGetCartResponse>('GET', 'get_cart', {});
    }

    addToCart(data: IWordpressAddToCartRequest): Promise<IWordpressAddToCartResponse> {
        return this.request<IWordpressAddToCartRequest, IWordpressAddToCartResponse>('POST', 'add_to_cart', data);
    }
    
}

