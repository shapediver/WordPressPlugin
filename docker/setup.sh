#!/bin/sh
set -eu

echo "Waiting for WordPress files..."
i=0
while [ ! -f /var/www/html/wp-includes/version.php ] || [ ! -f /var/www/html/wp-config.php ]; do
	i=$((i + 1))
	if [ "$i" -ge 60 ]; then
		echo "WordPress files did not appear in time."
		exit 1
	fi
	sleep 2
done

echo "Waiting for database..."
i=0
until wp db check >/dev/null 2>&1; do
	i=$((i + 1))
	if [ "$i" -ge 60 ]; then
		echo "Database did not become ready in time."
		exit 1
	fi
	sleep 2
done

if ! wp core is-installed --quiet; then
	echo "Installing WordPress..."
	wp core install \
		--url=http://localhost:8080 \
		--title="ShapeDiver Plugin Dev" \
		--admin_user=admin \
		--admin_password=admin \
		--admin_email=admin@example.com \
		--skip-email
fi

if ! wp plugin is-installed woocommerce; then
	echo "Installing WooCommerce..."
	wp plugin install woocommerce --activate
else
	wp plugin activate woocommerce >/dev/null || true
fi

if ! wp plugin is-installed shapediver-3d-configurators; then
	echo "ShapeDiver plugin not found in wp-content/plugins. Did you run pnpm run build?"
	exit 1
fi
wp plugin activate shapediver-3d-configurators

echo "WordPress setup complete."
echo "Admin: http://localhost:8080/wp-admin  (admin / admin)"
