(function ($) {
  var configurator = {
    init: function () {
      this.modal = document.getElementById('configurator-modal');
      this.iframe = document.getElementById('configurator-iframe');
      this.isIframeLoaded = false;
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
              modelStateId: data.model_state_id,
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

    sendMessage: function (type, data) {
      return new Promise((resolve, reject) => {
        const messageId = Date.now().toString();
        this.messageHandlers[messageId] = { resolve, reject };
        this.iframe.contentWindow.postMessage({ type, data, messageId }, '*');
        setTimeout(() => {
          delete this.messageHandlers[messageId];
          console.error({ type, data });
          reject(new Error('Message timed out'));
        }, 5000);
      });
    },

    handleMessage: function (event) {
      const { type, data, messageId } = event.data;

      if (messageId) {
        // This is a request from the iframe, so we need to respond
        switch (type) {
          case 'GET_PROFILE':
            this.getUserProfile().then((response) => {
              this.iframe.contentWindow.postMessage(
                { type: 'PROFILE_DATA', data: response.data, messageId },
                '*'
              );
            });
            return;
          case 'GET_PRODUCT':
            var productId = $('button[name="add-to-cart"]').val();
            this.getProductData(productId).then((response) => {
              this.iframe.contentWindow.postMessage(
                { type: 'PRODUCT_DATA', data: response.data, messageId },
                '*'
              );
            });
            return;
          case 'GET_CART':
            this.getCart().then((response) => {
              this.iframe.contentWindow.postMessage(
                { type: 'CART_DATA', data: response.data, messageId },
                '*'
              );
            });
            return;
        }
      }

      // Handle messages without messageId (old behavior)
      switch (type) {
        case 'ADD_TO_CART':
          this.addToCart(data);
          break;
        case 'REMOVE_FROM_CART':
          this.removeFromCart(data);
          break;
        case 'UPDATE_CART':
          this.updateCart(data);
          break;
        case 'CLOSE_CONFIGURATOR':
          this.closeConfigurator();
          break;
        case 'CONFIGURATOR_READY':
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

    handleConfiguratorReady: function () {
      $('#open-configurator').prop('disabled', false);
      // Send initial data to the configurator
      this.getUserProfile().then((response) => {
        this.sendMessage('PROFILE_DATA', response.data);
      });
      this.getCart().then((response) => {
        this.sendMessage('CART_DATA', response.data);
      });
      var productId = $('button[name="add-to-cart"]').val();
      this.getProductData(productId).then((response) => {
        this.sendMessage('PRODUCT_DATA', response.data);
      });
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
            console.log('Product added to cart:', response.data);
            this.sendMessage('CART_UPDATED', response.data);
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
            console.log('Cart updated:', response.data);
            this.sendMessage('CART_UPDATED', response.data);
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
            console.log('Product removed from cart:', response.data);
            this.sendMessage('CART_UPDATED', response.data);
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
