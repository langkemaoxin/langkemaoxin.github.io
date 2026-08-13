---
title: "33.6 read的代码，查询series方法和QueryEngine的RangeQuery方法"
sidebarGroup: "Prometheus"
shortTitle: "102 33.6 read的代码，查询series方..."
order: 102
date: 2026-08-13
category: "云原生"
tag:
  - "Prometheus"
  - "云原生"
  - "课程笔记"
description: "本节重点介绍 : - remote_read代码需求 - 查询一个标签的值列表 - 查询一段时间的数据 - 通用的查询series方法 - 查询一个标签的值列表 - 查询一段时间的数据 remote_..."
---

> **Prometheus · 第 102 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- remote_read代码需求
  - 查询一个标签的值列表
  - 查询一段时间的数据
- 通用的查询series方法
- 查询一个标签的值列表
- 查询一段时间的数据

# remote_read代码需求

- 查询一个标签的值列表
- 查询一段时间的数据

# 通用的查询series方法

- 补全go.mod
- ```shell
  module prome_remote_read_write

  go 1.16

  require (
  	github.com/go-kit/kit v0.10.0
  	github.com/gogo/protobuf v1.3.2
  	github.com/golang/snappy v0.0.2
  	github.com/opentracing-contrib/go-stdlib v1.0.0
  	github.com/opentracing/opentracing-go v1.2.0
  	github.com/pkg/errors v0.9.1
  	github.com/prometheus/client_golang v1.9.0
  	github.com/prometheus/common v0.17.0
  	github.com/prometheus/prometheus v1.8.2-0.20210220213500-8c8de46003d1
  	github.com/toolkits/pkg v1.1.8
  	go.uber.org/atomic v1.7.0
  	gopkg.in/yaml.v2 v2.4.0
  )

  ```
- 位置 datasource\read.go

```go
package datasource

import (
	"context"
	"errors"
	"github.com/prometheus/prometheus/pkg/labels"
	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/promql/parser"
	"github.com/prometheus/prometheus/storage"
	"github.com/toolkits/pkg/logger"
	"math"
	"sort"
	"time"
)

func (pd *PromeDataSource) CommonQuerySeries(qlStrFinal string) storage.SeriesSet {

	matcherSets, err := parseMatchersParam([]string{qlStrFinal})
	if err != nil {
		logger.Errorf("[prome_query_error][parse_label_match_error][err:%+v]", err)
		return nil
	}
	tEnd := time.Now().Unix()
	tStart := tEnd - 60*5

	startT := millisecondTs(timeParse(tStart))
	endT := millisecondTs(timeParse(tEnd))

	ctx, _ := context.WithTimeout(context.Background(), time.Second*30)
	q, err := pd.Queryable.Querier(ctx, startT, endT)
	if err != nil {

		logger.Errorf("[prome_query_error][get_querier_errro]")
		return nil
	}

	defer q.Close()

	hints := &storage.SelectHints{
		Start: startT,
		End:   endT,
		Func:  "series", // There is no series function, this token is used for lookups that don't need samples.
	}

	// Get all series which match matchers.
	s := q.Select(true, hints, matcherSets[0]...)

	return s

}
```

## 从promql中抽取标签matcher 得到 matcherSets

```go
// 从promql中抽取标签matcher的函数
func parseMatchersParam(matchers []string) ([][]*labels.Matcher, error) {
	var matcherSets [][]*labels.Matcher
	for _, s := range matchers {
		matchers, err := parser.ParseMetricSelector(s)
		if err != nil {
			return nil, err
		}
		matcherSets = append(matcherSets, matchers)
	}

OUTER:
	for _, ms := range matcherSets {
		for _, lm := range ms {
			if lm != nil && !lm.Matches("") {
				continue OUTER
			}
		}
		return nil, errors.New("match[] must contain at least one non-empty matcher")
	}
	return matcherSets, nil
}

```

## 设置起始时间并转换为utc的毫秒时间戳

```go
// 毫秒时间戳函数
func millisecondTs(t time.Time) int64 {
	return t.Unix()*1000 + int64(t.Nanosecond())/int64(time.Millisecond)
}

// 转行为utc时间
func timeParse(ts int64) time.Time {
	t := float64(ts)
	s, ns := math.Modf(t)
	ns = math.Round(ns*1000) / 1000
	return time.Unix(int64(s), int64(ns*float64(time.Second))).UTC()
}

```

## 创建查询对象，查询即可

```go
	ctx, _ := context.WithTimeout(context.Background(), time.Second*30)
	q, err := pd.Queryable.Querier(ctx, startT, endT)
	if err != nil {

		logger.Errorf("[prome_query_error][get_querier_errro]")
		return nil
	}

	defer q.Close()

	hints := &storage.SelectHints{
		Start: startT,
		End:   endT,
		Func:  "series", // There is no series function, this token is used for lookups that don't need samples.
	}

	// Get all series which match matchers.
	s := q.Select(true, hints, matcherSets[0]...)

```

# 查询一个标签的值列表

- 相当于查询prometheus的原始接口
- ![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630743105000/75dbc58092804d53888c9767a58a28c0.png)
- 对应prometheus 中的 /api/v1/label/<label_name>/values

```go
// 查询一个标签的值列表
// 对应prometheus 中的 /api/v1/label/<label_name>/values
func (pd *PromeDataSource) QueryLabelValue(promql string, targetLabel string) []string {
	s := pd.CommonQuerySeries(promql)
	if s.Warnings() != nil {
		logger.Warningf("[prome_query_error][series_set_iter_error][warning:%+v]", s.Warnings())

	}

	if err := s.Err(); err != nil {
		logger.Errorf("[prome_query_error][series_set_iter_error][err:%+v]", err)
		return nil
	}

	var sets []storage.SeriesSet
	sets = append(sets, s)
	set := storage.NewMergeSeriesSet(sets, storage.ChainedSeriesMerge)
	labelValuesSet := make(map[string]struct{})
	thisSeriesNum := 0
	for set.Next() {
		series := set.At()
		thisSeriesNum++
		for _, lb := range series.Labels() {
			if lb.Name == targetLabel {
				labelValuesSet[lb.Value] = struct{}{}
			}
		}
	}
	vals := make([]string, len(labelValuesSet))
	i := 0
	for val := range labelValuesSet {
		vals[i] = val
		i++
	}

	sort.Strings(vals)
	logger.Infof("[QueryLabelValue][promql:%v][targetLabel:%v][values:%v]", promql, targetLabel, vals)
	return vals
}

```

## 根据传入的promql查询得到series

```go
	s := pd.CommonQuerySeries(promql)
	if s.Warnings() != nil {
		logger.Warningf("[prome_query_error][series_set_iter_error][warning:%+v]", s.Warnings())

	}

	if err := s.Err(); err != nil {
		logger.Errorf("[prome_query_error][series_set_iter_error][err:%+v]", err)
		return nil
	}

```

## 遍历series.Labels 根据lb.Name判断即可

```go
	for set.Next() {
		series := set.At()
		thisSeriesNum++
		for _, lb := range series.Labels() {
			if lb.Name == targetLabel {
				labelValuesSet[lb.Value] = struct{}{}
			}
		}
	}
	vals := make([]string, len(labelValuesSet))
	i := 0
	for val := range labelValuesSet {
		vals[i] = val
		i++
	}

	sort.Strings(vals)
```

# 查询一段时间的数据

```go
func tsToUtcTs(s int64) time.Time {
	return time.Unix(s, 0).UTC()
}

// 查询数据
func (pd *PromeDataSource) QueryData(qlStrFinal string) {

	tEnd := time.Now().Unix()
	tStart := tEnd - 60*5

	startT := tsToUtcTs(tStart)
	endT := tsToUtcTs(tEnd)

	resolution := time.Second * 15

	q, err := pd.QueryEngine.NewRangeQuery(pd.Queryable, qlStrFinal, startT, endT, resolution)
	if err != nil {
		logger.Errorf("[prome_query_error][QueryData_error_may_be_parse_ql_error][args:%+v][err:%+v]", qlStrFinal, err)
		return
	}
	ctx, _ := context.WithTimeout(context.Background(), time.Second*30)
	res := q.Exec(ctx)
	if res.Err != nil {
		logger.Errorf("[prome_query_error][rangeQuery_exec_error][args:%+v][err:%+v]", qlStrFinal, res.Err)
		q.Close()
		return
	}
	mat, ok := res.Value.(promql.Matrix)
	if !ok {
		logger.Errorf("[promql.Engine.exec: invalid expression type %q]", res.Value.Type())
		q.Close()
		return
	}
	if res.Err != nil {
		logger.Errorf("[prome_query_error][res.Matrix_error][args:%+v][err:%+v]", qlStrFinal, res.Err)
		q.Close()
		return
	}
	for _, m := range mat {
		logger.Infof("[vector_res:%v]", m.Metric.String())
		for _, p := range m.Points {

			ts := time.Unix(p.T/1e3, 0).Format("2006-01-02 15:04:05")
			logger.Infof("[detail][ts:%v][value:%v]", ts, p.V)
		}

	}
	q.Close()

	return
}

```

## 时间转换为utc时间

```go
	tEnd := time.Now().Unix()
	tStart := tEnd - 60*5

	startT := tsToUtcTs(tStart)
	endT := tsToUtcTs(tEnd)

	resolution := time.Second * 15

```

## 使用QueryEngine创建RangeQuery对象

```go
	q, err := pd.QueryEngine.NewRangeQuery(pd.Queryable, qlStrFinal, startT, endT, resolution)
	if err != nil {
		logger.Errorf("[prome_query_error][QueryData_error_may_be_parse_ql_error][args:%+v][err:%+v]", qlStrFinal, err)
		return
	}
```

## 执行查询解析结果为matrix

```go
res := q.Exec(ctx)
	if res.Err != nil {
		logger.Errorf("[prome_query_error][rangeQuery_exec_error][args:%+v][err:%+v]", qlStrFinal, res.Err)
		q.Close()
		return
	}
	mat, ok := res.Value.(promql.Matrix)
	if !ok {
		logger.Errorf("[promql.Engine.exec: invalid expression type %q]", res.Value.Type())
		q.Close()
		return
	}
	if res.Err != nil {
		logger.Errorf("[prome_query_error][res.Matrix_error][args:%+v][err:%+v]", qlStrFinal, res.Err)
		q.Close()
		return
	}
```

## 遍历结果打印即可

```go
	for _, m := range mat {
		logger.Infof("[vector_res:%v]", m.Metric.String())
		for _, p := range m.Points {

			ts := time.Unix(p.T/1e3, 0).Format("2006-01-02 15:04:05")
			logger.Infof("[detail][ts:%v][value:%v]", ts, p.V)
		}

	}
	q.Close()
```

# 运行查询

- main.go
- 查询标签名为__name__的结果列表，也就是所有metrics的name
- 查询任意一个promeql的数据  avg(rate(node_cpu_seconds_total{mode="system"}[1m])) by (instance) *100

```go
package main

import (
	"flag"
	"github.com/toolkits/pkg/logger"
	"math/rand"
	"prome_remote_read_write/config"
	"prome_remote_read_write/datasource"
	"time"
)

func main() {
	rand.Seed(time.Now().UnixNano())
	configFile := flag.String("config", "prome_remote_read_write.yml",
		"Address on which to expose metrics and web interface.")
	flag.Parse()

	sConfig, err := config.LoadFile(*configFile)
	if err != nil {
		logger.Infof("config.LoadFile Error,Exiting ...error:%v", err)
		return
	}

	pd := datasource.NewPromeDataSource(sConfig)
	pd.Init()
    // 查询标签名为__name__的结果列表，也就是所有metrics的name
	res := pd.QueryLabelValue(`{__name__=~".*a.*"}`, "__name__")
	fmt.Println(res)

	// 查询数据
	pd.QueryData(`avg(rate(node_cpu_seconds_total{mode="system"}[1m])) by (instance) *100`)
}
```

## metricsName查询结果

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630743105000/a1416c47e2454da2b575d11954adde4a.png)

```shell
2021-08-31 15:44:26.128480 INFO datasource/prome.go:149 [successfully_init_prometheus_datasource][remote_read_num:1][remote_write_num:1]
2021-08-31 15:44:26.249858 INFO datasource/read.go:124 [QueryLabelValue][promql:{__name__=~".*a.*"}][targetLabel:__name__][values:[elasticsearch_cluster_health_json_parse_failures e
lasticsearch_cluster_health_total_scrapes elasticsearch_cluster_health_up elasticsearch_clusterinfo_last_retrieval_failure_ts elasticsearch_clusterinfo_up elasticsearch_exporter_bui
ld_info elasticsearch_node_stats_json_parse_failures elasticsearch_node_stats_total_scrapes elasticsearch_node_stats_up go_gc_duration_seconds go_gc_duration_seconds_count go_gc_dur
ation_seconds_sum go_memstats_alloc_bytes go_memstats_alloc_bytes_total go_memstats_buck_hash_sys_bytes go_memstats_frees_total go_memstats_gc_cpu_fraction go_memstats_gc_sys_bytes
go_memstats_heap_alloc_bytes go_memstats_heap_idle_bytes go_memstats_heap_inuse_bytes go_memstats_heap_objects go_memstats_heap_released_bytes go_memstats_heap_sys_bytes go_memstats
_last_gc_time_seconds go_memstats_lookups_total go_memstats_mallocs_total go_memstats_mcache_inuse_bytes go_memstats_mcache_sys_bytes go_memstats_mspan_inuse_bytes go_memstats_mspan
_sys_bytes go_memstats_next_gc_bytes go_memstats_other_sys_bytes go_memstats_stack_inuse_bytes go_memstats_stack_sys_bytes go_memstats_sys_bytes go_threads jmx_config_reload_failure
_created jmx_config_reload_failure_total jmx_config_reload_success_created jmx_config_reload_success_total jmx_scrape_cached_beans jmx_scrape_duration_seconds jmx_scrape_error jvm_b
uffer_pool_capacity_bytes jvm_classes_loaded jvm_classes_loaded_total jvm_classes_unloaded_total jvm_memory_bytes_max jvm_memory_objects_pending_finalization jvm_memory_pool_allocat
ed_bytes_created jvm_memory_pool_allocated_bytes_total jvm_memory_pool_bytes_max jvm_memory_pool_collection_max_bytes jvm_threads_current jvm_threads_daemon jvm_threads_deadlocked j
vm_threads_deadlocked_monitor jvm_threads_peak jvm_threads_started_total jvm_threads_state net_conntrack_dialer_conn_attempted_total net_conntrack_dialer_conn_closed_total net_connt
rack_dialer_conn_established_total net_conntrack_dialer_conn_failed_total net_conntrack_listener_conn_accepted_total net_conntrack_listener_conn_closed_total node_arp_entries node_c
ontext_switches_total node_cooling_device_cur_state node_cooling_device_max_state node_cpu_guest_seconds_total node_cpu_seconds_total node_disk_io_time_seconds_total node_disk_io_ti
me_weighted_seconds_total node_disk_read_bytes_total node_disk_read_time_seconds_total node_disk_reads_completed_total node_disk_reads_merged_total node_disk_write_time_seconds_tota
l node_disk_writes_completed_total node_disk_writes_merged_total node_disk_written_bytes_total node_entropy_available_bits node_filefd_allocated node_filefd_maximum node_filesystem_
avail_bytes node_filesystem_readonly node_forks_total node_intr_total node_ipvs_connections_total node_ipvs_incoming_bytes_total node_ipvs_incoming_packets_total node_ipvs_outgoing_
bytes_total node_ipvs_outgoing_packets_total node_load1 node_load15 node_load5 node_memory_Active_anon_bytes node_memory_AnonHugePages_bytes node_memory_AnonPages_bytes node_memory_
Cached_bytes node_memory_CmaFree_bytes node_memory_CmaTotal_bytes node_memory_DirectMap1G_bytes node_memory_DirectMap2M_bytes node_memory_DirectMap4k_bytes node_memory_HardwareCorru
pted_bytes node_memory_HugePages_Free node_memory_HugePages_Rsvd node_memory_HugePages_Surp node_memory_HugePages_Total node_memory_Hugepagesize_bytes node_memory_Inactive_anon_byte
s node_memory_Inactive_bytes node_memory_Inactive_file_bytes node_memory_KernelStack_bytes node_memory_Mapped_bytes node_memory_MemAvailable_bytes node_memory_MemTotal_bytes node_me
mory_NFS_Unstable_bytes node_memory_PageTables_bytes node_memory_SReclaimable_bytes node_memory_SUnreclaim_bytes node_memory_Slab_bytes node_memory_SwapCached_bytes node_memory_Swap
Free_bytes node_memory_SwapTotal_bytes node_memory_Unevictable_bytes node_memory_VmallocChunk_bytes node_memory_VmallocTotal_bytes node_memory_VmallocUsed_bytes node_memory_Writebac
kTmp_bytes node_memory_Writeback_bytes node_netstat_Icmp6_InErrors node_netstat_Icmp6_InMsgs node_netstat_Icmp6_OutMsgs node_netstat_Icmp_InErrors node_netstat_Icmp_InMsgs node_nets
tat_Icmp_OutMsgs node_netstat_Ip6_InOctets node_netstat_Ip6_OutOctets node_netstat_IpExt_InOctets node_netstat_IpExt_OutOctets node_netstat_Ip_Forwarding node_netstat_TcpExt_ListenD
rops node_netstat_TcpExt_ListenOverflows node_netstat_TcpExt_SyncookiesFailed node_netstat_TcpExt_SyncookiesRecv node_netstat_TcpExt_SyncookiesSent node_netstat_TcpExt_TCPSynRetrans
 node_netstat_Tcp_ActiveOpens node_netstat_Tcp_CurrEstab node_netstat_Tcp_InErrs node_netstat_Tcp_InSegs node_netstat_Tcp_OutRsts node_netstat_Tcp_OutSegs node_netstat_Tcp_PassiveOp
ens node_netstat_Tcp_RetransSegs node_netstat_Udp6_InDatagrams node_netstat_Udp6_InErrors node_netstat_Udp6_NoPorts node_netstat_Udp6_OutDatagrams node_netstat_Udp6_RcvbufErrors nod
e_netstat_Udp6_SndbufErrors node_netstat_UdpLite6_InErrors node_netstat_UdpLite_InErrors node_netstat_Udp_InDatagrams node_netstat_Udp_InErrors node_netstat_Udp_NoPorts node_netstat
_Udp_OutDatagrams node_netstat_Udp_RcvbufErrors node_netstat_Udp_SndbufErrors node_network_address_assign_type node_network_carrier node_network_carrier_changes_total node_network_d
ormant node_network_flags node_network_iface_id node_network_iface_link node_network_iface_link_mode node_network_receive_bytes_total node_network_receive_compressed_total node_netw
ork_receive_drop_total node_network_receive_errs_total node_network_receive_fifo_total node_network_receive_frame_total node_network_receive_multicast_total node_network_receive_pac
kets_total node_network_transmit_bytes_total node_network_transmit_carrier_total node_network_transmit_colls_total node_network_transmit_compressed_total node_network_transmit_drop_
total node_network_transmit_errs_total node_network_transmit_fifo_total node_network_transmit_packets_total node_network_transmit_queue_length node_nf_conntrack_entries node_nf_conn
track_entries_limit node_schedstat_running_seconds_total node_schedstat_timeslices_total node_schedstat_waiting_seconds_total node_scrape_collector_duration_seconds node_scrape_coll
ector_success node_sockstat_FRAG6_inuse node_sockstat_FRAG6_memory node_sockstat_FRAG_inuse node_sockstat_FRAG_memory node_sockstat_RAW6_inuse node_sockstat_RAW_inuse node_sockstat_
TCP6_inuse node_sockstat_TCP_alloc node_sockstat_TCP_inuse node_sockstat_TCP_mem node_sockstat_TCP_mem_bytes node_sockstat_TCP_orphan node_sockstat_TCP_tw node_sockstat_UDP6_inuse n
ode_sockstat_UDPLITE6_inuse node_sockstat_UDPLITE_inuse node_sockstat_UDP_inuse node_sockstat_UDP_mem node_sockstat_UDP_mem_bytes node_sockstat_sockets_used node_softnet_dropped_tot
al node_softnet_processed_total node_softnet_times_squeezed_total node_textfile_scrape_error node_timex_estimated_error_seconds node_timex_frequency_adjustment_ratio node_timex_loop
_time_constant node_timex_maxerror_seconds node_timex_pps_calibration_total node_timex_pps_error_total node_timex_pps_jitter_total node_timex_pps_stability_exceeded_total node_timex
_pps_stability_hertz node_timex_status node_timex_sync_status node_timex_tai_offset_seconds node_uname_info node_vmstat_pgfault node_vmstat_pgmajfault node_vmstat_pgpgin node_vmstat
_pgpgout node_vmstat_pswpin node_vmstat_pswpout node_xfs_allocation_btree_compares_total node_xfs_allocation_btree_lookups_total node_xfs_allocation_btree_records_deleted_total node
_xfs_allocation_btree_records_inserted_total node_xfs_block_map_btree_compares_total node_xfs_block_map_btree_lookups_total node_xfs_block_map_btree_records_deleted_total node_xfs_b
lock_map_btree_records_inserted_total node_xfs_block_mapping_extent_list_compares_total node_xfs_block_mapping_extent_list_deletions_total node_xfs_block_mapping_extent_list_inserti
ons_total node_xfs_block_mapping_extent_list_lookups_total node_xfs_block_mapping_reads_total node_xfs_block_mapping_unmaps_total node_xfs_block_mapping_writes_total node_xfs_direct
ory_operation_create_total node_xfs_directory_operation_getdents_total node_xfs_directory_operation_lookup_total node_xfs_directory_operation_remove_total node_xfs_extent_allocation
_blocks_allocated_total node_xfs_extent_allocation_blocks_freed_total node_xfs_extent_allocation_extents_allocated_total node_xfs_extent_allocation_extents_freed_total node_xfs_inod
e_operation_attempts_total node_xfs_inode_operation_attribute_changes_total node_xfs_inode_operation_duplicates_total node_xfs_inode_operation_found_total node_xfs_inode_operation_m
issed_total node_xfs_inode_operation_reclaims_total node_xfs_inode_operation_recycled_total node_xfs_read_calls_total node_xfs_vnode_active_total node_xfs_vnode_allocate_total node_
xfs_vnode_get_total node_xfs_vnode_hold_total node_xfs_vnode_reclaim_total node_xfs_vnode_release_total node_xfs_vnode_remove_total node_xfs_write_calls_total os_available_processor
s os_committed_virtual_memory_bytes os_cpu_load os_free_physical_memory_bytes os_free_swap_space_bytes os_max_file_descriptor_count os_process_cpu_load os_system_cpu_load os_system_
load_average os_total_memory_size os_total_physical_memory_bytes os_total_swap_space_bytes probe_duration_seconds probe_failed_due_to_regex probe_http_duration_seconds probe_http_st
atus_code probe_ip_addr_hash probe_ssl_earliest_cert_expiry probe_ssl_last_chain_expiry_timestamp_seconds probe_ssl_last_chain_info process_cpu_seconds_total process_max_fds process
_start_time_seconds process_virtual_memory_bytes process_virtual_memory_max_bytes prometheus_api_remote_read_queries prometheus_config_last_reload_success_timestamp_seconds promethe
us_config_last_reload_successful prometheus_engine_queries_concurrent_max prometheus_engine_query_duration_seconds prometheus_engine_query_duration_seconds_count prometheus_engine_q
uery_duration_seconds_sum prometheus_engine_query_log_enabled prometheus_engine_query_log_failures_total prometheus_http_request_duration_seconds_bucket prometheus_http_request_dura
tion_seconds_count prometheus_http_request_duration_seconds_sum prometheus_http_requests_total prometheus_notifications_alertmanagers_discovered prometheus_notifications_dropped_tot
al prometheus_notifications_errors_total prometheus_notifications_latency_seconds prometheus_notifications_latency_seconds_count prometheus_notifications_latency_seconds_sum prometh
eus_notifications_queue_capacity prometheus_notifications_queue_length prometheus_notifications_sent_total prometheus_remote_storage_exemplars_in_total prometheus_remote_storage_hig
hest_timestamp_in_seconds prometheus_remote_storage_samples_in_total prometheus_remote_storage_string_interner_zero_reference_releases_total prometheus_rule_evaluation_duration_seco
nds prometheus_rule_evaluation_duration_seconds_count prometheus_rule_evaluation_duration_seconds_sum prometheus_rule_evaluation_failures_total prometheus_rule_evaluations_total pro
metheus_rule_group_duration_seconds prometheus_rule_group_duration_seconds_count prometheus_rule_group_duration_seconds_sum prometheus_rule_group_interval_seconds prometheus_rule_gr
oup_iterations_missed_total prometheus_rule_group_iterations_total prometheus_rule_group_last_duration_seconds prometheus_rule_group_last_evaluation_samples prometheus_rule_group_la
st_evaluation_timestamp_seconds prometheus_sd_consul_rpc_duration_seconds prometheus_sd_consul_rpc_duration_seconds_count prometheus_sd_consul_rpc_duration_seconds_sum prometheus_sd
_consul_rpc_failures_total prometheus_sd_discovered_targets prometheus_sd_dns_lookup_failures_total prometheus_sd_dns_lookups_total prometheus_sd_failed_configs prometheus_sd_file_r
ead_errors_total prometheus_sd_file_scan_duration_seconds prometheus_sd_file_scan_duration_seconds_count prometheus_sd_file_scan_duration_seconds_sum prometheus_sd_kubernetes_events
_total prometheus_sd_received_updates_total prometheus_sd_updates_total prometheus_target_interval_length_seconds prometheus_target_interval_length_seconds_count prometheus_target_i
nterval_length_seconds_sum prometheus_target_metadata_cache_bytes prometheus_target_metadata_cache_entries prometheus_target_scrape_pool_exceeded_label_limits_total prometheus_targe
t_scrape_pool_exceeded_target_limit_total prometheus_target_scrape_pool_reloads_failed_total prometheus_target_scrape_pool_reloads_total prometheus_target_scrape_pool_sync_total pro
metheus_target_scrape_pool_targets prometheus_target_scrape_pools_failed_total prometheus_target_scrape_pools_total prometheus_target_scrapes_cache_flush_forced_total prometheus_tar
get_scrapes_exceeded_body_size_limit_total prometheus_target_scrapes_exceeded_sample_limit_total prometheus_target_scrapes_exemplar_out_of_order_total prometheus_target_scrapes_samp
le_duplicate_timestamp_total prometheus_target_scrapes_sample_out_of_bounds_total prometheus_target_scrapes_sample_out_of_order_total prometheus_target_sync_failed_total prometheus_
target_sync_length_seconds prometheus_target_sync_length_seconds_count prometheus_target_sync_length_seconds_sum prometheus_template_text_expansion_failures_total prometheus_templat
e_text_expansions_total prometheus_treecache_watcher_goroutines prometheus_treecache_zookeeper_failures_total prometheus_tsdb_blocks_loaded prometheus_tsdb_checkpoint_creations_fail
ed_total prometheus_tsdb_checkpoint_creations_total prometheus_tsdb_checkpoint_deletions_failed_total prometheus_tsdb_checkpoint_deletions_total prometheus_tsdb_clean_start promethe
us_tsdb_compaction_chunk_range_seconds_bucket prometheus_tsdb_compaction_chunk_range_seconds_count prometheus_tsdb_compaction_chunk_range_seconds_sum prometheus_tsdb_compaction_chun
k_samples_bucket prometheus_tsdb_compaction_chunk_samples_count prometheus_tsdb_compaction_chunk_samples_sum prometheus_tsdb_compaction_chunk_size_bytes_bucket prometheus_tsdb_compa
ction_chunk_size_bytes_count prometheus_tsdb_compaction_chunk_size_bytes_sum prometheus_tsdb_compaction_duration_seconds_bucket prometheus_tsdb_compaction_duration_seconds_count pro
metheus_tsdb_compaction_duration_seconds_sum prometheus_tsdb_compaction_populating_block prometheus_tsdb_compactions_failed_total prometheus_tsdb_compactions_skipped_total prometheu
s_tsdb_compactions_total prometheus_tsdb_compactions_triggered_total prometheus_tsdb_data_replay_duration_seconds prometheus_tsdb_head_active_appenders prometheus_tsdb_head_chunks p
rometheus_tsdb_head_chunks_created_total prometheus_tsdb_head_chunks_removed_total prometheus_tsdb_head_gc_duration_seconds_count prometheus_tsdb_head_gc_duration_seconds_sum promet
heus_tsdb_head_max_time prometheus_tsdb_head_max_time_seconds prometheus_tsdb_head_min_time prometheus_tsdb_head_min_time_seconds prometheus_tsdb_head_samples_appended_total prometh
eus_tsdb_head_series prometheus_tsdb_head_series_created_total prometheus_tsdb_head_series_not_found_total prometheus_tsdb_head_series_removed_total prometheus_tsdb_head_truncations
_failed_total prometheus_tsdb_head_truncations_total prometheus_tsdb_isolation_high_watermark prometheus_tsdb_isolation_low_watermark prometheus_tsdb_lowest_timestamp prometheus_tsd
b_lowest_timestamp_seconds prometheus_tsdb_mmap_chunk_corruptions_total prometheus_tsdb_out_of_bound_samples_total prometheus_tsdb_out_of_order_samples_total prometheus_tsdb_reloads
_failures_total prometheus_tsdb_reloads_total prometheus_tsdb_size_retentions_total prometheus_tsdb_storage_blocks_bytes prometheus_tsdb_symbol_table_size_bytes prometheus_tsdb_time
_retentions_total prometheus_tsdb_tombstone_cleanup_seconds_bucket prometheus_tsdb_tombstone_cleanup_seconds_count prometheus_tsdb_tombstone_cleanup_seconds_sum prometheus_tsdb_vert
ical_compactions_total prometheus_tsdb_wal_completed_pages_total prometheus_tsdb_wal_corruptions_total prometheus_tsdb_wal_fsync_duration_seconds prometheus_tsdb_wal_fsync_duration_
seconds_count prometheus_tsdb_wal_fsync_duration_seconds_sum prometheus_tsdb_wal_page_flushes_total prometheus_tsdb_wal_segment_current prometheus_tsdb_wal_truncate_duration_seconds
_count prometheus_tsdb_wal_truncate_duration_seconds_sum prometheus_tsdb_wal_truncations_failed_total prometheus_tsdb_wal_truncations_total prometheus_tsdb_wal_writes_failed_total p
rometheus_web_federation_errors_total prometheus_web_federation_warnings_total promhttp_metric_handler_errors_total promhttp_metric_handler_requests_in_flight promhttp_metric_handle
r_requests_total scrape_duration_seconds scrape_samples_post_metric_relabeling scrape_samples_scraped scrape_series_added zk_approximate_data_size zk_avg_latency zk_ephemerals_count
 zk_max_file_descriptor_count zk_max_latency zk_min_latency zk_num_alive_connections zk_outstanding_requests zk_packets_received zk_packets_sent zk_server_leader zk_watch_count]]
2021-08-31 15:44:26.252610 INFO prome_remote_read_write/main.go:27 [elasticsearch_cluster_health_json_parse_failures elasticsearch_cluster_health_total_scrapes elasticsearch_cluster
_health_up elasticsearch_clusterinfo_last_retrieval_failure_ts elasticsearch_clusterinfo_up elasticsearch_exporter_build_info elasticsearch_node_stats_json_parse_failures elasticsea
rch_node_stats_total_scrapes elasticsearch_node_stats_up go_gc_duration_seconds go_gc_duration_seconds_count go_gc_duration_seconds_sum go_memstats_alloc_bytes go_memstats_alloc_byt
es_total go_memstats_buck_hash_sys_bytes go_memstats_frees_total go_memstats_gc_cpu_fraction go_memstats_gc_sys_bytes go_memstats_heap_alloc_bytes go_memstats_heap_idle_bytes go_mem
stats_heap_inuse_bytes go_memstats_heap_objects go_memstats_heap_released_bytes go_memstats_heap_sys_bytes go_memstats_last_gc_time_seconds go_memstats_lookups_total go_memstats_mal
locs_total go_memstats_mcache_inuse_bytes go_memstats_mcache_sys_bytes go_memstats_mspan_inuse_bytes go_memstats_mspan_sys_bytes go_memstats_next_gc_bytes go_memstats_other_sys_byte
s go_memstats_stack_inuse_bytes go_memstats_stack_sys_bytes go_memstats_sys_bytes go_threads jmx_config_reload_failure_created jmx_config_reload_failure_total jmx_config_reload_succ
ess_created jmx_config_reload_success_total jmx_scrape_cached_beans jmx_scrape_duration_seconds jmx_scrape_error jvm_buffer_pool_capacity_bytes jvm_classes_loaded jvm_classes_loaded
_total jvm_classes_unloaded_total jvm_memory_bytes_max jvm_memory_objects_pending_finalization jvm_memory_pool_allocated_bytes_created jvm_memory_pool_allocated_bytes_total jvm_memo
ry_pool_bytes_max jvm_memory_pool_collection_max_bytes jvm_threads_current jvm_threads_daemon jvm_threads_deadlocked jvm_threads_deadlocked_monitor jvm_threads_peak jvm_threads_star
ted_total jvm_threads_state net_conntrack_dialer_conn_attempted_total net_conntrack_dialer_conn_closed_total net_conntrack_dialer_conn_established_total net_conntrack_dialer_conn_fa
iled_total net_conntrack_listener_conn_accepted_total net_conntrack_listener_conn_closed_total node_arp_entries node_context_switches_total node_cooling_device_cur_state node_coolin
g_device_max_state node_cpu_guest_seconds_total node_cpu_seconds_total node_disk_io_time_seconds_total node_disk_io_time_weighted_seconds_total node_disk_read_bytes_total node_disk_
read_time_seconds_total node_disk_reads_completed_total node_disk_reads_merged_total node_disk_write_time_seconds_total node_disk_writes_completed_total node_disk_writes_merged_tota
l node_disk_written_bytes_total node_entropy_available_bits node_filefd_allocated node_filefd_maximum node_filesystem_avail_bytes node_filesystem_readonly node_forks_total node_intr
_total node_ipvs_connections_total node_ipvs_incoming_bytes_total node_ipvs_incoming_packets_total node_ipvs_outgoing_bytes_total node_ipvs_outgoing_packets_total node_load1 node_lo
ad15 node_load5 node_memory_Active_anon_bytes node_memory_AnonHugePages_bytes node_memory_AnonPages_bytes node_memory_Cached_bytes node_memory_CmaFree_bytes node_memory_CmaTotal_byt
es node_memory_DirectMap1G_bytes node_memory_DirectMap2M_bytes node_memory_DirectMap4k_bytes node_memory_HardwareCorrupted_bytes node_memory_HugePages_Free node_memory_HugePages_Rsv
d node_memory_HugePages_Surp node_memory_HugePages_Total node_memory_Hugepagesize_bytes node_memory_Inactive_anon_bytes node_memory_Inactive_bytes node_memory_Inactive_file_bytes no
de_memory_KernelStack_bytes node_memory_Mapped_bytes node_memory_MemAvailable_bytes node_memory_MemTotal_bytes node_memory_NFS_Unstable_bytes node_memory_PageTables_bytes node_memor
y_SReclaimable_bytes node_memory_SUnreclaim_bytes node_memory_Slab_bytes node_memory_SwapCached_bytes node_memory_SwapFree_bytes node_memory_SwapTotal_bytes node_memory_Unevictable_
bytes node_memory_VmallocChunk_bytes node_memory_VmallocTotal_bytes node_memory_VmallocUsed_bytes node_memory_WritebackTmp_bytes node_memory_Writeback_bytes node_netstat_Icmp6_InErr
ors node_netstat_Icmp6_InMsgs node_netstat_Icmp6_OutMsgs node_netstat_Icmp_InErrors node_netstat_Icmp_InMsgs node_netstat_Icmp_OutMsgs node_netstat_Ip6_InOctets node_netstat_Ip6_Out
Octets node_netstat_IpExt_InOctets node_netstat_IpExt_OutOctets node_netstat_Ip_Forwarding node_netstat_TcpExt_ListenDrops node_netstat_TcpExt_ListenOverflows node_netstat_TcpExt_Sy
ncookiesFailed node_netstat_TcpExt_SyncookiesRecv node_netstat_TcpExt_SyncookiesSent node_netstat_TcpExt_TCPSynRetrans node_netstat_Tcp_ActiveOpens node_netstat_Tcp_CurrEstab node_n
etstat_Tcp_InErrs node_netstat_Tcp_InSegs node_netstat_Tcp_OutRsts node_netstat_Tcp_OutSegs node_netstat_Tcp_PassiveOpens node_netstat_Tcp_RetransSegs node_netstat_Udp6_InDatagrams
node_netstat_Udp6_InErrors node_netstat_Udp6_NoPorts node_netstat_Udp6_OutDatagrams node_netstat_Udp6_RcvbufErrors node_netstat_Udp6_SndbufErrors node_netstat_UdpLite6_InErrors node
_netstat_UdpLite_InErrors node_netstat_Udp_InDatagrams node_netstat_Udp_InErrors node_netstat_Udp_NoPorts node_netstat_Udp_OutDatagrams node_netstat_Udp_RcvbufErrors node_netstat_Ud
p_SndbufErrors node_network_address_assign_type node_network_carrier node_network_carrier_changes_total node_network_dormant node_network_flags node_network_iface_id node_network_if
ace_link node_network_iface_link_mode node_network_receive_bytes_total node_network_receive_compressed_total node_network_receive_drop_total node_network_receive_errs_total node_net
work_receive_fifo_total node_network_receive_frame_total node_network_receive_multicast_total node_network_receive_packets_total node_network_transmit_bytes_total node_network_trans
mit_carrier_total node_network_transmit_colls_total node_network_transmit_compressed_total node_network_transmit_drop_total node_network_transmit_errs_total node_network_transmit_fi
fo_total node_network_transmit_packets_total node_network_transmit_queue_length node_nf_conntrack_entries node_nf_conntrack_entries_limit node_schedstat_running_seconds_total node_s
chedstat_timeslices_total node_schedstat_waiting_seconds_total node_scrape_collector_duration_seconds node_scrape_collector_success node_sockstat_FRAG6_inuse node_sockstat_FRAG6_mem
ory node_sockstat_FRAG_inuse node_sockstat_FRAG_memory node_sockstat_RAW6_inuse node_sockstat_RAW_inuse node_sockstat_TCP6_inuse node_sockstat_TCP_alloc node_sockstat_TCP_inuse node
_sockstat_TCP_mem node_sockstat_TCP_mem_bytes node_sockstat_TCP_orphan node_sockstat_TCP_tw node_sockstat_UDP6_inuse node_sockstat_UDPLITE6_inuse node_sockstat_UDPLITE_inuse node_so
ckstat_UDP_inuse node_sockstat_UDP_mem node_sockstat_UDP_mem_bytes node_sockstat_sockets_used node_softnet_dropped_total node_softnet_processed_total node_softnet_times_squeezed_tot
al node_textfile_scrape_error node_timex_estimated_error_seconds node_timex_frequency_adjustment_ratio node_timex_loop_time_constant node_timex_maxerror_seconds node_timex_pps_calib
ration_total node_timex_pps_error_total node_timex_pps_jitter_total node_timex_pps_stability_exceeded_total node_timex_pps_stability_hertz node_timex_status node_timex_sync_status n
ode_timex_tai_offset_seconds node_uname_info node_vmstat_pgfault node_vmstat_pgmajfault node_vmstat_pgpgin node_vmstat_pgpgout node_vmstat_pswpin node_vmstat_pswpout node_xfs_alloca
tion_btree_compares_total node_xfs_allocation_btree_lookups_total node_xfs_allocation_btree_records_deleted_total node_xfs_allocation_btree_records_inserted_total node_xfs_block_map
_btree_compares_total node_xfs_block_map_btree_lookups_total node_xfs_block_map_btree_records_deleted_total node_xfs_block_map_btree_records_inserted_total node_xfs_block_mapping_ex
tent_list_compares_total node_xfs_block_mapping_extent_list_deletions_total node_xfs_block_mapping_extent_list_insertions_total node_xfs_block_mapping_extent_list_lookups_total node
_xfs_block_mapping_reads_total node_xfs_block_mapping_unmaps_total node_xfs_block_mapping_writes_total node_xfs_directory_operation_create_total node_xfs_directory_operation_getdent
s_total node_xfs_directory_operation_lookup_total node_xfs_directory_operation_remove_total node_xfs_extent_allocation_blocks_allocated_total node_xfs_extent_allocation_blocks_freed
_total node_xfs_extent_allocation_extents_allocated_total node_xfs_extent_allocation_extents_freed_total node_xfs_inode_operation_attempts_total node_xfs_inode_operation_attribute_c
hanges_total node_xfs_inode_operation_duplicates_total node_xfs_inode_operation_found_total node_xfs_inode_operation_missed_total node_xfs_inode_operation_reclaims_total node_xfs_in
ode_operation_recycled_total node_xfs_read_calls_total node_xfs_vnode_active_total node_xfs_vnode_allocate_total node_xfs_vnode_get_total node_xfs_vnode_hold_total node_xfs_vnode_re
claim_total node_xfs_vnode_release_total node_xfs_vnode_remove_total node_xfs_write_calls_total os_available_processors os_committed_virtual_memory_bytes os_cpu_load os_free_physica
l_memory_bytes os_free_swap_space_bytes os_max_file_descriptor_count os_process_cpu_load os_system_cpu_load os_system_load_average os_total_memory_size os_total_physical_memory_byte
s os_total_swap_space_bytes probe_duration_seconds probe_failed_due_to_regex probe_http_duration_seconds probe_http_status_code probe_ip_addr_hash probe_ssl_earliest_cert_expiry pro
be_ssl_last_chain_expiry_timestamp_seconds probe_ssl_last_chain_info process_cpu_seconds_total process_max_fds process_start_time_seconds process_virtual_memory_bytes process_virtua
l_memory_max_bytes prometheus_api_remote_read_queries prometheus_config_last_reload_success_timestamp_seconds prometheus_config_last_reload_successful prometheus_engine_queries_conc
urrent_max prometheus_engine_query_duration_seconds prometheus_engine_query_duration_seconds_count prometheus_engine_query_duration_seconds_sum prometheus_engine_query_log_enabled p
rometheus_engine_query_log_failures_total prometheus_http_request_duration_seconds_bucket prometheus_http_request_duration_seconds_count prometheus_http_request_duration_seconds_sum
 prometheus_http_requests_total prometheus_notifications_alertmanagers_discovered prometheus_notifications_dropped_total prometheus_notifications_errors_total prometheus_notificatio
ns_latency_seconds prometheus_notifications_latency_seconds_count prometheus_notifications_latency_seconds_sum prometheus_notifications_queue_capacity prometheus_notifications_queue
_length prometheus_notifications_sent_total prometheus_remote_storage_exemplars_in_total prometheus_remote_storage_highest_timestamp_in_seconds prometheus_remote_storage_samples_in_
total prometheus_remote_storage_string_interner_zero_reference_releases_total prometheus_rule_evaluation_duration_seconds prometheus_rule_evaluation_duration_seconds_count prometheu
s_rule_evaluation_duration_seconds_sum prometheus_rule_evaluation_failures_total prometheus_rule_evaluations_total prometheus_rule_group_duration_seconds prometheus_rule_group_durat
ion_seconds_count prometheus_rule_group_duration_seconds_sum prometheus_rule_group_interval_seconds prometheus_rule_group_iterations_missed_total prometheus_rule_group_iterations_to
tal prometheus_rule_group_last_duration_seconds prometheus_rule_group_last_evaluation_samples prometheus_rule_group_last_evaluation_timestamp_seconds prometheus_sd_consul_rpc_durati
on_seconds prometheus_sd_consul_rpc_duration_seconds_count prometheus_sd_consul_rpc_duration_seconds_sum prometheus_sd_consul_rpc_failures_total prometheus_sd_discovered_targets pro
metheus_sd_dns_lookup_failures_total prometheus_sd_dns_lookups_total prometheus_sd_failed_configs prometheus_sd_file_read_errors_total prometheus_sd_file_scan_duration_seconds prome
theus_sd_file_scan_duration_seconds_count prometheus_sd_file_scan_duration_seconds_sum prometheus_sd_kubernetes_events_total prometheus_sd_received_updates_total prometheus_sd_updat
es_total prometheus_target_interval_length_seconds prometheus_target_interval_length_seconds_count prometheus_target_interval_length_seconds_sum prometheus_target_metadata_cache_byt
es prometheus_target_metadata_cache_entries prometheus_target_scrape_pool_exceeded_label_limits_total prometheus_target_scrape_pool_exceeded_target_limit_total prometheus_target_scr
ape_pool_reloads_failed_total prometheus_target_scrape_pool_reloads_total prometheus_target_scrape_pool_sync_total prometheus_target_scrape_pool_targets prometheus_target_scrape_poo
ls_failed_total prometheus_target_scrape_pools_total prometheus_target_scrapes_cache_flush_forced_total prometheus_target_scrapes_exceeded_body_size_limit_total prometheus_target_sc
rapes_exceeded_sample_limit_total prometheus_target_scrapes_exemplar_out_of_order_total prometheus_target_scrapes_sample_duplicate_timestamp_total prometheus_target_scrapes_sample_o
ut_of_bounds_total prometheus_target_scrapes_sample_out_of_order_total prometheus_target_sync_failed_total prometheus_target_sync_length_seconds prometheus_target_sync_length_second
s_count prometheus_target_sync_length_seconds_sum prometheus_template_text_expansion_failures_total prometheus_template_text_expansions_total prometheus_treecache_watcher_goroutines
 prometheus_treecache_zookeeper_failures_total prometheus_tsdb_blocks_loaded prometheus_tsdb_checkpoint_creations_failed_total prometheus_tsdb_checkpoint_creations_total prometheus_
tsdb_checkpoint_deletions_failed_total prometheus_tsdb_checkpoint_deletions_total prometheus_tsdb_clean_start prometheus_tsdb_compaction_chunk_range_seconds_bucket prometheus_tsdb_c
ompaction_chunk_range_seconds_count prometheus_tsdb_compaction_chunk_range_seconds_sum prometheus_tsdb_compaction_chunk_samples_bucket prometheus_tsdb_compaction_chunk_samples_count
 prometheus_tsdb_compaction_chunk_samples_sum prometheus_tsdb_compaction_chunk_size_bytes_bucket prometheus_tsdb_compaction_chunk_size_bytes_count prometheus_tsdb_compaction_chunk_s
ize_bytes_sum prometheus_tsdb_compaction_duration_seconds_bucket prometheus_tsdb_compaction_duration_seconds_count prometheus_tsdb_compaction_duration_seconds_sum prometheus_tsdb_co
mpaction_populating_block prometheus_tsdb_compactions_failed_total prometheus_tsdb_compactions_skipped_total prometheus_tsdb_compactions_total prometheus_tsdb_compactions_triggered_
total prometheus_tsdb_data_replay_duration_seconds prometheus_tsdb_head_active_appenders prometheus_tsdb_head_chunks prometheus_tsdb_head_chunks_created_total prometheus_tsdb_head_c
hunks_removed_total prometheus_tsdb_head_gc_duration_seconds_count prometheus_tsdb_head_gc_duration_seconds_sum prometheus_tsdb_head_max_time prometheus_tsdb_head_max_time_seconds p
rometheus_tsdb_head_min_time prometheus_tsdb_head_min_time_seconds prometheus_tsdb_head_samples_appended_total prometheus_tsdb_head_series prometheus_tsdb_head_series_created_total
prometheus_tsdb_head_series_not_found_total prometheus_tsdb_head_series_removed_total prometheus_tsdb_head_truncations_failed_total prometheus_tsdb_head_truncations_total prometheus
_tsdb_isolation_high_watermark prometheus_tsdb_isolation_low_watermark prometheus_tsdb_lowest_timestamp prometheus_tsdb_lowest_timestamp_seconds prometheus_tsdb_mmap_chunk_corruptio
ns_total prometheus_tsdb_out_of_bound_samples_total prometheus_tsdb_out_of_order_samples_total prometheus_tsdb_reloads_failures_total prometheus_tsdb_reloads_total prometheus_tsdb_s
ize_retentions_total prometheus_tsdb_storage_blocks_bytes prometheus_tsdb_symbol_table_size_bytes prometheus_tsdb_time_retentions_total prometheus_tsdb_tombstone_cleanup_seconds_buc
ket prometheus_tsdb_tombstone_cleanup_seconds_count prometheus_tsdb_tombstone_cleanup_seconds_sum prometheus_tsdb_vertical_compactions_total prometheus_tsdb_wal_completed_pages_tota
l prometheus_tsdb_wal_corruptions_total prometheus_tsdb_wal_fsync_duration_seconds prometheus_tsdb_wal_fsync_duration_seconds_count prometheus_tsdb_wal_fsync_duration_seconds_sum pr
ometheus_tsdb_wal_page_flushes_total prometheus_tsdb_wal_segment_current prometheus_tsdb_wal_truncate_duration_seconds_count prometheus_tsdb_wal_truncate_duration_seconds_sum promet
heus_tsdb_wal_truncations_failed_total prometheus_tsdb_wal_truncations_total prometheus_tsdb_wal_writes_failed_total prometheus_web_federation_errors_total prometheus_web_federation
_warnings_total promhttp_metric_handler_errors_total promhttp_metric_handler_requests_in_flight promhttp_metric_handler_requests_total scrape_duration_seconds scrape_samples_post_me
tric_relabeling scrape_samples_scraped scrape_series_added zk_approximate_data_size zk_avg_latency zk_ephemerals_count zk_max_file_descriptor_count zk_max_latency zk_min_latency zk_
num_alive_connections zk_outstanding_requests zk_packets_received zk_packets_sent zk_server_leader zk_watch_count]

```

## 数据查询效果

```shell
2021-08-31 15:42:36.299303 INFO datasource/prome.go:149 [successfully_init_prometheus_datasource][remote_read_num:1][remote_write_num:1]
2021-08-31 15:42:36.353459 INFO datasource/read.go:170 [vector_res:{instance="172.20.70.205:9100"}]
2021-08-31 15:42:36.353459 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:37:36][value:0.9799999999991591]
2021-08-31 15:42:36.353459 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:37:51][value:0.9244444444468375]
2021-08-31 15:42:36.353459 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:38:06][value:0.9866666666671843]
2021-08-31 15:42:36.353459 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:38:21][value:0.9711111111116931]
2021-08-31 15:42:36.353459 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:38:36][value:1.0466666666664726]
2021-08-31 15:42:36.353459 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:38:51][value:0.9866666666671841]
2021-08-31 15:42:36.353969 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:39:06][value:1.0422222222211226]
2021-08-31 15:42:36.353969 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:39:21][value:0.9999999999983831]
2021-08-31 15:42:36.353969 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:39:36][value:1.0955555555556202]
2021-08-31 15:42:36.353969 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:39:51][value:1.0111111111133746]
2021-08-31 15:42:36.353969 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:40:06][value:1.09111111111027]
2021-08-31 15:42:36.353969 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:40:21][value:1.0488888888907644]
2021-08-31 15:42:36.353969 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:40:36][value:1.1111111111127279]
2021-08-31 15:42:36.353969 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:40:51][value:1.015555555555491]
2021-08-31 15:42:36.353969 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:41:06][value:1.0688888888883716]
2021-08-31 15:42:36.353969 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:41:21][value:1.017777777776549]
2021-08-31 15:42:36.355022 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:41:36][value:1.057777777781464]
2021-08-31 15:42:36.355532 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:41:51][value:1.02888888888669]
2021-08-31 15:42:36.355532 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:42:06][value:1.1488888888901176]
2021-08-31 15:42:36.355532 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:42:21][value:1.1066666666657612]
2021-08-31 15:42:36.355532 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:42:36][value:1.0822222222228042]
2021-08-31 15:42:36.356044 INFO datasource/read.go:170 [vector_res:{instance="172.20.70.215:9100"}]
2021-08-31 15:42:36.356044 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:37:36][value:0.5377777777777939]
2021-08-31 15:42:36.356575 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:37:51][value:0.5999999999999596]
2021-08-31 15:42:36.356575 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:38:06][value:0.4777777777776969]
2021-08-31 15:42:36.356575 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:38:21][value:0.5711111111108442]
2021-08-31 15:42:36.356575 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:38:36][value:0.5044444444441372]
2021-08-31 15:42:36.357086 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:38:51][value:0.5999999999999595]
2021-08-31 15:42:36.357086 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:39:06][value:0.5066666666668123]
2021-08-31 15:42:36.357086 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:39:21][value:0.6355555555556849]
2021-08-31 15:42:36.357086 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:39:36][value:0.531111111111386]
2021-08-31 15:42:36.357086 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:39:51][value:0.6577777777777859]
2021-08-31 15:42:36.357596 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:40:06][value:0.5288418807215358]
2021-08-31 15:42:36.357596 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:40:21][value:0.6422222222218906]
2021-08-31 15:42:36.357596 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:40:36][value:0.5244444444443717]
2021-08-31 15:42:36.357596 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:40:51][value:0.6556138323412185]
2021-08-31 15:42:36.357596 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:41:06][value:0.5555555555553534]
2021-08-31 15:42:36.358105 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:41:21][value:0.6177777777775191]
2021-08-31 15:42:36.358105 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:41:36][value:0.519999999999426]
2021-08-31 15:42:36.358105 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:41:51][value:0.657777777777988]
2021-08-31 15:42:36.358105 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:42:06][value:0.620000000000194]
2021-08-31 15:42:36.358105 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:42:21][value:0.6711111111114101]
2021-08-31 15:42:36.358105 INFO datasource/read.go:174 [detail][ts:2021-08-31 15:42:36][value:0.6066666666667717]

```

# 验证merge的结果，配置两个prometheus后端

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630743105000/a050effa871f4f1182c774901ae8fd8f.png)

# 本节重点总结 :

- remote_read代码需求
  - 查询一个标签的值列表
  - 查询一段时间的数据
- remote_read代码需求
  - 查询一个标签的值列表
  - 查询一段时间的数据
- 通用的查询series方法
- 查询一个标签的值列表
- 查询一段时间的数据

