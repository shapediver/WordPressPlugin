import { CrossWindowApiFactory } from "./shared/modules/crosswindowapi/crosswindowapi";
import { ICrossWindowApi } from "./shared/modules/crosswindowapi/types/crosswindowapi";


const MODAL_ELEMENT_ID = 'configurator-modal';
const IFRAME_ELEMENT_ID = 'configurator-iframe';
const OPEN_CONFIGURATOR_BUTTON_ID = 'open-configurator';
const CROSSWINDOW_API_TIMEOUT = 10000;

/**
 * The configurator manager.
 */
interface IConfiguratorManager {

	/**
	 * Open the configurator, which means: 
	 * 
	 *   * Load the configurator for the product defined by the target 
	 *     element of the event. 
	 *   * Show the configurator to the end user.
	 * 
	 * @param event 
	 */
	openConfiguratorEventHandler(event: MouseEvent): Promise<void>

	/**
	 * Hide the configurator from the end user.
	 */
	hideConfigurator(): void

	/**
	 * Show the configurator to the end user.
	 */
	showConfigurator(): void

	/**
	 * Enable the configurator for the end user. 
	 * This means that the user is shown a button to open the configurator.
	 */
	enableConfigurator(): void
}

class ConfiguratorManager implements IConfiguratorManager {

	/**
	 * Controls whether debug messages are shown in the console.
	 */
	private debug: boolean;

	/**
	 * The element containing the configurator iframe. 
	 * Used to show/hide the configurator.
	 */
	private modal: HTMLElement;

	/**
	 * The configurator iframe.
	 */
	iframe: HTMLIFrameElement;

	/**
	 * TODO clarify
	 */
	//isIframeLoaded: boolean;

	/**
	 * TODO clarify
	 */
	//isConfiguratorReady: boolean;
	
	private iframeApi: Promise<ICrossWindowApi>;

	constructor(debug: boolean) {
		this.debug = debug;

		const modal = document.getElementById(MODAL_ELEMENT_ID);
		if (!modal) {
			throw new Error(`ConfiguratorManager: Element with id ${MODAL_ELEMENT_ID} not found.`);
		}
		this.modal = modal;


		const iframe = document.getElementById(IFRAME_ELEMENT_ID) as HTMLIFrameElement | null;
		if (!iframe) {
			throw new Error(`ConfiguratorManager: iframe with id ${IFRAME_ELEMENT_ID} not found.`);
		}
		this.iframe = iframe;

		if (!iframe.contentWindow) {
			throw new Error(`ConfiguratorManager: contentWindow not set for the iframe?!`);
		}

		this.iframeApi = this.loadConfigurator(iframe, "http://localhost:3000");
	
		this.bindEvents();
	}
	
	log(...message: any[]): void {
		if (this.debug)
			console.log("ConfiguratorManager", ...message);
	}

	bindEvents() {
		document.addEventListener('click', (event) => {
			const target = event.target as HTMLElement;
			if (target.matches('#open-configurator, .open-configurator')) {
				this.openConfiguratorEventHandler(event);
			}
		});

		this.log('🎭 Events bound successfully');
	}

	openConfiguratorEventHandler(event: MouseEvent): Promise<void> {

		event.preventDefault();
		const target = event.target as HTMLElement;
		const productId =
			target.dataset.productId ||
			(
				document.querySelector(
					'button[name="add-to-cart"]'
				) as HTMLButtonElement
			).value;
		const modelStateId = target.dataset.modelStateId || '';

		// TODO use loadConfigurator and showConfigurator
		throw new Error("Method not implemented.");
	}

	loadConfigurator(iframe: HTMLIFrameElement, url: string): Promise<ICrossWindowApi> {
		if (!iframe.contentWindow) {
			throw new Error(`ConfiguratorManager: contentWindow not set for the iframe?!`);
		}

		return new Promise((resolve, reject) => {
			iframe.onload = async () => {
				this.log('iframe loaded:', iframe);
				const api = await CrossWindowApiFactory.getWindowApi(iframe.contentWindow!, 'plugin', 'app', CROSSWINDOW_API_TIMEOUT);
				this.log('iframe API created:', api);
				resolve(api);
			};
			iframe.src = url;
			this.log('🔗 Setting iframe src:', url);
		});
	}

	hideConfigurator(): void {
		this.modal.style.display = 'none';
		this.log('🚪 Configurator modal hidden');
	}

	showConfigurator(): void {
		this.modal.style.display = 'block';
		this.log('🖥️ Configurator modal displayed');
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

const configuratorManager = new ConfiguratorManager(true);
