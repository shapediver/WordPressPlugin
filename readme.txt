# Bitnami WordPress Docker Setup

This README provides instructions on how to set up and manage your Bitnami WordPress installation using Docker.

## Prerequisites

- Docker
- Docker Compose

## Getting Started

1. Save the `docker-compose.yml` file in a new directory.

2. Open a terminal and navigate to the directory containing the `docker-compose.yml` file.

3. Start the Docker containers:
   ```
   docker-compose up -d
   ```

4. Access WordPress in your browser:
   - Website: http://localhost:8000
   - Admin panel: http://localhost:8000/wp-admin/
   - Default username: user
   - Default password: bitnami

   IMPORTANT: Change these credentials after your first login!

## Useful Docker Commands

- Stop the containers:
  ```
  docker-compose down
  ```

- View running containers:
  ```
  docker-compose ps
  ```

- View container logs:
  ```
  docker-compose logs
  ```

- Access WordPress container shell:
  ```
  docker-compose exec wordpress /bin/bash
  ```

- Access MariaDB container shell:
  ```
  docker-compose exec mariadb /bin/bash
  ```

## WordPress CLI (WP-CLI)

WP-CLI is included in the Bitnami WordPress image. To use it:

1. Access the WordPress container:
   ```
   docker-compose exec wordpress /bin/bash
   ```

2. Run WP-CLI commands:
   ```
   wp --allow-root <command>
   ```

   Example (list users):
   ```
   wp --allow-root user list
   ```

## Backup and Restore

- Backup WordPress files:
  ```
  docker run --rm --volumes-from $(docker-compose ps -q wordpress) -v $(pwd):/backup ubuntu tar cvf /backup/wordpress_files.tar /bitnami/wordpress
  ```

- Backup database:
  ```
  docker-compose exec mariadb /usr/bin/mysqldump -u root --password=bitnami_wordpress bitnami_wordpress > wordpress_database.sql
  ```

- Restore WordPress files:
  ```
  docker run --rm --volumes-from $(docker-compose ps -q wordpress) -v $(pwd):/backup ubuntu bash -c "cd /bitnami/wordpress && tar xvf /backup/wordpress_files.tar --strip 1"
  ```

- Restore database:
  ```
  docker-compose exec -T mariadb /usr/bin/mysql -u root --password=bitnami_wordpress bitnami_wordpress < wordpress_database.sql
  ```

Remember to replace passwords and adjust paths as necessary for your specific setup.

## Troubleshooting

If you encounter issues:
1. Check container status: `docker-compose ps`
2. View logs: `docker-compose logs`
3. Restart containers: `docker-compose restart`
4. Rebuild containers: `docker-compose up -d --build`

For more detailed information, refer to the Bitnami WordPress Docker image documentation.