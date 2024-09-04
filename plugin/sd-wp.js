(function ($) {
  var configurator = {
    init: function () {
      this.modal = document.getElementById('configurator-modal');
      this.iframe = document.getElementById('configurator-iframe');
      this.isIframeLoaded = false;
      this.isConfiguratorReady = false;
      this.timeout = 10000;

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
      console.log('🚀 Configurator initialized with events:', this.EVENTS);
    },

    bindEvents: function () {
      $(document).on(
        'click',
        '#open-configurator, .open-configurator',
        this.openConfigurator.bind(this)
      );

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
        $(event.target).data('product-id') ||
        $('button[name="add-to-cart"]').val();
      var modelStateId = $(event.target).data('model-state-id') || '';

      console.log('🔓 Opening configurator for product:', productId);

      if (!this.isIframeLoaded) {
        this.getProductData(productId).then(
          function ({ data }) {
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
              console.log(
                '🖼️ Iframe loaded:',
                this.iframe.contentWindow.location.href
              );
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

    getProductData: function (productId) {
      console.log('📦 Fetching product data for ID:', productId);
      return $.ajax({
        url: configuratorData.ajaxurl,
        type: 'POST',
        data: {
          action: 'get_product_data',
          product_id: productId,
        },
      });
    },

    getUserProfile: function () {
      console.log('👤 Fetching user profile');
      return $.ajax({
        url: configuratorData.ajaxurl,
        type: 'POST',
        data: {
          action: 'get_user_profile',
        },
      });
    },

    getCart: function () {
      console.log('🛒 Fetching cart data');
      return $.ajax({
        url: configuratorData.ajaxurl,
        type: 'POST',
        data: {
          action: 'get_cart',
        },
      });
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
          var productId = $('button[name="add-to-cart"]').val();
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

      $('#open-configurator').prop('disabled', false);
      console.log('🚀 Configurator is ready!');
    },

    addToCart: function (data) {
      console.log('🛒 Adding to cart:', data);
      $.ajax({
        url: configuratorData.ajaxurl,
        type: 'POST',
        data: {
          action: 'add_to_cart',
          product_id: data.product_id,
          quantity: data.quantity,
          variation_id: data.variation_id,
          custom_data: JSON.stringify(data.custom_data),
          custom_price: data.custom_price,
        },
        success: function (response) {
          if (response.success) {
            console.log('✅ Product added to cart successfully!');
            this.sendMessage(this.EVENTS.CART_UPDATED, response.data);
          } else {
            console.error('❌ Failed to add product to cart:', response.data);
          }
        }.bind(this),
        error: function (xhr, status, error) {
          console.error('❌ AJAX error:', status, error);
        },
      });
    },

    updateCart: function (data) {
      console.log('🔄 Updating cart:', data);
      $.ajax({
        url: configuratorData.ajaxurl,
        type: 'POST',
        data: {
          action: 'update_cart',
          cart_item_key: data.cart_item_key,
          quantity: data.quantity,
          custom_data: JSON.stringify(data.custom_data),
          custom_price: data.custom_price,
        },
        success: function (response) {
          if (response.success) {
            console.log('✅ Cart updated successfully!');
            this.sendMessage(this.EVENTS.CART_UPDATED, response.data);
          } else {
            console.error('❌ Failed to update cart:', response.data);
          }
        }.bind(this),
        error: function (xhr, status, error) {
          console.error('❌ AJAX error:', status, error);
        },
      });
    },

    removeFromCart: function (data) {
      console.log('🗑️ Removing from cart:', data);
      $.ajax({
        url: configuratorData.ajaxurl,
        type: 'POST',
        data: {
          action: 'remove_from_cart',
          product_id: data.product_id,
          variation_id: data.variation_id,
        },
        success: function (response) {
          if (response.success) {
            console.log('✅ Product removed from cart successfully!');
            this.sendMessage(this.EVENTS.CART_UPDATED, response.data);
          } else {
            console.error(
              '❌ Failed to remove product from cart:',
              response.data
            );
          }
        }.bind(this),
        error: function (xhr, status, error) {
          console.error('❌ AJAX error:', status, error);
        },
      });
    },
  };

  $(document).ready(function () {
    configurator.init();
    console.log('🎉 Configurator initialized!');
  });
})(jQuery);
