---
title: 使用Argo CD实现流水线发布项目
sidebarGroup: DevOps / GitOps
shortTitle: 04 使用Argo CD实现流水线发布项目
order: 4
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - DevOps / GitOps
  - 云原生
  - 课程笔记
description: '使用Argo CD实现流水线发布项目 一、项目代码及项目部署工具准备 1.1 项目代码准备 1.1.1 argocd demo ~~~powershell [root@gitlab-server ar...'
---

> **DevOps / GitOps · 第 4 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 使用Argo CD实现流水线发布项目

# 一、项目代码及项目部署工具准备

## 1.1 项目代码准备

### 1.1.1 argocd demo

~~~powershell
[root@gitlab-server argocddir]# ls
argocd-demo  argocd-demo-helm

[root@gitlab-server argocddir]# ls argocd-demo
Dockerfile  go.mod  go.sum  main.go  README.md

[root@gitlab-server argocddir]# cd argocd-demo

[root@gitlab-server argocd-demo]# cat Dockerfile
FROM golang:1.18 AS builder
WORKDIR /workspace
COPY go.mod go.mod
COPY go.sum go.sum
ENV GOPROXY=https://goproxy.cn,direct
RUN go mod download
COPY main.go main.go
RUN go build -ldflags '-extldflags "-static"' -o /go/bin/devops-demo main.go
ENTRYPOINT ["/go/bin/devops-demo"]
~~~

~~~powershell
[root@gitlab-server argocd-demo]# cat go.mod
module dronek8s

require (
        github.com/gin-gonic/gin v1.4.0
        github.com/sirupsen/logrus v1.4.2
)
[root@gitlab-server argo-demo]# cat go.sum
github.com/davecgh/go-spew v1.1.0/go.mod h1:J7Y8YcW2NihsgmVo/mv3lAwl/skON4iLHjSsI+c5H38=
github.com/davecgh/go-spew v1.1.1/go.mod h1:J7Y8YcW2NihsgmVo/mv3lAwl/skON4iLHjSsI+c5H38=
github.com/gin-contrib/sse v0.0.0-20190301062529-5545eab6dad3 h1:t8FVkw33L+wilf2QiWkw0UV77qRpcH/JHPKGpKa2E8g=
github.com/gin-contrib/sse v0.0.0-20190301062529-5545eab6dad3/go.mod h1:VJ0WA2NBN22VlZ2dKZQPAPnyWw5XTlK1KymzLKsr59s=
github.com/gin-gonic/gin v1.4.0 h1:3tMoCCfM7ppqsR0ptz/wi1impNpT7/9wQtMZ8lr1mCQ=
github.com/gin-gonic/gin v1.4.0/go.mod h1:OW2EZn3DO8Ln9oIKOvM++LBO+5UPHJJDH72/q/3rZdM=
github.com/golang/protobuf v1.3.1 h1:YF8+flBXS5eO826T4nzqPrxfhQThhXl0YzfuUPu4SBg=
github.com/golang/protobuf v1.3.1/go.mod h1:6lQm79b+lXiMfvg/cZm0SGofjICqVBUtrP5yJMmIC1U=
github.com/json-iterator/go v1.1.6/go.mod h1:+SdeFBvtyEkXs7REEP0seUULqWtbJapLOCVDaaPEHmU=
github.com/konsorten/go-windows-terminal-sequences v1.0.1/go.mod h1:T0+1ngSBFLxvqU3pZ+m/2kptfBszLMUkC4ZK/EgS/cQ=
github.com/mattn/go-isatty v0.0.7 h1:UvyT9uN+3r7yLEYSlJsbQGdsaB/a0DlgWP3pql6iwOc=
github.com/mattn/go-isatty v0.0.7/go.mod h1:Iq45c/XA43vh69/j3iqttzPXn0bhXyGjM0Hdxcsrc5s=
github.com/modern-go/concurrent v0.0.0-20180306012644-bacd9c7ef1dd/go.mod h1:6dJC0mAP4ikYIbvyc7fijjWJddQyLn8Ig3JB5CqoB9Q=
github.com/modern-go/reflect2 v1.0.1/go.mod h1:bx2lNnkwVCuqBIxFjflWJWanXIb3RllmbCylyMrvgv0=
github.com/pmezard/go-difflib v1.0.0/go.mod h1:iKH77koFhYxTK1pcRnkKkqfTogsbg7gZNVY4sRDYZ/4=
github.com/sirupsen/logrus v1.4.2 h1:SPIRibHv4MatM3XXNO2BJeFLZwZ2LvZgfQ5+UNI2im4=
github.com/sirupsen/logrus v1.4.2/go.mod h1:tLMulIdttU9McNUspp0xgXVQah82FyeX6MwdIuYE2rE=
github.com/stretchr/objx v0.1.0/go.mod h1:HFkY916IF+rwdDfMAkV7OtwuqBVzrE8GR6GFx+wExME=
github.com/stretchr/objx v0.1.1/go.mod h1:HFkY916IF+rwdDfMAkV7OtwuqBVzrE8GR6GFx+wExME=
github.com/stretchr/testify v1.2.2/go.mod h1:a8OnRcib4nhh0OaRAV+Yts87kKdq0PP7pXfy6kDkUVs=
github.com/stretchr/testify v1.3.0/go.mod h1:M5WIy9Dh21IEIfnGCwXGc5bZfKNJtfHm1UVUgZn+9EI=
github.com/ugorji/go v1.1.4 h1:j4s+tAvLfL3bZyefP2SEWmhBzmuIlH/eqNuPdFPgngw=
github.com/ugorji/go v1.1.4/go.mod h1:uQMGLiO92mf5W77hV/PUCpI3pbzQx3CRekS0kk+RGrc=
golang.org/x/crypto v0.0.0-20190308221718-c2843e01d9a2/go.mod h1:djNgcEr1/C05ACkg1iLfiJU5Ep61QUkGW8qpdssI0+w=
golang.org/x/net v0.0.0-20190503192946-f4e77d36d62c/go.mod h1:t9HGtf8HONx5eT2rtn7q6eTqICYqUVnKs3thJo3Qplg=
golang.org/x/sys v0.0.0-20190215142949-d0b11bdaac8a/go.mod h1:STP8DvDyc/dI5b8T5hshtkjS+E42TnysNCUPdjciGhY=
golang.org/x/sys v0.0.0-20190222072716-a9d3bda3a223/go.mod h1:STP8DvDyc/dI5b8T5hshtkjS+E42TnysNCUPdjciGhY=
golang.org/x/sys v0.0.0-20190422165155-953cdadca894 h1:Cz4ceDQGXuKRnVBDTS23GTn/pU5OE2C0WrNTOYK1Uuc=
golang.org/x/sys v0.0.0-20190422165155-953cdadca894/go.mod h1:h1NjWce9XRLGQEsW7wpKNCjG9DtNlClVuFLEZdDNbEs=
golang.org/x/text v0.3.0/go.mod h1:NqM8EUOU14njkJ3fqMW+pc6Ldnwhi/IjpwHt7yyuwOQ=
gopkg.in/check.v1 v0.0.0-20161208181325-20d25e280405/go.mod h1:Co6ibVJAznAaIkqp8huTwlJQCZ016jof/cbN4VW5Yz0=
gopkg.in/go-playground/assert.v1 v1.2.1/go.mod h1:9RXL0bg/zibRAgZUYszZSwO/z8Y/a8bDuhia5mkpMnE=
gopkg.in/go-playground/validator.v8 v8.18.2 h1:lFB4DoMU6B626w8ny76MV7VX6W2VHct2GVOI3xgiMrQ=
gopkg.in/go-playground/validator.v8 v8.18.2/go.mod h1:RX2a/7Ha8BgOhfk7j780h4/u/RRjR0eouCJSH80/M2Y=
gopkg.in/yaml.v2 v2.2.2 h1:ZCJp+EgiOT7lHqUV2J862kp8Qj64Jo6az82+3Td9dZw=
gopkg.in/yaml.v2 v2.2.2/go.mod h1:hI93XBmqTisBFMUTm0b8Fm+jr3Dg1NNxqwp+5A1VGuI=
~~~

~~~powershell
[root@gitlab-server argocd-demo]# cat main.go
package main

import (
  "net/http"

  "github.com/gin-gonic/gin"
  "github.com/sirupsen/logrus"
)

func main() {
  r := gin.Default()

  r.GET("/", func(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H {
      "msg": "Hello, GitLab With ArgoCD\n",
    })
  })

  r.GET("/health", func(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H {
      "health": true,
    })
  })

  if err := r.Run(":8080"); err != nil {
    logrus.WithError(err).Fatal("Couldn't listen")
  }

}
~~~

~~~powershell
[root@gitlab-server argocd-demo]# cat .gitlab-ci.yml
stages:
  - test
  - build
  - dockerize

variables:
  DOCKER_HOST: "unix:///var/run/docker.sock"
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: ""

# 定义 使用的Docker
services:
  - docker:dind

# 阶段1: 测试
unit_tests:
  stage: test
  image: golang:1.18.3-alpine3.16
  script:
    - echo "执行单元测试"
    - go test ./...

# 阶段2: 构建应用程序
build_app:
  stage: build
  image: golang:1.18.3-alpine3.16
  script:
    - echo "构建 Go 应用"
    - GOOS=linux GOARCH=amd64 go build -o demo-app
  artifacts:
    paths:
      - demo-app

# 阶段3: 构建并推送 Docker 镜像
docker_build:
  stage: dockerize
  image: docker:latest
  script:
    - echo "构建 Docker 镜像"
    - docker info
    - docker login -u "$CI_REGISTRY_USER" -p "$CI_REGISTRY_PASSWORD" "$CI_REGISTRY"
    - echo "$CI_REGISTRY_USER $CI_REGISTRY_PASSWORD $CI_REGISTRY $CI_REGISTRY_IMAGE $CI_COMMIT_REF_SLUG"
    - docker build -t "$CI_REGISTRY_IMAGE:$CI_COMMIT_REF_SLUG" .
    - docker push "$CI_REGISTRY_IMAGE:$CI_COMMIT_REF_SLUG"
~~~

~~~powershell
[root@gitlab-server argocd-demo]# cat README.md
# devops-demo

devops kubernetes demo project
~~~

### 1.1.2 argocd demo helm

~~~powershell
[root@gitlab-server argocddir]# ls
argo-demo  argo-demo-helm

[root@gitlab-server argocddir]# cd argo-demo-helm/

[root@gitlab-server argocd-demo-helm]# ls -a
helm .gitkeep

[root@gitlab-server argocd-demo-helm]# cd helm/

[root@gitlab-server helm]# ls
Chart.yaml  my-values.enc.yaml  my-values.yaml  templates  values.yaml
~~~

~~~powershell
[root@gitlab-server helm]# cat Chart.yaml
apiVersion: v1
appVersion: "1.0"
description: A Helm chart for Kubernetes
name: devops-demo
version: 0.1.0
~~~

~~~powershell
[root@gitlab-server helm]# cat my-values.enc.yaml
image:
    repository: ENC[AES256_GCM,data:pUlayDcQKd1y/a0sxSl/Kj5G6mMbROyOQXUz0015QX1XgCk=,iv:evNABubc7Kc2YetFJP1fTrE9KV5JvksHzH0WIe2OTok=,tag:Nub1nE73oPhAvhGdF6DpwA==,type:str]
    tag: ENC[AES256_GCM,data:0f/BSKFk4yac25kgNIYo6YJpKnHVx/Nvk6RRTeADE5oQO6q9XVp0tg==,iv:KfZ6GdwLNOF9dGUOfEsiEglbiFlBZA2pigIxnBEy+4M=,tag:YVd/0MM5zl/iAdenLXWrKA==,type:str]
    pullPolicy: ENC[AES256_GCM,data:uPSt4Y2LX1zuDP0L,iv:hIj0C2u1QAc0w5vGlKm+nVWOIL+3nkJCU4gFnz48jpM=,tag:+l8S4aeS8W2q/GhkxoxRXw==,type:str]
ingress:
    enabled: ENC[AES256_GCM,data:F2VdOA==,iv:41+6TkfQaHP6XE9lFf7c9ZwVVWqgvmc7O8+gSKA55Pk=,tag:kbAMQBgr+SUTTwk75OvVsQ==,type:bool]
    ingressClassName: ENC[AES256_GCM,data:YBsVjVA=,iv:kCi/hWVRcSdAs0qoPfcC7kkCSm/NlU3xfzjD3RU/lMg=,tag:3lOFUy8VMYkL5A6SEfOqUA==,type:str]
    path: ENC[AES256_GCM,data:5Q==,iv:CmAatt4H9Miknk2Tn10j2jf2gm4zmCooVo8Iyq61q0k=,tag:tqI5UThr2t3thX9ZqE6mqw==,type:str]
    hosts:
        - ENC[AES256_GCM,data:EjB2BlEbr92PyH8Zf2A/OSAXt9RW,iv:aGjpesc1Fn32m3QDuItA35jiNrX6caRisHDHI8nXNss=,tag:Q+QSS7blYgNCwHYhBLXUkQ==,type:str]
resources:
    limits:
        cpu: ENC[AES256_GCM,data:M3WY,iv:dHRZgJLMWr0jTYOaGDTDiYuzwW84QGbXhBSqTPPYZKk=,tag:bReWau69FSoLzf8cVT+OKA==,type:str]
        memory: ENC[AES256_GCM,data:n2hV4P4=,iv:oNyl5Gp14bgWgTORSRlwB6DyZg3tyGirT6WzHChY5KY=,tag:nq2DsT30uwjgYS/bEnylWQ==,type:str]
    requests:
        cpu: ENC[AES256_GCM,data:H0gC,iv:YTGLOB1dd+PSFYTgTb1xnb6OcEjggDCFPioqvhKqf4E=,tag:AH7f/8qBEoRr8h4Lfbi3jw==,type:str]
        memory: ENC[AES256_GCM,data:2BQMn5E=,iv:doW+iV96ayityIW85Ql9DHMNA4R5EogeqBDspjwSUqs=,tag:0BkuJAUkDiGuXOCPv5qkWw==,type:str]
sops:
    kms: []
    gcp_kms: []
    azure_kv: []
    hc_vault: []
    age:
        - recipient: age1cac2zfqdcs69mwaztm7lc6xhlmnsx0swmhwdj4arjujqxnd40ysqdg3y04
          enc: |
            -----BEGIN AGE ENCRYPTED FILE-----
            YWdlLWVuY3J5cHRpb24ub3JnL3YxCi0+IFgyNTUxOSA0amh2Y3NYUm84a3hmOEI1
            TCtBVU9obFV3b3ZiN3dGUlNjMk82VHBtenhvClBzb3NaVnR0c1NVUUNFYkJBMDBl
            UUR5aStvOERMRCtJeWh1V1NrbjMwU0EKLS0tIHU2VlhJSjdvTmIzNFlFMDYxbUlz
            dE1teTlSVnVoMlV3bE1WZDRqaWVzMkkK4Z/DpFC6pwoB4PhDPsxZkGTRqAqpQ78k
            8Y9e8doKpUx/TNp5KlpB/Is3JD2e2t+Jb6pssd3YPOgYeSSjSwhvBw==
            -----END AGE ENCRYPTED FILE-----
    lastmodified: "2022-08-18T13:08:46Z"
    mac: ENC[AES256_GCM,data:kGnpVlCJyjg3oo9js3gbSj51MBXuD5TtLZQsYvrCeQp4Hnina5BiNwPIESp8vhSEFcM1E3tvI4Q91M6JOrEPPpG56vrHM/fSmpaIvG4+0MImqoLyI+rfOWoDiUJ75NwMeUs709ao14ORAaQm173V9TbnFSGAKc0RJiEq74gVKmw=,iv:RSxzLHOcbmf50hDUs/KnHfGmWFl3u3xaBUGQW1C/ZTI=,tag:UCIjH3ac6KaU1tdMipSeJg==,type:str]
    pgp: []
    unencrypted_suffix: _unencrypted
    version: 3.7.3
~~~

~~~powershell
[root@gitlab-server helm]# cat my-values.yaml
image:
  repository: www.kubemsb.com/library/devops-demo
  tag: latest
  pullPolicy: IfNotPresent
 

ingress:
  enabled: true
  ingressClassName: nginx
  path: /
  hosts:
    - www.kubex.com

resources:
  limits:
    cpu: 50m
    memory: 128Mi
  requests:
    cpu: 50m
    memory: 128Mi
~~~

~~~powershell
[root@gitlab-server helm]# cat values.yaml
# Default values for devops-demo.
# This is a YAML-formatted file.
# Declare variables to be passed into your templates.

replicaCount: 1

image:
  repository: www.kubemsb.com/library/devops-demo
  tag: latest
  pullPolicy: Always

nameOverride: ""
fullnameOverride: ""

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: false
  # ingressClassName: nginx
  annotations: {}
    # kubernetes.io/ingress.class: nginx
    # kubernetes.io/tls-acme: "true"
  path: /
  pathType: Prefix
  hosts:
    - www.kubex.com
  tls: []
  #  - secretName: chart-example-tls
  #    hosts:
  #      - chart-example.local

resources: {}
  # We usually recommend not to specify default resources and to leave this as a conscious
  # choice for the user. This also increases chances charts run on environments with little
  # resources, such as Minikube. If you do want to specify resources, uncomment the following
  # lines, adjust them as necessary, and remove the curly braces after 'resources:'.
  # limits:
  #  cpu: 100m
  #  memory: 128Mi
  # requests:
  #  cpu: 100m
  #  memory: 128Mi

nodeSelector: {}

tolerations: []

affinity: {}
~~~

~~~powershell
[root@gitlab-server helm]# ls templates/
deployment.yaml  _helpers.tpl  ingress.yaml  NOTES.txt  service.yaml
~~~

~~~powershell
[root@gitlab-server helm]# cat templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "devops-demo.fullname" . }}
  labels:
    app: {{ include "devops-demo.name" . }}
    chart: {{ include "devops-demo.chart" . }}
    release: {{ .Release.Name }}
    heritage: {{ .Release.Service }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ include "devops-demo.name" . }}
      release: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app: {{ include "devops-demo.name" . }}
        release: {{ .Release.Name }}
    spec:
      {{- with .Values.image.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: 8080
              protocol: TCP
          livenessProbe:
            httpGet:
              path: /health
              port: http
          readinessProbe:
            httpGet:
              path: /health
              port: http
          resources:
{{ toYaml .Values.resources | indent 12 }}
    {{- with .Values.nodeSelector }}
      nodeSelector:
{{ toYaml . | indent 8 }}
    {{- end }}
    {{- with .Values.affinity }}
      affinity:
{{ toYaml . | indent 8 }}
    {{- end }}
    {{- with .Values.tolerations }}
      tolerations:
{{ toYaml . | indent 8 }}
    {{- end }}
~~~

~~~powershell
[root@gitlab-server helm]# cat templates/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ include "devops-demo.fullname" . }}
  labels:
    app: {{ include "devops-demo.name" . }}
    chart: {{ include "devops-demo.chart" . }}
    release: {{ .Release.Name }}
    heritage: {{ .Release.Service }}
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: http
      protocol: TCP
      name: http
  selector:
    app: {{ include "devops-demo.name" . }}
    release: {{ .Release.Name }}
~~~

~~~powershell
[root@gitlab-server helm]# cat templates/ingress.yaml
{{- if .Values.ingress.enabled -}}
{{- $fullName := include "devops-demo.fullname" . -}}
{{- $servicePort := .Values.service.port -}}
{{- $ingressPath := .Values.ingress.path -}}
{{- $ingressPathType := .Values.ingress.pathType -}}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ $fullName }}
  labels:
    app: {{ include "devops-demo.name" . }}
    chart: {{ include "devops-demo.chart" . }}
    release: {{ .Release.Name }}
    heritage: {{ .Release.Service }}
{{- with .Values.ingress.annotations }}
  annotations:
{{ toYaml . | indent 4 }}
{{- end}}
spec:
  {{- if .Values.ingress.ingressClassName }}
  ingressClassName: {{ .Values.ingress.ingressClassName }}
  {{- end -}}
{{- if .Values.ingress.tls }}
  tls:
  {{- range .Values.ingress.tls }}
    - hosts:
      {{- range .hosts }}
        - {{ . | quote }}
      {{- end }}
      secretName: {{ .secretName }}
  {{- end }}
{{- end }}
  rules:
  {{- range .Values.ingress.hosts }}
    - host: {{ . | quote }}
      http:
        paths:
          - path: {{ $ingressPath }}
            pathType: {{ $ingressPathType }}
            backend:
              service:
                name: {{ $fullName }}
                port:
                  number: {{ $servicePort }}
  {{- end }}
{{- end }}
~~~

~~~powershell
[root@gitlab-server helm]# cat templates/_helpers.tpl
{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "devops-demo.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "devops-demo.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "devops-demo.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}
~~~

~~~powershell
[root@gitlab-server helm]# cat templates/NOTES.txt
1. Get the application URL by running these commands:
{{- if .Values.ingress.enabled }}
{{- range .Values.ingress.hosts }}
  http{{ if $.Values.ingress.tls }}s{{ end }}://{{ . }}{{ $.Values.ingress.path }}
{{- end }}
{{- else if contains "NodePort" .Values.service.type }}
  export NODE_PORT=$(kubectl get --namespace {{ .Release.Namespace }} -o jsonpath="{.spec.ports[0].nodePort}" services {{ include "devops-demo.fullname" . }})
  export NODE_IP=$(kubectl get nodes --namespace {{ .Release.Namespace }} -o jsonpath="{.items[0].status.addresses[0].address}")
  echo http://$NODE_IP:$NODE_PORT
{{- else if contains "LoadBalancer" .Values.service.type }}
     NOTE: It may take a few minutes for the LoadBalancer IP to be available.
           You can watch the status of by running 'kubectl get svc -w {{ include "devops-demo.fullname" . }}'
  export SERVICE_IP=$(kubectl get svc --namespace {{ .Release.Namespace }} {{ include "devops-demo.fullname" . }} -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
  echo http://$SERVICE_IP:{{ .Values.service.port }}
{{- else if contains "ClusterIP" .Values.service.type }}
  export POD_NAME=$(kubectl get pods --namespace {{ .Release.Namespace }} -l "app={{ include "devops-demo.name" . }},release={{ .Release.Name }}" -o jsonpath="{.items[0].metadata.name}")
  echo "Visit http://127.0.0.1:8080 to use your application"
  kubectl port-forward $POD_NAME 8080:80
{{- end }}
~~~

## 1.2 项目代码仓库准备

### 1.2.1 Gitlab准备

~~~powershell
[root@gitlab-server ~]# vim /etc/yum.repos.d/gitlab.repo
[root@gitlab-server ~]# cat /etc/yum.repos.d/gitlab.repo
[gitlab]
name=gitlab
baseurl=https://mirrors.tuna.tsinghua.edu.cn/gitlab-ce/yum/el7/
enabled=1
gpgcheck=0
~~~

~~~powershell
[root@gitlab-server ~]# yum -y install gitlab-ce
~~~

~~~powershell
[root@gitlab-server ~]# vim  /etc/gitlab/gitlab.rb
external_url 'http://192.168.10.164'
~~~

~~~powershell
[root@gitlab-server ~]# gitlab-ctl reconfigure
~~~

~~~powershell
[root@gitlab-server ~]# cat /etc/gitlab/initial_root_password
# WARNING: This value is valid only in the following conditions
#          1. If provided manually (either via `GITLAB_ROOT_PASSWORD` environment variable or via `gitlab_rails['initial_root_password']` setting in `gitlab.rb`, it was provided before database was seeded for the first time (usually, the first reconfigure run).
#          2. Password hasn't been changed manually, either via UI or via command line.
#
#          If the password shown here doesn't work, you must reset the admin password following https://docs.gitlab.com/ee/security/reset_user_password.html#reset-your-root-password.

Password: hpwQEtHSu8VggdkJ6+NzN6jdBrXfBv3ZBRImGsJWdGo=

# NOTE: This file will be automatically deleted in the first reconfigure run after 24 hours.
~~~

![image-20231122220121076](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231122220121076.png)

### 1.2.2 生成认证密钥并配置到Gitlab

~~~powershell
[root@gitlab-server ~]# ssh-keygen
~~~

~~~powershell
[root@gitlab-server ~]# cat /root/.ssh/id_rsa.pub
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDKpkmU3U/Je1NGugbWJu4yf8ewbHTbo4DYrsSmTkUUnOmoSCs5Tygq9SW4kzk50GBpbWDT+fqEwUOkCSonzownqFH8V4TrtPZSuvyPoKBDgxS6Q5fIZBeNVVw/IqpZNYkd0ACt7bCxMFmySi4i+0ugduZcmsQ5YjgIXAxzlj7nAUtzoWLBGDx+tPNudxnvvskr7INkaH+o1p8Qb0nt6JB7Zki41UJgffN4pG0l5Z0Mbnp3EDmO599O/RtKtvGyyr0xKO4MKE8cl3mMASslbmqSdwaknqcwVJBHJEPEE5BynoAdOs1joW4eeO54bjHMlXxrIdRsPd13NLoEcVE36++/ root@gitlab-server
~~~

~~~powershell
如果可以正常访问则不添加
[root@gitlab-server ~]# cat /root/.ssh/config
Host gitlab-server
    HostName 192.168.10.164
    User root
    Port 22
    IdentityFile ~/.ssh/id_rsa
~~~

![image-20231121182428972](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231121182428972.png)

![image-20231121182511198](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231121182511198.png)

![image-20231121182615291](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231121182615291.png)

![image-20231121182641460](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231121182641460.png)

### 1.2.3 创建代码仓库

![image-20231121181511299](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231121181511299.png)

![image-20231121181548566](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231121181548566.png)

![image-20231122221135562](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231122221135562.png)

![image-20231122221704519](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231122221704519.png)

~~~powershell
# ls
argocddir
~~~

~~~powershell
# cp -r argocddir/argocd-demo .
~~~

~~~powershell
# ls
argocddir  argocd-demo
~~~

~~~powershell
cd argocd-demo
~~~

~~~powershell
git config --global user.name "nextgo"
git config --global user.email "nextgo@126.com"
~~~

~~~powershell
git init
~~~

~~~powershell
git remote add origin http://192.168.10.164/root/argocd-demo.git
~~~

~~~powershell
# git config --get remote.origin.url
http://192.168.10.164/root/argocd-demo.git
~~~

![image-20231122232444165](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231122232444165.png)

~~~powershell
# git remote set-url origin git@192.168.10.164:root/argocd-demo.git
~~~

~~~powershell
# git config --get remote.origin.url
git@192.168.10.164:root/argocd-demo.git
~~~

~~~powershell
# git add .
~~~

~~~powershell
# git commit -m "first commit"
输出：
[master（根提交） 3ffda7a] first commit
 8 files changed, 321 insertions(+)
 create mode 100644 .drone.yml
 create mode 100644 .gitignore
 create mode 100644 Dockerfile
 create mode 100644 Jenkinsfile
 create mode 100644 README.md
 create mode 100644 go.mod
 create mode 100644 go.sum
 create mode 100644 main.go
~~~

~~~powershell
# git branch --list
* master
~~~

~~~powershell
# git branch -M main
~~~

~~~powershell
# git branch --list
* main
~~~

> 推送之前需要修改分支保护

![image-20231122225614059](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231122225614059.png)

![image-20231122225658142](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231122225658142.png)

![image-20231122225731875](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231122225731875.png)

~~~powershell
如果不处理，当push时会报错如下：
remote: GitLab: You are not allowed to force push code to a protected branch on this project.To git@
~~~

~~~powershell
# git push -uf origin main
~~~

![image-20231122230602043](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231122230602043.png)

## 1.3 项目部署工具Helm仓库准备

### 1.3.1 代码仓库准备

![image-20231122233820356](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231122233820356.png)

![image-20231122233849726](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231122233849726.png)

![image-20231122233956535](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231122233956535.png)

![image-20231122234051665](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231122234051665.png)

![image-20231122234124363](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231122234124363.png)

### 1.3.2 上传helm文件

~~~powershell
# cp -r argocddir/argo-demo-helm .
~~~

~~~powershell
# ls
argocddir  argo-demo  argo-demo-helm
~~~

~~~powershell
# cd argo-demo-helm/

# ls
helm .gitkeep
~~~

~~~powershell
# touch .gitkeep
说明：
因为 Git 默认不跟踪空目录。如果你的子目录中没有任何文件（包括隐藏文件），即使你执行了 `git add` 命令，Git 也不会将这个空目录添加到暂存区。结果是，当你运行 `git commit` 时，Git 认为没有任何内容需要提交，因此提示提交为空。

解决这个问题的方法之一是在这个子目录中添加至少一个文件。通常，人们会添加一个名为 `.gitkeep` 的空文件来让 Git 跟踪这个目录。`.gitkeep` 不是 Git 的官方部分，它只是一个普通的文件，名字本身没有特殊含义，但它在开发社区中成为了一种惯例。
~~~

~~~powershell
# git init
~~~

![image-20231122234741956](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231122234741956.png)

~~~powershell
# git remote add origin git@192.168.10.164:root/argocd-demo-helm.git
~~~

~~~powershell
# git config --get remote.origin.url
git@192.168.10.164:root/argocd-demo-helm.git
~~~

~~~powershell
# git add -A
~~~

~~~powershell
# git commit -m "first commit"

输出：
[master（根提交） 4f19cbf] first commit
 11 files changed, 305 insertions(+)
 create mode 100644 .gitkeep
 create mode 100644 helm/.helmignore
 create mode 100644 helm/Chart.yaml
 create mode 100644 helm/my-values.enc.yaml
 create mode 100644 helm/my-values.yaml
 create mode 100644 helm/templates/NOTES.txt
 create mode 100644 helm/templates/_helpers.tpl
 create mode 100644 helm/templates/deployment.yaml
 create mode 100644 helm/templates/ingress.yaml
 create mode 100644 helm/templates/service.yaml
 create mode 100644 helm/values.yaml
~~~

~~~powershell
# git branch --list
* master
~~~

~~~powershell
# git branch -M main
~~~

~~~powershell
# git branch --list
* main
~~~

~~~powershell
# git push -uf origin main

Counting objects: 15, done.
Delta compression using up to 8 threads.
Compressing objects: 100% (14/14), done.
Writing objects: 100% (15/15), 5.31 KiB | 0 bytes/s, done.
Total 15 (delta 1), reused 0 (delta 0)
To git@192.168.10.164:root/argocd-demo-helm.git
 + 8585e2c...4f19cbf main -> main (forced update)
分支 main 设置为跟踪来自 origin 的远程分支 main。
~~~

![image-20231123000825213](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123000825213.png)

## 1.4 helm及kubectl工具镜像准备

![image-20231123001030953](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123001030953.png)

## 1.5 Golang及docker安装

### 1.5.1 Golang安装

~~~powershell
[root@gitlab-server ~]# wget https://go.dev/dl/go1.21.3.linux-amd64.tar.gz

[root@gitlab-server ~]# ls
go1.21.3.linux-amd64.tar.gz

[root@gitlab-server ~]# tar xf go1.21.3.linux-amd64.tar.gz
[root@gitlab-server ~]# ls
go go1.21.3.linux-amd64.tar.gz

[root@gitlab-server ~]# mv go /usr/bin/

[root@gitlab-server ~]# vim /etc/profile
[root@gitlab-server ~]# source /etc/profile
export GOROOT=/usr/bin/go
export PATH=$PATH:/usr/bin/go/bin

[root@gitlab-server ~]# go version
go version go1.21.3 linux/amd64
~~~

### 1.5.2 docker安装

~~~powershell
[root@gitlab-server argo-demo]# wget https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo -O /etc/yum.repos.d/docker-ce.repo
~~~

~~~powershell
[root@gitlab-server argo-demo]# yum -y install docker-ce
~~~

~~~powershell
[root@gitlab-server argo-demo]# systemctl enable --now docker
~~~

# 二、项目部署

## 2.1 Argo CD Project创建

如果有多个团队，每个团队都要维护大量的应用，就需要用到 Argo CD 的另一个概念：项目（Project）。Argo CD 中的项目（Project）可以用来对 Application 进行分组，不同的团队使用不同的项目，这样就实现了多租户环境。项目还支持更细粒度的访问权限控制：

- 限制部署内容（受信任的 Git 仓库）；
- 限制目标部署环境（目标集群和 namespace）；
- 限制部署的资源类型（例如 RBAC、CRD、DaemonSets、NetworkPolicy 等）；
- 定义项目角色，为 Application 提供 RBAC（例如 OIDC group 或者 JWT 令牌绑定）。

比如我们这里创建一个名为 demo 的项目，将该应用创建到该项目下，只需创建一个如下所示的 AppProject 对象即可:

~~~powershell
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  # 项目名
  name: demo
  namespace: argocd
spec:
  # 目标
  destinations:
    # 此项目的服务允许部署的 namespace，这里为全部
    - namespace: "*"
      # 此项目允许部署的集群，这里为默认集群，即为Argo CD部署的当前集群
      server: https://kubernetes.default.svc
  # 允许的数据源
  sourceRepos:
    -  http://192.168.10.164/root/argocd-demo-helm.git
~~~

该对象中有几个核心的属性：

- sourceRepos：项目中的应用程序可以从中获取清单的仓库引用。
- destinations：项目中的应用可以部署到的集群和命名空间。
- roles：项目内资源访问定义的角色。

~~~powershell
[root@k8s-master01 ~]# mkdir demotest
[root@k8s-master01 ~]# cd demotest/
[root@k8s-master01 demotest]# vim demoproj.yaml
[root@k8s-master01 demotest]# cat demoproj.yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  # 项目名
  name: demo
  namespace: argocd
spec:
# 目标
  destinations:
  # 此项目的服务允许部署的 namespace，这里为全部
  - namespace: "*"
  # 此项目允许部署的集群，这里为默认集群，即为Argo CD部署的当前集群
  server: https://kubernetes.default.svc
  # 允许的数据源
  sourceRepos:
  -  http://192.168.10.164/root/argocd-demo-helm.git
~~~

~~~powershell
[root@k8s-master01 demotest]# kubectl apply -f demoproj.yaml
appproject.argoproj.io/demo created
~~~

~~~powershell
[root@k8s-master01 demotest]# kubectl get appproj -n argocd
NAME          AGE
default       20h
demo          30s
~~~

![image-20231123095120873](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123095120873.png)

![image-20231123095200881](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123095200881.png)

![image-20231123095443313](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123095443313.png)

![image-20231123095511872](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123095511872.png)

![image-20231123095712472](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123095712472.png)

![image-20231123095750414](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123095750414.png)

![image-20231123095927075](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123095927075.png)

![image-20231123100012166](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123100012166.png)

~~~powershell
token: glpat-fgmYx5YcctM-GQ9jLAgq
~~~

![image-20231123100316366](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123100316366.png)

![image-20231123095534639](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123095534639.png)

~~~powershell
[root@k8s-master01 demotest]# vim app.yaml
[root@k8s-master01 demotest]# cat app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: devops-demo-app
  namespace: argocd
spec:
  destination:
    namespace: default
    server: "https://kubernetes.default.svc"
  project: demo
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
  source:
    path: helm # 从 Helm 存储库创建应用程序时，chart 必须指定 path
    repoURL: "http://192.168.10.164/root/argocd-demo-helm.git"
    targetRevision: HEAD
    helm:
      parameters:
        - name: replicaCount
          value: "2"
      valueFiles:
        - my-values.yaml
~~~

这里我们定义了一个名为 devops-demo 的应用，应用源来自于 helm 路径，使用的是 my-values.yaml 文件，此外还可以通过 source.helm.parameters 来配置参数。

同步策略可以选择使用自动的方式，该策略下面还有两个属性可以配置：

- PRUNE RESOURCES：开启后 Git Repo 中删除资源会自动在环境中删除对应的资源。

![img](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/07bfd8542b041adb51f21202f6b73943a3dbec.jpg)

- SELF HEAL：自动痊愈，强制以 Git Repo 状态为准，手动在环境中修改不会生效。

![img](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/779580063d24bd80093294d92c420a7c571aae.jpg)

正常创建后这个应用会出现 Degraded 的错误，这是因为我们 Values 中的镜像默认为 latest，而我们没有将镜像推送到镜像仓库，所以会出现错误。

~~~powershell
[root@k8s-master01 demotest]# kubectl apply -f app.yaml
application.argoproj.io/devops-demo-app created
[root@k8s-master01 demotest]# kubectl get app -n argocd
NAME              SYNC STATUS   HEALTH STATUS
devops-demo-app   Synced        Progressing
~~~

![image-20231123100830336](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123100830336.png)

![image-20231123100902473](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123100902473.png)

![image-20231123103617190](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123103617190.png)

## 2.2 Gitlab Runner安装及配置

### 2.2.1 安装gitlab runner

![image-20231123183708810](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123183708810.png)

![image-20231123183741125](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123183741125.png)

![image-20231123183826136](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123183826136.png)

![image-20231123183934716](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123183934716.png)

![image-20231123184031187](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123184031187.png)

~~~powershell
[root@gitlab-server argo-demo]# curl -L --output /usr/local/bin/gitlab-runner https://gitlab-runner-downloads.s3.amazonaws.com/latest/binaries/gitlab-runner-linux-amd64
~~~

~~~powershell
[root@gitlab-server argo-demo]#  chmod +x /usr/local/bin/gitlab-runner
~~~

~~~powershell
[root@gitlab-server argo-demo]# useradd --comment 'GitLab Runner' --create-home gitlab-runner --shell /bin/bash
~~~

~~~powershell
[root@gitlab-server argo-demo]# gitlab-runner install --user=gitlab-runner --working-directory=/home/gitlab-runner
~~~

~~~powershell
[root@gitlab-server argo-demo]# gitlab-runner start
~~~

~~~powershell
[root@gitlab-server argo-demo]# gitlab-runner register --url http://192.168.10.164/ --registration-token GR13489414e_7geGcMqYZvz3H-KPB
Runtime platform                                    arch=amd64 os=linux pid=18034 revision=3046fee8 version=16.6.0
Running in system-mode.

Enter the GitLab instance URL (for example, https://gitlab.com/):
[http://192.168.10.164/]:
Enter the registration token:
[GR13489414e_7geGcMqYZvz3H-KPB]:
Enter a description for the runner:
[gitlab-server]:
Enter tags for the runner (comma-separated):

Enter optional maintenance note for the runner:

WARNING: Support for registration tokens and runner parameters in the 'register' command has been deprecated in GitLab Runner 15.6 and will be replaced with support for authentication tokens. For more information, see https://docs.gitlab.com/ee/ci/runners/new_creation_workflow
Registering runner... succeeded                     runner=GR13489414e_7geGc
Enter an executor: instance, kubernetes, ssh, virtualbox, docker+machine, parallels, shell, docker-autoscaler, custom, docker, docker-windows:
shell
Runner registered successfully. Feel free to start it, but if it's running already the config should be automatically reloaded!

Configuration (with the authentication token) was saved in "/etc/gitlab-runner/config.toml"
~~~

~~~powershell
[root@gitlab-server argo-demo]# vim /etc/gitlab-runner/config.toml
[root@gitlab-server argo-demo]# cat /etc/gitlab-runner/config.toml
concurrent = 1
check_interval = 0
shutdown_timeout = 0

[session_server]
  session_timeout = 1800

[[runners]]
  name = "devops-demo"
  url = "http://192.168.10.164/"
  id = 5
  token = "sRE-bWkHUGsha6uCXgAt"
  token_obtained_at = 2023-11-23T06:50:52Z
  token_expires_at = 0001-01-01T00:00:00Z
  executor = "shell"
  [runners.custom_build_dir] 添加以下2行内容
    enabled = true
~~~

~~~powershell
配置gitlab-runner用户能使用docker
[root@gitlab-server argo-demo]# usermod -G docker gitlab-runner
[root@gitlab-server argo-demo]# grep docker /etc/group
docker:x:989:gitlab-runner
~~~

### 2.2.2 查看Runner配置

![image-20231123184811188](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123184811188.png)

![image-20231123184855215](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123184855215.png)

![image-20231123184922940](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123184922940.png)

## 2.3 利用Gitlab runner实现CI功能

![image-20231123190149450](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123190149450.png)

~~~powershell
CI_REGISTRY_USER                            admin
CI_REGISTRY_PASSWORD                        12345
CI_REGISTRY                                 www.kubemsb.com

CI_REGISTRY_IMAGE                           www.kubemsb.com/library/devops-demo
CI_COMMIT_REF_SLUG                          latest
~~~

或

![image-20231123150815254](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123150815254.png)

~~~powershell
[root@gitlab-server argo-demo]# cat main.go
package main

import (
  "net/http"

  "github.com/gin-gonic/gin"
  "github.com/sirupsen/logrus"
)

func main() {
  r := gin.Default()

  r.GET("/", func(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H {
      "msg": "Hello, GitLab With ArgoCD",
    })
  })

  r.GET("/health", func(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H {
      "health": true,
    })
  })

  if err := r.Run(":8080"); err != nil {
    logrus.WithError(err).Fatal("Couldn't listen")
  }

}
[root@gitlab-server argo-demo]# vim main.go
[root@gitlab-server argo-demo]# cat main.go
package main

import (
  "net/http"

  "github.com/gin-gonic/gin"
  "github.com/sirupsen/logrus"
)

func main() {
  r := gin.Default()

  r.GET("/", func(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H {
      "msg": "Hello, GitLab With ArgoCD NextGO", 在此处添加了NextGo
    })
  })

  r.GET("/health", func(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H {
      "health": true,
    })
  })

  if err := r.Run(":8080"); err != nil {
    logrus.WithError(err).Fatal("Couldn't listen")
  }

}
~~~

~~~powershell
[root@gitlab-server argo-demo]# git add -A
[root@gitlab-server argo-demo]# git commit -m "modtify main.go"
[main e67794c] modtify main.go
 1 file changed, 1 insertion(+), 1 deletion(-)
[root@gitlab-server argo-demo]# git push -uf origin main
Counting objects: 5, done.
Delta compression using up to 8 threads.
Compressing objects: 100% (3/3), done.
Writing objects: 100% (3/3), 284 bytes | 0 bytes/s, done.
Total 3 (delta 2), reused 0 (delta 0)
To git@192.168.10.164:root/argocd-demo.git
   1c62e59..e67794c  main -> main
分支 main 设置为跟踪来自 origin 的远程分支 main。
~~~

> 当代码提交后，会自动触发gitlab-runner

![image-20231123190753356](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123190753356.png)

![image-20231123190815509](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123190815509.png)

![image-20231123190842824](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123190842824.png)

![image-20231123190913766](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123190913766.png)

![image-20231123190942787](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123190942787.png)

![image-20231123191027448](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123191027448.png)

![image-20231123191329293](/云原生/devops/devops-04-使用argo-cd实现流水线发布项目/image-20231123191329293.png)

