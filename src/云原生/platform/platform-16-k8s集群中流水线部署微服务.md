---
title: k8s集群中流水线部署微服务
sidebarGroup: 平台与实战
shortTitle: 16 k8s集群中流水线部署微服务
order: 16
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - 微服务实战
  - 云原生
  - 课程笔记
description: k8s集群中流水线发布微服务 一、流水线部署微服务部署流程 二、微服务发布流程 要注意jenkinsfile大小写，与代码仓库中的jenkinsfile文件名命名一致即可。 ~~~powershell...
---

> **微服务实战 · 第 11 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# k8s集群中流水线发布微服务

# 一、流水线部署微服务部署流程

![image-20221208131942230](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221208131942230.png)

# 二、微服务发布流程

![image-20221201112715816](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221201112715816.png)

![image-20221201120229371](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221201120229371.png)

![image-20221201121850832](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221201121850832.png)

![image-20221201122029879](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221201122029879.png)

![image-20221201122054453](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221201122054453.png)

![image-20221201123716810](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221201123716810.png)

**要注意jenkinsfile大小写，与代码仓库中的jenkinsfile文件名命名一致即可。**

![image-20221201123830610](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221201123830610.png)

![image-20221201124121688](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221201124121688.png)

![image-20221201125343557](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221201125343557.png)

~~~powershell
pipeline {
  agent {
    node {
      label 'maven'
    }

  }
   parameters {
    string(name: 'PROJECT_VERSION', defaultValue: 'v1.0', description: '')
    string(name: 'PROJECT_NAME', defaultValue: '', description: '')
  }

   environment {
    DOCKER_CREDENTIAL_ID = 'dockerhub-id'
    GITEE_CREDENTIAL_ID = 'gitee-id'
    KUBECONFIG_CREDENTIAL_ID = 'sangomall-kubeconfig'
    REGISTRY = 'docker.io'
    DOCKERHUB_NAMESPACE = 'nextgomsb'
    GITEE_ACCOUNT = 'nextgomsb'
    SONAR_CREDENTIAL_ID = 'sonar-qube'
  }

  stages {
    stage('拉取项目代码') {
      agent none
      steps {
        git(url: 'https://gitee.com/nextgomsb/sangomall.git', credentialsId: 'gitee-id', changelog: true, poll: false)
      }
    }

    stage('代码质量检查及分析') {
      agent none
      steps {
        container('maven') {
          withCredentials([string(credentialsId : 'sonar-qube' ,variable : 'SONAR_TOKEN' ,)]) {
            withSonarQubeEnv('sonar') {
              sh 'echo 当前目录 `pwd`'
              sh 'mvn clean install -Dmaven.test.skip=true -gs `pwd`/mvn_settings.xml'
              sh 'mvn sonar:sonar -gs `pwd`/mvn_settings.xml -Dsonar.login=$SONAR_TOKEN'
            }

          }

          timeout(unit: 'HOURS', activity: true, time: 1) {
            waitForQualityGate 'true'
          }

        }

      }
    }

    stage('单元测试') {
      agent none
      steps {
        container('maven') {
          sh 'mvn clean package -Dmaven.test.skip=true -gs `pwd`/mvn_settings.xml'
        }

      }
    }

    stage('构建项目容器镜像及推送') {
      agent none
      steps {
        container('maven') {
          sh 'mvn clean package -Dmaven.test.skip=true -gs `pwd`/mvn_settings.xml'
          sh 'cd $PROJECT_NAME && docker build -f Dockerfile -t $REGISTRY/$DOCKERHUB_NAMESPACE/$PROJECT_NAME:SNAPSHOT-$BUILD_NUMBER .'
          withCredentials([usernamePassword(credentialsId : 'dockerhub-id' ,passwordVariable : 'DOCKER_PASSWORD' ,usernameVariable : 'DOCKER_USERNAME' ,)]) {
            sh 'echo "$DOCKER_PASSWORD" | docker login $REGISTRY -u "$DOCKER_USERNAME" --password-stdin'
            sh 'docker push $REGISTRY/$DOCKERHUB_NAMESPACE/$PROJECT_NAME:SNAPSHOT-$BUILD_NUMBER'
            sh 'docker tag  $REGISTRY/$DOCKERHUB_NAMESPACE/$PROJECT_NAME:SNAPSHOT-$BUILD_NUMBER $REGISTRY/$DOCKERHUB_NAMESPACE/$PROJECT_NAME:latest'
            sh 'docker push  $REGISTRY/$DOCKERHUB_NAMESPACE/$PROJECT_NAME:latest'
          }

        }

      }
    }

    stage('创建项目代码及容器镜像的发布版') {
      agent none
      when {
        expression {
          return params.PROJECT_VERSION =~ /v.*/
        }

      }
      steps {
        container('maven') {
          input(message: '''@project-admin
是否允许推送本次项目代码及容器镜像的发布版？''', submitter: 'project-admin')
          withCredentials([usernamePassword(credentialsId : 'gitee-id' ,passwordVariable : 'GITEE_PASSWORD' ,usernameVariable : 'GITEE_USERNAME' ,)]) {
            sh 'git config --global user.email "nextgo@126.com" '
            sh 'git config --global user.name "nextgo" '
            sh 'git tag -a $PROJECT_VERSION -m "$PROJECT_VERSION" '
            sh 'git push http://$GITEE_USERNAME:$GITEE_PASSWORD@gitee.com/$GITEE_ACCOUNT/sangomall.git --tags --ipv4'
          }

          sh 'docker tag  $REGISTRY/$DOCKERHUB_NAMESPACE/$PROJECT_NAME:SNAPSHOT-$BUILD_NUMBER $REGISTRY/$DOCKERHUB_NAMESPACE/$PROJECT_NAME:$PROJECT_VERSION '
          sh 'docker push  $REGISTRY/$DOCKERHUB_NAMESPACE/$PROJECT_NAME:$PROJECT_VERSION'
        }

      }
    }

    stage('部署微服务项目到K8S集群') {
      agent none
      steps {
        input(message: '''@project-admin
是否允许发布微服务项目到K8S集群？''', submitter: 'project-admin')
        container('maven') {
          withCredentials([kubeconfigContent(credentialsId : 'sangomall-kubeconfig' ,variable : 'KUBECONFIG_CONTENT' ,)]) {
            sh '''mkdir ~/.kube
echo "$KUBECONFIG_CONTENT" > ~/.kube/config
envsubst < $PROJECT_NAME/deploy/deploy.yaml | kubectl apply -f -'''
          }

        }

      }
    }

  }

}
~~~

![image-20221201124154882](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221201124154882.png)

![image-20221201131540104](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221201131540104.png)

![image-20221201125504861](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221201125504861.png)

![image-20221201132130636](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221201132130636.png)

![image-20221201132149051](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221201132149051.png)

![image-20221201133122594](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221201133122594.png)

**切换到project-admin用户确认即可**

![image-20221201133251072](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221201133251072.png)

![image-20221201133307191](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221201133307191.png)

![image-20221201133335313](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221201133335313.png)

# 三、各微服务发布过程

## 3.1 mall-gateway

![image-20221202125114134](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221202125114134.png)

## 3.2 mall-auth-server

![image-20221202125155883](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221202125155883.png)

## 3.3 mall-cart

![image-20221202125236726](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221202125236726.png)

## 3.4 mall-coupon

![image-20221202125428874](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221202125428874.png)

## 3.5 mall-member

![image-20221202125518576](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221202125518576.png)

## 3.6 mall-order

![image-20221202125558785](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221202125558785.png)

## 3.7 mall-product

![image-20221202125647897](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221202125647897.png)

## 3.8 mall-search

![image-20221202125736317](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221202125736317.png)

## 3.9 mall-seckill

![image-20221202125816822](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221202125816822.png)

## 3.10 mall-third-party

![image-20221202125953606](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221202125953606.png)

## 3.11 mall-ware

![image-20221202130049139](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221202130049139.png)

## 3.12 renren-fast-master

![image-20221202130203817](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221202130203817.png)

## 3.13 renren-generator-master

![image-20221202130410448](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221202130410448.png)

# 四、微服务部署验证

![image-20221203005947692](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221203005947692.png)

# 五、mall-gateway服务暴露

![image-20221217210232945](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221217210232945.png)

![image-20221217210336545](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221217210336545.png)

![image-20221217210511081](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221217210511081.png)

![image-20221217211229934](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221217211229934.png)

![image-20221217211327089](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221217211327089.png)

~~~powershell
lb.kubesphere.io/v1alpha1: openelb
protocol.openelb.kubesphere.io/v1alpha1: layer2
eip.openelb.kubesphere.io/v1alpha2: layer2-eip
~~~

![image-20221217211754169](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221217211754169.png)

![image-20221217211846260](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221217211846260.png)

~~~powershell
[root@dnsserver ~]# cat /var/named/msb.com.zone
$TTL 1D
@       IN SOA  msb.com admin.msb.com. (
                                        0       ; serial
                                        1D      ; refresh
                                        1H      ; retry
                                        1W      ; expire
                                        3H )    ; minimum
@       NS      ns.msb.com.
ns      A       192.168.10.145
harbor  A       192.168.10.146
reg-test        A       192.168.10.70
kibana          A       192.168.10.70
rabbitmq        A       192.168.10.70
nacos-server    A       192.168.10.70
zipkin-server   A       192.168.10.70
sentinel-server A       192.168.10.70
skywalking-ui   A       192.168.10.70
rocketmq-dashboard      A       192.168.10.70
mall-gateway    A       192.168.10.73
~~~

~~~powershell
[root@dnsserver ~]# systemctl restart named
~~~

![image-20221217212455501](/云原生/platform/platform-16-k8s集群中流水线部署微服务/image-20221217212455501.png)

