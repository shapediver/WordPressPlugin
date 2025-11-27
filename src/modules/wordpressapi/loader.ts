import {
	DummyECommerceApiActions,
	ECommerceApiFactory,
} from "../../shared/modules/ecommerce/ecommerceapi";
import {IECommerceApiConnector} from "../../shared/modules/ecommerce/types/ecommerceapi";
import {buildAppBuilderUrl} from "../../shared/utils/urlbuilder";
import {
	IConfiguratorLoader,
	IConfiguratorLoaderOptions,
} from "../configuratormanager/types/loader";
import {WordpressApi, WordPressECommerceApiActions} from "./api";
import {IWordpressApi, IWordPressConfiguratorLoaderOptions} from "./types/api";

/** Timeout for establishing the cross-window API connection. */
const CROSSWINDOW_API_TIMEOUT = 20000;

export class WordPressConfiguratorLoader implements IConfiguratorLoader {
	private wordpressApi?: IWordpressApi;
	private options: IWordPressConfiguratorLoaderOptions;
	private debug: boolean;

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

		// do nothing if the URL didn't change
		if (url === iframe.src) return;

		return new Promise((resolve, reject) => {
			iframe.onload = async () => {
				this.log("iframe loaded:", iframe);

				// default ecommerce api actions
				const defaultActions = this.wordpressApi
					? new WordPressECommerceApiActions(this.wordpressApi, {
							productId: parseInt(productId),
							modelStateId,
							debug: this.debug,
							closeConfiguratorHandler:
								this.options.closeConfiguratorHandler,
						})
					: new DummyECommerceApiActions();
				// optionally override default ecommerce api actions
				const actions = apiActionsFactory
					? apiActionsFactory(defaultActions)
					: defaultActions;
				// create ecommerce api
				const api = await ECommerceApiFactory.getConnectorApi(
					iframe.contentWindow!,
					actions,
					"plugin",
					"app",
					{timeout: CROSSWINDOW_API_TIMEOUT, debug: this.debug},
				);

				this.log("ecommerce API created:", api);
				resolve(api);
			};
			iframe.onerror = (message, source, lineno, colno, error) => {
				const msg = `❌ Error loading configurator iframe: message = "${message}", source = "${source}", lineno = "${lineno}", colno = "${colno}", error = "${error}"`;
				this.log(msg);
				reject(new Error(msg));
			};
			iframe.src = url;
			this.log("🔗 Setting iframe src:", url);
		});
	}
}
