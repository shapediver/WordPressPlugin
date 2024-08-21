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
                searchParams.append(key, value);
              }

              url.search = searchParams.toString();
              return url.toString();
            }

            const url = buildUrl(configuratorData.settings.configurator_url, {
              modelViewUrl: data.model_view_url,
              ticket: data.shapediver_ticket,
              id: productId,
              ...(data?.custom_data && {
                custom_data: JSON.stringify(data.custom_data),
              }),
            });

            this.iframe.src = url;
            this.isIframeLoaded = true;
            this.sendSettingsToConfigurator();
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

    sendSettingsToConfigurator: function () {
      this.iframe.contentWindow.postMessage(
        {
          type: 'settings',
          data: configuratorData.settings,
        },
        '*'
      );
    },

    handleMessage: function (event) {
      var message = event.data;

      switch (message.type) {
        case 'ADD_TO_CART':
          this.addToCart(message.data);
          break;
        case 'REMOVE_FROM_CART':
          this.removeFromCart(message.data);
          break;
        case 'UPDATE_CART':
          this.updateCart(message.data);
          break;
        case 'GET_PROFILE':
          this.getUserProfile().then((response) => {
            this.iframe.contentWindow.postMessage(
              {
                type: 'PROFILE_DATA',
                data: response.data,
              },
              '*'
            );
          });
          break;
        case 'GET_CART':
          this.getCart().then((response) => {
            this.iframe.contentWindow.postMessage(
              {
                type: 'CART_DATA',
                data: response.data,
              },
              '*'
            );
          });
          break;
        case 'GET_PRODUCT':
          var productId = $('button[name="add-to-cart"]').val();
          this.getProductData(productId).then((response) => {
            this.iframe.contentWindow.postMessage(
              {
                type: 'PRODUCT_DATA',
                data: response.data,
              },
              '*'
            );
          });
          break;
        case 'CLOSE_CONFIGURATOR':
          this.closeConfigurator();
          break;
      }
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
            // Optionally update the cart display or show a success message
          } else {
            console.error('Failed to add product to cart:', response.data);
            // Show an error message to the user
          }
        },
        error: function (xhr, status, error) {
          console.error('AJAX error:', status, error);
          // Show an error message to the user
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
            // Optionally update the cart display or show a success message
          } else {
            console.error('Failed to update cart:', response.data);
            // Show an error message to the user
          }
        },
        error: function (xhr, status, error) {
          console.error('AJAX error:', status, error);
          // Show an error message to the user
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
      });
    },
  };

  $(document).ready(function () {
    configurator.init();
  });
})(jQuery);
