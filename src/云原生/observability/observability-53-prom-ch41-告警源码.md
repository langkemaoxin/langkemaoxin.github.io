---
title: Prometheus 第41章：告警源码
sidebarGroup: 可观测性
shortTitle: 53 告警源码
order: 53
date: 2026-08-13
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: Prometheus 第41章（告警源码）合并笔记
---

> **Prometheus · 第 41 章（合并）**
>
> 由原课程小节笔记合并，便于连续阅读。

---

## 41.1 预聚合提速实战项目之需求分析和架构设计

# 本节重点介绍 :
- 需求分析
- 架构设计

# 需求分析
- 使用预聚合提速查询
- 并且降低高基数查询对后端的压力
- 用户无需变更grafana上的查询语句，后端自动替换 
- 效果图
> （配图缺失：image）
> （配图缺失：image）

# 架构设计
- 架构图
> （配图缺失：image）

## 解决方案说明  
- heavy_query对用户侧表现为查询速度慢  
- 在服务端会导致资源占用过多甚至打挂后端存储  
- 查询如果命中heavy_query策略(目前为查询返回时间超过2秒)则会被替换为预先计算好的轻量查询结果返回,两种方式查询的结果一致  
- 未命中的查询按原始查询返回  
- 替换后的metrics_name 会变成 `hke:heavy_expr:xxxx` 字样,而对应的tag不变。对于大分部panel中已经设置了曲线的Legend,所以展示没有区别  
- 现在每晚23:30增量更新heavy_query策略。对于大部分设定好的dashboard没有影响(因为已经存量heavy_query已经跑7天以上了),对于新增策略会从策略生效后开始展示数据,对于查询高峰的白天来说至少保证有10+小时的数据

## 代码架构说明
- parse组件根据prometheus的query log分析heavy_query记录
- 把记录算哈希后增量写入consul，和redis集群中
- prometheus 根据confd拉取属于自己分片的consul数据生成record.yml
- 根据record做预查询聚合写入tsdb
- query前面的lua会将grafana传过来的查询expr算哈希
- 和redis中的记录匹配，匹配中说明这条是heavy_query
- 那么替换其expr到后端查询

# 本节重点总结 :
- 需求分析
- 架构设计

## 41.2 ansible拷贝日志文件，解析日志并判断重查询

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

## 41.3 将重查询记录增量更新到consul和redis中

# 本节重点介绍 :
- 将重查询记录增量更新到consul中
- 同时将record记录更新到本地
- 更新到redis中

# 将重查询记录增量更新到consul中

## 封装consul-client
```python

class Consul(object):
    def __init__(self, host, port):
        '''初始化，连接consul服务器'''
        self._consul = consul.Consul(host, port)

    def RegisterService(self, name, host, port, tags=None):
        tags = tags or []
        # 注册服务
        self._consul.agent.service.register(
            name,
            name,
            host,
            port,
            tags,
            # 健康检查ip端口，检查时间：5,超时时间：30，注销时间：30s
            check=consul.Check().tcp(host, port, "5s", "30s", "30s"))

    def GetService(self, name):
        services = self._consul.agent.services()
        service = services.get(name)
        if not service:
            return None, None
        addr = "{0}:{1}".format(service['Address'], service['Port'])
        return service, addr

    def delete_key(self, key='prometheus/records'):
        res = self._consul.kv.delete(key, recurse=True)
        return res

    def get_list(self, key='prometheus/records'):
        res = self._consul.kv.get(key, recurse=True)

        data = res[1]
        if not data:
            return {}
        pre_record_d = {}

        for i in data:
            v = json.loads(i.get('Value').decode("utf-8"))
            pre_record_d[v.get('record')] = v.get('expr')
        return pre_record_d

    def set_data(self, key, value):
        '''
        self._consul.kv.put('prometheus/records/1',

                            json.dumps(
                                {

                                    "record": "nyy_record_test_a",
                                    "expr": 'sum(kafka_log_log_size{project=~"metis - main1 - sg2"}) by (topic)'
                                }
                            )
                            )
        '''
        self._consul.kv.put(key, value)

    def get_b64encode(self, message):
        message_bytes = message.encode('ascii')
        base64_bytes = base64.b64encode(message_bytes)
        return base64_bytes.decode("utf8")

    def txn_mset(self, record_expr_list):
        lens = len(record_expr_list)
        logging.info("top_lens:{}".format(lens))
        max_txn_once = 64
        yu_d = lens // max_txn_once
        yu = lens / max_txn_once

        if lens <= max_txn_once:
            pass
        else:
            max = yu_d

            if yu > yu_d:
                max += 1

            for i in range(0, max):
                sli = record_expr_list[i * max_txn_once:(i + 1) * max_txn_once]
                self.txn_mset(sli)
            return True
        '''
             {
                    "KV": {
                      "Verb": "<verb>",
                      "Key": "<key>",
                      "Value": "<Base64-encoded blob of data>",
                      "Flags": 0,
                      "Index": 0,
                      "Session": "<session id>"
                    }
                }

        :return:
        '''

        txn_data = []
        logging.info("middle_lens:{}".format(len(record_expr_list)))
        for index, data in record_expr_list:
            txn_data.append(
                {
                    "KV": {
                        "Key": "{}/{}".format(CONSUL_RECORD_KEY_PREFIX, index),
                        "Verb": "set",
                        "Value": self.get_b64encode(json.dumps(
                            data
                        )),

                    }
                }
            )
        # TODO local test
        # print(txn_data)
        # return True
        res = self._consul.txn.put(txn_data)
        if not res:
            logging.error("txn_mset_error")
            return False
        if res.get("Errors"):
            logging.error("txn_mset_error:{}".format(str(res.get("Errors"))))
            return False
        return True
```

## 获取consul对象
```python
    consul_client = Consul(CONSUL_HOST, CONSUL_PORT)
    if not consul_client:
        logging.fatal("connect_to_consul_error")

```

## 获取历史key增量更新
- 做增量更新的意义是避免 重复添加相同的重查询
- 使用set做增量更新
- 最终一个key的示例和prometheus 的record yaml匹配
```yaml
groups:
- name: my_record
  interval: 30s
  rules:
  - record: hke:heavy_expr:0211d8a2fcdefee8e626c86ba3916281
    expr: sum(delta(kafka_topic_partition_current_offset{instance=~'1.1.1.1:9308', topic=~".+"}[5m])/5) by (topic)

```
- 代码
```python
    ##  consul中的历史记录
    pre_dic = consul_client.get_list(key=CONSUL_RECORD_KEY_PREFIX)
    old_len = len(pre_dic) + 1
    ## 增量更新
    old_key_set = set(pre_dic.keys())
    this_key_set = set(res_dic.keys())
    ## 更新的keys
    new_dic = {}
    today_all_dic = {}
    new_key_set = this_key_set - old_key_set
    logging.info("new_key_set:{} ".format(len(new_key_set)))
    for k in new_key_set:
        new_dic[k] = res_dic[k]

    record_expr_list = []
    for k in sorted(new_dic.keys()):
        record_expr_list.append({"record": k, "expr": new_dic.get(k)})

    today_all_dic.update(pre_dic)
    today_all_dic.update(new_dic)
    local_record_expr_list = []

    for k in sorted(today_all_dic.keys()):
        local_record_expr_list.append({"record": k, "expr": today_all_dic.get(k)})
    logging.info("get_all_record_heavy_query:{} ".format(len(local_record_expr_list)))
```

## 写入到本地record yaml中为了记录
```python
    # 写到本地record yaml中
    write_record_yaml_file(local_record_expr_list)
def write_record_yaml_file(record_expr_list):
    '''
    data = {
        "groups": [
            {
                "name": "example",
                "rules": [
                    {
                        "record": "nyy_record_test_a",
                        "expr": "sum(kafka_log_log_size{project=~"metis-main1-sg2"}) by (topic)"
                    },
                ],
            },
        ]

    }
    '''
    data = {
        "groups": [
            {
                "name": "heavy_expr_record",
                "rules": record_expr_list,
            },
        ]

    }
    with open("{}/record_{}_{}.yml".format(PROME_RECORD_FILE, len(record_expr_list), now_date_str()), 'w') as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)

```

## 给每一条记录加上 序号，为了后续confd分片
- record_expr_list中的记录已经排序了
```python
    # 写入consul中

    new_record_expr_list = []
    for index, data in enumerate(record_expr_list):
        new_record_expr_list.append((index + old_len, data))
    if new_record_expr_list:
        consul_w_res = consul_client.txn_mset(new_record_expr_list)
        if not consul_w_res:
            logging.fatal("write_to_consul_error")
    else:
        logging.info("zero_new_heavy_record:{}")

```

## 增量写入redis中
```python
    # 步骤 4 写入redis中
    if new_dic:
        mset_record_to_redis(new_dic)
def mset_record_to_redis(res_dic):
    if not res_dic:
        logging.fatal("record_expr_list empty")
    rc = redis_conn()
    if not rc:
        logging.fatal("failed to connect to redis-server")
    mset_res = rc.mset(res_dic)
    logging.info("mset_res:{} len:{}".format(str(mset_res), format(len(res_dic))))
    sadd_res = rc.sadd(REDIS_SET_KEY, *res_dic.keys())
    logging.info("sadd_res:{}".format(str(sadd_res)))
    smems = rc.smembers(REDIS_SET_KEY)
    logging.info("smember_res_len:{}".format(len(smems)))
```

## 将这个python运行加入playbook中
- prome_heavy_expr_parse.yaml
```yaml
- name:  localhost
  hosts: localhost
  user: root
  gather_facts:  false
  vars_files:
    - config.yaml
  tasks:

      - name:  merge result
        shell: cd {{ prome_query_log.local_work_dir }}/../  && /usr/bin/python3 {{ prome_query_log.py_name }}
        connection: local
        run_once: true

        register: result
      - name: Show debug info
        debug: var=result verbosity=0
```

# 本节重点介绍 :
- 将重查询记录增量更新到consul中
- 同时将record记录更新到本地
- 更新到redis中

## 41.4 修改confd源码增加静态分片功能

# 本节重点介绍 :
- confd简介
- 修改confd源码增加静态分片功能
- 配置prometheus record的confd

# confd简介
## 简介
- confd，它提供了一种新的集成思路
- confd的存在有点类似于快递员，买了东西不需要自己到店去取货了
- confd这个快递员回把货取过来，然后送到家里，并且通知你货已经送到了
- 加入confd之后的架构大致是这样的：
> （配图缺失：image）

## confd代码流程
> （配图缺失：image）

## confd使用
### Template Resources
- 模板源配置文件是TOML格式的文件
- 主要包含配置的生成逻辑，例如模板源，后端存储对应的keys，命令执行等
- 默认目录在/etc/confd/conf.d

> 参数说明：
- 必要参数
    - dest (string) - 写入的目标结果文件
    - keys (array of strings)  kv store中的keys
    - src (string) - 配置模板文件地址
- 可选参数

    - gid (int) - The gid that should own the file. Defaults to the effective gid.
    - mode (string) - The permission mode of the file.
    - uid (int) - The uid that should own the file. Defaults to the effective uid.
    - reload_cmd (string) - The command to reload config.
    - check_cmd (string) - The command to check config. Use {​{​.src}} to reference the rendered source template.
    - prefix (string) - The string to prefix to keys.
> 举例
- 下面的例子代表 
    - 从kv store中获取 key=/records的值
    - 过滤其中含有/prometheus的
    - 然后调用records.yml.tmpl模板文件
    - 生成/etc/prometheus/rules/record.yml结果文件
    - 最后调用shell 命令reload prometheus  curl -X POST http://localhost:9090/-/reload
- 配置如下
```yaml
[template]
prefix = "/prometheus"
src = "records.yml.tmpl"
dest = "/etc/prometheus/rules/record.yml"
#shards=3
#num=0
keys = [
    "/records"
]
reload_cmd = "curl -X POST http://localhost:9090/-/reload"

```

## confd分片功能
## [代码commit](https://github.com/ning1875/confd/commit/4ae262d0fc299049a6b7152f6628351b3f224f7e)
- 新增resource字段 ,代码位置 D:\go_path\src\github.com\ning1875\confd\resource\template\resource.go
- shards代表分片总数，num代表第几个分片
```go
type TemplateResource struct {
	CheckCmd      string `toml:"check_cmd"`
	Dest          string
	FileMode      os.FileMode
	Gid           int
	Keys          []string
	Mode          string
	Prefix        string
	ReloadCmd     string `toml:"reload_cmd"`
	Shards        int    `toml:"shards"`
	Num           int    `toml:"num"`
	Src           string
	StageFile     *os.File
	Uid           int
	funcMap       map[string]interface{}
	lastIndex     uint64
	keepStageFile bool
	noop          bool
	store         memkv.Store
	storeClient   backends.StoreClient
	syncOnly      bool
	PGPPrivateKey []byte
}

```
- setVar函数增加静态分类逻辑
    - 如果配置了Shards和Num，则认为开启分片
    - key的最后一个/后面就是索引值
    - 根据索引值对shards取模，结果等于Num就keep，否则continue
    - 这样就能打到分片的效果
- 代码
```go
func (t *TemplateResource) setVars() error {

	log.Info("t.shards:%+v,t.nums:%+v", t.Shards, t.Num)
	for k, v := range result {
		if t.Shards+t.Num > 0 {
			s := strings.Split(k, "/")
			numS := s[len(s)-1]
			index, _ := strconv.ParseInt(numS, 10, 32)
			if int(index)%t.Shards != t.Num {
				continue
			}

		}
		log.Debug("t.shards:%+v,t.nums:%+v,get key:%+v,value:%+v", t.Shards, t.Num, k, v)
		t.store.Set(path.Join("/", strings.TrimPrefix(k, t.Prefix)), v)
	}
	return nil
}
```

## confd分片功能后的配置

- 创建目录
```shell script
mkdir -p /etc/confd/{conf.d,templates}
```
-  主配置文件/etc/confd/conf.d/records.yml.toml

```shell script
cat <<-"EOF"  > /etc/confd/conf.d/records.yml.toml
[template] 
prefix = "/prometheus"
src = "records.yml.tmpl"
dest = "/etc/prometheus/rules/record.yml"
#shards=3
#num=0
keys = [
    "/records"
]
reload_cmd = "curl -X POST http://localhost:9090/-/reload"

EOF
```
- shards代表分片总数，num代表第几个分片
- record模板文件 /etc/confd/templates/records.yml.tmpl
```shell script
cat <<-"EOF"  > /etc/confd/templates/records.yml.tmpl
groups:
- name: my_record
  interval: 30s
  rules:{{range gets "/records/*"}}{{$item := json .Value}}
  - record: {{$item.record}}
    expr: {{$item.expr}}{{end}}
EOF

```

## 指定consul backend 启动confd
- onetime代表运行一次
```shell script
confd -onetime --backend consul --node localhost:8500 --log-level debug
```

```shell script
cat <<EOF>  /etc/systemd/system/confd.service
[Unit]
Description=confd server
Wants=network-online.target
After=network-online.target

[Service]
ExecStart=/usr/bin/confd  --backend consul --node localhost:8500 --log-level debug
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=confd
[Install]
WantedBy=default.target
EOF

# 启动服务
systemctl daemon-reload && systemctl start confd   

systemctl status confd 

```

# 本节重点总结 :
- confd简介
- 修改confd源码增加静态分片功能
- 配置prometheus record的confd

## 41.5 nginx拦截prometheus查询请求使用lua脚本做promql的检查替换

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

## 41.6 安装部署，效果测试，架构回顾

## 01 在prometheus record机器上 安装confd

- 下载 带分片功能的confd二进制 
```shell script
wget https://github.com/ning1875/confd/releases/download/v0.16.0/confd_shard-0.16.0-linux-amd64.tar.gz
```

- 创建目录

```shell script
mkdir -p /etc/confd/{conf.d,templates}
```

- 主配置文件/etc/confd/conf.d/records.yml.toml ，注意dest要和你的prometheus目录一致

```shell script
cat <<-"EOF"  > /etc/confd/conf.d/records.yml.toml
[template] 
prefix = "/prometheus"
src = "records.yml.tmpl"
dest = "/opt/app/prometheus/confd_record.yml"
#shards=3
#num=0
keys = [
    "/records"
]
reload_cmd = "curl -X POST http://localhost:9090/-/reload"

EOF
```

- shards代表分片总数，num代表第几个分片
- record模板文件 /etc/confd/templates/records.yml.tmpl
> 每个record单独的group分组，好处是互相不影响，缺点是group过多
```shell script
cat <<-"EOF"  > /etc/confd/templates/records.yml.tmpl
groups:
{{range gets "/records/*"}}{{$item := json .Value}}
- name: {{$item.record}}
  rules:	
  - record: {{$item.record}}
    expr: {{$item.expr}}
{{end}}
EOF
```

> 使用相同分组，需要按顺序执行record
```shell script
cat <<-"EOF"  > /etc/confd/templates/records.yml.tmpl
groups:
- name: confd_record
  interval: 30s
  rules:{{range gets "/records/*"}}{{$item := json .Value}}
  - record: {{$item.record}}
    expr: {{$item.expr}}{{end}}
EOF

```

### 指定consul backend 启动confd

- onetime代表运行一次

```shell script
confd -onetime --backend consul --node localhost:8500 --log-level debug
```

```shell script
cat <<EOF>  /etc/systemd/system/confd.service
[Unit]
Description=confd server
Wants=network-online.target
After=network-online.target

[Service]
ExecStart=/usr/bin/confd  --backend consul --node 172.20.70.205:8500 --log-level debug -interval=30
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=confd
[Install]
WantedBy=default.target
EOF

# 启动服务
systemctl daemon-reload && systemctl start confd   

systemctl status confd 

```

## 02 中控机上部署consul redis ansible 
### consul 安装

#### 准备工作

```shell

# 下载consul
wget -O /opt/tgzs/consul_1.9.4_linux_amd64.zip  https://releases.hashicorp.com/consul/1.9.4/consul_1.9.4_linux_amd64.zip 

cd /opt/tgzs/
unzip consul_1.9.4_linux_amd64.zip

/bin/cp -f consul /usr/bin/

```

#### 启动单机版consul

```shell

# 
mkdir  /opt/app/consul

# 准备配置文件
cat <<EOF > /opt/app/consul/single_server.json
{
    "datacenter": "dc1",
    "node_name": "consul-svr-01",
    "server": true,
    "bootstrap_expect": 1,
    "data_dir": "/opt/app/consul/",
    "log_level": "INFO",
    "log_file": "/opt/logs/",
    "ui": true,
    "bind_addr": "0.0.0.0",
    "client_addr": "0.0.0.0",
    "retry_interval": "10s",
    "raft_protocol": 3,
    "enable_debug": false,
    "rejoin_after_leave": true,
    "enable_syslog": false
}
EOF

# 多个ip地址时，将bind_addr 改为一个内网的ip

# 写入service文件
cat <<EOF > /etc/systemd/system/consul.service
[Unit]
Description=consul server
Wants=network-online.target
After=network-online.target

[Service]
ExecStart=/usr/bin/consul agent  -config-file=/opt/app/consul/single_server.json
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=consul
[Install]
WantedBy=default.target
EOF

# 启动服务
systemctl daemon-reload && systemctl start consul   

systemctl status consul 

```

#### 验证访问

- http://localhost:8500/

## 03 将pre_query 放到中控机上
- all_prome_query 中的prometheus query ip改为自己的
- prometheus query 开启query log
```yaml
global:
  query_log_file: /App/logs/prometheus_query.log
```
- config.yaml 填写相关配置项

## 04 执行pre_query中的分析record命令
> 将promtool 复制到当前目录用作 record promql的check
- /bin/cp -f /opt/app/prometheus/promtool

> pre_query目录下执行ansible命令
```shell script
ansible-playbook -i all_prome_query  prome_heavy_expr_parse.yaml
```

> 检查本地record yaml
```shell script
[root@k8s-master01 pre_query]# ll local_record_yml_dir/
total 12
-rw-r--r-- 1 root root  551 Sep 13 15:53 record_2_2021-09-13.yml
-rw-r--r-- 1 root root 5455 Sep 13 15:53 record_26_2021-09-13.yml
[root@k8s-master01 pre_query]# head local_record_yml_dir/record_26_2021-09-13.yml 
groups:
- name: heavy_expr_record
  rules:
  - record: hke:heavy_expr:082a631dfddb7cf65ddd0fb4923ab17e
    expr: rate(mysql_global_status_sort_scan{instance=~"172.20.70.205:9104"}[5s])
      or irate(mysql_global_status_sort_scan{instance=~"172.20.70.205:9104"}[5m])
  - record: hke:heavy_expr:1416fc3de389e2a5c36aa5c8c376391f
    expr: mysql_global_status_threads_cached{instance=~"172.20.70.205:9104"}
  - record: hke:heavy_expr:14e8a540527123cc11ad96c5faa03f43
    expr: irate(mysql_slave_status_relay_log_pos{instance=~"172.20.70.205:9104"}[5m])
```

> 检查consul中的记录
```shell script
curl http://localhost:8500/v1/kv/prometheus/record?recurse= |python -m json.tool
    {
        "CreateIndex": 585468,
        "Flags": 0,
        "Key": "prometheus/records/6",
        "LockIndex": 0,
        "ModifyIndex": 585468,
        "Value": "eyJyZWNvcmQiOiAiaGtlOmhlYXZ5X2V4cHI6MjY1YzUwMzMxZjRiNzk4MzRjMzc1MDY2ZTY2NWQ4NDYiLCAiZXhwciI6ICJyYXRlKG15c3FsX2dsb2JhbF9zdGF0dXNfY3JlYXRlZF90bXBfdGFibGVze2luc3RhbmNlPX5cIjE3Mi4yMC43MC4yMDU6OTEwNFwifVs1c10pIG9yIGlyYXRlKG15c3FsX2dsb2JhbF9zdGF0dXNfY3JlYXRlZF90bXBfdGFibGVze2luc3RhbmNlPX5cIjE3Mi4yMC43MC4yMDU6OTEwNFwifVs1bV0pIn0="
    },
    {
        "CreateIndex": 585468,
        "Flags": 0,
        "Key": "prometheus/records/7",
        "LockIndex": 0,
        "ModifyIndex": 585468,
        "Value": "eyJyZWNvcmQiOiAiaGtlOmhlYXZ5X2V4cHI6MjZkODYwNzY4NzcxOTUyOTc3ZGNiZjUzYzU3ZWZhNTUiLCAiZXhwciI6ICJyYXRlKG15c3FsX2dsb2JhbF9zdGF0dXNfcXVlcmllc3tpbnN0YW5jZT1+XCIxNzIuMjAuNzAuMjA1OjkxMDRcIn1bNXNdKSBvciBpcmF0ZShteXNxbF9nbG9iYWxfc3RhdHVzX3F1ZXJpZXN7aW5zdGFuY2U9flwiMTcyLjIwLjcwLjIwNTo5MTA0XCJ9WzVtXSkifQ=="
    },
```

> 检测部署了confd的 prometheus record 上的record文件内容
```shell script
[root@k8s-master01 pre_query]# cat /opt/app/prometheus/confd_record.yml  |head 
groups:

- name: hke:heavy_expr:082a631dfddb7cf65ddd0fb4923ab17e
  rules:
  - record: hke:heavy_expr:082a631dfddb7cf65ddd0fb4923ab17e
    expr: rate(mysql_global_status_sort_scan{instance=~"172.20.70.205:9104"}[5s]) or irate(mysql_global_status_sort_scan{instance=~"172.20.70.205:9104"}[5m])

- name: hke:heavy_expr:4b93ce0bd3db2848e1b6d330a03272f7
  rules:
  - record: hke:heavy_expr:4b93ce0bd3db2848e1b6d330a03272f7
```

> prometheus record页面上检查 聚合规则并查询数据
- 截图

> 检查redis中的key
```shell script
[root@k8s-master01 pre_query]# redis-cli keys "hke:heavy_expr*"
 1) "hke:heavy_expr:bc7775bb5e33bf84afa9a1d4c0c45a9a"
 2) "hke:heavy_expr:de2548ae6a00a90b1c2f85f8d6d9f13b"
 3) "hke:heavy_expr:d86e3aa799b6a84790e133aa8a306e96"
 4) "hke:heavy_expr:4fe8ee091e7823b66b475ba05b5fd030"
 5) "hke:heavy_expr:b96a96befac765f6c00743a82ffae053"
 6) "hke:heavy_expr:513ddfbf6f83d1ba1dd9b0b4a21a43bf"
 7) "hke:heavy_expr:2998d2677fc1873a0e46802cbdd1bfee"
 8) "hke:heavy_expr:22ccf0a71b6651763d1b7c16f5c05365"
 9) "hke:heavy_expr:0d8c4be4ea8dccb9f06389246a02c6b3"
10) "hke:heavy_expr:f30b7b481bb0fdee0466902b9abb3b35"
11) "hke:heavy_expr:298afe40c3479e217b0b0b3666bd6904"
12) "hke:heavy_expr:bebca671decc9d5954af35628a05baa2"
13) "hke:heavy_expr:db9f0c1be81f91c95d9eb617ab70da36"
14) "hke:heavy_expr:45d5dc64bef02cf3f515481747cccd80"
15) "hke:heavy_expr:d797f93ad8ec0f7c80a5617eb5e4f3d8"
16) "hke:heavy_expr:eb1637bfe8f1388e99659d4621a79367"
17) "hke:heavy_expr:26d860768771952977dcbf53c57efa55"
18) "hke:heavy_expr:25bc18bd90a1a69d950802d937d337a0"
19) "hke:heavy_expr:d8aaf244a86fcfae8e51aeeb6935a5a5"
20) "hke:heavy_expr:189831b5aaa2d688c49a9c717fbf8b3d"
```

## 05 confd分片功能演示
> 默认不开启分片 ,shards 和num注释掉就可以
- confd配置文件 /etc/confd/conf.d/records.yml.toml
```yaml
[template] 
prefix = "/prometheus"
src = "records.yml.tmpl"
dest = "/opt/app/prometheus/confd_record.yml"
#shards=2
#num=0
keys = [
    "/records"
]
reload_cmd = "curl -X POST http://localhost:9090/-/reload"

```
- prometheus record 通过的结果 46个
```shell script
[root@k8s-master01 conf.d]# confd -onetime --backend consul --node localhost:8500 
2021-09-13T16:45:15+08:00 k8s-master01 confd[30010]: INFO Backend set to consul
2021-09-13T16:45:15+08:00 k8s-master01 confd[30010]: INFO Starting confd
2021-09-13T16:45:15+08:00 k8s-master01 confd[30010]: INFO Backend source(s) set to localhost:8500
2021-09-13T16:45:15+08:00 k8s-master01 confd[30010]: INFO t.shards:0,t.nums:0
[root@k8s-master01 conf.d]# /opt/app/prometheus/promtool check rules   /opt/app/prometheus/confd_record.yml 
Checking /opt/app/prometheus/confd_record.yml
  SUCCESS: 46 rules found

```

> 开启分片 配置 shards=2 num=0 代表 2分片中的第一个
- confd配置文件 /etc/confd/conf.d/records.yml.toml
```yaml
[template] 
prefix = "/prometheus"
src = "records.yml.tmpl"
dest = "/opt/app/prometheus/confd_record.yml"
shards=2
num=0
keys = [
    "/records"
]
reload_cmd = "curl -X POST http://localhost:9090/-/reload"
```

- prometheus record 通过的结果 23个
```shell script
[root@k8s-master01 conf.d]# confd -onetime --backend consul --node localhost:8500                               
2021-09-13T16:47:16+08:00 k8s-master01 confd[32350]: INFO Backend set to consul
2021-09-13T16:47:16+08:00 k8s-master01 confd[32350]: INFO Starting confd
2021-09-13T16:47:16+08:00 k8s-master01 confd[32350]: INFO Backend source(s) set to localhost:8500
2021-09-13T16:47:16+08:00 k8s-master01 confd[32350]: INFO t.shards:2,t.nums:0
2021-09-13T16:47:16+08:00 k8s-master01 confd[32350]: INFO /opt/app/prometheus/confd_record.yml has md5sum a0c39c7a73d741ec911b64a6eb5d1b8c should be 50ad6045ba32557c64037702bbc2613c
2021-09-13T16:47:16+08:00 k8s-master01 confd[32350]: INFO Target config /opt/app/prometheus/confd_record.yml out of sync
2021-09-13T16:47:16+08:00 k8s-master01 confd[32350]: INFO Target config /opt/app/prometheus/confd_record.yml has been updated
[root@k8s-master01 conf.d]# /opt/app/prometheus/promtool check rules   /opt/app/prometheus/confd_record.yml                                      
Checking /opt/app/prometheus/confd_record.yml
  SUCCESS: 23 rules found

[root@k8s-master01 conf.d

```

## 06  openresty和lua组件，新增grafana数据源

>  安装openresty ，准备lua环境
```shell script
yum install yum-utils -y
yum-config-manager --add-repo https://openresty.org/package/centos/openresty.repo
yum install openresty openresty-resty -y
```

> 修改信息
- 修改prome_redirect.lua 文件中的 27 行 localhost redis地址为你自己的
- 修改ngx_prome_redirect.conf文件中 真实real_prometheus后端,使用前请修改

> 将nginx配置和lua文件放到指定目录
```shell script

mkdir -pv /usr/local/openresty/nginx/conf/conf.d/
mkdir -pv /usr/local/openresty/nginx/lua_files/
/bin/cp -f  ngx_prome_redirect.conf /usr/local/openresty/nginx/conf/conf.d/
/bin/cp -f  nginx.conf /usr/local/openresty/nginx/conf/
/bin/cp -f prome_redirect.lua /usr/local/openresty/nginx/lua_files/

```

>  启动openresty
```shell script
systemctl enable openresty
systemctl start openresty
```

> 请求OpenResty 9992端口 ,出现/graph则正常
```shell script
[root@k8s-master01 pre_query]# curl localhost:9992/
<a href="/graph">Found</a>.
```

> openresty查看日志
```shell script
tail -f /usr/local/openresty/nginx/logs/access.log 
```

> 修改grafana数据源，将原来的指向真实prometheus地址改为指向openresty的9992端口
- 截图

> 之前查询慢的大盘导出一份，再导入，选择新的9992数据源 查看对比
- 截图

## 运维指南
```
# 查看redis中的heavy_query记录
redis-cli -h $redis_host   keys hke:heavy_expr*
# 查看consul中的heavy_query记录
curl http://$consul_addr:8500/v1/kv/prometheus/record?recurse= |python -m json.tool
# 根据一个heavy_record文件恢复记录
python3 recovery_by_local_yaml.py local_record_yml/record_to_keep.yml
# 根据一个metric_name前缀删除record记录
bash -x recovery_heavy_metrics.sh  $metric_name
```

## 总结
- 使用OpenResty的数据源 不会影响未配置预聚合的图
- 因为只是nginx代理了一下，如果redis中没有要替换的expr就会以原查询ql查询

