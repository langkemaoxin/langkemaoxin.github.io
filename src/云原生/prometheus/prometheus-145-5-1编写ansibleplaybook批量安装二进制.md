---
title: "5.1编写ansibleplaybook批量安装二进制"
sidebarGroup: "Prometheus"
shortTitle: "145 5.1编写ansibleplaybook批量..."
order: 145
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : ansible playbook编写 - rsyslog 和 logrotate - service_deploy yaml的编写 配置机器直接的ssh免密码登录 节点主机名host..."
---

> **Prometheus · 第 145 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 : ansible playbook编写
- rsyslog 和 logrotate
- service_deploy yaml的编写

# 配置机器直接的ssh免密码登录

## 节点主机名host解析
> 节点主机名写入hosts
```shell script

echo "192.168.3.200   prome-master01" >> /etc/hosts
echo "192.168.3.201   prome-node01" >> /etc/hosts

``` 

## master上生成ssh key 并拷贝到node上
```shell script
ssh-keygen
ssh-copy-id prome-node01

# 测试ssh联通

ssh prome-node01

```

## master 上安装ansible
```shell script
yum install -y ansible

# 关闭hostcheck 
vim /etc/ansible/ansible.cfg

ssh_args = -o ControlMaster=auto -o ControlPersist=60s -o StrictHostKeyChecking=no 

```

## playbook执行时需要设置机器文件 
```shell script
cat <<EOF > /opt/tgzs/host_file
prome-master01
prome-node01
EOF
```

##  设置syslog 和logrotate服务

### 编写yaml文件

```shell script
cat <<EOF >  init_syslog_logrotate.yaml
- name: init syslog logrotate
  hosts: all
  user: root
  gather_facts:  false
  vars:
      app_log_path: /opt/logs/
      sc_path: /opt/tgzs/
      syslog_conf: syslog_server.conf
      logrotate_conf: logrotate.conf

  tasks:

      - name: mkdir
        file: path={{ app_log_path }} state=directory
      

      - name: copy  files
        copy:
          src: '{{ item.src }}'
          dest: '{{ item.dest }}'
          owner: root
          group: root
          mode: 0644
          force: true

        with_items:
          - { src: '{{ sc_path }}/{{ syslog_conf }}', dest: '/etc/rsyslog.d/{{ syslog_conf }}' }
          - { src: '{{ sc_path }}/{{ logrotate_conf }}', dest: '/etc/logrotate.d/{{ logrotate_conf }}' }
        register: result

      - name: Show debug info
        debug: var=result verbosity=0

      - name: restart service

        systemd:
          name: "{{ item }}"
          state: restarted
          daemon_reload: yes
        with_items:
          - 'rsyslog'
        register: result

      - name: Show debug info
        debug: var=result verbosity=0

EOF
```

### 准备  syslog_server.conf  和 logrotate.conf 
```shell script
cat <<EOF >  syslog_server.conf
if $programname == 'alertmanager'               then /opt/logs/alertmanager.log
if $programname == 'prometheus'                 then /opt/logs/prometheus.log
if $programname == 'node_exporter'              then /opt/logs/node_exporter.log
if $programname == 'process_exporter'            then /opt/logs/process_exporter.log
if $programname == 'mysql_exporter'            then /opt/logs/mysql_exporter.log
if $programname == 'redis_exporter'            then /opt/logs/redis_exporter.log
if $programname == 'blackbox_exporter'          then /opt/logs/blackbox_exporter.log
if $programname == 'mysqld_exporter'          then /opt/logs/mysqld_exporter.log
if $programname == 'process-exporter'          then /opt/logs/process-exporter.log
if $programname == 'pushgateway'                then /opt/logs/pushgateway.log
if $programname == 'm3coordinator'              then /opt/logs/m3coordinator.log
if $programname == 'm3dbnode'                   then /opt/logs/m3dbnode.log
EOF

cat <<EOF > logrotate.conf 
/opt/logs/*.log
{
    daily
    missingok
    notifempty
    dateext
    compress
    delaycompress
    copytruncate
    rotate 15
}
EOF
```

### 执行 
```shell script
ansible-playbook -i host_file init_syslog_logrotate.yaml
```

### 编写ansible 发布服务脚本
```shell script
cat <<EOF >  service_deploy.yaml
- name:  install
  hosts: all
  user: root
  gather_facts:  false
  vars:
      local_path: /opt/tgzs
      app_dir: /opt/app

  tasks:
      - name: mkdir
        file: path={{ app_dir }}/{{ app }} state=directory
      - name: mkdir
        file: path={{ local_path }} state=directory

      - name: copy  config and service
        copy:
          src: '{{ item.src }}'
          dest: '{{ item.dest }}'
          owner: root
          group: root
          mode: 0644
          force: true

        with_items:
          - { src: '{{ local_path }}/{{ tgz }}', dest: '{{ local_path }}/{{ tgz }}' }
          - { src: '{{ local_path }}/{{ app }}.service', dest: '/etc/systemd/system/{{ app }}.service' }

        register: result
      - name: Show debug info 
        debug: var=result verbosity=0

      - name: tar gz
        shell: rm -rf /root/{{ app }}* ; \
          tar xf {{ local_path }}/{{ tgz }} -C /root/ ; \
          /bin/cp -far /root/{{ app }}*/* {{ app_dir }}/{{ app }}/ \

        register: result
      - name: Show debug info
        debug: var=result verbosity=0

      - name: restart service
        systemd:
          name: "{{ item }}"
          state: restarted
          daemon_reload: yes
          enabled: yes
        with_items:
          - '{{ app }}'
        register: result

      - name: Show debug info
        debug: var=result verbosity=0
EOF

```

## 使用这个脚本安装node_exporter

> 下载node_exporter

```shell script
wget -O /opt/tgzs/node_exporter-1.1.2.linux-amd64.tar.gz https://github.com/prometheus/node_exporter/releases/download/v1.1.2/node_exporter-1.1.2.linux-amd64.tar.gz

```

> 准备service文件
```shell script
cat <<EOF> node_exporter.service
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
ExecStart=/opt/app/node_exporter/node_exporter
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=node_exporter
[Install]
WantedBy=default.target

EOF
```

> 执行安装
```shell script

ansible-playbook -i host_file  service_deploy.yaml  -e "tgz=node_exporter-1.1.2.linux-amd64.tar.gz" -e "app=node_exporter"

```

# 本节重点总结 : ansible playbook编写
- rsyslog 和 logrotate
- service_deploy yaml的编写

