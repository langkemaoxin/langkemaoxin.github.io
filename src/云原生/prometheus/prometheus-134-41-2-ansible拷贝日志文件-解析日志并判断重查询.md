---
title: 41.2 ansible拷贝日志文件，解析日志并判断重查询
sidebarGroup: Prometheus
shortTitle: 134 41.2 ansible拷贝日志文件，解析日...
order: 134
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - pre_query项目配置文件设计 - ansible-copy拷贝日志文件 - 解析日志文件并判断重查询 新建python项目 pre_query 设计配置文件 - confi...'
---

> **Prometheus · 第 134 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :
- pre_query项目配置文件设计
- ansible-copy拷贝日志文件
- 解析日志文件并判断重查询

# 新建python项目 pre_query

# 设计配置文件
- config.yaml
```yaml

prome_query_log:
  prome_log_path: /App/logs/prometheus_query.log # prometheus query log文件path
  heavy_query_threhold: 5.0                    # heavy_query阈值
  py_name: parse_prome_query_log.py            # 主文件名
  local_work_dir: /App/tgzs/conf_dir/prome_heavy_expr_parse/all_prome_query_log # parser拉取query_log的保存路径
  check_heavy_query_api: http://localhost:9090  # 一个prometheus查询地址，用来double_check记录是否真的heavy，避免误添加

redis:
  host: localhost  # redis地址
  port: 6379
  redis_set_key: hke:heavy_query_set
  redis_one_key_prefix: hke:heavy_expr # heavy_query key前缀
  high_can_result_key: high_can_result_key
consul:
  host: localhost  #consul地址
  port: 8500
  consul_record_key_prefix: prometheus/records #  heavy_query key前缀

# 所有采集的地址，用来取高基数
scrape_promes:
  - 1.1.1.1:9090
  - 1.1.1.2:9090
  - 1.1.0.0空的模板:9090
  - 1.1.1.4:9090

heavy_blacklist_metrics:   # 黑名单metric_names
  - kafka_log_log_logendoffset
  - requests_latency_bucket
  - count(node_cpu_seconds_total)
```

# ansible-copy拷贝日志文件
## 变量存放的yaml config.yaml
```yaml
prome_query_log:
  prome_log_path: /App/logs/prometheus_query.log # prometheus query log文件path
  heavy_query_threhold: 5.0                    # heavy_query阈值
  py_name: parse_prome_query_log.py            # 主文件名
  local_work_dir: /App/tgzs/conf_dir/prome_heavy_expr_parse/all_prome_query_log # parser拉取query_log的保存路径
  check_heavy_query_api: http://localhost:9090  # 一个prometheus查询地址，用来double_check记录是否真的heavy，避免误添加

```
## 执行拷贝的playbook
- prome_heavy_expr_parse.yaml
- 意思是将所有prometheus的query log 拷贝到本地目录下
```yaml

- name:  fetch log and push expr to cache
  hosts: all
  user: root
  gather_facts:  false
  vars_files:
    - config.yaml

  tasks:

      - name: fetch query log
        fetch: src={{ prome_query_log.prome_log_path }} dest={{ prome_query_log.local_work_dir }}/{{ inventory_hostname }}_query.log flat=yes validate_checksum=no
        register: result

      - name: Show debug info
        debug: var=result verbosity=0

```

# 解析日志文件，查找重查询
## 解析文件 parse_prome_query_log.py
### 方法  parse_log_file
- 代码
```python
def parse_log_file(log_f):
    '''
    {
    "httpRequest":{
        "clientIP":"1.1.1.1",
        "method":"GET",
        "path":"/api/v1/query_range"
    },
    "params":{
        "end":"2020-04-09T06:20:00.000Z",
        "query":"api_request_counter{job="kubernetes-pods",kubernetes_namespace="sprs",app="model-server"}/60",
        "start":"2020-04-02T06:20:00.000Z",
        "step":1200
    },
    "stats":{
        "timings":{
            "evalTotalTime":0.467329174,
            "resultSortTime":0.000476303,
            "queryPreparationTime":0.373947928,
            "innerEvalTime":0.092889708,
            "execQueueTime":0.000008911,
            "execTotalTime":0.467345411
        }
    },
    "ts":"2020-04-09T06:20:28.353Z"
    }
    :param log_f:
    :return:
    '''
    heavy_expr_set = set()
    heavy_expr_dict = dict()
    record_expr_dict = dict()

    with open(log_f) as f:
        for x in f.readlines():
            x = json.loads(x.strip())
            if not isinstance(x, dict):
                continue
            httpRequest = x.get("httpRequest")
            path = httpRequest.get("path")
            if path != "/api/v1/query_range":
                continue
            params = x.get("params")

            start_time = params.get("start")
            end_time = params.get("end")
            stats = x.get("stats")
            evalTotalTime = stats.get("timings").get("evalTotalTime")
            execTotalTime = stats.get("timings").get("execTotalTime")
            queryPreparationTime = stats.get("timings").get("queryPreparationTime")
            execQueueTime = stats.get("timings").get("execQueueTime")
            innerEvalTime = stats.get("timings").get("innerEvalTime")

            # 如果查询事件段大于6小时则不认为是heavy-query
            if not start_time or not end_time:
                continue
            start_time = datetime.strptime(start_time, '%Y-%m-%dT%H:%M:%S.%fZ').timestamp()
            end_time = datetime.strptime(end_time, '%Y-%m-%dT%H:%M:%S.%fZ').timestamp()
            if end_time - start_time > 3600 * 6:
                continue

            # 如果两个时间都小于阈值则不为heavy-query
            c = (queryPreparationTime < HEAVY_QUERY_THREHOLD) and (innerEvalTime < HEAVY_QUERY_THREHOLD)
            if c:
                continue

            if queryPreparationTime > 40:
                continue
            if execQueueTime > 40:
                continue
            if innerEvalTime > 40:
                continue
            if evalTotalTime > 40:
                continue
            if execTotalTime > 40:
                continue
            query = params.get("query").strip()
            is_bl = False
            for bl in HEAVY_BLACKLIST_METRICS:
                if bl in query:
                    is_bl = True
                    break
            if is_bl:
                continue
            # avoid multi heavy query
            if REDIS_ONE_KEY_PREFIX in query:
                continue
            # \r\n should not in query ,replace it
            if "\r\n" in query:
                query = query.replace("\r\n", "", -1)
            # \n should not in query ,replace it
            if "\n" in query:
                query = query.replace("\n", "", -1)

            # - startwith for grafana network out

            if query.startswith("-"):
                query = query.replace("-", "", 1)
            md5_str = get_str_md5(query.encode("utf-8"))

            record_name = "{}:{}".format(REDIS_ONE_KEY_PREFIX, md5_str)
            record_expr_dict[record_name] = query
            heavy_expr_set.add(query)
            last_time = heavy_expr_dict.get(query)
            this_time = evalTotalTime
            if last_time and last_time > this_time:
                this_time = last_time

            heavy_expr_dict[query] = this_time
    logging.info("log_file:{} get :{} heavy expr".format(log_f, len(record_expr_dict)))
    return record_expr_dict

```
- 判断是否是 range_query ,instant_query不分析
```python
            if path != "/api/v1/query_range":
                continue
```
- 解析querylog中的耗时字段
- 如果查询事件段大于6小时则不认为是heavy-query
```python
            # 如果查询事件段大于6小时则不认为是heavy-query
            if not start_time or not end_time:
                continue
```
- 如果两个时间都小于阈值则不为heavy-query
```python
            # 如果两个时间都小于阈值则不为heavy-query
            c = (queryPreparationTime < HEAVY_QUERY_THREHOLD) and (innerEvalTime < HEAVY_QUERY_THREHOLD)
            if c:
                continue
```
- 用dict和set去重，因为日志中可能有多行关于一个重查询ql的记录
```python
            last_time = heavy_expr_dict.get(query)
            this_time = evalTotalTime
            if last_time and last_time > this_time:
                this_time = last_time

            heavy_expr_dict[query] = this_time
```
- 将重查询ql的结果算md5作为key，ql作为value 返回

# 本节重点总结 :
- pre_query项目配置文件设置
- ansible-copy拷贝日志文件
- 解析日志文件并判断重查询

