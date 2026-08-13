---
title: 如何通过docker部署https访问的nginx应用？
sidebarGroup: Docker 进阶
shortTitle: 01 如何通过docker部署https访问的ng...
order: 1
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Docker 进阶
  - 云原生
  - 课程笔记
description: 如何通过docker容器部署https访问的nginx应用？ 一、应用目录准备 ~~~powershell 存储配置文件 mkdir -p nginxdir/nginx/conf.d ~~~ ~~~p...
---

> **Docker 进阶 · 第 1 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 如何通过docker容器部署https访问的nginx应用？

# 一、应用目录准备

~~~powershell
存储配置文件
# mkdir -p nginxdir/nginx/conf.d
~~~

~~~powershell
存储证书文件
# mkdir -p nginxdir/nginx/certs
~~~

~~~powershell
存储网站文件
# mkdir -p nginxdir/app
~~~

# 二、文件准备

## 2.1 证书文件准备

~~~powershell
# ls /root/nginxdir/nginx/certs/
www.kubemsb.com.key  www.kubemsb.com.pem
~~~

## 2.2 网站文件准备

~~~powershell
# echo "ssl test" > /root/nginxdir/nginx/app/index.html
~~~

~~~powershell
# ls /root/nginxdir/nginx/app/
index.html
~~~

## 2.3 配置文件准备

~~~powershell
# vim /root/nginxdir/nginx/conf.d/default.conf
# cat /root/nginxdir/nginx/conf.d/default.conf
server {
    listen       80;
    listen       443 ssl;
    listen  [::]:443;
    server_name  www.kubemsb.com;

    #access_log  /var/log/nginx/host.access.log  main;

    ssl_certificate /etc/nginx/certs/www.kubemsb.com.pem;
    ssl_certificate_key /etc/nginx/certs/www.kubemsb.com.key;

    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
    }

    #error_page  404              /404.html;

    # redirect server error pages to the static page /50x.html
    #
    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }

    # proxy the PHP scripts to Apache listening on 127.0.0.1:80
    #
    #location ~ \.php$ {
    #    proxy_pass   http://127.0.0.1;
    #}

    # pass the PHP scripts to FastCGI server listening on 127.0.0.1:9000
    #
    #location ~ \.php$ {
    #    root           html;
    #    fastcgi_pass   127.0.0.1:9000;
    #    fastcgi_index  index.php;
    #    fastcgi_param  SCRIPT_FILENAME  /scripts$fastcgi_script_name;
    #    include        fastcgi_params;
    #}

    # deny access to .htaccess files, if Apache's document root
    # concurs with nginx's one
    #
    #location ~ /\.ht {
    #    deny  all;
    #}
}
~~~

~~~powershell
# vim /root/nginxdir/nginx/conf.d/default.conf
# cat /root/nginxdir/nginx/conf.d/default.conf
server {
   listen       80;
   server_name  www.kubemsb.com;
   return 301 https://$host$request_uri;
}
server {
    listen      443 ssl;
    server_name  www.kubemsb.com;

    #access_log  /var/log/nginx/host.access.log  main;
    ssl_certificate /etc/nginx/certs/www.kubemsb.com.pem;
    ssl_certificate_key /etc/nginx/certs/www.kubemsb.com.key;

    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
    }

    #error_page  404              /404.html;

    # redirect server error pages to the static page /50x.html
    #
    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }

    # proxy the PHP scripts to Apache listening on 127.0.0.1:80
    #
    #location ~ \.php$ {
    #    proxy_pass   http://127.0.0.1;
    #}

    # pass the PHP scripts to FastCGI server listening on 127.0.0.1:9000
    #
    #location ~ \.php$ {
    #    root           html;
    #    fastcgi_pass   127.0.0.1:9000;
    #    fastcgi_index  index.php;
    #    fastcgi_param  SCRIPT_FILENAME  /scripts$fastcgi_script_name;
    #    include        fastcgi_params;
    #}

    # deny access to .htaccess files, if Apache's document root
    # concurs with nginx's one
    #
    #location ~ /\.ht {
    #    deny  all;
    #}
}
~~~

# 三、使用docker run运行应用

~~~powershell
# docker run -d --name my-nginx \
    -p 80:80 -p 443:443 \
    -v /root/nginxdir/nginx/conf.d:/etc/nginx/conf.d \
    -v /root/nginxdir/nginx/certs:/etc/nginx/certs \
    -v /root/nginxdir/app:/usr/share/nginx/html/ \
    --restart always \
    nginx:latest
~~~

~~~powershell
# docker ps
CONTAINER ID   IMAGE          COMMAND                   CREATED          STATUS          PORTS                                                                      NAMES
ff203e7bbba8   nginx:latest   "/docker-entrypoint.…"   12 minutes ago   Up 12 minutes   0.0.0.0:80->80/tcp, :::80->80/tcp, 0.0.0.0:443->443/tcp, :::443->443/tcp   my-nginx
~~~

# 四、访问应用

~~~powershell
# vim /etc/hosts
# cat /etc/hosts
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
192.168.10.161 www.kubemsb.com
~~~

~~~powershell
# curl http://www.kubemsb.com
ssl test

# curl https://www.kubemsb.com
ssl test
~~~

