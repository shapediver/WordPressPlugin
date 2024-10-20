import { 
	IConfiguratorLoader, 
	IConfiguratorLoaderOptions
} from "../configuratormanager/types/loader";
import { IWordpressApi, IWordPressConfiguratorLoaderOptions } from "./types/api";
import { buildAppBuilderUrl } from "../../shared/utils/urlbuilder";
import { 
	DummyECommerceApiActions,
	ECommerceApiFactory,
} from "../../shared/modules/ecommerce/ecommerceapi";
import { WordpressApi, WordPressECommerceApiActions } from "./api";
import { IECommerceApiConnector } from "../../shared/modules/ecommerce/types/ecommerceapi";

/** Timeout for establishing the cross-window API connection. */
const CROSSWINDOW_API_TIMEOUT = 20000;

export class WordPressConfiguratorLoader implements IConfiguratorLoader {

	private wordpressApi?: IWordpressApi;
	private options: IWordPressConfiguratorLoaderOptions;
	private debug: boolean;
   
	constructor(options: IWordPressConfiguratorLoaderOptions) {
		this.options = options;
		// in case we didn't get an ajax url, run in local dummy mode
		this.wordpressApi = options.ajaxUrl ? new WordpressApi({ajaxUrl: options.ajaxUrl, debug: options.debug}) : undefined;
		this.debug = options.debug ?? false;
	}

	private log(...message: any[]): void {
		if (this.debug)
			console.log("WordPressConfiguratorLoader:", ...message);
	}
    
	async load(iframe: HTMLIFrameElement, options: IConfiguratorLoaderOptions): Promise<IECommerceApiConnector | undefined> {

		this.log("🚀 Loading configurator", options);
		// get product data, or use dummy data for local testing
		const { productId, context } = options;
		const productData = this.wordpressApi
			? await this.wordpressApi.getProductData(parseInt(productId))
		// in local development mode, use dummy data 
			: { 
				configurator_url: options.baseUrl,
				model_state_id: options.modelStateId,
				embedding_ticket: undefined,
				model_view_url: undefined,
				slug: undefined,
				settings_url: "localtesting.json",
			};

		// build configurator url
		const baseUrl = productData.configurator_url ? productData.configurator_url : options.baseUrl;
		const modelStateId = options.modelStateId ? options.modelStateId : productData.model_state_id;
		const url = buildAppBuilderUrl({
			baseUrl,
			ticket: productData.embedding_ticket,
			modelViewUrl: productData.model_view_url,
			slug: productData.slug,
			modelStateId,
			settingsUrl: productData.settings_url ? productData.settings_url : this.options.defaultSettingsUrl,
			context,
		});

		// do nothing if the URL didn't change
		if (url === iframe.src) 
			return;

		return new Promise((resolve, reject) => {
			iframe.onload = async () => {
				this.log("iframe loaded:", iframe);
                
				// create ecommerce api actions
				const actions = this.wordpressApi ? new WordPressECommerceApiActions(this.wordpressApi, {
					productId: parseInt(productId),
					modelStateId,
					debug: this.debug,
					closeConfiguratorHandler: this.options.closeConfiguratorHandler
				}) : new DummyECommerceApiActions();

				// create ecommerce api
				const api = await ECommerceApiFactory.getConnectorApi(
					iframe.contentWindow!, 
					actions, "plugin", "app", 
					{ timeout: CROSSWINDOW_API_TIMEOUT, debug: this.debug }
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
