import {
	QUERYPARAM_MODELSTATEID,
	QUERYPARAM_SETTINGSURL,
	QUERYPARAM_SLUG,
} from "@AppBuilderShared/types/shapediver/queryparams";
import {IAppBuilderUrlBuilderData} from "@AppBuilderShared/utils/urlbuilder";
import {
	IAddItemToCartData,
	IAddItemToCartReply,
	IECommerceApiActions,
	IGetParentPageInfoReply,
	IGetUserProfileReply,
	IScrollingApiLoadMoreData,
	IScrollingApiLoadMoreReply,
	IScrollingApiSetParametersData,
	IScrollingApiSetParametersReply,
	IUpdateSharingLinkData,
	IUpdateSharingLinkReply,
} from "./shared/modules/ecommerce/types/ecommerceapi";
import {IScrollingApiItemTypeSelect} from "./shared/modules/ecommerce/types/scrollingapi";

/**
 * Type definition for product categories.
 */
interface ICategory {
	id: number;
	name: string;
	slug: string;
	path: string;
	thumbnail_url: string;
	children: ICategory[];
}

/**
 * Type definition for product graphics.
 */
interface IProduct {
	graphic_id: number;
	graphic_name: string;
	description: string;
	category_id: number;
	category_name: string;
	tags: string[];
	downloadable_files: {
		name: string;
		image_type: "thumbnail" | string;
		image_png_url?: string;
		image_jpg_url?: string;
	}[];
}

/**
 * Product/category API response.
 */
interface IGraphicsApiResponse {
	categories?: ICategory[];
	products?: IProduct[];
}

/**
 * Create query string for fetching from graphics API
 * @param categories Optional categories to append as URL parameter "categories"
 * @param tag Optional tag to append as URL parameter "tags"
 * @param search Optional search term to append as URL parameter "search"
 * @returns
 */
function getGraphicsApiQueryString(
	categories?: string[] | string,
	tags?: string,
	search?: string,
	categoryIds?: number[],
): string {
	const params = new URLSearchParams();
	if (Array.isArray(categories) && categories.length === 0)
		categories = undefined;

	if (!categories && !tags && !search) categories = "all";

	if (categoryIds && categoryIds.length > 0) {
		params.set(
			"category_id",
			categoryIds[categoryIds.length - 1].toString(),
		);
		if (!tags && !search) {
			// if a product category has been chosen, but no search term
			// is present, get all products in that category
			params.set("tags", "all");
		}
	} else if (categories) {
		if (Array.isArray(categories))
			params.set("categories", categories.join(","));
		else params.set("categories", categories);
		if (categories !== "all" && !tags && !search) {
			// if a product category has been chosen, but no search term
			// is present, get all products in that category
			params.set("tags", "all");
		}
	}
	if (tags) params.set("tags", tags);
	if (search) params.set("search", search);

	return params.toString();
}

/** Query string used for the latest API call. */
let latestQuery: string = getGraphicsApiQueryString("");
/** Query string for fetching all categories. */
const allCategoriesQuery: string = getGraphicsApiQueryString();
/** Depth of categories for the latest API call. */
let latestCategorySlugs: Array<string> = [];
/** Page size to be used for data returned to the App Builder iframe. */
let pageSize: number = 10;
/** Current index. */
let currentIndex: number = 0;
/** Cached responses of previous API calls. */
const cachedResults: Record<string, IGraphicsApiResponse> = {};
/** Identifier for category items. */
const categoryIdentifier = "\u200B\u2063";

/**
 * Clear the cache of previous API calls.
 */
function clearCache() {
	latestQuery = getGraphicsApiQueryString();
	latestCategorySlugs = [];
	pageSize = 10;
	currentIndex = 0;
	for (const key in cachedResults) delete cachedResults[key];
}

/**
 * Fetch from Graphics API.
 */
async function fetchFromGraphicsApi(
	queryString: string,
	ignoreCache: boolean,
): Promise<IGraphicsApiResponse> {
	if (!ignoreCache && cachedResults[queryString]) {
		return cachedResults[queryString];
	}

	const base =
		"https://test1.tarablooms.in/wp-json/shapediver/v1/graphic-components";

	const url = `${base}?${queryString}`;

	const resp = await fetch(url, {
		method: "GET",
		headers: {
			Accept: "application/json",
		},
	});

	if (!resp.ok) {
		const text = await resp.text().catch(() => "");
		throw new Error(
			`Failed to fetch from graphics api: ${resp.status} ${resp.statusText} ${text}`,
		);
	}

	const json = await resp.json().catch((err) => {
		throw new Error(
			`Failed to parse graphics api response: ${String(err)}`,
		);
	});

	// Basic runtime shape check
	if (!json || typeof json !== "object")
		throw new Error("Invalid graphics api response: not an object");

	const result = json as IGraphicsApiResponse;
	cachedResults[queryString] = result;
	return result;
}

/**
 * Return and map cached results.
 * @returns
 */
async function returnAndMapCachedResults(): Promise<
	IScrollingApiLoadMoreReply<unknown>
> {
	const result: IScrollingApiLoadMoreReply<unknown> = {
		hasNextPage: false,
		items: [],
	};

	// map categories
	const categoryData = await fetchFromGraphicsApi(allCategoriesQuery, false);
	let categories = categoryData.categories;
	if (categories) {
		for (let i = 0; i < latestCategorySlugs.length; i++) {
			const categorySlug = latestCategorySlugs[i];
			const matchedCategory: ICategory | undefined = categories.find(
				(cat) => cat.slug === categorySlug,
			);
			if (!matchedCategory)
				throw new Error(
					`Category with slug "${categorySlug}" not found`,
				);
			categories = matchedCategory.children;
		}

		// map categories to items
		const items: IScrollingApiItemTypeSelect[] = categories.map((p) => ({
			item: `search:${categoryIdentifier}` + p.name,
			data: {
				displayname: p.name,
				imageUrl: p.thumbnail_url,
				data: p,
			},
		}));
		result.items = items;
	}

	// map products
	const products = cachedResults[latestQuery].products;
	if (products) {
		// map products to items
		const items: IScrollingApiItemTypeSelect[] = products
			.slice(currentIndex, currentIndex + pageSize)
			.map((p) => ({
				item: p.graphic_id + "",
				data: {
					displayname: p.graphic_name,
					tooltip: p.description,
					imageUrl: p.downloadable_files.find(
						(f) => f.image_type === "thumbnail",
					)?.image_png_url,
					data: p,
				},
			}));
		currentIndex += pageSize;

		result.hasNextPage = currentIndex < products.length;
		result.items = result.items.concat(items);
	}

	console.log(result);

	return result;
}

/**
 * Handler for setting parameters for the scrolling API.
 * @param data
 * @returns
 */
async function scrollingApiSetParameters(
	data: IScrollingApiSetParametersData,
): Promise<IScrollingApiSetParametersReply<unknown>> {
	if (data.source !== "graphics") {
		console.debug(`Unsupported data source name: ${data.source}`);
		clearCache();
		return {hasNextPage: false, items: []};
	}

	if (data.terms) {
		const categories: string[] = [];
		const categoryIds: number[] = [];
		let tags: string = "";
		let search: string = "";
		const categoryData = await fetchFromGraphicsApi(
			allCategoriesQuery,
			false,
		);
		let cachedCategories = categoryData.categories;
		data.terms?.forEach((v) => {
			if (v.startsWith(categoryIdentifier)) {
				if (cachedCategories) {
					const categoryName = v.substring(categoryIdentifier.length);
					// Check if the category exists in the fetched categories
					const matchedCategory = cachedCategories.find(
						(cat) => cat.name === categoryName,
					);
					if (matchedCategory) {
						categories.push(matchedCategory.slug);
						categoryIds.push(matchedCategory.id);
						cachedCategories = matchedCategory.children;
					}
				}
			} else if (v.startsWith("tag:")) tags = v.substring("tag:".length);
			else search = v;
		});
		const queryString = getGraphicsApiQueryString(
			categories,
			tags,
			search,
			categoryIds,
		);
		if (queryString !== latestQuery) {
			latestQuery = queryString;
			latestCategorySlugs = categories;
			currentIndex = 0;
		}
	}

	if (data.pageSize !== undefined) {
		pageSize = data.pageSize;
		currentIndex = 0;
	}

	await fetchFromGraphicsApi(latestQuery, false);
	return returnAndMapCachedResults();
}

/**
 * Handler for loading more items for the scrolling API.
 * @param data
 * @returns
 */
async function scrollingApiLoadMore(
	data: IScrollingApiLoadMoreData,
): Promise<IScrollingApiLoadMoreReply<unknown>> {
	if (data.source !== "graphics") {
		console.debug(`Unsupported data source name: ${data.source}`);
		clearCache();
		return {hasNextPage: false, items: []};
	}

	await fetchFromGraphicsApi(latestQuery, false);
	return returnAndMapCachedResults();
}

/**
 * Specific implementation of IECommerceApiActions for the App Builder iframe.
 * This overrides some of the default actions.
 */
class SpecificECommerceApiActions implements IECommerceApiActions {
	constructor(private defaultActions?: IECommerceApiActions) {}

	getParentPageInfo(): Promise<IGetParentPageInfoReply> {
		if (this.defaultActions) return this.defaultActions.getParentPageInfo();

		return Promise.resolve({href: window.location.href});
	}

	closeConfigurator(): Promise<boolean> {
		if (this.defaultActions) return this.defaultActions.closeConfigurator();

		return Promise.resolve(false);
	}

	addItemToCart(data: IAddItemToCartData): Promise<IAddItemToCartReply> {
		// here we skip the default action on purpose
		//if (this.defaultActions) return this.defaultActions.addItemToCart(data);

		const {description, modelStateId} = data;

		// try to parse description as JSON
		let pricingParameters: Record<string, any> = {};
		if (description) {
			try {
				pricingParameters = JSON.parse(description);
			} catch (e) {
				console.warn(
					`Failed to parse pricing parameters from description: ${description}`,
					e,
				);
			}
		}

		// TODO Tara Blooms:
		// Use pricing parameters to request price(s) from your backend,
		// display user interface for confirming the addition to the cart,
		// and finally return the cart item id.
		// In case the user denies adding to the cart, return an empty cart item id.

		console.log(
			"Adding item to cart with modelStateId:",
			modelStateId,
			"and pricing parameters:",
			pricingParameters,
		);

		const reply: IAddItemToCartReply = {
			id: "DUMMY_ID",
		};

		return Promise.resolve(reply);
	}

	getUserProfile(): Promise<IGetUserProfileReply> {
		// NOTE: This action is not used yet by App Builder, therefore no
		// reason to implement it.
		if (this.defaultActions) return this.defaultActions.getUserProfile();

		const reply: IGetUserProfileReply = {
			id: "DUMMY_ID",
			email: "john@doe.com",
			name: "John Doe",
		};

		return Promise.resolve(reply);
	}

	updateSharingLink(
		data: IUpdateSharingLinkData,
	): Promise<IUpdateSharingLinkReply> {
		// here we skip the default action on purpose
		//if (this.defaultActions)
		//	return this.defaultActions.updateSharingLink(data);

		// TODO Tara Blooms: Here you could show a user interface for sharing the link
		// via email, social media, etc.
		// For now, we just update the URL in the browser.
		const {modelStateId, imageUrl} = data;
		console.log(
			imageUrl
				? `Model state with image data URL: ${imageUrl.substring(0, 10)}`
				: "Model state without image",
		);
		const url = new URL(window.location.href);
		url.searchParams.set(QUERYPARAM_MODELSTATEID, modelStateId);
		const href = url.toString();
		history.replaceState(history.state, "", href);
		return Promise.resolve({href});
	}

	async scrollingApiSetParameters(
		data: IScrollingApiSetParametersData,
	): Promise<IScrollingApiSetParametersReply<unknown>> {
		// connection to the graphics API
		return scrollingApiSetParameters(data);
	}

	async scrollingApiLoadMore(
		data: IScrollingApiLoadMoreData,
	): Promise<IScrollingApiLoadMoreReply<unknown>> {
		// connection to the graphics API
		return scrollingApiLoadMore(data);
	}
}

(globalThis as {[key: string]: any}).specificECommerceApiActionsFactory = (
	defaultActions: IECommerceApiActions,
) => new SpecificECommerceApiActions(defaultActions);

const urlParams = new URLSearchParams(window.location.search);

/**
 * URL builder options for development environment.
 */
export const developmentUrlBuilderOptions: IAppBuilderUrlBuilderData = {
	baseUrl: `https://appbuilder.shapediver.com/v1/main/${urlParams.get("appBuilderVersion") ?? "development"}/`,
	settingsUrl: urlParams.get(QUERYPARAM_SETTINGSURL) ?? "_stringselect.json",
	modelStateId: urlParams.get(QUERYPARAM_MODELSTATEID) ?? undefined,
	slug: urlParams.get(QUERYPARAM_SLUG) ?? undefined,
};

(globalThis as {[key: string]: any}).developmentUrlBuilderOptions =
	developmentUrlBuilderOptions;
