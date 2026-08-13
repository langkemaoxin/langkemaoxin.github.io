---
title: "41.3 将重查询记录增量更新到consul和redis中"
sidebarGroup: "Prometheus"
shortTitle: "135 41.3 将重查询记录增量更新到consul..."
order: 135
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - 将重查询记录增量更新到consul中 - 同时将record记录更新到本地 - 更新到redis中 将重查询记录增量更新到consul中 封装consul-client pyth..."
---

> **Prometheus · 第 135 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

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

