(function () {
  var configurator = {
    init: function () {
      this.modal = document.getElementById('configurator-modal');
      this.iframe = document.getElementById('configurator-iframe');
      this.isIframeLoaded = false;
      this.isConfiguratorReady = false;
      this.timeout = 5000;

      this.EVENTS = {
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
      };

      this.allowedTypes = Object.values(this.EVENTS);
      this.bindEvents();
      console.log('🚀 Configurator initialized');
    },

    bindEvents: function () {
      document.addEventListener('click', (event) => {
        if (event.target.matches('#open-configurator, .open-configurator')) {
          this.openConfigurator(event);
        }
      });

      Object.values(this.EVENTS).forEach((eventType) => {
        postRobot.on(eventType, this.handleMessage.bind(this));
      });

      postRobot.on('*', (event) => {
        console.log('📡 Received postRobot event:', event);
        this.handleMessage(event);
      });
      console.log('🎭 Events bound successfully');
    },

    openConfigurator: function (event) {
      event.preventDefault();
      var productId =
        event.target.dataset.productId ||
        document.querySelector('button[name="add-to-cart"]').value;
      var modelStateId = event.target.dataset.modelStateId || '';

      console.log('🔓 Opening configurator for product:', productId);

      if (!this.isIframeLoaded) {
        this.getProductData(productId).then(
          function (data) {
            function buildUrl(baseUrl, params) {
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
              configuratorData.settings.configurator_url;

            const urlParams = {
              modelViewUrl: data.model_view_url,
              ticket: data.shapediver_ticket,
              id: productId,
              slug: data.slug,
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

            this.iframe.onload = () => {
              this.isIframeLoaded = true;
            };
            this.iframe.src = url;
            console.log('🔗 Setting iframe src:', url);
          }.bind(this)
        );
      }

      this.modal.style.display = 'block';
      console.log('🖥️ Configurator modal displayed');
    },

    closeConfigurator: function () {
      this.modal.style.display = 'none';
      console.log('🚪 Configurator closed');
    },

    getProductData: async function (productId) {
      console.log('📦 Fetching product data for ID:', productId);
      const response = await fetch(configuratorData.ajaxurl, {
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

    getUserProfile: async function () {
      console.log('👤 Fetching user profile');
      const response = await fetch(configuratorData.ajaxurl, {
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

    getCart: async function () {
      console.log('🛒 Fetching cart data');
      const response = await fetch(configuratorData.ajaxurl, {
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

    sendMessage: function (type, data) {
      console.log('📤 Sending message:', type, data);
      return postRobot.send(this.iframe.contentWindow, type, data);
    },

    handleMessage: function (event) {
      const { type, data } = event.data;

      if (!this.allowedTypes.includes(type)) {
        console.warn('⚠️ Received message with unallowed type:', type);
        return;
      }

      console.log('📥 Handling message:', type, data);

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
          var productId = document.querySelector(
            'button[name="add-to-cart"]'
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

    handleConfiguratorReady: async function () {
      if (this.isConfiguratorReady) {
        console.log('⏭️ Configurator already ready, skipping');
        return;
      }
      this.isConfiguratorReady = true;

      document.getElementById('open-configurator').disabled = false;
      console.log('🚀 Configurator is ready!');
    },

    addToCart: function (data) {
      console.log('🛒 Adding to cart:', data);
      fetch(configuratorData.ajaxurl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'add_to_cart',
          product_id: data.product_id,
          quantity: data.quantity,
          variation_id: data.variation_id,
          custom_data: JSON.stringify(data.custom_data),
          custom_price: data.custom_price,
        }),
      })
        .then((response) => response.json())
        .then((response) => {
          if (response.success) {
            console.log('✅ Product added to cart successfully!');
            this.sendMessage(this.EVENTS.CART_UPDATED, response.data);
          } else {
            console.error('❌ Failed to add product to cart:', response.data);
          }
        })
        .catch((error) => {
          console.error('❌ AJAX error:', error);
        });
    },

    updateCart: function (data) {
      console.log('🔄 Updating cart:', data);
      fetch(configuratorData.ajaxurl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'update_cart',
          cart_item_key: data.cart_item_key,
          quantity: data.quantity,
          custom_data: JSON.stringify(data.custom_data),
          custom_price: data.custom_price,
        }),
      })
        .then((response) => response.json())
        .then((response) => {
          if (response.success) {
            console.log('✅ Cart updated successfully!');
            this.sendMessage(this.EVENTS.CART_UPDATED, response.data);
          } else {
            console.error('❌ Failed to update cart:', response.data);
          }
        })
        .catch((error) => {
          console.error('❌ AJAX error:', error);
        });
    },

    removeFromCart: function (data) {
      console.log('🗑️ Removing from cart:', data);
      fetch(configuratorData.ajaxurl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'remove_from_cart',
          product_id: data.product_id,
          variation_id: data.variation_id,
        }),
      })
        .then((response) => response.json())
        .then((response) => {
          if (response.success) {
            console.log('✅ Product removed from cart successfully!');
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

  document.addEventListener('DOMContentLoaded', function () {
    configurator.init();
    console.log('🎉 Configurator initialized!');
  });
})();
