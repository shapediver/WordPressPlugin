<?php
/**
 * Plugin Name: ShapeDiver 3D Configurators
 * Plugin URI: https://github.com/shapediver/WordPressPlugin
 * Description: A plugin to integrate ShapeDiver 3D configurators into WooCommerce.
 * Version: 1.2.0
 * Author: ShapeDiver GmbH
 * Author URI: https://www.shapediver.com
 * License: GPLv2 or later
 * License URI: https://opensource.org/license/gpl-2-0
 * Text Domain: shapediver-3d-configurators
 * WC requires at least: 3.0
 */

// Exit if accessed directly
if (!defined('ABSPATH')) exit;

// Constants
define('SHAPEDIVER_PLUGIN_VERSION', '1.0.0');
define('SHAPEDIVER_PRODUCT_BUTTON_CLASSES', 'single_add_to_cart_button button alt wp-element-button shapediver-product-button');
define('SHAPEDIVER_CART_ITEM_BUTTON_CLASSES', 'single_add_to_cart_button button alt wp-element-button shapediver-cart-item-button');
define('SHAPEDIVER_ORDER_ITEM_BUTTON_CLASSES', 'single_add_to_cart_button button alt wp-element-button shapediver-order-item-button');
define('SHAPEDIVER_BUTTON_ID', 'sd-open-configurator');
define('SHAPEDIVER_APP_BUILDER_URL', 'https://appbuilder.shapediver.com/v1/main/latest/');
define('SHAPEDIVER_PRODUCT_BUTTON_LABEL', 'Customize'); // Default label for the configurator button on the product page
define('SHAPEDIVER_CART_ITEM_BUTTON_LABEL', 'View 3D Model'); // Default label for the configurator button shown for cart items
define('SHAPEDIVER_ORDER_ITEM_BUTTON_LABEL', 'View 3D Model'); // Default label for the configurator button shown for order items

class ShapeDiverConfiguratorPlugin {
    public function __construct() {
        // Initialize plugin
        add_action('init', array($this, 'init'));

        // Admin-related actions
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));

        // Enqueue scripts and styles
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));

        // WooCommerce product page modifications
        add_action('woocommerce_after_add_to_cart_button', array($this, 'add_configurator_button'));
        add_action('wp_footer', array($this, 'add_configurator_modal'));
        add_action('woocommerce_product_options_general_product_data', array($this, 'add_custom_product_fields'));
        add_action('woocommerce_process_product_meta', array($this, 'save_custom_product_fields'));

        // Register shortcode for defining a configurator button
        add_shortcode('sd_configurator_button', array($this, 'configurator_button_shortcode'));

        // AJAX handlers
        $this->register_ajax_handlers();

        // WooCommerce cart and checkout modifications
        $this->modify_woocommerce_cart_and_checkout();

        // Display custom data in cart and order
        $this->display_custom_data();
    }

    // Initialize plugin
    public function init() {
        // Placeholder for future initialization code
    }

    // Add menu item to WordPress admin
    public function add_admin_menu() {
        add_options_page(
            'ShapeDiver Plugin Settings',
            'ShapeDiver',
            'manage_options',
            'shapediver-settings',
            array($this, 'settings_page')
        );
    }

    // Register plugin settings
    public function register_settings() {
        register_setting('shapediver_plugin_settings', 'default_configurator_url');
        register_setting('shapediver_plugin_settings', 'default_settings_url');
        register_setting('shapediver_plugin_settings', 'product_button_label');
        register_setting('shapediver_plugin_settings', 'cart_item_button_label');
        register_setting('shapediver_plugin_settings', 'order_item_button_label');
        register_setting('shapediver_plugin_settings', 'debug_flag', array(
            'sanitize_callback' => array($this, 'sanitize_checkbox'),
        ));
    }

    // Sanitize function for checkbox (return 1 if checked, 0 if not)
    function sanitize_checkbox($input) {
        return $input ? 1 : 0;
    }

    // Render settings page in WordPress admin
    public function settings_page() {
       ?>
        <div class="wrap">
            <h1>ShapeDiver Configurator Settings</h1>
            <form method="post" action="options.php">
                <?php
                settings_fields('shapediver_plugin_settings');
                do_settings_sections('shapediver_plugin_settings');
                ?>
                <table class="form-table">
                    <tr valign="top">
                        <th scope="row">Default configurator URL. This defaults to ShapeDiver App Builder and can be overridden for each product.</th>
                        <td>
                            <input type="text" name="default_configurator_url" value="<?php echo esc_attr(get_option('default_configurator_url', SHAPEDIVER_APP_BUILDER_URL)); ?>" />
                        </td>
                    </tr>
                    <tr valign="top">
                        <th scope="row">Default URL of the JSON file defining the App Builder settings of the configurator. This can be a relative or absolute URL, and can be overridden for each product. Leave this empty to not apply a specific theme.</th>
                        <td>
                            <input type="text" name="default_settings_url" value="<?php echo esc_attr(get_option('default_settings_url')); ?>" />
                        </td>
                    </tr>
                    <tr valign="top">
                        <th scope="row">Label of the configurator button on the product page (defaults to "<?php echo esc_attr(SHAPEDIVER_PRODUCT_BUTTON_LABEL) ?>").</th>
                        <td>
                            <input type="text" name="product_button_label" value="<?php echo esc_attr(get_option('product_button_label', SHAPEDIVER_PRODUCT_BUTTON_LABEL)); ?>" />
                        </td>
                    </tr>
                    <tr valign="top">
                        <th scope="row">Label of the configurator button shown for cart items (defaults to "<?php echo esc_attr(SHAPEDIVER_CART_ITEM_BUTTON_LABEL) ?>").</th>
                        <td>
                            <input type="text" name="cart_item_button_label" value="<?php echo esc_attr(get_option('cart_item_button_label', SHAPEDIVER_CART_ITEM_BUTTON_LABEL)); ?>" />
                        </td>
                    </tr>
                    <tr valign="top">
                        <th scope="row">Label of the configurator button shown for order items (defaults to "<?php echo esc_attr(SHAPEDIVER_ORDER_ITEM_BUTTON_LABEL) ?>").</th>
                        <td>
                            <input type="text" name="order_item_button_label" value="<?php echo esc_attr(get_option('order_item_button_label', SHAPEDIVER_ORDER_ITEM_BUTTON_LABEL)); ?>" />
                        </td>
                    </tr>
                    <tr valign="top">
                        <th scope="row">Debug flag.</th>
                        <td>
                            <input type="checkbox" name="debug_flag" value="1" <?php checked("1", get_option('debug_flag', false)); ?> />
                            <label for="debug_flag">Check to enable debug messages in the browser console</label>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    // Enqueue necessary scripts and styles
    public function enqueue_scripts() {  
        wp_enqueue_style('configurator-style', plugin_dir_url(__FILE__) . 'sd-wp.css', array(), '1.0');
        wp_enqueue_script('configurator-script', plugin_dir_url(__FILE__) . 'sd-wp.js', array(), '1.0', true);
        wp_localize_script('configurator-script', 'configuratorData', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'settings' => $this->get_configurator_settings()
        ));
    }

    // Function to check whether any of the following product meta fields are set: 
    // _model_view_url, _embedding_ticket, _slug, _settings_url
    public function is_product_configurable($product_id) {
        $model_view_url = get_post_meta($product_id, '_model_view_url', true);
        $embedding_ticket = get_post_meta($product_id, '_embedding_ticket', true);
        $slug = get_post_meta($product_id, '_slug', true);
        $settings_url = get_post_meta($product_id, '_settings_url', true);
        return !empty($model_view_url) || !empty($embedding_ticket) || !empty($slug) || !empty($settings_url);
    }
    

    // Add "Customize" button to product page
    public function add_configurator_button() {
        global $product;
        if ($product) {
            $product_id = $product->get_id();
            if ($this->is_product_configurable($product_id)) {
                echo '<button id="' . esc_attr(SHAPEDIVER_BUTTON_ID) . '" class="' . esc_attr(SHAPEDIVER_PRODUCT_BUTTON_CLASSES) . '" data-product-id="' . esc_attr($product_id) . '" disabled>' . esc_html(get_option('product_button_label', SHAPEDIVER_PRODUCT_BUTTON_LABEL)) . '</button>';
            }
        }
    }

    // Add modal for configurator iframe
    public function add_configurator_modal() {
        ?>
        <div id="configurator-modal" class="modal" style="display: none;">
            <div class="modal-content">
                <iframe id="configurator-iframe" src="" frameborder="0" allowfullscreen></iframe>
            </div>
        </div>
        <?php
    }

    // Function for the "configurator_button" shortcode
    function configurator_button_shortcode($atts) {
        global $product;
    
        // Define default attributes for the shortcode
        $atts = shortcode_atts(
            array(
                'label' => get_option('product_button_label', SHAPEDIVER_PRODUCT_BUTTON_LABEL), // Button text
                'class'  => SHAPEDIVER_PRODUCT_BUTTON_CLASSES, // Button classes
            ),
            $atts
        );

        if ($product) {
            $product_id = $product->get_id();
            if ($this->is_product_configurable($product_id)) {
                echo '<button id="' . esc_attr(SHAPEDIVER_BUTTON_ID) . 
                    '" class="' . esc_attr($atts['class']) . 
                    '" data-product-id="' . esc_attr($product_id) . '" disabled>' . 
                    esc_html($atts['label']) . 
                    '</button>';
            }
        }
    }
    
    // Register AJAX handlers
    private function register_ajax_handlers() {
        $ajax_actions = array(
            'get_product_data',
            'get_user_profile',
            'add_to_cart',
            'get_cart'
        );

        foreach ($ajax_actions as $action) {
            add_action("wp_ajax_{$action}", array($this, $action));
            add_action("wp_ajax_nopriv_{$action}", array($this, $action));
        }
    }

    // Modify WooCommerce cart and checkout
    private function modify_woocommerce_cart_and_checkout() {
        // This adds the custom price to the cart item
        add_filter('woocommerce_add_cart_item', array($this, 'add_custom_price_to_cart_item'), 10, 2);
        // Restore custom price when getting cart item from session
        add_filter('woocommerce_get_cart_item_from_session', array($this, 'get_cart_item_from_session'), 10, 2);
        // Add custom data to cart item
        add_filter('woocommerce_add_cart_item_data', array($this, 'add_custom_data_to_cart_item'), 10, 3);
        // On checkout: Add custom data from cart item to order item 
        add_action('woocommerce_checkout_create_order_line_item', array($this, 'add_custom_data_to_order_item'), 10, 4);
    }

    // Display custom data in cart and order
    private function display_custom_data() {
        // This adds the button after the order item in the order overview page
        add_action('woocommerce_order_item_meta_end', array($this, 'add_button_after_order_item'), 10, 3);
        // This modifies the display key of the order item meta data
        add_filter('woocommerce_order_item_display_meta_key', array($this, 'modify_order_item_meta_key'), 10, 3);
        // This adds the custom data to the cart item in the cart overview page
        add_filter('woocommerce_get_item_data', array($this, 'display_custom_data_in_cart'), 10, 2);
    } 

    public function modify_order_item_meta_key($display_key, $meta_key, $item) {
        if ($display_key === 'model_state_id') {
            return "Configuration ID";
        }
        if ($display_key === 'description') {
            return "Description";
        }
        return $display_key;
    }
 
    // AJAX handler to add product to cart 
    public function add_to_cart() {
        $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
        // Validate product
        $product = wc_get_product($product_id);
        if (!$product || !$product->is_purchasable()) {
            wp_send_json_error(array('message' => 'Invalid or non-purchasable product'));
            wp_die();
        }

        $quantity = isset($_POST['quantity']) ? intval($_POST['quantity']) : 1;
        $variation_id = isset($_POST['variation_id']) ? intval($_POST['variation_id']) : 0;
        // NOTE: The WordPress plugin checker creates an error for the following line (WordPress.Security.ValidatedSanitizedInput.InputNotSanitized)
        $custom_data = json_decode(isset($_POST['custom_data']) ? wp_unslash($_POST['custom_data']) : '', true);
        $custom_price = isset($_POST['custom_price']) ? floatval($_POST['custom_price']) : 0;
        
        if ($custom_price < 0) {
            wp_send_json_error(array('message' => 'Invalid price'));
            wp_die();
        }

        // Sanitize custom data
        $custom_data = array_map('sanitize_text_field', $custom_data);

        $cart_item_data = array(
            'custom_data' => $custom_data,
            'custom_price' => $custom_price
        );

        $cart_item_key = WC()->cart->add_to_cart($product_id, $quantity, $variation_id, array(), $cart_item_data);

        if ($cart_item_key) {
            wp_send_json_success(array('message' => 'Product added to cart', 'cart_item_key' => $cart_item_key));
        } else {
            wp_send_json_error(array('message' => 'Failed to add product to cart'));
        }

        wp_die();
    }

    // Add custom price to cart item
    public function add_custom_price_to_cart_item($cart_item, $cart_item_key) {
        if (isset($cart_item['custom_price'])) {
            $cart_item['data']->set_price($cart_item['custom_price']);
        }
        return $cart_item;
    }

    // AJAX handler to get cart data
    public function get_cart() {
        $cart = WC()->cart->get_cart();
        $cart_data = array();

        foreach ($cart as $cart_item_key => $cart_item) {
            $product = $cart_item['data'];
            $cart_data[] = array(
                'key' => $cart_item_key,
                'product_id' => $cart_item['product_id'],
                'variation_id' => $cart_item['variation_id'],
                'quantity' => $cart_item['quantity'],
                'product_name' => $product->get_name(),
                'product_price' => $product->get_price(), // string
                'total' => $cart_item['line_total'], // number
                'custom_data' => isset($cart_item['custom_data']) ? $cart_item['custom_data'] : null,
                'custom_price' => isset($cart_item['custom_price']) ? $cart_item['custom_price'] : null,
            );
        }

        $cart_totals = array(
            'subtotal' => WC()->cart->get_subtotal(), // string
            'total' => WC()->cart->get_total('edit'), // string
        );

        $response = array(
            'items' => $cart_data,
            'totals' => $cart_totals,
        );

        wp_send_json_success($response);
    }

    // Restore custom price when getting cart item from session
    public function get_cart_item_from_session($cart_item, $values) {
        if (isset($values['custom_price'])) {
            $cart_item['custom_price'] = $values['custom_price'];
            $cart_item = $this->add_custom_price_to_cart_item($cart_item, '');
        }
        if (isset($values['custom_data'])) {
            $cart_item['custom_data'] = $values['custom_data'];
        }
        if (isset($values['model_state_id'])) {
            $cart_item['model_state_id'] = $values['model_state_id'];
        }
        return $cart_item;
    }

    // Display custom data in cart
    public function display_custom_data_in_cart($item_data, $cart_item) {
        if (isset($cart_item['custom_data'])) {
            $existing_keys = array_column($item_data, 'key');
            foreach ($cart_item['custom_data'] as $key => $value) {
                $display_key = $key;
                if ($key === 'model_state_id') {
                    $display_key = 'Configuration ID';
                } else {
                    $display_key = str_replace('_', ' ', $display_key);
                }
                $display_key = ucfirst($display_key);
                if (!in_array($display_key, $existing_keys)) {
                    $item_data[] = array(
                        'key' => esc_html($display_key),
                        'value' => esc_html(is_array($value) ? wp_json_encode($value) : $value)
                    );
                    $existing_keys[] = $display_key;
                }
            }
        }
        // Add the product id to the item data: 
        // We need this to dynamically add a button for
        // opening the configurator to the cart item. 
        // We hide the element displaying the product id using CSS. 
        $item_data[] = array(
            'key' => 'Product ID',
            'value' => esc_html($cart_item['product_id'])
        );
        return $item_data;
    }

    // Add "View 3D Model" button after order item
    public function add_button_after_order_item($item_id, $item, $order) {
        if (!is_object($item) || !method_exists($item, 'get_product_id')) {
            error_log('Invalid item object in add_button_after_order_item');

            echo 'Invalid item object in add_button_after_order_item';
            return;
        }
    
        $product_id = $item->get_product_id();
        $model_state_id = $item->get_meta('model_state_id');
        
        if (!empty($model_state_id) && $this->is_product_configurable($product_id)) {
            echo '<button id="' . esc_attr(SHAPEDIVER_BUTTON_ID) . '" class="' . esc_attr(SHAPEDIVER_ORDER_ITEM_BUTTON_CLASSES) . 
                '" data-model-state-id="' . esc_attr($model_state_id) . 
                '" data-context=order' . 
                ' data-product-id="' . esc_attr($product_id) . '">' . 
                esc_html(get_option('order_item_button_label', SHAPEDIVER_ORDER_ITEM_BUTTON_LABEL)) . 
                '</button>';
        }
    }

    // Filter: Add custom data to cart item
    public function add_custom_data_to_cart_item($cart_item_data, $product_id, $variation_id) {
        if (isset($_POST['custom_data'])) {
            // NOTE: The WordPress plugin checker creates an error for the following line (WordPress.Security.ValidatedSanitizedInput.InputNotSanitized)
            $custom_data = json_decode(wp_unslash($_POST['custom_data']), true);
            // Sanitize custom data
            $custom_data = array_map('sanitize_text_field', $custom_data);
            $cart_item_data['custom_data'] = $custom_data;
            // Store model_state_id separately for easy access
            if (isset($custom_data['model_state_id'])) {
                $cart_item_data['model_state_id'] = sanitize_text_field($custom_data['model_state_id']);
            }
        }
        return $cart_item_data;
    }

    // Action: Add custom data to order items
    public function add_custom_data_to_order_item($item, $cart_item_key, $values, $order) {
        if (isset($values['custom_data'])) {
            $custom_data = $values['custom_data'];
            
            // Add model_state_id separately
            if (isset($custom_data['model_state_id'])) {
                $item->add_meta_data('model_state_id', sanitize_text_field($custom_data['model_state_id']));
            }
            
            // Add description separately
            if (isset($custom_data['description'])) {
                $item->add_meta_data('description', sanitize_text_field($custom_data['description']));
            }
            
            // Add all custom data as a single meta field - to be clarified why we need this
            $item->add_meta_data('custom_data', $custom_data);
        }
    }

    // Add custom product fields to WooCommerce product data
    public function add_custom_product_fields() {
        global $woocommerce, $post;
        echo '<div class="options_group">';
        woocommerce_wp_text_input(array(
            'id' => '_slug',
            'label' => __('Slug', 'woocommerce'),
            'desc_tip' => 'true',
            'description' => __('Enter the slug of your ShapeDiver model. The slug is the last part of the URL of your model. You can leave this empty if you provide ticket and model view URL.', 'woocommerce')
        ));
        woocommerce_wp_text_input(array(
            'id' => '_embedding_ticket',
            'label' => __('ShapeDiver Ticket', 'woocommerce'),
            'desc_tip' => 'true',
            'description' => __('Enter a ticket for embedding for your ShapeDiver model. You can leave this empty if you provide a slug.', 'woocommerce')
        ));
        woocommerce_wp_text_input(array(
            'id' => '_model_view_url',
            'label' => __('ShapeDiver model view URL', 'woocommerce'),
            'desc_tip' => 'true',
            'description' => __('Enter the model view URL of your ShapeDiver model. You can leave this empty if you provide a slug.', 'woocommerce')
        ));
        woocommerce_wp_text_input(array(
            'id' => '_model_state_id',
            'label' => __('Model State ID', 'woocommerce'),
            'desc_tip' => 'true',
            'description' => __('Optional. Enter a model state ID of your ShapeDiver model. If left empty, the model\'s default state will be used.', 'woocommerce')
        ));
        woocommerce_wp_text_input(array(
            'id' => '_configurator_url',
            'label' => __('Configurator URL', 'woocommerce'),
            'desc_tip' => 'true',
            'description' => __('Optional. Enter the configurator URL for this product. If left empty, the default configurator URL configured in the ShapeDiver plugin settings will be used. This defaults to ShapeDiver App Builder.', 'woocommerce')
        ));
        woocommerce_wp_text_input(array(
            'id' => '_settings_url',
            'label' => __('Settings JSON URL', 'woocommerce'),
            'desc_tip' => 'true',
            'description' => __('Optional. Enter a URL of the JSON file defining the App Builder settings of the configurator. This can be a relative or absolute URL.', 'woocommerce')
        ));
        
        echo '</div>';
    }

    // Save custom product fields
    public function save_custom_product_fields($post_id) {
        $fields = array('_slug', '_embedding_ticket', '_model_view_url', '_model_state_id', '_configurator_url', '_settings_url');
        foreach ($fields as $field) {
            if (isset($_POST[$field])) {
                update_post_meta($post_id, $field, sanitize_text_field(wp_unslash($_POST[$field])));
            }
        }
    }

    // AJAX handler to get product data
    public function get_product_data() {
        $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
        $product = wc_get_product($product_id);
        if (!$product) {
            wp_send_json_error('Invalid product');
        }
        $data = array(
            'id' => $product->get_id(),
            'name' => esc_html($product->get_name()),
            'price' => $product->get_price(),
            'model_view_url' => esc_url(get_post_meta($product_id, '_model_view_url', true)),
            'embedding_ticket' => sanitize_text_field(get_post_meta($product_id, '_embedding_ticket', true)),
            'configurator_url' => esc_url(get_post_meta($product_id, '_configurator_url', true)),
            'model_state_id' => sanitize_text_field(get_post_meta($product_id, '_model_state_id', true)),
            'slug' => sanitize_text_field(get_post_meta($product_id, '_slug', true)),
            'settings_url' => sanitize_text_field(get_post_meta($product_id, '_settings_url', true)),
        );
        wp_send_json_success($data);
    }

    public function get_user_profile() {
        if (!is_user_logged_in()) {
            wp_send_json_error('User not logged in');
        }
        $user = wp_get_current_user();
        $data = array(
            'id' => $user->ID,
            'name' => esc_html($user->display_name),
            'email' => sanitize_email($user->user_email),
        );
        wp_send_json_success($data);
    }
    
    // Get configurator settings
    private function get_configurator_settings() {
      
        return array(
            'configurator_url' => get_option('default_configurator_url', SHAPEDIVER_APP_BUILDER_URL),
            'default_settings_url' => get_option('default_settings_url'),
            'debug_flag' => get_option('debug_flag', false),
            'cart_item_button_label' => get_option('cart_item_button_label', SHAPEDIVER_CART_ITEM_BUTTON_LABEL),
            'cart_item_button_classes' => get_option('cart_item_button_classes', SHAPEDIVER_CART_ITEM_BUTTON_CLASSES),
        );
    }
}

$shapediver_configurator_plugin = new ShapeDiverConfiguratorPlugin();