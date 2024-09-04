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

if (!defined('ABSPATH')) exit; // Exit if accessed directly

class ShapeDiverConfiguratorPlugin {
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('woocommerce_after_add_to_cart_button', array($this, 'add_configurator_button'));
        add_action('wp_footer', array($this, 'add_configurator_modal'));
        add_action('woocommerce_product_options_general_product_data', array($this, 'add_custom_product_fields'));
        add_action('woocommerce_process_product_meta', array($this, 'save_custom_product_fields'));
        add_action('wp_ajax_get_product_data', array($this, 'get_product_data'));
        add_action('wp_ajax_nopriv_get_product_data', array($this, 'get_product_data'));
        add_action('wp_ajax_get_user_profile', array($this, 'get_user_profile'));
        add_filter('woocommerce_add_to_cart_validation', array($this, 'validate_add_to_cart'), 10, 3);
        add_action('wp_ajax_add_to_cart', array($this, 'add_to_cart'));
        add_action('wp_ajax_nopriv_add_to_cart', array($this, 'add_to_cart'));
        add_filter('woocommerce_add_cart_item', array($this, 'add_custom_price_to_cart_item'), 10, 2);
        add_filter('woocommerce_get_cart_item_from_session', array($this, 'get_cart_item_from_session'), 10, 2);
        add_filter('woocommerce_add_cart_item_data', array($this, 'add_custom_data_to_cart_item'), 10, 3);
        add_filter('woocommerce_get_item_data', array($this, 'display_custom_data_in_cart'), 10, 2);
        add_action('woocommerce_checkout_create_order_line_item', array($this, 'add_custom_data_to_order_items'), 10, 4);
        
        add_action('wp_ajax_get_cart', array($this, 'get_cart'));
        add_action('wp_ajax_nopriv_get_cart', array($this, 'get_cart'));
        
        add_action('woocommerce_after_cart_item_name', array($this, 'add_configurator_button_to_cart_alternative'), 10, 2);
        add_filter('woocommerce_cart_item_name', array($this, 'add_configurator_button_to_cart'), 10, 3);
        add_action('woocommerce_order_item_meta_end', array($this, 'add_configurator_button_to_order'), 10, 3);
    }

    public function init() {
        // Initialize plugin
    }

    public function add_admin_menu() {
        add_options_page(
            'ShapeDiver Configurator Settings',
            'ShapeDiver Configurator',
            'manage_options',
            'shapediver-configurator',
            array($this, 'settings_page')
        );
    }

    public function register_settings() {
        register_setting('shapediver_configurator_settings', 'shapediver_configurator_url');
    }

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
                        <th scope="row">Configurator URL</th>
                        <td><input type="text" name="shapediver_configurator_url" value="<?php echo esc_attr(get_option('shapediver_configurator_url', 'https://appbuilder.shapediver.com/v1/main/latest/')); ?>" /></td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    public function enqueue_scripts() {
        if (is_product() || is_cart() || is_wc_endpoint_url('view-order')) {
            wp_enqueue_style('configurator-style', plugin_dir_url(__FILE__) . 'sd-wp.css', array(), '1.0');
            wp_enqueue_script('post-robot', 'https://unpkg.com/post-robot/dist/post-robot.min.js', array(), null, true);
            wp_enqueue_script('configurator-script', plugin_dir_url(__FILE__) . 'sd-wp.js', array('jquery', 'post-robot'), '1.0', true);
            wp_localize_script('configurator-script', 'configuratorData', array(
                'ajaxurl' => admin_url('admin-ajax.php'),
                'settings' => $this->get_configurator_settings()
            ));
        }
    }

    public function add_configurator_button() {
        echo '<button id="open-configurator" class="button alt wp-element-button single_add_to_cart_button">Customize</button>';
    }

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

    public function add_custom_price_to_cart_item($cart_item, $cart_item_key) {
        if (isset($cart_item['custom_price'])) {
            $cart_item['data']->set_price($cart_item['custom_price']);
        }
        return $cart_item;
    }

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
                'total' => $cart_item['line_total'],
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

    public function get_cart_item_from_session($cart_item, $values) {
        if (isset($values['custom_price'])) {
            $cart_item['custom_price'] = $values['custom_price'];
            $cart_item = $this->add_custom_price_to_cart_item($cart_item, '');
        }
        return $cart_item;
    }

    public function display_custom_data_in_cart($item_data, $cart_item) {
        if (isset($cart_item['custom_data'])) {
            foreach ($cart_item['custom_data'] as $key => $value) {
                $item_data[] = array(
                    'key' => ucfirst($key),
                    'value' => (is_array($value) ? json_encode($value) : $value)
                );
            }
        }
        if (isset($cart_item['custom_price'])) {
            $item_data[] = array(
                'key' => 'Custom Price',
                'value' => wc_price($cart_item['custom_price'])
            );
        }
        return $item_data;
    }

    public function add_custom_data_to_cart_item($cart_item_data, $product_id, $variation_id) {
        if (isset($_POST['custom_data'])) {
            $custom_data = json_decode(stripslashes($_POST['custom_data']), true);
            $cart_item_data['custom_data'] = $custom_data;
            
            // Store modelStateId separately for easy access
            if (isset($custom_data['modelStateId'])) {
                $cart_item_data['model_state_id'] = $custom_data['modelStateId'];
            }
        }
        return $cart_item_data;
    }

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

    public function add_custom_product_fields() {
        global $woocommerce, $post;
        echo '<div class="options_group">';
        woocommerce_wp_text_input(array(
            'id' => '_model_view_url',
            'label' => __('Model View URL', 'woocommerce'),
            'desc_tip' => 'true',
            'description' => __('Enter the URL for the 3D model view.', 'woocommerce')
        ));
        woocommerce_wp_text_input(array(
            'id' => '_shapediver_ticket',
            'label' => __('ShapeDiver Ticket', 'woocommerce'),
            'desc_tip' => 'true',
            'description' => __('Enter the ShapeDiver ticket.', 'woocommerce')
        ));
        woocommerce_wp_text_input(array(
            'id' => '_configurator_url',
            'label' => __('Configurator URL', 'woocommerce'),
            'desc_tip' => 'true',
            'description' => __('Enter the Configurator URL for this product. If left empty, the global setting will be used.', 'woocommerce')
        ));
        woocommerce_wp_text_input(array(
            'id' => '_model_state_id',
            'label' => __('Model State ID', 'woocommerce'),
            'desc_tip' => 'true',
            'description' => __('Enter the Model State ID.', 'woocommerce')
        ));
        woocommerce_wp_text_input(array(
            'id' => '_slug',
            'label' => __('Slug', 'woocommerce'),
            'desc_tip' => 'true',
            'description' => __('Enter the slug.', 'woocommerce')
        ));
        echo '</div>';
    }

    public function save_custom_product_fields($post_id) {
        $fields = array('_model_view_url', '_shapediver_ticket', '_configurator_url', '_model_state_id');
        foreach ($fields as $field) {
            if (isset($_POST[$field])) {
                update_post_meta($post_id, $field, sanitize_text_field($_POST[$field]));
            }
        }
    }

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
            'shapediver_ticket' => get_post_meta($product_id, '_shapediver_ticket', true),
            'configurator_url' => get_post_meta($product_id, '_configurator_url', true),
            'model_state_id' => get_post_meta($product_id, '_model_state_id', true),
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
    public function validate_add_to_cart($passed, $product_id, $quantity) {
        // Add custom validation logic here
        return $passed;
    }

    public function add_configurator_button_to_cart($product_name, $cart_item, $cart_item_key) {
        $product_id = $cart_item['product_id'];
        $model_view_url = get_post_meta($product_id, '_model_view_url', true);
        $model_state_id = isset($cart_item['custom_data']['modelStateId']) ? $cart_item['custom_data']['modelStateId'] : '';
    
        if ($model_view_url) {
            $button = sprintf(
                '<br><button class="button alt open-configurator" data-product-id="%d" data-model-state-id="%s" data-cart-item-key="%s">Reconfigure</button>',
                $product_id,
                esc_attr($model_state_id),
                esc_attr($cart_item_key)
            );
            return $product_name . $button;
        }
    
        return $product_name;
    }

    public function add_configurator_button_to_cart_alternative($cart_item, $cart_item_key) {
        $product_id = $cart_item['product_id'];
        $model_view_url = get_post_meta($product_id, '_model_view_url', true);
        $model_state_id = isset($cart_item['custom_data']['modelStateId']) ? $cart_item['custom_data']['modelStateId'] : '';
    
        if ($model_view_url) {
            printf(
                '<button class="button alt open-configurator" data-product-id="%d" data-model-state-id="%s" data-cart-item-key="%s">Reconfigure</button>',
                $product_id,
                esc_attr($model_state_id),
                esc_attr($cart_item_key)
            );
        }
    }

    public function add_configurator_button_to_order($item_id, $item, $order) {
        $product_id = $item->get_product_id();
        $model_view_url = get_post_meta($product_id, '_model_view_url', true);
        $model_state_id = $item->get_meta('modelStateId');
    
        if ($model_view_url) {
            printf(
                '<br><button class="button alt open-configurator" data-product-id="%d" data-model-state-id="%s">Reconfigure</button>',
                $product_id,
                esc_attr($model_state_id)
            );
        }
    }

    private function get_configurator_settings() {
        return array(
            'configurator_url' => get_option('shapediver_configurator_url', 'https://appbuilder.shapediver.com/v1/main/latest/'),
        );
    }
}

$shapediver_configurator_plugin = new ShapeDiverConfiguratorPlugin();