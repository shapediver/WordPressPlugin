import { z } from 'zod';

// Zod type definition for IWordpressGetUserProfileResponse
export const IWordpressGetUserProfileResponseSchema = z.object({
    id: z.number(),
    email: z.string(),
    name: z.string(),
});

// Zod type definition for IWordpressGetProductDataResponse
export const IWordpressGetProductDataResponseSchema = z.object({
    id: z.number(),
    name: z.string(),
    price: z.string(),
    embedding_ticket: z.string().optional(),
    model_view_url: z.string().optional(),
    slug: z.string().optional(),
    model_state_id: z.string().optional(),
    configurator_url: z.string().optional(),
    settings_url: z.string().optional(),
});

// Zod type definition for IWordpressCartItem
const IWordpressCartItemSchema = z.object({
    key: z.string(),
    product_id: z.number(),
    variation_id: z.number().optional(),
    quantity: z.number(),
    product_name: z.string(),
    product_price: z.string(),
    custom_data: z.record(z.string()),
    custom_price: z.number().optional(),
});

// Zod type definition for IWordpressCartTotals
const IWordpressCartTotalsSchema = z.object({
    subtotal: z.number(),
    total: z.number(),
});

// Zod type definition for IWordpressGetCartResponse
export const IWordpressGetCartResponseSchema = z.object({
    items: z.array(IWordpressCartItemSchema),
    totals: IWordpressCartTotalsSchema,
});

// Zod type definition for IWordpressAddToCartResponse
export const IWordpressAddToCartResponseSchema = z.object({
    message: z.string(),
    cart_item_key: z.string().optional(),
});
