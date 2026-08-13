---
title: 严选商城项目部署前流水线编写
sidebarGroup: 平台与实战
shortTitle: 27 严选商城项目部署前流水线编写
order: 27
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - 微服务实战
  - 云原生
  - 课程笔记
description: 严选商城项目部署前流水线编写 一、中台服务 1.1 horse-gateway 网关 演示如何借助kubesphere生成流水线过程。 1.1.1 代码拉取 1.1.2 项目打包 ~~~powersh...
---

> **微服务实战 · 第 24 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 严选商城项目部署前流水线编写

# 一、中台服务

## 1.1 horse-gateway 网关

> 演示如何借助kubesphere生成流水线过程。

### 1.1.1 代码拉取

![image-20230524072539262](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524072539262.png)

![image-20230524072702797](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524072702797.png)

![image-20230524072732866](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524072732866.png)

![image-20230524072812245](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524072812245.png)

![image-20230524072902527](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524072902527.png)

![image-20230524072932017](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524072932017.png)

![image-20230524073051391](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524073051391.png)

![image-20230524073133609](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524073133609.png)

![image-20230524073208698](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524073208698.png)

![image-20230524073316662](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524073316662.png)

![image-20230524073343543](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524073343543.png)

![image-20230524073443085](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524073443085.png)

![image-20230524073542392](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524073542392.png)

![image-20230524073610490](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524073610490.png)

### 1.1.2 项目打包

![image-20230524073753273](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524073753273.png)

![image-20230524073821051](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524073821051.png)

![image-20230524073848226](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524073848226.png)

![image-20230524073919099](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524073919099.png)

![image-20230524074008990](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524074008990.png)

~~~powershell
mvn clean package -pl com.msb.cloud:$IMAGES -am -Dmaven.test.skip=true
~~~

![image-20230524074108032](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524074108032.png)

![image-20230524074243985](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524074243985.png)

### 1.1.3 构建镜像

![image-20230524074355055](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524074355055.png)

![image-20230524074421872](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524074421872.png)

![image-20230524074446200](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524074446200.png)

![image-20230524074512732](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524074512732.png)

~~~powershell
docker build --build-arg SKNAME="${IMAGES}" --build-arg SKIP="${skywalking_IP}" --build-arg BRANCH="${start_branch}" --build-arg JAR_FILE="${JAR_FILE}" --build-arg NACOS_URL="${NACOS_URL}" --build-arg NACOS="${NACOS}" --build-arg NACOS_PS="${NACOS_PS}" --build-arg JAR_PORD="${JAR_PORD}" -t $IMAGES:$BUILD_NUMBER .
~~~

![image-20230524074612106](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524074612106.png)

![image-20230524074701538](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524074701538.png)

![image-20230524074743475](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524074743475.png)

### 1.1.4 推送镜像

![image-20230524074922781](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524074922781.png)

![image-20230524074955977](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524074955977.png)

![image-20230524075023971](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524075023971.png)

![image-20230524075118836](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524075118836.png)

![image-20230524075144088](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524075144088.png)

![image-20230524075241792](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524075241792.png)

~~~powershell
echo "$ALIYUNACR_PASSWORD" | docker login $REGISTRY -u "$ALIYUNACR_USERNAME" --password-stdin
~~~

~~~powershell
docker tag  $IMAGES:$BUILD_NUMBER $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER
~~~

~~~powershell
docker push  $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER
~~~

![image-20230524075438619](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524075438619.png)

![image-20230524075518135](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524075518135.png)

![image-20230524075755813](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524075755813.png)

![image-20230524075648533](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524075648533.png)

![image-20230524075846553](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524075846553.png)

![image-20230524075924419](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524075924419.png)

![image-20230524080022242](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524080022242.png)

![image-20230524080042618](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524080042618.png)

### 1.1.5 发布到生产环境

![image-20230524080241788](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524080241788.png)

![image-20230524080307643](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524080307643.png)

![image-20230524080344176](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524080344176.png)

![image-20230524080411021](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524080411021.png)

![image-20230524080513599](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524080513599.png)

~~~powershell
使用环境变量中的KUBECONFIG_CREDENTIAL_ID亦可
env.KUBECONFIG_CREDENTIAL_ID
~~~

![image-20230524102957364](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524102957364.png)

或下面的方法

![image-20230524080857735](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524080857735.png)

~~~powershell
envsubst < deploy.yaml | kubectl apply -f -
~~~

![image-20230524081144357](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524081144357.png)

![image-20230524081218731](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524081218731.png)

![image-20230524081259522](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524081259522.png)

~~~powershell
docker rmi -f $IMAGES:$BUILD_NUMBER
~~~

![image-20230524081334177](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524081334177.png)

![image-20230524081402266](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524081402266.png)

![image-20230524081444269](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524081444269.png)

![image-20230524081616469](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524081616469.png)

### 1.1.6 检查发布应用的状态

![image-20230524081803850](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524081803850.png)

![image-20230524081932836](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524081932836.png)

![image-20230524082009026](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524082009026.png)

![image-20230524082037795](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524082037795.png)

![image-20230524081838871](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524081838871.png)

![image-20230524082132282](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524082132282.png)

![image-20230524082201592](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524082201592.png)

~~~powershell
kubectl rollout status deployment $IMAGES -n yanxuan-project
~~~

![image-20230524082339149](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524082339149.png)

![image-20230524082424852](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524082424852.png)

![image-20230524082450149](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524082450149.png)

![image-20230524082530642](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524082530642.png)

添加项目对应的环境变量即可生成完整的流水线。 

![image-20230524082843311](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230524082843311.png)

### 1.1.7 完整流水线

~~~powershell
pipeline {
  agent {
    node {
      label 'maven'
    }

  }
  stages {
    stage('代码拉取') {
      agent none
      steps {
        container('maven') {
          git(url: 'https://gitee.com/nextgomsb/yanxuan.git', credentialsId: 'gitee-id', branch: 'master', changelog: true, poll: false)
        }

      }
    }

    stage('项目打包') {
      agent none
      steps {
        container('maven') {
          sh 'mvn clean package -pl com.msb.cloud:$IMAGES -am -Dmaven.test.skip=true'
        }

      }
    }

    stage('构建 images') {
      steps {
        container('maven') {
          sh 'docker build --build-arg SKNAME="${IMAGES}" --build-arg SKIP="${skywalking_IP}" --build-arg BRANCH="${start_branch}" --build-arg JAR_FILE="${JAR_FILE}" --build-arg NACOS_URL="${NACOS_URL}" --build-arg NACOS="${NACOS}" --build-arg NACOS_PS="${NACOS_PS}" --build-arg JAR_PORD="${JAR_PORD}" -t $IMAGES:$BUILD_NUMBER .'
        }

      }
    }

    stage('推送 images') {
      agent none
      steps {
        container('maven') {
          withCredentials([usernamePassword(credentialsId : 'aliyunacr-id' ,passwordVariable : 'ALIYUNACR_PASSWORD' ,usernameVariable : 'ALIYUNACR_USERNAME' ,)]) {
            sh 'echo "$ALIYUNACR_PASSWORD" | docker login $REGISTRY -u "$ALIYUNACR_USERNAME" --password-stdin'
            sh 'docker tag  $IMAGES:$BUILD_NUMBER $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
            sh 'docker push  $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

    stage('发布到生产') {
      agent none
      steps {
        container('maven') {
          withCredentials([
               kubeconfigFile(
                       credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                         variable: 'KUBECONFIG')
                 ]) {
                sh 'envsubst < deploy.yaml | kubectl apply -f -'
                sh 'docker rmi -f $IMAGES:$BUILD_NUMBER'
              }

            }

          }
        }

        stage('检查状态') {
          steps {
            container('maven') {
              withCredentials([
                    kubeconfigFile(
                         credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                          variable: 'KUBECONFIG')
                        ]) {
                    sh 'kubectl rollout status deployment $IMAGES -n yanxuan-project'
                  }

                }

              }
            }

          }
          environment {
            JAR_FILE = "${DIR}/${JAVA}"
            REGISTRY = 'registry.cn-zhangjiakou.aliyuncs.com'
            ACR_CREDENTIAL_ID = 'aliyunacr-id'
            ALIYUNACR_NAMESPACE = 'msb-yanxuan'
            KUBECONFIG_CREDENTIAL_ID = 'yanxuan-kubeconfig'
            skywalking_IP = 'skywalking-oap-server.yanxuan-project.svc.cluster.local.:11800'
            start_branch = 'prod'
            JAVA = 'target/*.jar'
            ES = 'elasticsearch.yanxuan-project.svc.cluster.local.'
            NACOS_URL = 'nacos-server.yanxuan-project.svc.cluster.local.'
            NACOS = 'nacos'
            NACOS_PS = 'nacos'
            INSPECT = '/actuator/health'
            JAR_PORD = '8090'
            IMAGES = 'horse-gateway'
            DIR = 'horse-support/horse-gateway'
          }
        }
~~~

## 1.2 horse-id 分布式ID

~~~powershell
pipeline {
  agent {
    node {
      label 'maven'
    }

  }
  stages {
    stage('代码拉取') {
      agent none
      steps {
        container('maven') {
          git(url: 'https://gitee.com/nextgomsb/yanxuan.git', credentialsId: 'gitee-id', branch: 'master', changelog: true, poll: false)
        }

      }
    }

    stage('项目打包') {
      agent none
      steps {
        container('maven') {
          sh 'mvn clean package -pl com.msb.cloud:$IMAGES -am -Dmaven.test.skip=true'
        }

      }
    }

    stage('构建 images') {
      steps {
        container('maven') {
          sh 'docker build --build-arg SKNAME="${IMAGES}" --build-arg SKIP="${skywalking_IP}" --build-arg BRANCH="${start_branch}" --build-arg JAR_FILE="${JAR_FILE}" --build-arg NACOS_URL="${NACOS_URL}" --build-arg NACOS="${NACOS}" --build-arg NACOS_PS="${NACOS_PS}" --build-arg JAR_PORD="${JAR_PORD}" -t $IMAGES:$BUILD_NUMBER .'
        }

      }
    }

    stage('推送 images') {
      agent none
      steps {
        container('maven') {
          withCredentials([usernamePassword(credentialsId : 'aliyunacr-id' ,passwordVariable : 'ALIYUNACR_PASSWORD' ,usernameVariable : 'ALIYUNACR_USERNAME' ,)]) {
            sh 'echo "$ALIYUNACR_PASSWORD" | docker login $REGISTRY -u "$ALIYUNACR_USERNAME" --password-stdin'
            sh 'docker tag  $IMAGES:$BUILD_NUMBER $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
            sh 'docker push  $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

    stage('发布到生产') {
      agent none
      steps {
        container('maven') {
          withCredentials([
               kubeconfigFile(
                       credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                         variable: 'KUBECONFIG')
                 ]) {
                sh 'envsubst < deploy.yaml | kubectl apply -f -'
                sh 'docker rmi -f $IMAGES:$BUILD_NUMBER'
              }

            }

          }
        }

        stage('检查状态') {
          steps {
            container('maven') {
              withCredentials([
                    kubeconfigFile(
                         credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                          variable: 'KUBECONFIG')
                        ]) {
                    sh 'kubectl rollout status deployment $IMAGES -n yanxuan-project'
                  }

                }

              }
            }

          }
          environment {
            JAR_FILE = "${DIR}/${JAVA}"
            REGISTRY = 'registry.cn-zhangjiakou.aliyuncs.com'
            ACR_CREDENTIAL_ID = 'aliyunacr-id'
            ALIYUNACR_NAMESPACE = 'msb-yanxuan'
            KUBECONFIG_CREDENTIAL_ID = 'yanxuan-kubeconfig'
            skywalking_IP = 'skywalking-oap-server.yanxuan-project.svc.cluster.local.:11800'
            start_branch = 'prod'
            JAVA = 'target/*.jar'
            ES = 'elasticsearch.yanxuan-project.svc.cluster.local.'
            NACOS_URL = 'nacos-server.yanxuan-project.svc.cluster.local.'
            NACOS = 'nacos'
            NACOS_PS = 'nacos'
            INSPECT = '/id/actuator/health'
            JAR_PORD = '5001'
            IMAGES = 'horse-id-service'
            DIR = 'horse-support/horse-id/horse-id-service'
          }
        }
~~~

## 1.3 horse-im 即时通讯中台

~~~powershell
pipeline {
  agent {
    node {
      label 'maven'
    }

  }
  stages {
    stage('代码拉取') {
      agent none
      steps {
        container('maven') {
          git(url: 'https://gitee.com/nextgomsb/yanxuan.git', credentialsId: 'gitee-id', branch: 'master', changelog: true, poll: false)
        }

      }
    }

    stage('项目打包') {
      agent none
      steps {
        container('maven') {
          sh 'mvn clean package -pl com.msb.cloud:$IMAGES -am -Dmaven.test.skip=true'
        }

      }
    }

    stage('构建 images') {
      steps {
        container('maven') {
          sh 'docker build --build-arg SKNAME="${IMAGES}" --build-arg SKIP="${skywalking_IP}" --build-arg BRANCH="${start_branch}" --build-arg JAR_FILE="${JAR_FILE}" --build-arg NACOS_URL="${NACOS_URL}" --build-arg NACOS="${NACOS}" --build-arg NACOS_PS="${NACOS_PS}" --build-arg JAR_PORD="${JAR_PORD}" -t $IMAGES:$BUILD_NUMBER .'
        }

      }
    }

    stage('推送 images') {
      agent none
      steps {
        container('maven') {
          withCredentials([usernamePassword(credentialsId : 'aliyunacr-id' ,passwordVariable : 'ALIYUNACR_PASSWORD' ,usernameVariable : 'ALIYUNACR_USERNAME' ,)]) {
            sh 'echo "$ALIYUNACR_PASSWORD" | docker login $REGISTRY -u "$ALIYUNACR_USERNAME" --password-stdin'
            sh 'docker tag  $IMAGES:$BUILD_NUMBER $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
            sh 'docker push  $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

    stage('发布到生产') {
      agent none
      steps {
        container('maven') {
          withCredentials([
               kubeconfigFile(
                       credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                         variable: 'KUBECONFIG')
                 ]) {
                sh 'envsubst < deploy.yaml | kubectl apply -f -'
                sh 'docker rmi -f $IMAGES:$BUILD_NUMBER'
              }

            }

          }
        }

        stage('检查状态') {
          steps {
            container('maven') {
              withCredentials([
                    kubeconfigFile(
                         credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                          variable: 'KUBECONFIG')
                        ]) {
                    sh 'kubectl rollout status deployment $IMAGES -n yanxuan-project'
                  }

                }

              }
            }

          }
          environment {
            JAR_FILE = "${DIR}/${JAVA}"
            REGISTRY = 'registry.cn-zhangjiakou.aliyuncs.com'
            ACR_CREDENTIAL_ID = 'aliyunacr-id'
            ALIYUNACR_NAMESPACE = 'msb-yanxuan'
            KUBECONFIG_CREDENTIAL_ID = 'yanxuan-kubeconfig'
            skywalking_IP = 'skywalking-oap-server.yanxuan-project.svc.cluster.local.:11800'
            start_branch = 'prod'
            JAVA = 'target/*.jar'
            ES = 'elasticsearch.yanxuan-project.svc.cluster.local.'
            NACOS_URL = 'nacos-server.yanxuan-project.svc.cluster.local.'
            NACOS = 'nacos'
            NACOS_PS = 'nacos'
            INSPECT = '/im/actuator/health'
            JAR_PORD = '5002'
            IMAGES = 'horse-im-service'
            DIR = 'horse-support/horse-im/horse-im-service'
          }
        }
~~~

## 1.4 horse-like 点赞中台

~~~powershell
pipeline {
  agent {
    node {
      label 'maven'
    }

  }
  stages {
    stage('代码拉取') {
      agent none
      steps {
        container('maven') {
          git(url: 'https://gitee.com/nextgomsb/yanxuan.git', credentialsId: 'gitee-id', branch: 'master', changelog: true, poll: false)
        }

      }
    }

    stage('项目打包') {
      agent none
      steps {
        container('maven') {
          sh 'mvn clean package -pl com.msb.cloud:$IMAGES -am -Dmaven.test.skip=true'
        }

      }
    }

    stage('构建 images') {
      steps {
        container('maven') {
          sh 'docker build --build-arg SKNAME="${IMAGES}" --build-arg SKIP="${skywalking_IP}" --build-arg BRANCH="${start_branch}" --build-arg JAR_FILE="${JAR_FILE}" --build-arg NACOS_URL="${NACOS_URL}" --build-arg NACOS="${NACOS}" --build-arg NACOS_PS="${NACOS_PS}" --build-arg JAR_PORD="${JAR_PORD}" -t $IMAGES:$BUILD_NUMBER .'
        }

      }
    }

    stage('推送 images') {
      agent none
      steps {
        container('maven') {
          withCredentials([usernamePassword(credentialsId : 'aliyunacr-id' ,passwordVariable : 'ALIYUNACR_PASSWORD' ,usernameVariable : 'ALIYUNACR_USERNAME' ,)]) {
            sh 'echo "$ALIYUNACR_PASSWORD" | docker login $REGISTRY -u "$ALIYUNACR_USERNAME" --password-stdin'
            sh 'docker tag  $IMAGES:$BUILD_NUMBER $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
            sh 'docker push  $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

    stage('发布到生产') {
      agent none
      steps {
        container('maven') {
          withCredentials([
               kubeconfigFile(
                       credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                         variable: 'KUBECONFIG')
                 ]) {
                sh 'envsubst < deploy.yaml | kubectl apply -f -'
                sh 'docker rmi -f $IMAGES:$BUILD_NUMBER'
              }

            }

          }
        }

        stage('检查状态') {
          steps {
            container('maven') {
              withCredentials([
                    kubeconfigFile(
                         credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                          variable: 'KUBECONFIG')
                        ]) {
                    sh 'kubectl rollout status deployment $IMAGES -n yanxuan-project'
                  }

                }

              }
            }

          }
          environment {
            JAR_FILE = "${DIR}/${JAVA}"
            REGISTRY = 'registry.cn-zhangjiakou.aliyuncs.com'
            ACR_CREDENTIAL_ID = 'aliyunacr-id'
            ALIYUNACR_NAMESPACE = 'msb-yanxuan'
            KUBECONFIG_CREDENTIAL_ID = 'yanxuan-kubeconfig'
            skywalking_IP = 'skywalking-oap-server.yanxuan-project.svc.cluster.local.:11800'
            start_branch = 'prod'
            JAVA = 'target/*.jar'
            ES = 'elasticsearch.yanxuan-project.svc.cluster.local.'
            NACOS_URL = 'nacos-server.yanxuan-project.svc.cluster.local.'
            NACOS = 'nacos'
            NACOS_PS = 'nacos'
            INSPECT = '/like/actuator/health'
            JAR_PORD = '5003'
            IMAGES = 'horse-like-service'
            DIR = 'horse-support/horse-like/horse-like-service'
          }
        }
~~~

## 1.5 horse-oss 文件中台

~~~powershell
pipeline {
  agent {
    node {
      label 'maven'
    }

  }
  stages {
    stage('代码拉取') {
      agent none
      steps {
        container('maven') {
          git(url: 'https://gitee.com/nextgomsb/yanxuan.git', credentialsId: 'gitee-id', branch: 'master', changelog: true, poll: false)
        }

      }
    }

    stage('项目打包') {
      agent none
      steps {
        container('maven') {
          sh 'mvn clean package -pl com.msb.cloud:$IMAGES -am -Dmaven.test.skip=true'
        }

      }
    }

    stage('构建 images') {
      steps {
        container('maven') {
          sh 'docker build --build-arg SKNAME="${IMAGES}" --build-arg SKIP="${skywalking_IP}" --build-arg BRANCH="${start_branch}" --build-arg JAR_FILE="${JAR_FILE}" --build-arg NACOS_URL="${NACOS_URL}" --build-arg NACOS="${NACOS}" --build-arg NACOS_PS="${NACOS_PS}" --build-arg JAR_PORD="${JAR_PORD}" -t $IMAGES:$BUILD_NUMBER .'
        }

      }
    }

    stage('推送 images') {
      agent none
      steps {
        container('maven') {
          withCredentials([usernamePassword(credentialsId : 'aliyunacr-id' ,passwordVariable : 'ALIYUNACR_PASSWORD' ,usernameVariable : 'ALIYUNACR_USERNAME' ,)]) {
            sh 'echo "$ALIYUNACR_PASSWORD" | docker login $REGISTRY -u "$ALIYUNACR_USERNAME" --password-stdin'
            sh 'docker tag  $IMAGES:$BUILD_NUMBER $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
            sh 'docker push  $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

    stage('发布到生产') {
      agent none
      steps {
        container('maven') {
          withCredentials([
               kubeconfigFile(
                       credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                         variable: 'KUBECONFIG')
                 ]) {
                sh 'envsubst < deploy.yaml | kubectl apply -f -'
                sh 'docker rmi -f $IMAGES:$BUILD_NUMBER'
              }

            }

          }
        }

        stage('检查状态') {
          steps {
            container('maven') {
              withCredentials([
                    kubeconfigFile(
                         credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                          variable: 'KUBECONFIG')
                        ]) {
                    sh 'kubectl rollout status deployment $IMAGES -n yanxuan-project'
                  }

                }

              }
            }

          }
          environment {
            JAR_FILE = "${DIR}/${JAVA}"
            REGISTRY = 'registry.cn-zhangjiakou.aliyuncs.com'
            ACR_CREDENTIAL_ID = 'aliyunacr-id'
            ALIYUNACR_NAMESPACE = 'msb-yanxuan'
            KUBECONFIG_CREDENTIAL_ID = 'yanxuan-kubeconfig'
            skywalking_IP = 'skywalking-oap-server.yanxuan-project.svc.cluster.local.:11800'
            start_branch = 'prod'
            JAVA = 'target/*.jar'
            ES = 'elasticsearch.yanxuan-project.svc.cluster.local.'
            NACOS_URL = 'nacos-server.yanxuan-project.svc.cluster.local.'
            NACOS = 'nacos'
            NACOS_PS = 'nacos'
            INSPECT = '/oss/actuator/health'
            JAR_PORD = '5004'
            IMAGES = 'horse-oss'
            DIR = 'horse-support/horse-oss'
          }
        }
~~~

## 1.6 horse-pay 支付中台

~~~powershell
pipeline {
  agent {
    node {
      label 'maven'
    }

  }
  stages {
    stage('代码拉取') {
      agent none
      steps {
        container('maven') {
          git(url: 'https://gitee.com/nextgomsb/yanxuan.git', credentialsId: 'gitee-id', branch: 'master', changelog: true, poll: false)
        }

      }
    }

    stage('项目打包') {
      agent none
      steps {
        container('maven') {
          sh 'mvn clean package -pl com.msb.cloud:$IMAGES -am -Dmaven.test.skip=true'
        }

      }
    }

    stage('构建 images') {
      steps {
        container('maven') {
          sh 'docker build --build-arg SKNAME="${IMAGES}" --build-arg SKIP="${skywalking_IP}" --build-arg BRANCH="${start_branch}" --build-arg JAR_FILE="${JAR_FILE}" --build-arg NACOS_URL="${NACOS_URL}" --build-arg NACOS="${NACOS}" --build-arg NACOS_PS="${NACOS_PS}" --build-arg JAR_PORD="${JAR_PORD}" -t $IMAGES:$BUILD_NUMBER .'
        }

      }
    }

    stage('推送 images') {
      agent none
      steps {
        container('maven') {
          withCredentials([usernamePassword(credentialsId : 'aliyunacr-id' ,passwordVariable : 'ALIYUNACR_PASSWORD' ,usernameVariable : 'ALIYUNACR_USERNAME' ,)]) {
            sh 'echo "$ALIYUNACR_PASSWORD" | docker login $REGISTRY -u "$ALIYUNACR_USERNAME" --password-stdin'
            sh 'docker tag  $IMAGES:$BUILD_NUMBER $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
            sh 'docker push  $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

    stage('发布到生产') {
      agent none
      steps {
        container('maven') {
          withCredentials([
               kubeconfigFile(
                       credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                         variable: 'KUBECONFIG')
                 ]) {
                sh 'envsubst < deploy.yaml | kubectl apply -f -'
                sh 'docker rmi -f $IMAGES:$BUILD_NUMBER'
              }

            }

          }
        }

        stage('检查状态') {
          steps {
            container('maven') {
              withCredentials([
                    kubeconfigFile(
                         credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                          variable: 'KUBECONFIG')
                        ]) {
                    sh 'kubectl rollout status deployment $IMAGES -n yanxuan-project'
                  }

                }

              }
            }

          }
          environment {
            JAR_FILE = "${DIR}/${JAVA}"
            REGISTRY = 'registry.cn-zhangjiakou.aliyuncs.com'
            ACR_CREDENTIAL_ID = 'aliyunacr-id'
            ALIYUNACR_NAMESPACE = 'msb-yanxuan'
            KUBECONFIG_CREDENTIAL_ID = 'yanxuan-kubeconfig'
            skywalking_IP = 'skywalking-oap-server.yanxuan-project.svc.cluster.local.:11800'
            start_branch = 'prod'
            JAVA = 'target/*.jar'
            ES = 'elasticsearch.yanxuan-project.svc.cluster.local.'
            NACOS_URL = 'nacos-server.yanxuan-project.svc.cluster.local.'
            NACOS = 'nacos'
            NACOS_PS = 'nacos'
            INSPECT = '/payCenter/actuator/health'
            JAR_PORD = '5005'
            IMAGES = 'horse-pay-service'
            DIR = 'horse-support/horse-pay/horse-pay-service'
          }
        }
~~~

## 1.7 horse-push 消息推送中台

~~~powershell
pipeline {
  agent {
    node {
      label 'maven'
    }

  }
  stages {
    stage('代码拉取') {
      agent none
      steps {
        container('maven') {
          git(url: 'https://gitee.com/nextgomsb/yanxuan.git', credentialsId: 'gitee-id', branch: 'master', changelog: true, poll: false)
        }

      }
    }

    stage('项目打包') {
      agent none
      steps {
        container('maven') {
          sh 'mvn clean package -pl com.msb.cloud:$IMAGES -am -Dmaven.test.skip=true'
        }

      }
    }

    stage('构建 images') {
      steps {
        container('maven') {
          sh 'docker build --build-arg SKNAME="${IMAGES}" --build-arg SKIP="${skywalking_IP}" --build-arg BRANCH="${start_branch}" --build-arg JAR_FILE="${JAR_FILE}" --build-arg NACOS_URL="${NACOS_URL}" --build-arg NACOS="${NACOS}" --build-arg NACOS_PS="${NACOS_PS}" --build-arg JAR_PORD="${JAR_PORD}" -t $IMAGES:$BUILD_NUMBER .'
        }

      }
    }

    stage('推送 images') {
      agent none
      steps {
        container('maven') {
          withCredentials([usernamePassword(credentialsId : 'aliyunacr-id' ,passwordVariable : 'ALIYUNACR_PASSWORD' ,usernameVariable : 'ALIYUNACR_USERNAME' ,)]) {
            sh 'echo "$ALIYUNACR_PASSWORD" | docker login $REGISTRY -u "$ALIYUNACR_USERNAME" --password-stdin'
            sh 'docker tag  $IMAGES:$BUILD_NUMBER $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
            sh 'docker push  $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

    stage('发布到生产') {
      agent none
      steps {
        container('maven') {
          withCredentials([
               kubeconfigFile(
                       credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                         variable: 'KUBECONFIG')
                 ]) {
                sh 'envsubst < deploy.yaml | kubectl apply -f -'
                sh 'docker rmi -f $IMAGES:$BUILD_NUMBER'
              }

            }

          }
        }

        stage('检查状态') {
          steps {
            container('maven') {
              withCredentials([
                    kubeconfigFile(
                         credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                          variable: 'KUBECONFIG')
                        ]) {
                    sh 'kubectl rollout status deployment $IMAGES -n yanxuan-project'
                  }

                }

              }
            }

          }
          environment {
            JAR_FILE = "${DIR}/${JAVA}"
            REGISTRY = 'registry.cn-zhangjiakou.aliyuncs.com'
            ACR_CREDENTIAL_ID = 'aliyunacr-id'
            ALIYUNACR_NAMESPACE = 'msb-yanxuan'
            KUBECONFIG_CREDENTIAL_ID = 'yanxuan-kubeconfig'
            skywalking_IP = 'skywalking-oap-server.yanxuan-project.svc.cluster.local.:11800'
            start_branch = 'prod'
            JAVA = 'target/*.jar'
            ES = 'elasticsearch.yanxuan-project.svc.cluster.local.'
            NACOS_URL = 'nacos-server.yanxuan-project.svc.cluster.local.'
            NACOS = 'nacos'
            NACOS_PS = 'nacos'
            INSPECT = '/push/actuator/health'
            JAR_PORD = '5006'
            IMAGES = 'horse-push-service'
            DIR = 'horse-support/horse-push/horse-push-service'
          }
        }
~~~

## 1.8 horse-search 搜索中台

~~~powershell
pipeline {
  agent {
    node {
      label 'maven'
    }

  }
  stages {
    stage('代码拉取') {
      agent none
      steps {
        container('maven') {
          git(url: 'https://gitee.com/nextgomsb/yanxuan.git', credentialsId: 'gitee-id', branch: 'master', changelog: true, poll: false)
        }

      }
    }

    stage('项目打包') {
      agent none
      steps {
        container('maven') {
          sh 'mvn clean package -pl com.msb.cloud:$IMAGES -am -Dmaven.test.skip=true'
        }

      }
    }

    stage('构建 images') {
      steps {
        container('maven') {
          sh 'docker build --build-arg SKNAME="${IMAGES}" --build-arg SKIP="${skywalking_IP}" --build-arg BRANCH="${start_branch}" --build-arg JAR_FILE="${JAR_FILE}" --build-arg NACOS_URL="${NACOS_URL}" --build-arg NACOS="${NACOS}" --build-arg NACOS_PS="${NACOS_PS}" --build-arg JAR_PORD="${JAR_PORD}" -t $IMAGES:$BUILD_NUMBER .'
        }

      }
    }

    stage('推送 images') {
      agent none
      steps {
        container('maven') {
          withCredentials([usernamePassword(credentialsId : 'aliyunacr-id' ,passwordVariable : 'ALIYUNACR_PASSWORD' ,usernameVariable : 'ALIYUNACR_USERNAME' ,)]) {
            sh 'echo "$ALIYUNACR_PASSWORD" | docker login $REGISTRY -u "$ALIYUNACR_USERNAME" --password-stdin'
            sh 'docker tag  $IMAGES:$BUILD_NUMBER $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
            sh 'docker push  $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

    stage('发布到生产') {
      agent none
      steps {
        container('maven') {
          withCredentials([
               kubeconfigFile(
                       credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                         variable: 'KUBECONFIG')
                 ]) {
                sh 'envsubst < deploy.yaml | kubectl apply -f -'
                sh 'docker rmi -f $IMAGES:$BUILD_NUMBER'
              }

            }

          }
        }

        stage('检查状态') {
          steps {
            container('maven') {
              withCredentials([
                    kubeconfigFile(
                         credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                          variable: 'KUBECONFIG')
                        ]) {
                    sh 'kubectl rollout status deployment $IMAGES -n yanxuan-project'
                  }

                }

              }
            }

          }
          environment {
            JAR_FILE = "${DIR}/${JAVA}"
            REGISTRY = 'registry.cn-zhangjiakou.aliyuncs.com'
            ACR_CREDENTIAL_ID = 'aliyunacr-id'
            ALIYUNACR_NAMESPACE = 'msb-yanxuan'
            KUBECONFIG_CREDENTIAL_ID = 'yanxuan-kubeconfig'
            skywalking_IP = 'skywalking-oap-server.yanxuan-project.svc.cluster.local.:11800'
            start_branch = 'prod'
            JAVA = 'target/*.jar'
            ES = 'elasticsearch.yanxuan-project.svc.cluster.local.'
            NACOS_URL = 'nacos-server.yanxuan-project.svc.cluster.local.'
            NACOS = 'nacos'
            NACOS_PS = 'nacos'
            INSPECT = '/search/actuator/health'
            JAR_PORD = '5007'
            IMAGES = 'horse-search-service'
            DIR = 'horse-support/horse-search/horse-search-service'
          }
        }
~~~

## 1.9 horse-sensitive 敏感词中台

~~~powershell
pipeline {
  agent {
    node {
      label 'maven'
    }

  }
  stages {
    stage('代码拉取') {
      agent none
      steps {
        container('maven') {
          git(url: 'https://gitee.com/nextgomsb/yanxuan.git', credentialsId: 'gitee-id', branch: 'master', changelog: true, poll: false)
        }

      }
    }

    stage('项目打包') {
      agent none
      steps {
        container('maven') {
          sh 'mvn clean package -pl com.msb.cloud:$IMAGES -am -Dmaven.test.skip=true'
        }

      }
    }

    stage('构建 images') {
      steps {
        container('maven') {
          sh 'docker build --build-arg SKNAME="${IMAGES}" --build-arg SKIP="${skywalking_IP}" --build-arg BRANCH="${start_branch}" --build-arg JAR_FILE="${JAR_FILE}" --build-arg NACOS_URL="${NACOS_URL}" --build-arg NACOS="${NACOS}" --build-arg NACOS_PS="${NACOS_PS}" --build-arg JAR_PORD="${JAR_PORD}" -t $IMAGES:$BUILD_NUMBER .'
        }

      }
    }

    stage('推送 images') {
      agent none
      steps {
        container('maven') {
          withCredentials([usernamePassword(credentialsId : 'aliyunacr-id' ,passwordVariable : 'ALIYUNACR_PASSWORD' ,usernameVariable : 'ALIYUNACR_USERNAME' ,)]) {
            sh 'echo "$ALIYUNACR_PASSWORD" | docker login $REGISTRY -u "$ALIYUNACR_USERNAME" --password-stdin'
            sh 'docker tag  $IMAGES:$BUILD_NUMBER $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
            sh 'docker push  $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

    stage('发布到生产') {
      agent none
      steps {
        container('maven') {
          withCredentials([
               kubeconfigFile(
                       credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                         variable: 'KUBECONFIG')
                 ]) {
                sh 'envsubst < deploy.yaml | kubectl apply -f -'
                sh 'docker rmi -f $IMAGES:$BUILD_NUMBER'
              }

            }

          }
        }

        stage('检查状态') {
          steps {
            container('maven') {
              withCredentials([
                    kubeconfigFile(
                         credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                          variable: 'KUBECONFIG')
                        ]) {
                    sh 'kubectl rollout status deployment $IMAGES -n yanxuan-project'
                  }

                }

              }
            }

          }
          environment {
            JAR_FILE = "${DIR}/${JAVA}"
            REGISTRY = 'registry.cn-zhangjiakou.aliyuncs.com'
            ACR_CREDENTIAL_ID = 'aliyunacr-id'
            ALIYUNACR_NAMESPACE = 'msb-yanxuan'
            KUBECONFIG_CREDENTIAL_ID = 'yanxuan-kubeconfig'
            skywalking_IP = 'skywalking-oap-server.yanxuan-project.svc.cluster.local.:11800'
            start_branch = 'prod'
            JAVA = 'target/*.jar'
            ES = 'elasticsearch.yanxuan-project.svc.cluster.local.'
            NACOS_URL = 'nacos-server.yanxuan-project.svc.cluster.local.'
            NACOS = 'nacos'
            NACOS_PS = 'nacos'
            INSPECT = '/sensitive/actuator/health'
            JAR_PORD = '5008'
            IMAGES = 'horse-sensitive-service'
            DIR = 'horse-support/horse-sensitive/horse-sensitive-service'
          }
        }
~~~

## 1.10 horse-third 第三方服务对接中台

~~~powershell
pipeline {
  agent {
    node {
      label 'maven'
    }

  }
  stages {
    stage('代码拉取') {
      agent none
      steps {
        container('maven') {
          git(url: 'https://gitee.com/nextgomsb/yanxuan.git', credentialsId: 'gitee-id', branch: 'master', changelog: true, poll: false)
        }

      }
    }

    stage('项目打包') {
      agent none
      steps {
        container('maven') {
          sh 'mvn clean package -pl com.msb.cloud:$IMAGES -am -Dmaven.test.skip=true'
        }

      }
    }

    stage('构建 images') {
      steps {
        container('maven') {
          sh 'docker build --build-arg SKNAME="${IMAGES}" --build-arg SKIP="${skywalking_IP}" --build-arg BRANCH="${start_branch}" --build-arg JAR_FILE="${JAR_FILE}" --build-arg NACOS_URL="${NACOS_URL}" --build-arg NACOS="${NACOS}" --build-arg NACOS_PS="${NACOS_PS}" --build-arg JAR_PORD="${JAR_PORD}" -t $IMAGES:$BUILD_NUMBER .'
        }

      }
    }

    stage('推送 images') {
      agent none
      steps {
        container('maven') {
          withCredentials([usernamePassword(credentialsId : 'aliyunacr-id' ,passwordVariable : 'ALIYUNACR_PASSWORD' ,usernameVariable : 'ALIYUNACR_USERNAME' ,)]) {
            sh 'echo "$ALIYUNACR_PASSWORD" | docker login $REGISTRY -u "$ALIYUNACR_USERNAME" --password-stdin'
            sh 'docker tag  $IMAGES:$BUILD_NUMBER $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
            sh 'docker push  $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

    stage('发布到生产') {
      agent none
      steps {
        container('maven') {
          withCredentials([
               kubeconfigFile(
                       credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                         variable: 'KUBECONFIG')
                 ]) {
                sh 'envsubst < deploy.yaml | kubectl apply -f -'
                sh 'docker rmi -f $IMAGES:$BUILD_NUMBER'
              }

            }

          }
        }

        stage('检查状态') {
          steps {
            container('maven') {
              withCredentials([
                    kubeconfigFile(
                         credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                          variable: 'KUBECONFIG')
                        ]) {
                    sh 'kubectl rollout status deployment $IMAGES -n yanxuan-project'
                  }

                }

              }
            }

          }
          environment {
            JAR_FILE = "${DIR}/${JAVA}"
            REGISTRY = 'registry.cn-zhangjiakou.aliyuncs.com'
            ACR_CREDENTIAL_ID = 'aliyunacr-id'
            ALIYUNACR_NAMESPACE = 'msb-yanxuan'
            KUBECONFIG_CREDENTIAL_ID = 'yanxuan-kubeconfig'
            skywalking_IP = 'skywalking-oap-server.yanxuan-project.svc.cluster.local.:11800'
            start_branch = 'prod'
            JAVA = 'target/*.jar'
            ES = 'elasticsearch.yanxuan-project.svc.cluster.local.'
            NACOS_URL = 'nacos-server.yanxuan-project.svc.cluster.local.'
            NACOS = 'nacos'
            NACOS_PS = 'nacos'
            INSPECT = '/third/actuator/health'
            JAR_PORD = '5009'
            IMAGES = 'horse-third-service'
            DIR = 'horse-support/horse-third/horse-third-service'
          }
        }
~~~

## 1.11 horse-user 用户中台

~~~powershell
pipeline {
  agent {
    node {
      label 'maven'
    }

  }
  stages {
    stage('代码拉取') {
      agent none
      steps {
        container('maven') {
          git(url: 'https://gitee.com/nextgomsb/yanxuan.git', credentialsId: 'gitee-id', branch: 'master', changelog: true, poll: false)
        }

      }
    }

    stage('项目打包') {
      agent none
      steps {
        container('maven') {
          sh 'mvn clean package -pl com.msb.cloud:$IMAGES -am -Dmaven.test.skip=true'
        }

      }
    }

    stage('构建 images') {
      steps {
        container('maven') {
          sh 'docker build --build-arg SKNAME="${IMAGES}" --build-arg SKIP="${skywalking_IP}" --build-arg BRANCH="${start_branch}" --build-arg JAR_FILE="${JAR_FILE}" --build-arg NACOS_URL="${NACOS_URL}" --build-arg NACOS="${NACOS}" --build-arg NACOS_PS="${NACOS_PS}" --build-arg JAR_PORD="${JAR_PORD}" -t $IMAGES:$BUILD_NUMBER .'
        }

      }
    }

    stage('推送 images') {
      agent none
      steps {
        container('maven') {
          withCredentials([usernamePassword(credentialsId : 'aliyunacr-id' ,passwordVariable : 'ALIYUNACR_PASSWORD' ,usernameVariable : 'ALIYUNACR_USERNAME' ,)]) {
            sh 'echo "$ALIYUNACR_PASSWORD" | docker login $REGISTRY -u "$ALIYUNACR_USERNAME" --password-stdin'
            sh 'docker tag  $IMAGES:$BUILD_NUMBER $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
            sh 'docker push  $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

    stage('发布到生产') {
      agent none
      steps {
        container('maven') {
          withCredentials([
               kubeconfigFile(
                       credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                         variable: 'KUBECONFIG')
                 ]) {
                sh 'envsubst < deploy.yaml | kubectl apply -f -'
                sh 'docker rmi -f $IMAGES:$BUILD_NUMBER'
              }

            }

          }
        }

        stage('检查状态') {
          steps {
            container('maven') {
              withCredentials([
                    kubeconfigFile(
                         credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                          variable: 'KUBECONFIG')
                        ]) {
                    sh 'kubectl rollout status deployment $IMAGES -n yanxuan-project'
                  }

                }

              }
            }

          }
          environment {
            JAR_FILE = "${DIR}/${JAVA}"
            REGISTRY = 'registry.cn-zhangjiakou.aliyuncs.com'
            ACR_CREDENTIAL_ID = 'aliyunacr-id'
            ALIYUNACR_NAMESPACE = 'msb-yanxuan'
            KUBECONFIG_CREDENTIAL_ID = 'yanxuan-kubeconfig'
            skywalking_IP = 'skywalking-oap-server.yanxuan-project.svc.cluster.local.:11800'
            start_branch = 'prod'
            JAVA = 'target/*.jar'
            ES = 'elasticsearch.yanxuan-project.svc.cluster.local.'
            NACOS_URL = 'nacos-server.yanxuan-project.svc.cluster.local.'
            NACOS = 'nacos'
            NACOS_PS = 'nacos'
            INSPECT = '/uc/actuator/health'
            JAR_PORD = '5010'
            IMAGES = 'horse-user-service'
            DIR = 'horse-support/horse-user/horse-user-service'
          }
        }
~~~

# 二、商城服务

## 2.1 mall-base-service 基础服务

~~~powershell
pipeline {
  agent {
    node {
      label 'maven'
    }

  }
  stages {
    stage('代码拉取') {
      agent none
      steps {
        container('maven') {
          git(url: 'https://gitee.com/nextgomsb/yanxuan.git', credentialsId: 'gitee-id', branch: 'master', changelog: true, poll: false)
        }

      }
    }

    stage('项目打包') {
      agent none
      steps {
        container('maven') {
          sh 'mvn clean package -pl com.msb.cloud:$IMAGES -am -Dmaven.test.skip=true'
        }

      }
    }

    stage('构建 images') {
      steps {
        container('maven') {
          sh 'docker build --build-arg SKNAME="${IMAGES}" --build-arg SKIP="${skywalking_IP}" --build-arg BRANCH="${start_branch}" --build-arg JAR_FILE="${JAR_FILE}" --build-arg NACOS_URL="${NACOS_URL}" --build-arg NACOS="${NACOS}" --build-arg NACOS_PS="${NACOS_PS}" --build-arg JAR_PORD="${JAR_PORD}" -t $IMAGES:$BUILD_NUMBER .'
        }

      }
    }

    stage('推送 images') {
      agent none
      steps {
        container('maven') {
          withCredentials([usernamePassword(credentialsId : 'aliyunacr-id' ,passwordVariable : 'ALIYUNACR_PASSWORD' ,usernameVariable : 'ALIYUNACR_USERNAME' ,)]) {
            sh 'echo "$ALIYUNACR_PASSWORD" | docker login $REGISTRY -u "$ALIYUNACR_USERNAME" --password-stdin'
            sh 'docker tag  $IMAGES:$BUILD_NUMBER $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
            sh 'docker push  $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

    stage('发布到生产') {
      agent none
      steps {
        container('maven') {
          withCredentials([
               kubeconfigFile(
                       credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                         variable: 'KUBECONFIG')
                 ]) {
                sh 'envsubst < deploy.yaml | kubectl apply -f -'
                sh 'docker rmi -f $IMAGES:$BUILD_NUMBER'
              }

            }

          }
        }

        stage('检查状态') {
          steps {
            container('maven') {
              withCredentials([
                    kubeconfigFile(
                         credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                          variable: 'KUBECONFIG')
                        ]) {
                    sh 'kubectl rollout status deployment $IMAGES -n yanxuan-project'
                  }

                }

              }
            }

          }
          environment {
            JAR_FILE = "${DIR}/${JAVA}"
            REGISTRY = 'registry.cn-zhangjiakou.aliyuncs.com'
            ACR_CREDENTIAL_ID = 'aliyunacr-id'
            ALIYUNACR_NAMESPACE = 'msb-yanxuan'
            KUBECONFIG_CREDENTIAL_ID = 'yanxuan-kubeconfig'
            skywalking_IP = 'skywalking-oap-server.yanxuan-project.svc.cluster.local.:11800'
            start_branch = 'prod'
            JAVA = 'target/*.jar'
            ES = 'elasticsearch.yanxuan-project.svc.cluster.local.'
            NACOS_URL = 'nacos-server.yanxuan-project.svc.cluster.local.'
            NACOS = 'nacos'
            NACOS_PS = 'nacos'
            INSPECT = '/mall/base/actuator/health'
            JAR_PORD = '4003'
            IMAGES = 'mall-base-service'
            DIR = 'horse-business/mall-base/mall-base-service'
          }
        }
~~~

## 2.2 mall-comment-service 评论中台

~~~powershell
pipeline {
  agent {
    node {
      label 'maven'
    }

  }
  stages {
    stage('代码拉取') {
      agent none
      steps {
        container('maven') {
          git(url: 'https://gitee.com/nextgomsb/yanxuan.git', credentialsId: 'gitee-id', branch: 'master', changelog: true, poll: false)
        }

      }
    }

    stage('项目打包') {
      agent none
      steps {
        container('maven') {
          sh 'mvn clean package -pl com.msb.cloud:$IMAGES -am -Dmaven.test.skip=true'
        }

      }
    }

    stage('构建 images') {
      steps {
        container('maven') {
          sh 'docker build --build-arg SKNAME="${IMAGES}" --build-arg SKIP="${skywalking_IP}" --build-arg BRANCH="${start_branch}" --build-arg JAR_FILE="${JAR_FILE}" --build-arg NACOS_URL="${NACOS_URL}" --build-arg NACOS="${NACOS}" --build-arg NACOS_PS="${NACOS_PS}" --build-arg JAR_PORD="${JAR_PORD}" -t $IMAGES:$BUILD_NUMBER .'
        }

      }
    }

    stage('推送 images') {
      agent none
      steps {
        container('maven') {
          withCredentials([usernamePassword(credentialsId : 'aliyunacr-id' ,passwordVariable : 'ALIYUNACR_PASSWORD' ,usernameVariable : 'ALIYUNACR_USERNAME' ,)]) {
            sh 'echo "$ALIYUNACR_PASSWORD" | docker login $REGISTRY -u "$ALIYUNACR_USERNAME" --password-stdin'
            sh 'docker tag  $IMAGES:$BUILD_NUMBER $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
            sh 'docker push  $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

    stage('发布到生产') {
      agent none
      steps {
        container('maven') {
          withCredentials([
               kubeconfigFile(
                       credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                         variable: 'KUBECONFIG')
                 ]) {
                sh 'envsubst < deploy.yaml | kubectl apply -f -'
                sh 'docker rmi -f $IMAGES:$BUILD_NUMBER'
              }

            }

          }
        }

        stage('检查状态') {
          steps {
            container('maven') {
              withCredentials([
                    kubeconfigFile(
                         credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                          variable: 'KUBECONFIG')
                        ]) {
                    sh 'kubectl rollout status deployment $IMAGES -n yanxuan-project'
                  }

                }

              }
            }

          }
          environment {
            JAR_FILE = "${DIR}/${JAVA}"
            REGISTRY = 'registry.cn-zhangjiakou.aliyuncs.com'
            ACR_CREDENTIAL_ID = 'aliyunacr-id'
            ALIYUNACR_NAMESPACE = 'msb-yanxuan'
            KUBECONFIG_CREDENTIAL_ID = 'yanxuan-kubeconfig'
            skywalking_IP = 'skywalking-oap-server.yanxuan-project.svc.cluster.local.:11800'
            start_branch = 'prod'
            JAVA = 'target/*.jar'
            ES = 'elasticsearch.yanxuan-project.svc.cluster.local.'
            NACOS_URL = 'nacos-server.yanxuan-project.svc.cluster.local.'
            NACOS = 'nacos'
            NACOS_PS = 'nacos'
            INSPECT = '/mall/comment/actuator/health'
            JAR_PORD = '4005'
            IMAGES = 'mall-comment-service'
            DIR = 'horse-business/mall-comment/mall-comment-service'
          }
        }
~~~

## 2.3 mall-im-service 消息服务

~~~powershell
pipeline {
  agent {
    node {
      label 'maven'
    }

  }
  stages {
    stage('代码拉取') {
      agent none
      steps {
        container('maven') {
          git(url: 'https://gitee.com/nextgomsb/yanxuan.git', credentialsId: 'gitee-id', branch: 'master', changelog: true, poll: false)
        }

      }
    }

    stage('项目打包') {
      agent none
      steps {
        container('maven') {
          sh 'mvn clean package -pl com.msb.cloud:$IMAGES -am -Dmaven.test.skip=true'
        }

      }
    }

    stage('构建 images') {
      steps {
        container('maven') {
          sh 'docker build --build-arg SKNAME="${IMAGES}" --build-arg SKIP="${skywalking_IP}" --build-arg BRANCH="${start_branch}" --build-arg JAR_FILE="${JAR_FILE}" --build-arg NACOS_URL="${NACOS_URL}" --build-arg NACOS="${NACOS}" --build-arg NACOS_PS="${NACOS_PS}" --build-arg JAR_PORD="${JAR_PORD}" -t $IMAGES:$BUILD_NUMBER .'
        }

      }
    }

    stage('推送 images') {
      agent none
      steps {
        container('maven') {
          withCredentials([usernamePassword(credentialsId : 'aliyunacr-id' ,passwordVariable : 'ALIYUNACR_PASSWORD' ,usernameVariable : 'ALIYUNACR_USERNAME' ,)]) {
            sh 'echo "$ALIYUNACR_PASSWORD" | docker login $REGISTRY -u "$ALIYUNACR_USERNAME" --password-stdin'
            sh 'docker tag  $IMAGES:$BUILD_NUMBER $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
            sh 'docker push  $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

    stage('发布到生产') {
      agent none
      steps {
        container('maven') {
          withCredentials([
               kubeconfigFile(
                       credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                         variable: 'KUBECONFIG')
                 ]) {
                sh 'envsubst < deploy.yaml | kubectl apply -f -'
                sh 'docker rmi -f $IMAGES:$BUILD_NUMBER'
              }

            }

          }
        }

        stage('检查状态') {
          steps {
            container('maven') {
              withCredentials([
                    kubeconfigFile(
                         credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                          variable: 'KUBECONFIG')
                        ]) {
                    sh 'kubectl rollout status deployment $IMAGES -n yanxuan-project'
                  }

                }

              }
            }

          }
          environment {
            JAR_FILE = "${DIR}/${JAVA}"
            REGISTRY = 'registry.cn-zhangjiakou.aliyuncs.com'
            ACR_CREDENTIAL_ID = 'aliyunacr-id'
            ALIYUNACR_NAMESPACE = 'msb-yanxuan'
            KUBECONFIG_CREDENTIAL_ID = 'yanxuan-kubeconfig'
            skywalking_IP = 'skywalking-oap-server.yanxuan-project.svc.cluster.local.:11800'
            start_branch = 'prod'
            JAVA = 'target/*.jar'
            ES = 'elasticsearch.yanxuan-project.svc.cluster.local.'
            NACOS_URL = 'nacos-server.yanxuan-project.svc.cluster.local.'
            NACOS = 'nacos'
            NACOS_PS = 'nacos'
            INSPECT = '/mall/im/actuator/health'
            JAR_PORD = '4006'
            IMAGES = 'mall-im-service'
            DIR = 'horse-business/mall-im/mall-im-service'
          }
        }
~~~

## 2.4 mall-marketing-service 营销服务

~~~powershell
pipeline {
  agent {
    node {
      label 'maven'
    }

  }
  stages {
    stage('代码拉取') {
      agent none
      steps {
        container('maven') {
          git(url: 'https://gitee.com/nextgomsb/yanxuan.git', credentialsId: 'gitee-id', branch: 'master', changelog: true, poll: false)
        }

      }
    }

    stage('项目打包') {
      agent none
      steps {
        container('maven') {
          sh 'mvn clean package -pl com.msb.cloud:$IMAGES -am -Dmaven.test.skip=true'
        }

      }
    }

    stage('构建 images') {
      steps {
        container('maven') {
          sh 'docker build --build-arg SKNAME="${IMAGES}" --build-arg SKIP="${skywalking_IP}" --build-arg BRANCH="${start_branch}" --build-arg JAR_FILE="${JAR_FILE}" --build-arg NACOS_URL="${NACOS_URL}" --build-arg NACOS="${NACOS}" --build-arg NACOS_PS="${NACOS_PS}" --build-arg JAR_PORD="${JAR_PORD}" -t $IMAGES:$BUILD_NUMBER .'
        }

      }
    }

    stage('推送 images') {
      agent none
      steps {
        container('maven') {
          withCredentials([usernamePassword(credentialsId : 'aliyunacr-id' ,passwordVariable : 'ALIYUNACR_PASSWORD' ,usernameVariable : 'ALIYUNACR_USERNAME' ,)]) {
            sh 'echo "$ALIYUNACR_PASSWORD" | docker login $REGISTRY -u "$ALIYUNACR_USERNAME" --password-stdin'
            sh 'docker tag  $IMAGES:$BUILD_NUMBER $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
            sh 'docker push  $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

    stage('发布到生产') {
      agent none
      steps {
        container('maven') {
          withCredentials([
               kubeconfigFile(
                       credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                         variable: 'KUBECONFIG')
                 ]) {
                sh 'envsubst < deploy.yaml | kubectl apply -f -'
                sh 'docker rmi -f $IMAGES:$BUILD_NUMBER'
              }

            }

          }
        }

        stage('检查状态') {
          steps {
            container('maven') {
              withCredentials([
                    kubeconfigFile(
                         credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                          variable: 'KUBECONFIG')
                        ]) {
                    sh 'kubectl rollout status deployment $IMAGES -n yanxuan-project'
                  }

                }

              }
            }

          }
          environment {
            JAR_FILE = "${DIR}/${JAVA}"
            REGISTRY = 'registry.cn-zhangjiakou.aliyuncs.com'
            ACR_CREDENTIAL_ID = 'aliyunacr-id'
            ALIYUNACR_NAMESPACE = 'msb-yanxuan'
            KUBECONFIG_CREDENTIAL_ID = 'yanxuan-kubeconfig'
            skywalking_IP = 'skywalking-oap-server.yanxuan-project.svc.cluster.local.:11800'
            start_branch = 'prod'
            JAVA = 'target/*.jar'
            ES = 'elasticsearch.yanxuan-project.svc.cluster.local.'
            NACOS_URL = 'nacos-server.yanxuan-project.svc.cluster.local.'
            NACOS = 'nacos'
            NACOS_PS = 'nacos'
            INSPECT = '/mall/marketing/actuator/health'
            JAR_PORD = '4004'
            IMAGES = 'mall-marketing-service'
            DIR = 'horse-business/mall-marketing/mall-marketing-service'
          }
        }
~~~

## 2.5 mall-product-service 产品服务

~~~powershell
pipeline {
  agent {
    node {
      label 'maven'
    }

  }
  stages {
    stage('代码拉取') {
      agent none
      steps {
        container('maven') {
          git(url: 'https://gitee.com/nextgomsb/yanxuan.git', credentialsId: 'gitee-id', branch: 'master', changelog: true, poll: false)
        }

      }
    }

    stage('项目打包') {
      agent none
      steps {
        container('maven') {
          sh 'mvn clean package -pl com.msb.cloud:$IMAGES -am -Dmaven.test.skip=true'
        }

      }
    }

    stage('构建 images') {
      steps {
        container('maven') {
          sh 'docker build --build-arg SKNAME="${IMAGES}" --build-arg SKIP="${skywalking_IP}" --build-arg BRANCH="${start_branch}" --build-arg JAR_FILE="${JAR_FILE}" --build-arg NACOS_URL="${NACOS_URL}" --build-arg NACOS="${NACOS}" --build-arg NACOS_PS="${NACOS_PS}" --build-arg JAR_PORD="${JAR_PORD}" -t $IMAGES:$BUILD_NUMBER .'
        }

      }
    }

    stage('推送 images') {
      agent none
      steps {
        container('maven') {
          withCredentials([usernamePassword(credentialsId : 'aliyunacr-id' ,passwordVariable : 'ALIYUNACR_PASSWORD' ,usernameVariable : 'ALIYUNACR_USERNAME' ,)]) {
            sh 'echo "$ALIYUNACR_PASSWORD" | docker login $REGISTRY -u "$ALIYUNACR_USERNAME" --password-stdin'
            sh 'docker tag  $IMAGES:$BUILD_NUMBER $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
            sh 'docker push  $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

    stage('发布到生产') {
      agent none
      steps {
        container('maven') {
          withCredentials([
               kubeconfigFile(
                       credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                         variable: 'KUBECONFIG')
                 ]) {
                sh 'envsubst < deploy.yaml | kubectl apply -f -'
                sh 'docker rmi -f $IMAGES:$BUILD_NUMBER'
              }

            }

          }
        }

        stage('检查状态') {
          steps {
            container('maven') {
              withCredentials([
                    kubeconfigFile(
                         credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                          variable: 'KUBECONFIG')
                        ]) {
                    sh 'kubectl rollout status deployment $IMAGES -n yanxuan-project'
                  }

                }

              }
            }

          }
          environment {
            JAR_FILE = "${DIR}/${JAVA}"
            REGISTRY = 'registry.cn-zhangjiakou.aliyuncs.com'
            ACR_CREDENTIAL_ID = 'aliyunacr-id'
            ALIYUNACR_NAMESPACE = 'msb-yanxuan'
            KUBECONFIG_CREDENTIAL_ID = 'yanxuan-kubeconfig'
            skywalking_IP = 'skywalking-oap-server.yanxuan-project.svc.cluster.local.:11800'
            start_branch = 'prod'
            JAVA = 'target/*.jar'
            ES = 'elasticsearch.yanxuan-project.svc.cluster.local.'
            NACOS_URL = 'nacos-server.yanxuan-project.svc.cluster.local.'
            NACOS = 'nacos'
            NACOS_PS = 'nacos'
            INSPECT = '/mall/product/actuator/health'
            JAR_PORD = '4002'
            IMAGES = 'mall-product-service'
            DIR = 'horse-business/mall-product/mall-product-service'
          }
        }
~~~

## 2.6 mall-trade-service 交易服务

~~~powershell
pipeline {
  agent {
    node {
      label 'maven'
    }

  }
  stages {
    stage('代码拉取') {
      agent none
      steps {
        container('maven') {
          git(url: 'https://gitee.com/nextgomsb/yanxuan.git', credentialsId: 'gitee-id', branch: 'master', changelog: true, poll: false)
        }

      }
    }

    stage('项目打包') {
      agent none
      steps {
        container('maven') {
          sh 'mvn clean package -pl com.msb.cloud:$IMAGES -am -Dmaven.test.skip=true'
        }

      }
    }

    stage('构建 images') {
      steps {
        container('maven') {
          sh 'docker build --build-arg SKNAME="${IMAGES}" --build-arg SKIP="${skywalking_IP}" --build-arg BRANCH="${start_branch}" --build-arg JAR_FILE="${JAR_FILE}" --build-arg NACOS_URL="${NACOS_URL}" --build-arg NACOS="${NACOS}" --build-arg NACOS_PS="${NACOS_PS}" --build-arg JAR_PORD="${JAR_PORD}" -t $IMAGES:$BUILD_NUMBER .'
        }

      }
    }

    stage('推送 images') {
      agent none
      steps {
        container('maven') {
          withCredentials([usernamePassword(credentialsId : 'aliyunacr-id' ,passwordVariable : 'ALIYUNACR_PASSWORD' ,usernameVariable : 'ALIYUNACR_USERNAME' ,)]) {
            sh 'echo "$ALIYUNACR_PASSWORD" | docker login $REGISTRY -u "$ALIYUNACR_USERNAME" --password-stdin'
            sh 'docker tag  $IMAGES:$BUILD_NUMBER $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
            sh 'docker push  $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

    stage('发布到生产') {
      agent none
      steps {
        container('maven') {
          withCredentials([
               kubeconfigFile(
                       credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                         variable: 'KUBECONFIG')
                 ]) {
                sh 'envsubst < deploy.yaml | kubectl apply -f -'
                sh 'docker rmi -f $IMAGES:$BUILD_NUMBER'
              }

            }

          }
        }

        stage('检查状态') {
          steps {
            container('maven') {
              withCredentials([
                    kubeconfigFile(
                         credentialsId: env.KUBECONFIG_CREDENTIAL_ID,
                          variable: 'KUBECONFIG')
                        ]) {
                    sh 'kubectl rollout status deployment $IMAGES -n yanxuan-project'
                  }

                }

              }
            }

          }
          environment {
            JAR_FILE = "${DIR}/${JAVA}"
            REGISTRY = 'registry.cn-zhangjiakou.aliyuncs.com'
            ACR_CREDENTIAL_ID = 'aliyunacr-id'
            ALIYUNACR_NAMESPACE = 'msb-yanxuan'
            KUBECONFIG_CREDENTIAL_ID = 'yanxuan-kubeconfig'
            skywalking_IP = 'skywalking-oap-server.yanxuan-project.svc.cluster.local.:11800'
            start_branch = 'prod'
            JAVA = 'target/*.jar'
            ES = 'elasticsearch.yanxuan-project.svc.cluster.local.'
            NACOS_URL = 'nacos-server.yanxuan-project.svc.cluster.local.'
            NACOS = 'nacos'
            NACOS_PS = 'nacos'
            INSPECT = '/mall/trade/actuator/health'
            JAR_PORD = '4001'
            IMAGES = 'mall-trade-service'
            DIR = 'horse-business/mall-trade/mall-trade-service'
          }
        }
~~~

# 三、前端项目

## 3.1 horse-gateway服务暴露

![image-20230525180218121](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525180218121.png)

![image-20230525180313449](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525180313449.png)

![image-20230525180409633](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525180409633.png)

![image-20230525180442583](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525180442583.png)

![image-20230525180518424](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525180518424.png)

![image-20230525180642514](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525180642514.png)

![image-20230525184618424](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525184618424.png)

![image-20230525184725421](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525184725421.png)

![image-20230525184758041](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525184758041.png)

![image-20230525184827809](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525184827809.png)

![image-20230525184939267](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525184939267.png)

![image-20230525185019524](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525185019524.png)

![image-20230525185213503](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525185213503.png)

## 3.2 项目仓库创建及项目代码准备

### 3.2.1 H5版商城项目仓库及项目代码准备

#### 3.2.1.1 修改H5商城项目中env配置

![image-20230525185558999](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525185558999.png)

![image-20230525185731700](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525185731700.png)

![image-20230525190205333](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525190205333.png)

**deploy.yaml**

> 后期可以通过apisix创建应用路由来进行访问

~~~powershell
kind: Deployment
apiVersion: apps/v1
metadata:
  labels:
    app: $IMAGES
  name: $IMAGES
  namespace: yanxuan-project
spec:
  progressDeadlineSeconds: 600
  replicas: 1
  selector:
    matchLabels:
      app: $IMAGES
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 25%
      maxSurge: 25%
  template:
    metadata:
      labels:
        app: $IMAGES
    spec:
      imagePullSecrets:
        - name: aliyunacr-secret
      containers:
        - image: '$REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          name: app
          ports:
            - containerPort: $JAR_PORD
              protocol: TCP
          resources:
            limits:
              cpu: '0.3'
              memory: 500Mi
          terminationMessagePath: /dev/termination-log
          terminationMessagePolicy: File
      dnsPolicy: ClusterFirst
      restartPolicy: Always
      terminationGracePeriodSeconds: 30
---
kind: Service
apiVersion: v1
metadata:
  name: $IMAGES
  namespace: yanxuan-project
spec:
  ports:
  - port: 80
    protocol: TCP
    targetPort: 80  
  selector:
    app: $IMAGES
  type: ClusterIP

~~~

**Dockerfile**

~~~powershell
FROM nginx
COPY dist/build/h5 /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
~~~

**nginx.conf**

~~~powershell
server {
    listen 80;
    listen [::]:80;
    server_name localhost default_server;
    client_max_body_size 200m;

    location / {
        if ($request_filename ~* .*\.(?:htm|html)$) {
            add_header Cache-Control "no-store";
        }
        root /usr/share/nginx/html;
        try_files $uri @index ;
    }

    
    location @index {
        add_header Cache-Control "no-store" ;
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri/index.html /index.html;
    }

    error_page 405 =200 $uri;
}
~~~

#### 3.2.1.2 创建H5商城项目代码仓库

![image-20230525170758890](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525170758890.png)

![image-20230525170848324](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525170848324.png)

**Git 全局设置**

~~~powershell
git config --global user.name "nextgomsb"
git config --global user.email "nextgo@126.com"
~~~

**创建 git 仓库**

~~~powershell
cd yanxuan-frontend-h5
git init 
git add .
git commit -m "first commit"
git remote add origin https://gitee.com/nextgomsb/yanxuan-frontend-h5.git
git push -u origin master
~~~

![image-20230525172331516](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525172331516.png)

![image-20230525172510889](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525172510889.png)

![image-20230525173258582](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525173258582.png)

![image-20230525174704816](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525174704816.png)

![image-20230525174804237](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525174804237.png)

![image-20230525174904567](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525174904567.png)

![image-20230525175338565](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525175338565.png)

![image-20230525175417738](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525175417738.png)

### 3.2.2 PC版商城项目仓库及项目代码准备

#### 3.2.2.1 修改PC版商城项目中env配置

![image-20230525193558153](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525193558153.png)

![image-20230525193649546](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525193649546.png)

![image-20230525194734997](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525194734997.png)

**deploy.yaml**

~~~powershell
kind: Deployment
apiVersion: apps/v1
metadata:
  labels:
    app: $IMAGES
  name: $IMAGES
  namespace: yanxuan-project
spec:
  progressDeadlineSeconds: 600
  replicas: 1
  selector:
    matchLabels:
      app: $IMAGES
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 25%
      maxSurge: 25%
  template:
    metadata:
      labels:
        app: $IMAGES
    spec:
      imagePullSecrets:
        - name: aliyunacr-secret
      containers:
        - image: '$REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          name: app
          ports:
            - containerPort: $JAR_PORD
              protocol: TCP
          resources:
            limits:
              cpu: '0.3'
              memory: 500Mi
          terminationMessagePath: /dev/termination-log
          terminationMessagePolicy: File
      dnsPolicy: ClusterFirst
      restartPolicy: Always
      terminationGracePeriodSeconds: 30
---
kind: Service
apiVersion: v1
metadata:
  name: $IMAGES
  namespace: yanxuan-project
spec:
  ports:
  - port: $JAR_PORD
    protocol: TCP
    targetPort: $JAR_PORD
  selector:
    app: $IMAGES
  type: ClusterIP

~~~

**Dockerfile**

~~~powershell
FROM node:12.13.1
WORKDIR /workload

COPY nuxt.config.js /workload/nuxt.config.js
COPY package.json /workload/package.json
COPY .nuxt /workload/.nuxt
COPY static /workload/static

RUN npm config set registry https://registry.npm.taobao.org \
    && npm install

EXPOSE 3000
CMD npm run start
~~~

#### 3.2.2.2 创建PC版商城项目代码仓库

![image-20230525195046293](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525195046293.png)

**Git 全局设置**

~~~powershell
git config --global user.name "nextgomsb"
git config --global user.email "nextgo@126.com"
~~~

**创建 git 仓库**

~~~powershell
cd yanxuan-frontend-pc
git init 
git add .
git commit -m "first commit"
git remote add origin https://gitee.com/nextgomsb/yanxuan-frontend-pc.git
git push -u origin "master"
~~~

![image-20230525200023084](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525200023084.png)

![image-20230525200207155](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525200207155.png)

![image-20230525200303753](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525200303753.png)

![image-20230525200356019](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525200356019.png)

![image-20230525200445342](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525200445342.png)

![image-20230525200531451](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525200531451.png)

![image-20230525200620155](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525200620155.png)

### 3.2.3 商城APP项目仓库及项目代码准备

#### 3.2.3.1 修改商城APP项目中env配置

![image-20230525201302679](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525201302679.png)

![image-20230525201340270](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525201340270.png)

![image-20230525201606199](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525201606199.png)

**deploy.yaml**

~~~powershell
kind: Deployment
apiVersion: apps/v1
metadata:
  labels:
    app: $IMAGES
  name: $IMAGES
  namespace: yanxuan-project
spec:
  progressDeadlineSeconds: 600
  replicas: 1
  selector:
    matchLabels:
      app: $IMAGES
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 25%
      maxSurge: 25%
  template:
    metadata:
      labels:
        app: $IMAGES
    spec:
      imagePullSecrets:
        - name: aliyun-docker-hub
      containers:
        - image: '$REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          name: app
          ports:
            - containerPort: $JAR_PORD
              protocol: TCP
          resources:
            limits:
              cpu: '0.3'
              memory: 500Mi
          terminationMessagePath: /dev/termination-log
          terminationMessagePolicy: File
      dnsPolicy: ClusterFirst
      restartPolicy: Always
      terminationGracePeriodSeconds: 30
---
kind: Service
apiVersion: v1
metadata:
  name: $IMAGES
  namespace: yanxuan-project
spec:
  ports:
  - port: 80
    protocol: TCP
    targetPort: 80  
  selector:
    app: $IMAGES
  type: ClusterIP

~~~

**Dockerfile**

~~~powershell
FROM nginx
COPY dist/build/h5 /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
~~~

**nginx.conf**

~~~powershell
server {
    listen 80;
    listen [::]:80;
    server_name localhost default_server;
    client_max_body_size 200m;

    location / {
        if ($request_filename ~* .*\.(?:htm|html)$) {
            add_header Cache-Control "no-store";
        }
        root /usr/share/nginx/html;
        try_files $uri @index ;
    }

    
    location @index {
        add_header Cache-Control "no-store" ;
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri/index.html /index.html;
    }

    error_page 405 =200 $uri;
}
~~~

#### 3.2.3.2 创建商城APP项目代码仓库

![image-20230525202028225](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525202028225.png)

**Git 全局设置**

~~~powershell
git config --global user.name "nextgomsb"
git config --global user.email "12102047+nextgomsb@user.noreply.gitee.com"
~~~

**创建 git 仓库**

~~~powershell
cd yanxuan-frontend-app
git init 
git add .
git commit -m "first commit"
git remote add origin https://gitee.com/nextgomsb/yanxuan-frontend-app.git
git push -u origin master
~~~

![image-20230525202310141](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525202310141.png)

![image-20230525202543641](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525202543641.png)

![image-20230525202643759](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525202643759.png)

![image-20230525202737641](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525202737641.png)

### 3.2.4 商城后台管理系统项目仓库及项目代码准备

#### 3.2.4.1 修改商城后台管理系统项目中env配置

![image-20230525203145657](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525203145657.png)

![image-20230525203259718](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525203259718.png)

![image-20230525203652016](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525203652016.png)

**deploy.yaml**

~~~powershell
kind: Deployment
apiVersion: apps/v1
metadata:
  labels:
    app: $IMAGES
  name: $IMAGES
  namespace: yanxuan-project
spec:
  progressDeadlineSeconds: 600
  replicas: 1
  selector:
    matchLabels:
      app: $IMAGES
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 25%
      maxSurge: 25%
  template:
    metadata:
      labels:
        app: $IMAGES
    spec:
      imagePullSecrets:
        - name: aliyunacr-secret
      containers:
        - image: '$REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          name: app
          ports:
            - containerPort: $JAR_PORD
              protocol: TCP
          resources:
            limits:
              cpu: '0.3'
              memory: 500Mi
          terminationMessagePath: /dev/termination-log
          terminationMessagePolicy: File
      dnsPolicy: ClusterFirst
      restartPolicy: Always
      terminationGracePeriodSeconds: 30

---
kind: Service
apiVersion: v1
metadata:
  name: $IMAGES
  namespace: yanxuan-project
spec:
  ports:
  - port: 80
    protocol: TCP
    targetPort: 80  
  selector:
    app: $IMAGES
  type: ClusterIP

~~~

**Dockerfile**

~~~powershell
FROM nginx
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
~~~

**nginx.conf**

~~~powershell
server {
    listen 80;
    listen [::]:80;
    server_name localhost default_server;
    client_max_body_size 200m;

    location / {
        if ($request_filename ~* .*\.(?:htm|html)$) {
            add_header Cache-Control "no-store";
        }
        root /usr/share/nginx/html;
        try_files $uri @index ;
    }

    location @index {
        add_header Cache-Control "no-store" ;
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri/index.html /index.html;
    }

    error_page 405 =200 $uri;
}
~~~

#### 3.2.4.2 创建商城后台管理系统项目代码仓库

![image-20230525204018092](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525204018092.png)

**Git 全局设置**

```powershell
git config --global user.name "nextgomsb"
git config --global user.email "nextgo@126.com"
```

**创建 git 仓库**

```powershell
cd yanxuan-shop-admin
git init 
git add .
git commit -m "first commit"
git remote add origin https://gitee.com/nextgomsb/yanxuan-shop-admin.git
git push -u origin master
```

![image-20230525204238371](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525204238371.png)

![image-20230525204429247](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525204429247.png)

![image-20230525204546723](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525204546723.png)

![image-20230525204623962](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525204623962.png)

## 3.3  前端项目流水线编写演示

![image-20230525211838698](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525211838698.png)

![image-20230525211915802](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525211915802.png)

![image-20230525212450815](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525212450815.png)

![image-20230525212514741](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525212514741.png)

![image-20230525212541623](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525212541623.png)

![image-20230525212610132](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230525212610132.png)

~~~powershell
pipeline {
  agent {
    kubernetes {
      inheritFrom 'nodejs base'
      containerTemplate {
        name 'nodejs'
        image 'node:14.19.0'
      }

    }

  }
  stages {
    stage('代码拉取') {
      agent none
      steps {
        container('nodejs') {
          git(url: 'https://gitee.com/nextgomsb/yanxuan-frontend-h5.git', credentialsId: 'gitee-id', branch: 'master', changelog: true, poll: false)
        }

      }
    }

    stage('run npm install') {
      agent none
      steps {
        container('nodejs') {
          sh 'npm config set registry https://registry.npm.taobao.org'
          sh 'npm install'
        }

      }
    }

    stage('项目编译') {
      agent none
      steps {
        container('nodejs') {
          sh 'npm run build:prod'
        }

      }
    }

    stage('构建镜像') {
      agent none
      steps {
        container('base') {
          sh 'docker build -t $IMAGES:$BUILD_NUMBER -f Dockerfile .'
        }

      }
    }

    stage('推送镜像') {
      agent none
      steps {
        container('base') {
          withCredentials([usernamePassword(credentialsId : 'aliyunacr-id' ,passwordVariable : 'ALIYUNACR_PASSWORD' ,usernameVariable : 'ALIYUNACR_USERNAME' ,)]) {
            sh 'echo "$ALIYUNACR_PASSWORD" | docker login $REGISTRY -u "$ALIYUNACR_USERNAME" --password-stdin'
            sh 'docker tag  $IMAGES:$BUILD_NUMBER $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
            sh 'docker push  $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

    stage('部署到生产环境') {
      agent none
      steps {
        container('base') {
          withCredentials([kubeconfigFile(credentialsId : env.KUBECONFIG_CREDENTIAL_ID ,variable : 'KUBECONFIG' ,)]) {
            sh 'envsubst < deploy.yaml | kubectl apply -f -'
            sh 'docker rmi -f $IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

  }
  environment {
            REGISTRY = 'registry.cn-zhangjiakou.aliyuncs.com'
            ACR_CREDENTIAL_ID = 'aliyunacr-id'
            ALIYUNACR_NAMESPACE = 'msb-yanxuan'
            KUBECONFIG_CREDENTIAL_ID = 'yanxuan-kubeconfig'
            JAR_PORD = '80'
            IMAGES = 'pay'
          }
}
~~~

## 3.4 各前端项目流水线编写及项目发布

### 3.4.1 h5版商城

~~~powershell
pipeline {
  agent {
    kubernetes {
      inheritFrom 'nodejs base'
      containerTemplate {
        name 'nodejs'
        image 'node:14.19.0'
      }

    }

  }
  stages {
    stage('代码拉取') {
      agent none
      steps {
        container('nodejs') {
          git(url: 'https://gitee.com/nextgomsb/yanxuan-frontend-h5.git', credentialsId: 'gitee-id', branch: 'master', changelog: true, poll: false)
        }

      }
    }

    stage('run npm install') {
      agent none
      steps {
        container('nodejs') {
          sh 'npm config set registry https://registry.npm.taobao.org'
          sh 'npm install'
        }

      }
    }

    stage('项目编译') {
      agent none
      steps {
        container('nodejs') {
          sh 'npm run build:prod'
        }

      }
    }

    stage('构建镜像') {
      agent none
      steps {
        container('base') {
          sh 'docker build -t $IMAGES:$BUILD_NUMBER -f Dockerfile .'
        }

      }
    }

    stage('推送镜像') {
      agent none
      steps {
        container('base') {
          withCredentials([usernamePassword(credentialsId : 'aliyunacr-id' ,passwordVariable : 'ALIYUNACR_PASSWORD' ,usernameVariable : 'ALIYUNACR_USERNAME' ,)]) {
            sh 'echo "$ALIYUNACR_PASSWORD" | docker login $REGISTRY -u "$ALIYUNACR_USERNAME" --password-stdin'
            sh 'docker tag  $IMAGES:$BUILD_NUMBER $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
            sh 'docker push  $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

    stage('部署到生产环境') {
      agent none
      steps {
        container('base') {
          withCredentials([kubeconfigFile(credentialsId : env.KUBECONFIG_CREDENTIAL_ID ,variable : 'KUBECONFIG' ,)]) {
            sh 'envsubst < deploy.yaml | kubectl apply -f -'
            sh 'docker rmi -f $IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

  }
  environment {
            REGISTRY = 'registry.cn-zhangjiakou.aliyuncs.com'
            ACR_CREDENTIAL_ID = 'aliyunacr-id'
            ALIYUNACR_NAMESPACE = 'msb-yanxuan'
            KUBECONFIG_CREDENTIAL_ID = 'yanxuan-kubeconfig'
            JAR_PORD = '80'
            IMAGES = 'pay'
          }
}
~~~

### 3.4.2 pc版商城

~~~powershell
pipeline {
  agent {
    kubernetes {
      inheritFrom 'nodejs base'
      containerTemplate {
        name 'nodejs'
        image 'node:14.19.0'
      }

    }

  }
  stages {
    stage('代码拉取') {
      agent none
      steps {
        container('nodejs') {
          git(url: 'https://gitee.com/nextgomsb/yanxuan-frontend-pc.git', credentialsId: 'gitee-id', branch: 'master', changelog: true, poll: false)
        }

      }
    }

    stage('run npm install') {
      agent none
      steps {
        container('nodejs') {
          sh 'npm config set registry https://registry.npm.taobao.org'
          sh 'npm install'
        }

      }
    }

    stage('项目编译') {
      agent none
      steps {
        container('nodejs') {
          sh 'npm run build:prod'
        }

      }
    }

    stage('构建镜像') {
      agent none
      steps {
        container('base') {
          sh 'docker build -t $IMAGES:$BUILD_NUMBER -f Dockerfile .'
        }

      }
    }

    stage('推送镜像') {
      agent none
      steps {
        container('base') {
          withCredentials([usernamePassword(credentialsId : 'aliyunacr-id' ,passwordVariable : 'ALIYUNACR_PASSWORD' ,usernameVariable : 'ALIYUNACR_USERNAME' ,)]) {
            sh 'echo "$ALIYUNACR_PASSWORD" | docker login $REGISTRY -u "$ALIYUNACR_USERNAME" --password-stdin'
            sh 'docker tag  $IMAGES:$BUILD_NUMBER $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
            sh 'docker push  $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

    stage('部署到生产环境') {
      agent none
      steps {
        container('base') {
          withCredentials([kubeconfigFile(credentialsId : env.KUBECONFIG_CREDENTIAL_ID ,variable : 'KUBECONFIG' ,)]) {
            sh 'envsubst < deploy.yaml | kubectl apply -f -'
            sh 'docker rmi -f $IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

  }
  environment {
            REGISTRY = 'registry.cn-zhangjiakou.aliyuncs.com'
            ACR_CREDENTIAL_ID = 'aliyunacr-id'
            ALIYUNACR_NAMESPACE = 'msb-yanxuan'
            KUBECONFIG_CREDENTIAL_ID = 'yanxuan-kubeconfig'
            JAR_PORD = '3000'
            IMAGES = 'shop-pc'
          }
}
~~~

### 3.4.3 商城APP

~~~powershell
pipeline {
  agent {
    kubernetes {
      inheritFrom 'nodejs base'
      containerTemplate {
        name 'nodejs'
        image 'node:14.19.0'
      }

    }

  }
  stages {
    stage('代码拉取') {
      agent none
      steps {
        container('nodejs') {
          git(url: 'https://gitee.com/nextgomsb/yanxuan-frontend-app.git', credentialsId: 'gitee-id', branch: 'master', changelog: true, poll: false)
        }

      }
    }

    stage('run npm install') {
      agent none
      steps {
        container('nodejs') {
          sh 'npm config set registry https://registry.npm.taobao.org'
          sh 'npm install'
        }

      }
    }

    stage('项目编译') {
      agent none
      steps {
        container('nodejs') {
          sh 'npm run build:prod'
        }

      }
    }

    stage('构建镜像') {
      agent none
      steps {
        container('base') {
          sh 'docker build -t $IMAGES:$BUILD_NUMBER -f Dockerfile .'
        }

      }
    }

    stage('推送镜像') {
      agent none
      steps {
        container('base') {
          withCredentials([usernamePassword(credentialsId : 'aliyunacr-id' ,passwordVariable : 'ALIYUNACR_PASSWORD' ,usernameVariable : 'ALIYUNACR_USERNAME' ,)]) {
            sh 'echo "$ALIYUNACR_PASSWORD" | docker login $REGISTRY -u "$ALIYUNACR_USERNAME" --password-stdin'
            sh 'docker tag  $IMAGES:$BUILD_NUMBER $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
            sh 'docker push  $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

    stage('部署到生产环境') {
      agent none
      steps {
        container('base') {
          withCredentials([kubeconfigFile(credentialsId : env.KUBECONFIG_CREDENTIAL_ID ,variable : 'KUBECONFIG' ,)]) {
            sh 'envsubst < deploy.yaml | kubectl apply -f -'
            sh 'docker rmi -f $IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

  }
  environment {
            REGISTRY = 'registry.cn-zhangjiakou.aliyuncs.com'
            ACR_CREDENTIAL_ID = 'aliyunacr-id'
            ALIYUNACR_NAMESPACE = 'msb-yanxuan'
            KUBECONFIG_CREDENTIAL_ID = 'yanxuan-kubeconfig'
            JAR_PORD = '80'
            IMAGES = 'shop-app'
          }
}
~~~

### 3.4.4 商城后台管理系统

~~~powershell
pipeline {
  agent {
    kubernetes {
      inheritFrom 'nodejs base'
      containerTemplate {
        name 'nodejs'
        image 'node:14.19.0'
      }

    }

  }
  stages {
    stage('代码拉取') {
      agent none
      steps {
        container('nodejs') {
          git(url: 'https://gitee.com/nextgomsb/yanxuan-frontend-admin.git', credentialsId: 'gitee-id', branch: 'master', changelog: true, poll: false)
        }

      }
    }

    stage('run npm install') {
      agent none
      steps {
        container('nodejs') {
          sh 'npm config set registry https://registry.npm.taobao.org'
          sh 'npm install'
        }

      }
    }

    stage('项目编译') {
      agent none
      steps {
        container('nodejs') {
          sh 'npm run build:prod'
        }

      }
    }

    stage('构建镜像') {
      agent none
      steps {
        container('base') {
          sh 'docker build -t $IMAGES:$BUILD_NUMBER -f Dockerfile .'
        }

      }
    }

    stage('推送镜像') {
      agent none
      steps {
        container('base') {
          withCredentials([usernamePassword(credentialsId : 'aliyunacr-id' ,passwordVariable : 'ALIYUNACR_PASSWORD' ,usernameVariable : 'ALIYUNACR_USERNAME' ,)]) {
            sh 'echo "$ALIYUNACR_PASSWORD" | docker login $REGISTRY -u "$ALIYUNACR_USERNAME" --password-stdin'
            sh 'docker tag  $IMAGES:$BUILD_NUMBER $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
            sh 'docker push  $REGISTRY/$ALIYUNACR_NAMESPACE/$IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

    stage('部署到生产环境') {
      agent none
      steps {
        container('base') {
          withCredentials([kubeconfigFile(credentialsId : env.KUBECONFIG_CREDENTIAL_ID ,variable : 'KUBECONFIG' ,)]) {
            sh 'envsubst < deploy.yaml | kubectl apply -f -'
            sh 'docker rmi -f $IMAGES:$BUILD_NUMBER'
          }

        }

      }
    }

  }
  environment {
            REGISTRY = 'registry.cn-zhangjiakou.aliyuncs.com'
            ACR_CREDENTIAL_ID = 'aliyunacr-id'
            ALIYUNACR_NAMESPACE = 'msb-yanxuan'
            KUBECONFIG_CREDENTIAL_ID = 'yanxuan-kubeconfig'
            JAR_PORD = '80'
            IMAGES = 'shop-admin'
          }
}
~~~

## 3.5 创建各前端对外提供服务

### 3.5.1 H5版

![image-20230526145742610](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230526145742610.png)

![image-20230526145812638](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230526145812638.png)

~~~powershell
[root@dns-server ~]# vim /var/named/mashibing.com.zone

[root@dns-server ~]# cat /var/named/mashibing.com.zone
$TTL 1D
@       IN SOA  mashibing.com admin.mashibing.com. (
                                        0       ; serial
                                        1D      ; refresh
                                        1H      ; retry
                                        1W      ; expire
                                        3H )    ; minimum
@       NS      ns.mashibing.com.
ns      A       192.168.10.143
harbor  A       192.168.10.145
nfs     A       192.168.10.144
test1   A       192.168.10.71
kibana  A       192.168.10.71
nacos-server    A       192.168.10.71
sentinel-server A       192.168.10.71
skywalking-ui   A       192.168.10.71
rocketmq-dashboard      A       192.168.10.71
xxl-job-admin   A       192.168.10.71
yanxuan-h5   A       192.168.10.71
~~~

~~~powershell
[root@dns-server ~]# systemctl restart named
~~~

![image-20230526192123806](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230526192123806.png)

### 3.5.2 PC版商城

![image-20230526145358098](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230526145358098.png)

![image-20230526145523760](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230526145523760.png)

![image-20230526145617074](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230526145617074.png)

~~~powershell
[root@dns-server ~]# vim /var/named/mashibing.com.zone

[root@dns-server ~]# cat /var/named/mashibing.com.zone
$TTL 1D
@       IN SOA  mashibing.com admin.mashibing.com. (
                                        0       ; serial
                                        1D      ; refresh
                                        1H      ; retry
                                        1W      ; expire
                                        3H )    ; minimum
@       NS      ns.mashibing.com.
ns      A       192.168.10.143
harbor  A       192.168.10.145
nfs     A       192.168.10.144
test1   A       192.168.10.71
kibana  A       192.168.10.71
nacos-server    A       192.168.10.71
sentinel-server A       192.168.10.71
skywalking-ui   A       192.168.10.71
rocketmq-dashboard      A       192.168.10.71
xxl-job-admin   A       192.168.10.71

yanxuan-shop-pc        A       192.168.10.71
~~~

~~~powershell
[root@dns-server ~]# systemctl restart named
~~~

![image-20230526152343416](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230526152343416.png)

### 3.5.3 商城APP

![image-20230526103923398](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230526103923398.png)

![image-20230526104020966](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230526104020966.png)

~~~powershell
[root@dns-server ~]# vim /var/named/mashibing.com.zone

[root@dns-server ~]# cat /var/named/mashibing.com.zone
$TTL 1D
@       IN SOA  mashibing.com admin.mashibing.com. (
                                        0       ; serial
                                        1D      ; refresh
                                        1H      ; retry
                                        1W      ; expire
                                        3H )    ; minimum
@       NS      ns.mashibing.com.
ns      A       192.168.10.143
harbor  A       192.168.10.145
nfs     A       192.168.10.144
test1   A       192.168.10.71
kibana  A       192.168.10.71
nacos-server    A       192.168.10.71
sentinel-server A       192.168.10.71
skywalking-ui   A       192.168.10.71
rocketmq-dashboard      A       192.168.10.71
xxl-job-admin   A       192.168.10.71

yanxuan-shop-app        A       192.168.10.71
~~~

~~~powershell
[root@dns-server ~]# systemctl restart named
~~~

![image-20230526153759891](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230526153759891.png)

### 3.5.4 商城后台管理系统

![image-20230526150442267](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230526150442267.png)

![image-20230526150547502](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230526150547502.png)

![image-20230526150639659](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230526150639659.png)

~~~powershell
[root@dns-server ~]# vim /var/named/mashibing.com.zone

[root@dns-server ~]# cat /var/named/mashibing.com.zone
$TTL 1D
@       IN SOA  mashibing.com admin.mashibing.com. (
                                        0       ; serial
                                        1D      ; refresh
                                        1H      ; retry
                                        1W      ; expire
                                        3H )    ; minimum
@       NS      ns.mashibing.com.
ns      A       192.168.10.143
harbor  A       192.168.10.145
nfs     A       192.168.10.144
test1   A       192.168.10.71
kibana  A       192.168.10.71
nacos-server    A       192.168.10.71
sentinel-server A       192.168.10.71
skywalking-ui   A       192.168.10.71
rocketmq-dashboard      A       192.168.10.71

yanxuan-shop-admin        A       192.168.10.71
~~~

~~~powershell
[root@dns-server ~]# systemctl restart named
~~~

![image-20230526150751130](/云原生/platform/platform-27-严选商城项目部署前流水线编写/image-20230526150751130.png)

>测试手机：16600660099  测试密码：123456 

~~~powershell
INSERT INTO user_center.employee (id, user_id, user_name, phone, employee_name, employee_type, password, email, remark, is_enable,create_time, update_time, create_user, update_user, is_deleted) VALUES (2, 8, 'fc', '16600660099', 'tomfc', 1, '123456 ', 'nextgo@126.com', '备注', 1,'2023-03-29 19:39:05', '2025-08-01 15:13:05', 0, 15, 0);
~~~

