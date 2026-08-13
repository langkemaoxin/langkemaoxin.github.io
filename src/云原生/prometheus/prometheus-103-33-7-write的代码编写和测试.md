---
title: 33.7 write的代码编写和测试
sidebarGroup: Prometheus
shortTitle: 103 33.7 write的代码编写和测试
order: 103
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - Prometheus
  - 云原生
  - 课程笔记
description: '本节重点介绍 : - prometheus的proto编码 和压缩 - 带retry的写入管理器 - 写入的post函数判断是否是可恢复的错误决定是否重试 开启prometheus 队列消费协程 - ...'
---

> **Prometheus · 第 103 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 本节重点介绍 :

- prometheus的proto编码 和压缩
- 带retry的写入管理器
- 写入的post函数判断是否是可恢复的错误决定是否重试

# 开启prometheus 队列消费协程

- 位置 datasource\prome.go
- 接收队列中传来的数据，转换推送即可

```go
package datasource

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"github.com/gogo/protobuf/proto"
	"github.com/golang/snappy"
	"github.com/opentracing-contrib/go-stdlib/nethttp"
	"github.com/opentracing/opentracing-go"
	"github.com/pkg/errors"
	"github.com/prometheus/common/model"
	"github.com/prometheus/prometheus/pkg/labels"
	"github.com/prometheus/prometheus/prompb"
	"github.com/toolkits/pkg/logger"
	"io"
	"io/ioutil"
	"math/rand"
	"net/http"
	"regexp"
	"time"
)

func (pd *PromeDataSource) remoteWrite() {

	for {
		select {
		case pbItems := <-pd.PushQueue:
			payload, err := pd.buildWriteRequest(pbItems)
			if err != nil {
				logger.Errorf("[prome_remote_write_error][pb_marshal_error][items: %+v][pb.err: %v]: ", pbItems, err)
				continue
			}
			pd.processWrite(payload)
		}

	}
}

```

# proto编码 和压缩

```go
func (pd *PromeDataSource) buildWriteRequest(samples []prompb.TimeSeries) ([]byte, error) {

	req := &prompb.WriteRequest{
		Timeseries: samples,
		Metadata:   nil,
	}

	data, err := proto.Marshal(req)
	if err != nil {
		return nil, err
	}

	compressed := snappy.Encode(nil, data)
	return compressed, nil
}
```

# 带retry的写入管理器

- 遍历后端的WriteTargets，用协程写入
- 判断返回错误

```go
type RecoverableError struct {
	error
}

func (pd *PromeDataSource) processWrite(payload []byte) {

	retry := 3

	for _, c := range pd.WriteTargets {
		newC := c
		go func(cc *HttpClient, payload []byte) {
			sendOk := false
			var rec bool
			var finalErr error
			for i := 0; i < retry; i++ {
				err := remoteWritePost(cc, payload)
				if err == nil {
					sendOk = true
					break
				}

				_, rec = err.(RecoverableError)

				if !rec {
					finalErr = err
					break
				}
				logger.Warningf("[send prome fail recoverableError][retry: %d/%d][err:%v]", i+1, retry, err)
				time.Sleep(time.Millisecond * 100)
			}
			if !sendOk {
				logger.Errorf("send prome finally fail: %v", finalErr)
			} else {
				logger.Debugf("send to prome %s ok", cc.url.String())
			}
		}(newC, payload)
	}

}

```

## 写入的post函数

- 如果错误为5xx  httpResp.StatusCode/100 == 5 ，则认为是可恢复的错误，继续重试
- 如果错误为4xx  400的错误是客户端的问题，不返回给上层，输出到debug日志中

```go
func remoteWritePost(c *HttpClient, req []byte) error {
	httpReq, err := http.NewRequest("POST", c.url.String(), bytes.NewReader(req))
	if err != nil {
		// Errors from NewRequest are from unparsable URLs, so are not
		// recoverable.
		return err
	}

	httpReq.Header.Add("Content-Encoding", "snappy")
	httpReq.Header.Set("Content-Type", "application/x-protobuf")
	httpReq.Header.Set("User-Agent", "n9e-v5")
	httpReq.Header.Set("X-Prometheus-Remote-Write-Version", "0.1.0")
	ctx, cancel := context.WithTimeout(context.Background(), c.timeout)
	defer cancel()

	httpReq = httpReq.WithContext(ctx)

	if parentSpan := opentracing.SpanFromContext(ctx); parentSpan != nil {
		var ht *nethttp.Tracer
		httpReq, ht = nethttp.TraceRequest(
			parentSpan.Tracer(),
			httpReq,
			nethttp.OperationName("Remote Store"),
			nethttp.ClientTrace(false),
		)
		defer ht.Finish()
	}

	httpResp, err := c.Client.Do(httpReq)
	if err != nil {
		// Errors from Client.Do are from (for example) network errors, so are
		// recoverable.
		return RecoverableError{err}
	}
	defer func() {
		io.Copy(ioutil.Discard, httpResp.Body)
		httpResp.Body.Close()
	}()

	if httpResp.StatusCode/100 != 2 {
		scanner := bufio.NewScanner(io.LimitReader(httpResp.Body, 512))
		line := ""
		if scanner.Scan() {
			line = scanner.Text()
		}

		if httpResp.StatusCode == 400 {
			//400的错误是客户端的问题，不返回给上层，输出到debug日志中
			logger.Debugf("server returned HTTP status %s: %s req:%v", httpResp.Status, line, getSamples(req))
		} else {
			err = errors.Errorf("server returned HTTP status %s: %s", httpResp.Status, line)
		}
	}

	if httpResp.StatusCode/100 == 5 {
		return RecoverableError{err}
	}
	return err
}

func getSamples(compressed []byte) []prompb.TimeSeries {
	var samples []prompb.TimeSeries
	req := &prompb.WriteRequest{
		Timeseries: samples,
		Metadata:   nil,
	}

	d, _ := snappy.Decode(nil, compressed)
	proto.Unmarshal(d, req)

	return req.Timeseries
}

```

# 测试写入数据的入口

- 有一个公共的metrics前缀
- mock一些标签数据
- 调用转换函数 convertOne转换
- 将结果推入chan中

```go
func (pd *PromeDataSource) WriteTest() {
	for {
		metricNamePrefix := "metrics_gen_by_remote_write_code_"

		randMapKeys := []string{"arch", "idc", "os", "jobname"}
		randMapValues := []string{"linux", "beijing", "centos", "arm64"}
		frn := func(n int) int {
			return rand.Intn(n)
		}
		pts := []prompb.TimeSeries{}
		for i := 0; i < 10; i++ {
			name := fmt.Sprintf("%s_%d", metricNamePrefix, i)
			num := len(randMapKeys)
			m := make(map[string]string, num)
			for i := 0; i < num; i++ {
				m[randMapKeys[frn(len(randMapKeys)-1)]] = randMapValues[frn(len(randMapValues)-1)]
			}
			pt, err := pd.convertOne(name, m, float64(rand.Intn(1000)))
			if err != nil {
				continue
			}
			pts = append(pts, pt)
		}
		pd.PushQueue <- pts
		time.Sleep(15 * time.Second)
	}
}
```

## 转换函数

- 先校验下metrics是否符合正则要求
- 调用labelsToLabelsProto 将标签转换为protocol buf格式

```go
type sample struct {
	labels labels.Labels
	t      int64
	v      float64
}

func (pd *PromeDataSource) convertOne(metricName string, labelsMap map[string]string, value float64) (prompb.TimeSeries, error) {
	pt := prompb.TimeSeries{}
	pt.Samples = []prompb.Sample{{}}
	s := sample{}
	s.t = time.Now().Unix()
	s.v = value
	// name
	if !MetricNameRE.MatchString(metricName) {
		return pt, errors.New("invalid metrics name")
	}
	nameLs := labels.Label{
		Name:  "__name__",
		Value: metricName,
	}
	s.labels = append(s.labels, nameLs)

	for k, v := range labelsMap {
		if model.LabelNameRE.MatchString(k) {
			ls := labels.Label{
				Name:  k,
				Value: v,
			}
			s.labels = append(s.labels, ls)

		}

	}

	pt.Labels = labelsToLabelsProto(s.labels, pt.Labels)
	// 时间赋值问题,使用毫秒时间戳
	tsMs := time.Unix(s.t, 0).UnixNano() / 1e6
	pt.Samples[0].Timestamp = tsMs
	pt.Samples[0].Value = s.v
	return pt, nil
}

var MetricNameRE = regexp.MustCompile(`^[a-zA-Z_:][a-zA-Z0-9_:]*$`)

func labelsToLabelsProto(labels labels.Labels, buf []prompb.Label) []prompb.Label {
	result := buf[:0]
	if cap(buf) < len(labels) {
		result = make([]prompb.Label, 0, len(labels))
	}
	for _, l := range labels {
		result = append(result, prompb.Label{
			Name:  l.Name,
			Value: l.Value,
		})
	}
	return result
}

```

# prometheus  远程写入接收器允许 Prometheus 接受来自其他 Prometheus 服务器的远程写入请求

- [文档地址](https://prometheus.io/docs/prometheus/latest/feature_flags/#remote-write-receiver)

```shell
--enable-feature=remote-write-receiver
```

# main中写入测试数据

```go
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
	go pd.WriteTest()
	select {}

}

```

## 观察日志

![image.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630743127000/5fbc2b8c1c4c40f08156b16ddc167a32.png)

![remote_write_code.png](https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/908/1630743127000/c5497fdc959f40dbbef30928f6c596bd.png)

```go
2021-08-31 15:59:10.260790 DEBUG datasource/write.go:74 send to prome http://172.20.70.205:9090/api/v1/write ok
2021-08-31 15:59:25.263606 DEBUG datasource/write.go:74 send to prome http://172.20.70.205:9090/api/v1/write ok
2021-08-31 15:59:40.273120 DEBUG datasource/write.go:74 send to prome http://172.20.70.205:9090/api/v1/write ok
2021-08-31 15:59:55.288338 DEBUG datasource/write.go:74 send to prome http://172.20.70.205:9090/api/v1/write ok

```

# 本节重点总结 :

- prometheus的proto编码 和压缩
- 带retry的写入管理器
- 写入的post函数判断是否是可恢复的错误决定是否重试

