/**

Copyright (C) 2024 ShapeDiver GmbH

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, see <https://www.gnu.org/licenses/>.

 */

import { IECommerceApiConnector } from "shared/modules/ecommerce/types/ecommerceapi";
import { IConfiguratorLoader } from "./modules/configuratormanager/types/loader";
import { WordPressConfiguratorLoader } from "./modules/wordpressapi/loader";

/** Id of the div representing the configurator modal. */
const MODAL_ELEMENT_ID = "configurator-modal";
/** Id of the iframe hosting the configurator. */
const IFRAME_ELEMENT_ID = "configurator-iframe";
/** Id of the button used to open the configurator (display the modal). */
const OPEN_CONFIGURATOR_BUTTON_ID = "sd-open-configurator";
/** Selector for testing whether we are running inside the e-commerce system. */
const TEST_PAGE_SELECTOR = "body.shapediver-wordpress-plugin-test-page";

/** Number of key events for toggling configurator visibility. */
const TOGGLE_CONFIGURATOR_VISIBILITY_NUM_EVENTS = 3;
/** Time window in milliseconds for toggling configurator visibility. */
const TOGGLE_CONFIGURATOR_VISIBILITY_MSEC = 750;
/** Key for toggling configurator visibility. */
const TOGGLE_CONFIGURATOR_VISIBILITY_KEY = "Escape";

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
	loadConfigurator(target?: HTMLElement | null): Promise<IECommerceApiConnector | undefined>

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

		this.runsInsideECommerceSystem = document.querySelector(TEST_PAGE_SELECTOR) === null;
		this.debug = !this.runsInsideECommerceSystem || (window as any).configuratorData?.settings?.debug_flag === "1";
		if (!this.runsInsideECommerceSystem) {
			this.log("🚫 Not running inside WordPress");
		}
		
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

		this.isConfiguratorVisible = this.modal.style.display !== "none";

		this.configuratorLoader = new WordPressConfiguratorLoader({
			debug: this.debug,
			ajaxUrl: (window as any).configuratorData?.ajaxurl,
			defaultSettingsUrl: (window as any).configuratorData?.settings.default_settings_url,
			closeConfiguratorHandler: () => {
				this.setConfiguratorVisibility(false);
				
				return Promise.resolve(true);
			}
		});

		this.bindEvents();

		// load and enable the configurator on product pages
		if (document.getElementById(OPEN_CONFIGURATOR_BUTTON_ID)) {
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
			this.log("🖥️ Configurator modal visible");
		else
			this.log("🚪 Configurator modal hidden");
	}
	
	log(...message: any[]): void {
		if (this.debug)
			console.log("ConfiguratorManager", ...message);
	}

	bindEvents() {

		// add event handler for open configurator button
		document.addEventListener("click", async (event) => {
			const target = event.target as HTMLElement;
			if (!target.matches(`#${OPEN_CONFIGURATOR_BUTTON_ID}`))
				return;
			event.preventDefault();
			const apiConnector = await this.loadConfigurator(target);
			(globalThis as { [key: string]: any }).ecommerceApi = apiConnector;
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
		
		document.addEventListener("keydown", (event) => {
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

		this.log("🎭 Events bound successfully");
	}

	get baseUrl(): string {
		const defaultBaseUrl = (window as any).configuratorData?.settings?.configurator_url;
		
		return defaultBaseUrl ? defaultBaseUrl :
			this.runsInsideECommerceSystem ? "https://appbuilder.shapediver.com/v1/main/latest/" : "http://localhost:3000";
	}

	async loadConfigurator(target?: HTMLElement | null): Promise<IECommerceApiConnector | undefined> {
	
		target = target ?? document.getElementById(OPEN_CONFIGURATOR_BUTTON_ID);
		const productId = target?.dataset.productId;
		if (!productId) {
			this.log("❌ Product id not found");
			
			return Promise.resolve(undefined);
		}

		const modelStateId = target?.dataset.modelStateId;
		const context = target?.dataset.context;

		this.log(`🔓 Opening configurator for productId "${productId}" modelStateId "${modelStateId}" context "${context}"`);

		const apiConnector = await this.configuratorLoader.load(this.iframe, {
			productId,
			modelStateId,
			baseUrl: this.baseUrl,
			context
		});

		return Promise.resolve(apiConnector);
	}

	enableConfigurator(): void {
		const openConfiguratorButtons = document.querySelectorAll(`#${OPEN_CONFIGURATOR_BUTTON_ID}`);

		if (openConfiguratorButtons.length === 0) {
			this.log(`ConfiguratorManager: No elements with id ${OPEN_CONFIGURATOR_BUTTON_ID} found.`);
		}
		else {
			openConfiguratorButtons.forEach((button) => {
				if (button instanceof HTMLButtonElement)
					button.disabled = false;
			});
		}

		this.log("🚀 Configurator enabled!");
	}

}

const configuratorManager = new ConfiguratorManager();

(globalThis as { [key: string]: any }).configuratorManager = configuratorManager;
