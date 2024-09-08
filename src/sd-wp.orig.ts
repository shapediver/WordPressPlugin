import { CrossWindowApiFactory } from "./shared/modules/crosswindowapi/crosswindowapi";
import { ICrossWindowApi } from "./shared/modules/crosswindowapi/types/crosswindowapi";
import postRobot from "post-robot";

interface Configurator {
  modal: HTMLElement | null;
  iframe: HTMLIFrameElement | null;
  isIframeLoaded: boolean;
  isConfiguratorReady: boolean;
  timeout: number;
  showConsoleLog: boolean;
  EVENTS: Record<string, string>;
  allowedTypes: string[];
  iframeApi: ICrossWindowApi | null;

  init(): void;
  log(...message: any[]): void;
  bindEvents(): void;
  openConfigurator(event: MouseEvent): void;
  closeConfigurator(): void;
  getProductData(productId: string): Promise<any>;
  getUserProfile(): Promise<any>;
  getCart(): Promise<any>;
  sendMessage(type: string, data: any): Promise<any>;
  handleMessage(event: { data: { type: string; data: any } }): void;
  handleConfiguratorReady(): Promise<void>;
  addToCart(data: {
    product_id: string;
    quantity: number;
    variation_id?: string;
    custom_data: any;
    custom_price?: number;
  }): void;
  updateCart(data: {
    cart_item_key: string;
    quantity: number;
    custom_data: any;
    custom_price?: number;
  }): void;
  removeFromCart(data: { product_id: string; variation_id?: string }): void;
}

(() => {
  
  const configurator: Configurator = {
    modal: null,
    iframe: null,
    isIframeLoaded: false,
    isConfiguratorReady: false,
    timeout: 5000,
    showConsoleLog: true,
    iframeApi: null,

    EVENTS: {
      GET_PROFILE: 'GET_PROFILE',
      GET_PRODUCT: 'GET_PRODUCT',
      GET_CART: 'GET_CART',
      ADD_TO_CART: 'ADD_TO_CART',
      REMOVE_FROM_CART: 'REMOVE_FROM_CART',
      UPDATE_CART: 'UPDATE_CART',
      CLOSE_CONFIGURATOR: 'CLOSE_CONFIGURATOR',
      CONFIGURATOR_READY: 'CONFIGURATOR_READY',
      PROFILE_DATA: 'PROFILE_DATA',
      PRODUCT_DATA: 'PRODUCT_DATA',
      CART_DATA: 'CART_DATA',
      CART_UPDATED: 'CART_UPDATED',
    },

    allowedTypes: [],

    init() {
      this.modal = document.getElementById('configurator-modal');
      this.iframe = document.getElementById(
        'configurator-iframe'
      ) as HTMLIFrameElement;
      this.allowedTypes = Object.values(this.EVENTS);
      this.bindEvents();
      this.log('🚀 Configurator initialized');
    },

    log(...message: any[]) {
      if (this.showConsoleLog) {
        console.log(...message);
      }
    },

    bindEvents() {
      document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        if (target.matches('#open-configurator, .open-configurator')) {
          this.openConfigurator(event);
        }
      });

      Object.values(this.EVENTS).forEach((eventType) => {
        //postRobot.on(eventType, this.handleMessage.bind(this));
      });

      // (window as any).postRobot.on('*', (event: any) => {
      //   this.log('📡 Received postRobot event:', event);
      //   this.handleMessage(event);
      // });
      this.log('🎭 Events bound successfully');
    },

    openConfigurator(event: MouseEvent) {
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

      this.log('🔓 Opening configurator for product:', productId);

      if (!this.isIframeLoaded && this.iframe) {
        this.getProductData(productId).then((data) => {
          function buildUrl(baseUrl: string, params: Record<string, string>) {
            const url = new URL(baseUrl);
            const searchParams = new URLSearchParams(url.search);

            for (const [key, value] of Object.entries(params)) {
              if (value) {
                searchParams.append(key, value);
              }
            }

            url.search = searchParams.toString();
            return url.toString();
          }

          const configuratorUrl =
            data.configurator_url ||
            (window as any).configuratorData.settings.configurator_url;

          const urlParams: Record<string, string> = {
            modelViewUrl: data.model_view_url,
            ticket: data.shapediver_ticket,
            id: productId,
            slug: data.slug,
            g: "iframe13.json",
            modelStateId: modelStateId || data.model_state_id,
            parentOrigin: window.location.origin,
            ...(data?.custom_data && {
              custom_data: JSON.stringify(data.custom_data),
            }),
          };

          Object.keys(urlParams).forEach(
            (key) => urlParams[key] === undefined && delete urlParams[key]
          );

          const url = buildUrl(configuratorUrl, urlParams);

          if (this.iframe) {
            this.iframe.onload = async () => {
              this.isIframeLoaded = true;
              this.iframeApi = await CrossWindowApiFactory.getWindowApi(this.iframe?.contentWindow!, 'plugin', 'app', 30000);
              this.log('Iframe API ready:', this.iframeApi);
              
            };
            this.iframe.src = url;
            this.log('🔗 Setting iframe src:', url);
          }
        });
      }

      if (this.modal) {
        this.modal.style.display = 'block';
      }
      this.log('🖥️ Configurator modal displayed');
    },

    closeConfigurator() {
      if (this.modal) {
        this.modal.style.display = 'none';
      }
      this.log('🚪 Configurator closed');
    },

    async getProductData(productId: string) {
      this.log('📦 Fetching product data for ID:', productId);
      const response = await fetch((window as any).configuratorData.ajaxurl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'get_product_data',
          product_id: productId,
        }),
      });
      return response.json();
    },

    async getUserProfile() {
      this.log('👤 Fetching user profile');
      const response = await fetch((window as any).configuratorData.ajaxurl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'get_user_profile',
        }),
      });
      return response.json();
    },

    async getCart() {
      this.log('🛒 Fetching cart data');
      const response = await fetch((window as any).configuratorData.ajaxurl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'get_cart',
        }),
      });
      return response.json();
    },

    sendMessage(type: string, data: any) {
      this.log('📤 Sending message:', type, data);
      return postRobot.send(
        this.iframe?.contentWindow!,
        type,
        data
      );
    },

    handleMessage(event: { data: { type: string; data: any } }) {
      const { type, data } = event.data;

      if (!this.allowedTypes.includes(type)) {
        this.log('⚠️ Received message with unallowed type:', type);
        return;
      }

      this.log('📥 Handling message:', type, data);

      if (type === this.EVENTS.CONFIGURATOR_READY) {
        this.handleConfiguratorReady();
        return;
      }

      switch (type) {
        case this.EVENTS.GET_PROFILE:
          this.getUserProfile().then((response) => {
            this.sendMessage(this.EVENTS.PROFILE_DATA, response.data);
          });
          break;
        case this.EVENTS.GET_PRODUCT:
          const productId = (
            document.querySelector(
              'button[name="add-to-cart"]'
            ) as HTMLButtonElement
          ).value;
          this.getProductData(productId).then((response) => {
            this.sendMessage(this.EVENTS.PRODUCT_DATA, response.data);
          });
          break;
        case this.EVENTS.GET_CART:
          this.getCart().then((response) => {
            this.sendMessage(this.EVENTS.CART_DATA, response.data);
          });
          break;
        case this.EVENTS.ADD_TO_CART:
          this.addToCart(data);
          break;
        case this.EVENTS.REMOVE_FROM_CART:
          this.removeFromCart(data);
          break;
        case this.EVENTS.UPDATE_CART:
          this.updateCart(data);
          break;
        case this.EVENTS.CLOSE_CONFIGURATOR:
          this.closeConfigurator();
          break;
      }
    },

    async handleConfiguratorReady() {
      if (this.isConfiguratorReady) {
        this.log('⏭️ Configurator already ready, skipping');
        return;
      }
      this.isConfiguratorReady = true;

      const openConfiguratorButton = document.getElementById(
        'open-configurator'
      ) as HTMLButtonElement;
      if (openConfiguratorButton) {
        openConfiguratorButton.disabled = false;
      }
      this.log('🚀 Configurator is ready!');
    },

    addToCart(data: {
      product_id: string;
      quantity: number;
      variation_id?: string;
      custom_data: any;
      custom_price?: number;
    }) {
      this.log('🛒 Adding to cart:', data);
      fetch((window as any).configuratorData.ajaxurl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'add_to_cart',
          product_id: data.product_id,
          quantity: data.quantity.toString(),
          variation_id: data.variation_id || '',
          custom_data: JSON.stringify(data.custom_data),
          custom_price: data.custom_price?.toString() || '',
        }),
      })
        .then((response) => response.json())
        .then((response) => {
          if (response.success) {
            this.log('✅ Product added to cart successfully!');
            this.sendMessage(this.EVENTS.CART_UPDATED, response.data);
          } else {
            console.error('❌ Failed to add product to cart:', response.data);
          }
        })
        .catch((error) => {
          console.error('❌ AJAX error:', error);
        });
    },

    updateCart(data: {
      cart_item_key: string;
      quantity: number;
      custom_data: any;
      custom_price?: number;
    }) {
      this.log('🔄 Updating cart:', data);
      fetch((window as any).configuratorData.ajaxurl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'update_cart',
          cart_item_key: data.cart_item_key,
          quantity: data.quantity.toString(),
          custom_data: JSON.stringify(data.custom_data),
          custom_price: data.custom_price?.toString() || '',
        }),
      })
        .then((response) => response.json())
        .then((response) => {
          if (response.success) {
            this.log('✅ Cart updated successfully!');
            this.sendMessage(this.EVENTS.CART_UPDATED, response.data);
          } else {
            console.error('❌ Failed to update cart:', response.data);
          }
        })
        .catch((error) => {
          console.error('❌ AJAX error:', error);
        });
    },

    removeFromCart(data: { product_id: string; variation_id?: string }) {
      this.log('🗑️ Removing from cart:', data);
      fetch((window as any).configuratorData.ajaxurl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'remove_from_cart',
          product_id: data.product_id,
          variation_id: data.variation_id || '',
        }),
      })
        .then((response) => response.json())
        .then((response) => {
          if (response.success) {
            this.log('✅ Product removed from cart successfully!');
            this.sendMessage(this.EVENTS.CART_UPDATED, response.data);
          } else {
            console.error(
              '❌ Failed to remove product from cart:',
              response.data
            );
          }
        })
        .catch((error) => {
          console.error('❌ AJAX error:', error);
        });
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    configurator.init();
  });
})();
