import {
	DummyECommerceApiActions,
	ECommerceApiFactory,
} from "@AppBuilderShared/features/ecommerce/api/ecommerceapi";
import {IECommerceApiConnector} from "@AppBuilderShared/features/ecommerce/config/ecommerceapi";
import {QUERYPARAM_MODELSTATEID} from "@AppBuilderShared/shared/config/queryparams";
import {buildAppBuilderUrl} from "@AppBuilderShared/shared/lib/urlbuilder";
import {
	IConfiguratorLoader,
	IConfiguratorLoaderOptions,
} from "../configuratormanager/types/loader";
import {WordpressApi, WordPressECommerceApiActions} from "./api";
import {IWordpressApi, IWordPressConfiguratorLoaderOptions} from "./types/api";

/** Timeout for establishing the cross-window API connection. */
const CROSSWINDOW_API_TIMEOUT = 20000;

/**
 * Compare two App Builder URLs, ignoring `modelStateId`.
 * Origin, pathname, and all other query parameters must match
 * (query parameter order is ignored).
 */
function appBuilderUrlsMatchIgnoringModelStateId(
	left: string,
	right: string,
): boolean {
	try {
		const urlA = new URL(left);
		const urlB = new URL(right);
		if (urlA.origin !== urlB.origin || urlA.pathname !== urlB.pathname) {
			return false;
		}

		return searchParamsEqualIgnoring(
			urlA.searchParams,
			urlB.searchParams,
			QUERYPARAM_MODELSTATEID,
		);
	} catch {
		return false;
	}
}

function searchParamsEqualIgnoring(
	left: URLSearchParams,
	right: URLSearchParams,
	ignoredKey: string,
): boolean {
	const serialize = (params: URLSearchParams): string => {
		const copy = new URLSearchParams(params);
		copy.delete(ignoredKey);

		return [...copy.entries()]
			.map(([key, value]) => `${key}=${value}`)
			.sort()
			.join("&");
	};

	return serialize(left) === serialize(right);
}

export class WordPressConfiguratorLoader implements IConfiguratorLoader {
	private wordpressApi?: IWordpressApi;
	private options: IWordPressConfiguratorLoaderOptions;
	private debug: boolean;
	private lastConnector?: IECommerceApiConnector;

	constructor(options: IWordPressConfiguratorLoaderOptions) {
		this.options = options;
		// in case we didn't get an ajax url, run in local dummy mode
		this.wordpressApi = options.ajaxUrl
			? new WordpressApi({ajaxUrl: options.ajaxUrl, debug: options.debug})
			: undefined;
		this.debug = options.debug ?? false;
	}

	private log(...message: any[]): void {
		if (this.debug) console.log("WordPressConfiguratorLoader:", ...message);
	}

	async load(
		iframe: HTMLIFrameElement,
		options: IConfiguratorLoaderOptions,
	): Promise<IECommerceApiConnector | undefined> {
		this.log("🚀 Loading configurator", options);
		// get product data, or use dummy data for local testing
		const {productId, context, urlBuilderOptions, apiActionsFactory} =
			options;
		const productData = this.wordpressApi
			? await this.wordpressApi.getProductData(parseInt(productId))
			: // in local development mode, use dummy data
				{
					configurator_url: options.baseUrl,
					model_state_id: options.modelStateId,
					embedding_ticket: undefined,
					model_view_url: undefined,
					slug: undefined,
					settings_url: "example-ecommerce.json",
					query_params: undefined,
				};

		// build configurator url
		const baseUrl = productData.configurator_url
			? productData.configurator_url
			: options.baseUrl;
		const modelStateId = options.modelStateId
			? options.modelStateId
			: productData.model_state_id;
		const url = buildAppBuilderUrl(
			urlBuilderOptions ?? {
				baseUrl,
				ticket: productData.embedding_ticket,
				modelViewUrl: productData.model_view_url,
				slug: productData.slug,
				modelStateId,
				settingsUrl: productData.settings_url
					? productData.settings_url
					: this.options.defaultSettingsUrl,
				context,
				queryParams: productData.query_params,
			},
		);

		if (appBuilderUrlsMatchIgnoringModelStateId(url, iframe.src)) {
			this.log(
				"♻️ Reusing configurator iframe (URL matches except modelStateId)",
			);

			return this.lastConnector;
		}

		const loadedIframe = await this.navigateIframe(iframe, url);

		const defaultActions = this.wordpressApi
			? new WordPressECommerceApiActions(this.wordpressApi, {
					productId: parseInt(productId),
					modelStateId,
					debug: this.debug,
					addToCartBehavior: this.options.addToCartBehavior,
					closeConfiguratorHandler:
						this.options.closeConfiguratorHandler,
					redirectToCartHandler: this.options.redirectToCartHandler,
				})
			: new DummyECommerceApiActions();
		const actions = apiActionsFactory
			? apiActionsFactory(defaultActions)
			: defaultActions;

		if (!loadedIframe.contentWindow) {
			throw new Error("Configurator iframe has no content window.");
		}

		const api = await ECommerceApiFactory.getConnectorApi(
			loadedIframe.contentWindow,
			actions,
			"plugin",
			"app",
			{timeout: CROSSWINDOW_API_TIMEOUT, debug: this.debug},
		);

		this.log("ecommerce API created:", api);
		this.lastConnector = api;

		return api;
	}

	/**
	 * Load `url` in a fresh iframe. Changing `src` on an already-loaded iframe
	 * often does not fire `load`, so the node is replaced instead.
	 */
	private navigateIframe(
		iframe: HTMLIFrameElement,
		url: string,
	): Promise<HTMLIFrameElement> {
		const next = iframe.cloneNode(false) as HTMLIFrameElement;

		return new Promise((resolve, reject) => {
			const cleanup = () => {
				next.removeEventListener("load", onLoad);
				next.removeEventListener("error", onError);
			};

			const onLoad = () => {
				if (next.src === "about:blank") {
					return;
				}

				cleanup();
				this.log("iframe loaded:", next);
				resolve(next);
			};

			const onError = () => {
				cleanup();
				const msg = `❌ Error loading configurator iframe: url = "${url}"`;
				this.log(msg);
				reject(new Error(msg));
			};

			next.addEventListener("load", onLoad);
			next.addEventListener("error", onError);
			next.src = url;
			this.log("🔗 Setting iframe src:", url);
			iframe.replaceWith(next);
		});
	}
}
