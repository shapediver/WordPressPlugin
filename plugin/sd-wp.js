(function ($) {
  var configurator = {
    init: function () {
      this.modal = document.getElementById('configurator-modal');
      this.iframe = document.getElementById('configurator-iframe');
      this.isIframeLoaded = false;
      this.targetOrigin = this.getTargetOrigin();
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
    },

    bindEvents: function () {
      $(document).on(
        'click',
        '#open-configurator, .open-configurator',
        this.openConfigurator.bind(this)
      );
      window.addEventListener('message', this.handleMessage.bind(this), false);
    },

    openConfigurator: function (event) {
      event.preventDefault();
      var productId =
        $(event.target).data('product-id') ||
        $('button[name="add-to-cart"]').val();
      var modelStateId = $(event.target).data('model-state-id') || '';

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
              ...(data?.custom_data && {
                custom_data: JSON.stringify(data.custom_data),
              }),
            };

            Object.keys(urlParams).forEach(
              (key) => urlParams[key] === undefined && delete urlParams[key]
            );

            const url = buildUrl(configuratorUrl, urlParams);

            this.iframe.src = url;
            this.isIframeLoaded = true;
          }.bind(this)
        );
      }

      this.modal.style.display = 'block';
    },

    closeConfigurator: function () {
      this.modal.style.display = 'none';
    },

    getProductData: function (productId) {
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
      return $.ajax({
        url: configuratorData.ajaxurl,
        type: 'POST',
        data: {
          action: 'get_user_profile',
        },
      });
    },

    getCart: function () {
      return $.ajax({
        url: configuratorData.ajaxurl,
        type: 'POST',
        data: {
          action: 'get_cart',
        },
      });
    },

    messageHandlers: {},

    sendMessage: function (type, data, messageIdProp) {
      return new Promise((resolve, reject) => {
        const messageId = messageIdProp || Date.now().toString();
        this.messageHandlers[messageId] = { resolve, reject };
        this.iframe.contentWindow.postMessage(
          { type, data, messageId },
          this.targetOrigin
        );
        setTimeout(() => {
          if (this.messageHandlers[messageId]) {
            delete this.messageHandlers[messageId];

            // Reject the promise if the message times out
            reject(
              new Error(
                `Message timed out after 5 seconds: ${type} ${messageId}`
              )
            );
          }
        }, this.timeout);
      });
    },

    handleMessage: function (event) {
      // Check if the message is from the configurator
      if (
        event?.origin !== this.targetOrigin ||
        !this.allowedTypes.includes(event?.data?.type)
      ) {
        return;
      }

      const { type, data, messageId } = event.data;

      if (type === this.EVENTS.CONFIGURATOR_READY) {
        this.handleConfiguratorReady();
        return;
      }

      if (messageId) {
        // This is a request from the iframe, so we need to respond
        switch (type) {
          case this.EVENTS.GET_PROFILE:
            this.getUserProfile().then((response) => {
              this.sendMessage(
                this.EVENTS.PROFILE_DATA,
                response.data,
                messageId
              );
            });
            return;
          case this.EVENTS.GET_PRODUCT:
            var productId = $('button[name="add-to-cart"]').val();
            this.getProductData(productId).then((response) => {
              this.sendMessage(
                this.EVENTS.PRODUCT_DATA,
                response.data,
                messageId
              );
            });
            return;
          case this.EVENTS.GET_CART:
            this.getCart().then((response) => {
              this.sendMessage(this.EVENTS.CART_DATA, response.data, messageId);
            });
            return;
        }
      }

      // Handle messages without messageId
      switch (type) {
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
        case this.EVENTS.CONFIGURATOR_READY:
          this.handleConfiguratorReady();
          break;
      }
    },

    getTargetOrigin: function () {
      const configuratorUrl = new URL(
        configuratorData.settings.configurator_url
      );

      return configuratorUrl.origin;
    },

    handleConfiguratorReady: async function () {
      if (this.isConfiguratorReady) {
        return;
      }
      this.isConfiguratorReady = true;

      $('#open-configurator').prop('disabled', false);

      console.log('👌 Configurator ready');
    },

    addToCart: function (data) {
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
            this.sendMessage(this.EVENTS.CART_UPDATED, response.data);
          } else {
            console.error('Failed to add product to cart:', response.data);
          }
        }.bind(this),
        error: function (xhr, status, error) {
          console.error('AJAX error:', status, error);
        },
      });
    },

    updateCart: function (data) {
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
            this.sendMessage(this.EVENTS.CART_UPDATED, response.data);
          } else {
            console.error('Failed to update cart:', response.data);
          }
        }.bind(this),
        error: function (xhr, status, error) {
          console.error('AJAX error:', status, error);
        },
      });
    },

    removeFromCart: function (data) {
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
            this.sendMessage(this.EVENTS.CART_UPDATED, response.data);
          } else {
            console.error('Failed to remove product from cart:', response.data);
          }
        }.bind(this),
        error: function (xhr, status, error) {
          console.error('AJAX error:', status, error);
        },
      });
    },
  };

  $(document).ready(function () {
    configurator.init();
  });
})(jQuery);
