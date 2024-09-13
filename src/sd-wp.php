<?php
/**
 * Plugin Name: ShapeDiver WordPress Plugin
 * Description: A plugin to integrate the ShapeDiver 3D configurator into WooCommerce.
 * Version: 1.0
 * Author: ShapeDiver GmbH
 * Author URI: https://www.shapediver.com
 * License: MIT
 * License URI: https://opensource.org/licenses/MIT
 * Text Domain: shapediver-wordpress-plugin
 * WC requires at least: 3.0
 */

// Exit if accessed directly
if (!defined('ABSPATH')) exit;

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
            'ShapeDiver Configurator Settings',
            'ShapeDiver Configurator',
            'manage_options',
            'shapediver-configurator',
            array($this, 'settings_page')
        );
    }

    // Register plugin settings
    public function register_settings() {
        register_setting('shapediver_configurator_settings', 'shapediver_configurator_url');
    }

    // Render settings page in WordPress admin
    public function settings_page() {
        ?>
        <div class="wrap">
            <h1>ShapeDiver Configurator Settings</h1>
            <form method="post" action="options.php">
                <?php
                settings_fields('shapediver_configurator_settings');
                do_settings_sections('shapediver_configurator_settings');
                ?>
                <table class="form-table">
                    <tr valign="top">
                        <th scope="row">Default configurator URL (can be overridden for each product)</th>
                        <td><input type="text" name="shapediver_configurator_url" value="<?php echo esc_attr(get_option('shapediver_configurator_url', 'https://appbuilder.shapediver.com/v1/main/latest/')); ?>" /></td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    // Enqueue necessary scripts and styles
    public function enqueue_scripts() {
        if (is_product() || is_cart() || is_wc_endpoint_url('view-order')) {
            wp_enqueue_style('configurator-style', plugin_dir_url(__FILE__) . 'sd-wp.css', array(), '1.0');
            wp_enqueue_script('configurator-script', plugin_dir_url(__FILE__) . 'sd-wp.js', array(), '1.0', true);
            wp_localize_script('configurator-script', 'configuratorData', array(
                'ajaxurl' => admin_url('admin-ajax.php'),
                'settings' => $this->get_configurator_settings()
            ));
        }
    }

    // Add "Customize" button to product page
    public function add_configurator_button() {
        echo '<button id="open-configurator" class="button alt wp-element-button single_add_to_cart_button" disabled>Customize</button>';
    }

    // Add modal for configurator iframe
    public function add_configurator_modal() {
        if (is_product() || is_cart() || is_wc_endpoint_url('view-order')) {
            ?>
            <div id="configurator-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <iframe id="configurator-iframe" src="" frameborder="0"></iframe>
                </div>
            </div>
            <?php
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
        add_filter('woocommerce_add_cart_item', array($this, 'add_custom_price_to_cart_item'), 10, 2);
        add_filter('woocommerce_get_cart_item_from_session', array($this, 'get_cart_item_from_session'), 10, 2);
        add_filter('woocommerce_add_cart_item_data', array($this, 'add_custom_data_to_cart_item'), 10, 3);
        add_action('woocommerce_checkout_create_order_line_item', array($this, 'add_custom_data_to_order_items'), 10, 4);
    }

    // Display custom data in cart and order
    private function display_custom_data() {
        add_filter('woocommerce_get_item_data', array($this, 'display_custom_data_in_cart'), 10, 2);
        add_action('woocommerce_after_cart_item_name', array($this, 'add_button_after_cart_item'), 10, 2);
        add_action('woocommerce_order_item_meta_end', array($this, 'add_button_after_order_item'), 10, 3);
    }

    // AJAX handler to add product to cart
    public function add_to_cart() {
        $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
        $quantity = isset($_POST['quantity']) ? intval($_POST['quantity']) : 1;
        $variation_id = isset($_POST['variation_id']) ? intval($_POST['variation_id']) : 0;
        $custom_data = isset($_POST['custom_data']) ? json_decode(stripslashes($_POST['custom_data']), true) : array();
        $custom_price = isset($_POST['custom_price']) ? floatval($_POST['custom_price']) : 0;

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
                'name' => $product->get_name(),
                'price' => $product->get_price(),
                'total' => $cart_item['line_total'], // TODO does this exist?
                'custom_data' => isset($cart_item['custom_data']) ? $cart_item['custom_data'] : null,
                'custom_price' => isset($cart_item['custom_price']) ? $cart_item['custom_price'] : null,
            );
        }

        $cart_totals = array(
            'subtotal' => WC()->cart->get_subtotal(),
            'total' => WC()->cart->get_total('edit'),
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
        return $cart_item;
    }

    // Display custom data in cart
    public function display_custom_data_in_cart($item_data, $cart_item) {
        if (isset($cart_item['custom_data'])) {
            foreach ($cart_item['custom_data'] as $key => $value) {
                $item_data[] = array(
                    'key' => ucfirst($key),
                    'value' => (is_array($value) ? json_encode($value) : $value)
                );
            }
        }
        
        return $item_data;
    }

    // Add "View 3D Model" button after cart item
    public function add_button_after_cart_item($cart_item, $cart_item_key) {
        if (isset($cart_item['custom_data'])) {
            echo '<button class="button alt open-configurator" data-model-state-id="' . esc_attr($cart_item['custom_data']['model_state_id']) . '">View 3D Model</button>';
        }
    }

    // Add "View 3D Model" button after order item
    public function add_button_after_order_item($item_id, $item, $order) {
        $product_id = $item->get_product_id();
        $model_state_id = wc_get_order_item_meta($item_id, 'model_state_id', true);
        if ($model_state_id) {
            echo '<button class="button alt open-configurator" data-model-state-id="' . esc_attr($model_state_id) . '" data-product-id="' . esc_attr($product_id) . '">View 3D Model</button>';
        }
    }

    // Add custom data to cart item
    public function add_custom_data_to_cart_item($cart_item_data, $product_id, $variation_id) {
        if (isset($_POST['custom_data'])) {
            $custom_data = json_decode(stripslashes($_POST['custom_data']), true);
            $cart_item_data['custom_data'] = $custom_data;
            
            // Store model_state_id separately for easy access
            if (isset($custom_data['model_state_id'])) {
                $cart_item_data['model_state_id'] = $custom_data['model_state_id'];
            }
        }
        return $cart_item_data;
    }

    // Add custom data to order items
    public function add_custom_data_to_order_items($item, $cart_item_key, $values, $order) {
        if (isset($values['custom_data'])) {
            foreach ($values['custom_data'] as $key => $value) {
                $item->add_meta_data($key, $value);
            }
        }
        if (isset($values['model_state_id'])) {
            $item->add_meta_data('model_state_id', $values['model_state_id']);
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
            'description' => __('Enter the slug of your ShapeDiver model. You can leave this empty if you provide ticket and model view URL.', 'woocommerce')
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
            'description' => __('Enter the model state ID of your ShapeDiver model. If left empty, the model\'s default state will be used.', 'woocommerce')
        ));
        woocommerce_wp_text_input(array(
            'id' => '_configurator_url',
            'label' => __('Configurator URL', 'woocommerce'),
            'desc_tip' => 'true',
            'description' => __('Enter the configurator URL for this product. If left empty, ShapeDiver App Builder will be used.', 'woocommerce')
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
                update_post_meta($post_id, $field, sanitize_text_field($_POST[$field]));
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
            'name' => $product->get_name(),
            'price' => $product->get_price(),
            'model_view_url' => get_post_meta($product_id, '_model_view_url', true),
            'embedding_ticket' => get_post_meta($product_id, '_embedding_ticket', true),
            'configurator_url' => get_post_meta($product_id, '_configurator_url', true),
            'model_state_id' => get_post_meta($product_id, '_model_state_id', true),
            'slug' => get_post_meta($product_id, '_slug', true),
            'settings_url' => get_post_meta($product_id, '_settings_url', true),
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
            'name' => $user->display_name,
            'email' => $user->user_email,
        );
        wp_send_json_success($data);
    }
    
    private function get_configurator_settings() {
        return array(
            'configurator_url' => get_option('shapediver_configurator_url', 'https://appbuilder.shapediver.com/v1/main/latest/'),
        );
    }
}

$shapediver_configurator_plugin = new ShapeDiverConfiguratorPlugin();