import { IECommerceApiConnector } from "shared/modules/ecommerce/types/ecommerceapi";
import { IConfiguratorLoader } from "./modules/configuratormanager/types/loader";
import { WordPressConfiguratorLoader } from "./modules/wordpressapi/loader";

/** Id of the div representing the configurator modal. */
const MODAL_ELEMENT_ID = 'configurator-modal';
/** Id of the iframe hosting the configurator. */
const IFRAME_ELEMENT_ID = 'configurator-iframe';
/** Id of the button used to open the configurator (display the modal). */
const OPEN_CONFIGURATOR_BUTTON_ID = 'open-configurator';
/** Selector for testing whether we are running inside the e-commerce system. */
const ECOMMERCE_SELECTOR = 'div.wp-site-blocks';
/** 
 * Selector for the element that defines the product id. 
 * This is used to get the product id on product pages, 
 * and load the configurator in the background. 
 */
const PRODUCT_ID_SELECTOR = 'button[name="add-to-cart"]';

/** Number of key events for toggling configurator visibility. */
const TOGGLE_CONFIGURATOR_VISIBILITY_NUM_EVENTS = 3;
/** Time window in milliseconds for toggling configurator visibility. */
const TOGGLE_CONFIGURATOR_VISIBILITY_MSEC = 750;
/** Key for toggling configurator visibility. */
const TOGGLE_CONFIGURATOR_VISIBILITY_KEY = 'Escape';

/**
 * The configurator manager.
 */
interface IConfiguratorManager {

	/**
	 * Load the configurator, based on a product id and optional model state id. 
	 * 
	 *   * If a target element is provided, try to use its data attributes to get  
	 *     product id and model state id.
	 *   * Otherwise, try to get the data from other elements in the DOM.
	 *   * If a product id is found, load the configurator.
	 * 
	 * Note: In case the configurator iframe is hidden, use setConfiguratorVisibility to show it. 
	 * 
	 * @param target 
	 */
	loadConfigurator(target?: HTMLElement): Promise<IECommerceApiConnector | undefined>

	/**
	 * Set the visibility of the configurator.
	 */
	setConfiguratorVisibility(visible: boolean): void

	/**
	 * The current visibility of the configurator.
	 */
	readonly isConfiguratorVisible: boolean

	/**
	 * Enable the configurator for the end user. 
	 * This means that the user is shown a button to open the configurator.
	 */
	enableConfigurator(): void

	/**
	 * True if the code runs inside the eCommerce environment.
	 */
	readonly runsInsideECommerceSystem: boolean
}

class ConfiguratorManager implements IConfiguratorManager {

	runsInsideECommerceSystem: boolean;

	private debug: boolean;

	isConfiguratorVisible: boolean;

	/**
	 * The element containing the configurator iframe. 
	 * Used to show/hide the configurator.
	 */
	private modal: HTMLElement;

	/**
	 * The configurator iframe.
	 */
	private iframe: HTMLIFrameElement;

	/**
	 * The configurator loader.
	 */
	private configuratorLoader: IConfiguratorLoader;

	constructor() {

		this.runsInsideECommerceSystem = document.querySelector(ECOMMERCE_SELECTOR) !== null;
		if (!this.runsInsideECommerceSystem) {
			this.log('🚫 Not running inside WordPress');
		}
		this.debug = !this.runsInsideECommerceSystem || (window as any).configuratorData?.settings?.debug_flag === "1";
	
		const modal = document.getElementById(MODAL_ELEMENT_ID);
		if (!modal) {
			const msg = `ConfiguratorManager: Element with id ${MODAL_ELEMENT_ID} not found.`;
			this.log(msg);
			throw new Error(msg);
		}
		this.modal = modal;

		const iframe = document.getElementById(IFRAME_ELEMENT_ID) as HTMLIFrameElement | null;
		if (!iframe) {
			const msg = `ConfiguratorManager: iframe with id ${IFRAME_ELEMENT_ID} not found.`;
			this.log(msg);
			throw new Error(msg);
		}
		this.iframe = iframe;

		this.isConfiguratorVisible = this.modal.style.display !== 'none';

		this.configuratorLoader = new WordPressConfiguratorLoader({
			debug: this.debug,
			ajaxUrl: (window as any).configuratorData?.ajaxurl,
			closeConfiguratorHandler: () => {
				this.setConfiguratorVisibility(false);
				return Promise.resolve(true);
			}
		})

		this.bindEvents();

		// load and enable the configurator on product pages
		if (document.querySelector(PRODUCT_ID_SELECTOR)) {
			this.loadConfigurator()
			.then((apiConnector) => {
				(globalThis as { [key: string]: any }).ecommerceApi = apiConnector;
				this.enableConfigurator();
			});
		}
	}
	
	setConfiguratorVisibility(visible: boolean): void {
		this.modal.style.display = visible ? "block" : "none";
		this.isConfiguratorVisible = visible;
		if (visible)
			this.log('🖥️ Configurator modal visible');
		else
			this.log('🚪 Configurator modal hidden');
	}
	
	log(...message: any[]): void {
		if (this.debug)
			console.log("ConfiguratorManager", ...message);
	}

	bindEvents() {

		// add event handler for open configurator button
		document.addEventListener('click', async (event) => {
			const target = event.target as HTMLElement;
			if (!target.matches(`#${OPEN_CONFIGURATOR_BUTTON_ID}, .${OPEN_CONFIGURATOR_BUTTON_ID}`))
				return;
			event.preventDefault();
			const apiConnector = await this.loadConfigurator(target);
			(globalThis as { [key: string]: any }).ecommerceApi = apiConnector
			this.setConfiguratorVisibility(true);
		});

		// in local development mode, load a dummy configurator right away
		if (!this.runsInsideECommerceSystem) {
			setTimeout(async () => {
				await this.configuratorLoader.load(this.iframe, {
					productId: "",
					modelStateId: "",
					baseUrl: this.baseUrl,
				});
				this.setConfiguratorVisibility(true);
			}, 1000);
		}

		// event handler for toggling configurator visibility
		let toggleKeyPressCount = 0;
		let timer : NodeJS.Timeout;
		
		document.addEventListener('keydown', (event) => {
			if (event.key === TOGGLE_CONFIGURATOR_VISIBILITY_KEY) {
				toggleKeyPressCount++;
		
				if (toggleKeyPressCount === 1) {
					// Start the timer on the first key press
					timer = setTimeout(() => {
						// Reset the counter if the time window expires
						toggleKeyPressCount = 0;
					}, TOGGLE_CONFIGURATOR_VISIBILITY_MSEC);
				}
		
				if (toggleKeyPressCount === TOGGLE_CONFIGURATOR_VISIBILITY_NUM_EVENTS) {
					// If the key is pressed X times within Y milliseconds
					clearTimeout(timer); // Clear the timer to prevent reset
					this.setConfiguratorVisibility(!this.isConfiguratorVisible); // Call the event handler
					toggleKeyPressCount = 0; // Reset the counter after the event is handled
				}
			}
		});

		this.log('🎭 Events bound successfully');
	}

	get baseUrl(): string {
		return (window as any).configuratorData?.settings?.configurator_url ?? 
			this.runsInsideECommerceSystem ? "https://appbuilder.shapediver.com/v1/main/latest/" : "http://localhost:3000";
	}

	async loadConfigurator(target?: HTMLElement): Promise<IECommerceApiConnector | undefined> {
	
		let productId = target?.dataset.productId;
		if (!productId) {
			const element = document.querySelector(PRODUCT_ID_SELECTOR);
			if (element)
				productId = (element as HTMLButtonElement).value;
		}
		if (!productId) {
			this.log('❌ Product id not found');
			return Promise.resolve(undefined);
		}

		const modelStateId = target?.dataset.modelStateId;

		this.log(`🔓 Opening configurator for productId ${productId} modelStateId ${modelStateId}`);

		const apiConnector = await this.configuratorLoader.load(this.iframe, {
			productId,
			modelStateId,
			baseUrl: this.baseUrl,
		});

		return Promise.resolve(apiConnector);
	}

	enableConfigurator(): void {
		const openConfiguratorButton = document.getElementById(
			OPEN_CONFIGURATOR_BUTTON_ID
		) as HTMLButtonElement;

		if (!openConfiguratorButton) {
			this.log(`ConfiguratorManager: Element with id ${OPEN_CONFIGURATOR_BUTTON_ID} not found.`);
		}
		else {
			openConfiguratorButton.disabled = false;
		}

		this.log('🚀 Configurator enabled!');
	}

}

const configuratorManager = new ConfiguratorManager();

(globalThis as { [key: string]: any }).configuratorManager = configuratorManager;
