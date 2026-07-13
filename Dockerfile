# Static serve of the committed dist/ with explicit caching + gzip.
# (Replaces Dokploy's generic `static` build type so index.html is no-cache.)
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist /usr/share/nginx/html
