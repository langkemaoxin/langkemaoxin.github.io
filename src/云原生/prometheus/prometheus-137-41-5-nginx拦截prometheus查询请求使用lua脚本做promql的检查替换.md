---
title: "41.5 nginx拦截prometheus查询请求使用lua脚本做promql的检查替换"
sidebarGroup: "Prometheus"
shortTitle: "137 41.5 nginx拦截prometheus..."
order: 137
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 编写lua脚本做promql的检查替换 - nginx拦截prometheus查询请求使用lua处理 编写lua脚本做promql的检查替换 获取请求参数 shell scrip..."
---

> **Prometheus · 第 137 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :
- 编写lua脚本做promql的检查替换
- nginx拦截prometheus查询请求使用lua处理

# 编写lua脚本做promql的检查替换

## 获取请求参数
```shell script
function replace_work()
    --Nginx服务器中使用lua获取get或post参数

    local request_method = ngx.var.request_method;
    local args = {}
    --获取参数的值

    if "GET" == request_method then
        args = ngx.req.get_uri_args();
    elseif "POST" == request_method then
        ngx.req.read_body();
        args = ngx.req.get_post_args();
    end

    local q_query = args["query"];
    local q_start = args["start"];
    local q_end = args["end"];
    local q_step = args["step"];
end
```
## 根据查询的promql算m5d
```shell script
    local md5_str = get_str_md5(q_query)

    if md5_str == null then
        return
    end
function get_str_md5(input_s)
    local resty_md5 = require "resty.md5"
    local md5 = resty_md5:new()
    if not md5 then
        ngx.log(ngx.ERR, "failed to create md5 object")
        return
    end

    local ok = md5:update(input_s)
    if not ok then
        ngx.log(ngx.ERR, "failed to add data")
        return
    end
    local digest = md5:final()

    local str = require "resty.string"
    local md5_str = str.to_hex(digest)
    return md5_str
end
```

## 根据md5去redis中query
```shell script
    local redis_query_key = "hke:heavy_expr:" .. md5_str
    --ngx.log(ngx.ERR, "redis_query_key: ",redis_query_key)
    local redis_get_res = redis_get(redis_query_key)
    if redis_get_res == true then
        q_query = redis_query_key
    end
function redis_get(key)
    -- start of redis

    local redis = require "resty.redis"
    local red = redis:new()
    --red:set_timeouts(1000, 1000, 1000)
    local ok, conn_err = red:connect("localhost", 6379)
    if not ok then
        ngx.log(ngx.ERR, "[redis]failed to connect redis server:", conn_err)
        return false
    end

    local res, get_err = red:get(key)
    if get_err then
        ngx.log(ngx.ERR, "[redis]failed to get value by key: ", key, "err:", get_err)
        return false
    end

    red:set_keepalive(30000, 1000)
    if res ~= ngx.null then
        ngx.log(ngx.INFO, "[redis]success  get value by key: ", key, "value: ", res)
        return true
    else
        return false
    end

    -- end of  redis
end
```

## 如果redis中有结果，就替换查询语句为聚合后的
```shell script
    if redis_get_res == true then
        q_query = redis_query_key
    end

    local new_args = {}
    new_args["query"] = q_query
    new_args["start"] = q_start
    new_args["end"] = q_end
    new_args["step"] = q_step

    ngx.req.set_uri_args(new_args)
    --ngx.req.set_uri_args("end=" .. q_end)
    --local arg = ngx.req.get_uri_args()
    --for k, v in pairs(arg) do
    --    ngx.say("[GET ] key:", k, " v:", v)
    --end

```

## 完整的 prome_redirect.lua
```shell script
function get_str_md5(input_s)
    local resty_md5 = require "resty.md5"
    local md5 = resty_md5:new()
    if not md5 then
        ngx.log(ngx.ERR, "failed to create md5 object")
        return
    end

    local ok = md5:update(input_s)
    if not ok then
        ngx.log(ngx.ERR, "failed to add data")
        return
    end
    local digest = md5:final()

    local str = require "resty.string"
    local md5_str = str.to_hex(digest)
    return md5_str
end

function redis_get(key)
    -- start of redis

    local redis = require "resty.redis"
    local red = redis:new()
    --red:set_timeouts(1000, 1000, 1000)
    local ok, conn_err = red:connect("localhost", 6379)
    if not ok then
        ngx.log(ngx.ERR, "[redis]failed to connect redis server:", conn_err)
        return false
    end

    local res, get_err = red:get(key)
    if get_err then
        ngx.log(ngx.ERR, "[redis]failed to get value by key: ", key, "err:", get_err)
        return false
    end

    red:set_keepalive(30000, 1000)
    if res ~= ngx.null then
        ngx.log(ngx.INFO, "[redis]success  get value by key: ", key, "value: ", res)
        return true
    else
        return false
    end

    -- end of  redis
end

function replace_work()
    --Nginx服务器中使用lua获取get或post参数

    local request_method = ngx.var.request_method;
    local args = {}
    --获取参数的值

    if "GET" == request_method then
        args = ngx.req.get_uri_args();
    elseif "POST" == request_method then
        ngx.req.read_body();
        args = ngx.req.get_post_args();
    end

    local q_query = args["query"];
    local q_start = args["start"];
    local q_end = args["end"];
    local q_step = args["step"];

    local md5_str = get_str_md5(q_query)

    if md5_str == null then
        return
    end
    local redis_query_key = "hke:heavy_expr:" .. md5_str
    --ngx.log(ngx.ERR, "redis_query_key: ",redis_query_key)
    local redis_get_res = redis_get(redis_query_key)
    if redis_get_res == true then
        q_query = redis_query_key
    end

    local new_args = {}
    new_args["query"] = q_query
    new_args["start"] = q_start
    new_args["end"] = q_end
    new_args["step"] = q_step

    ngx.req.set_uri_args(new_args)
    --ngx.req.set_uri_args("end=" .. q_end)
    --local arg = ngx.req.get_uri_args()
    --for k, v in pairs(arg) do
    --    ngx.say("[GET ] key:", k, " v:", v)
    --end

end

return replace_work();
```

# nginx拦截prometheus查询请求使用lua处理
- ngx_prome_redirect.conf
```shell script
# 真实prometheus后端,使用前请修改
upstream real_prometheus {

       server 1.1.1.1:9090;
       server 2.2.2.2:9090;

}

server{
    listen 9992;
    server_name _;
    location / {  
        proxy_set_header Host $host:$server_port;
        proxy_pass http://real_prometheus;
    } 
    location /api/v1/query_range { 
        access_by_lua_file /usr/local/openresty/nginx/lua_files/prome_redirect.lua;
        proxy_pass http://real_prometheus;
    }
      
    
}

```
- grafana发来的请求经过nginx，使用lua脚本处理
- 然后转发到真实的prometheus 查询

# 本节重点总结 :
- 编写lua脚本做promql的检查替换
- nginx拦截prometheus查询请求使用lua处理

