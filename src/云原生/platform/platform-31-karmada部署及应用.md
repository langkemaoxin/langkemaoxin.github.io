---
title: karmada部署及应用
sidebarGroup: 平台与实战
shortTitle: 31 karmada部署及应用
order: 31
date: 2026-08-13T00:00:00.000Z
category: 云原生
tag:
  - 多集群
  - 云原生
  - 课程笔记
description: 使用kubeconfig管理多集群方法 一、k8s集群准备 1.1 持久化存储准备 提前准备好NFS服务 ~~~powershell for file in class.yaml deployment...
---

> **多集群 · 第 4 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 使用kubeconfig管理多集群方法

# 一、k8s集群准备

## 1.1 持久化存储准备

> 提前准备好NFS服务

~~~powershell
# for file in class.yaml deployment.yaml rbac.yaml  ; do wget https://raw.githubusercontent.com/kubernetes-incubator/external-storage/master/nfs-client/deploy/$file ; done
~~~

~~~powershell
替换的镜像：registry.cn-beijing.aliyuncs.com/pylixm/nfs-subdir-external-provisioner:v4.0.0
~~~

~~~powershell
本次NFS服务器IP地址及共享目录：
192.168.10.166
/netshare
~~~

## 1.2 k8s集群部署

> 准备多套k8s集群，可以使用kubeadm部署多套k8s集群。

~~~powershell
# wget  https://github.com/labring/sealos/releases/download/v4.1.3/sealos_4.1.3_linux_amd64.tar.gz  && \
    tar -zxvf sealos_4.1.3_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin
~~~

~~~powershell
[root@k8s-master01 ~]# cat sealos-install.sh
sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 \
     --masters 192.168.10.160 \
     --nodes 192.168.10.161,192.168.10.162 -p centos
~~~

~~~powershell
[root@k8s-master01 ~]# cat sealos-install.sh
sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 \
     --masters 192.168.10.163 \
     --nodes 192.168.10.164,192.168.10.165 -p centos
~~~

## 1.3 多集群管理

### 1.3.1 获取多集群kubeconfig文件

~~~powershell
[root@k8s-master01 ~]# mkdir kubeconfigdir
~~~

~~~powershell
[root@k8s-master01 ~]# cp /root/.kube/config kubeconfigdir/config1
~~~

~~~powershell
[root@k8s-master01 ~]# scp 192.168.10.163:/root/.kube/config kubeconfigdir/config2
~~~

### 1.3.2 合并多集群kubeconfig文件

> 可以选择手动合并，也可以选择自动全并。本案例为手动合并。

~~~powershell
合并后kubeconfig文件如下：

[root@k8s-master01 kubeconfigdir]# cat config12
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUMvakNDQWVhZ0F3SUJBZ0lCQURBTkJna3Foa2lHOXcwQkFRc0ZBREFWTVJNd0VRWURWUVFERXdwcmRXSmwKY201bGRHVnpNQjRYRFRJek1ERXdOVEExTWpJek1sb1hEVE16TURFd01qQTFNakl6TWxvd0ZURVRNQkVHQTFVRQpBeE1LYTNWaVpYSnVaWFJsY3pDQ0FTSXdEUVlKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDQVFvQ2dnRUJBTmJjClFkK0ttSkd2NDNJRG9yWXY1UmRSNkNVTkpvUE1CY3kveDd2U3FIM1dEbWJsWnM3NDMvbVJRUDE1NDNRSmlsbDYKNmV1WjQrSDBsZXVsRWNjQU9mN2dPOG5EaDJSTEQ0ZHc4bk51L2JWMnRnRjc5b1FSTUtDczN2TWwzcEwzZmZiVQpweHdQVXAzTktwb1pZZndNVTJvazVIZGxwbkdqQzVLRnkvb2FNcmNrUWFNQjhjaFhhckxoSDBCVHZXS29sWnUxCjJPa2VvRDJKRTl1czVDRkt4MDMxWmtjQVArbVpjM2JYejI0amZYOUI1L05BR3c2Vmx3bjNCR1dHR1pJczd4Q3cKbjdpS1dNMTJGZCsyM1Z0dUtMWDBzdnJsUkQxcHdFdUxvRVVGdHN0dEJqZmN6bHJtQkhTWEE4SHFRazE1bVRCWAo5U0ZSc2NpOEVHaTR1MS9UN0JFQ0F3RUFBYU5aTUZjd0RnWURWUjBQQVFIL0JBUURBZ0trTUE4R0ExVWRFd0VCCi93UUZNQU1CQWY4d0hRWURWUjBPQkJZRUZKRFVvYStGQklSeXduaHFPUDViWk1ZSmdWZEJNQlVHQTFVZEVRUU8KTUF5Q0NtdDFZbVZ5Ym1WMFpYTXdEUVlKS29aSWh2Y05BUUVMQlFBRGdnRUJBRWc3WmFMLzJNWE9BNi9qem5wTApqVTA4Z2lBV01Jc2pzWk10V3R2WFNEQ3g0UE10LzAzVENXb0hlYi9BTSszMHpkMXNqOWE5V281akNkdFB0WGtQClFIa3gyNWZheVpwVndiN0d1Qk8xNSsxdUFjRWtJWmhKNnhuT25sZlIyUkF2TTVodXV6RUtTeHRoZ3Nlay9wYlAKeFBYWkdzQS90T3dEbm55L1ZpMzNFVjlLampybVY4d0xLR0htRHVhM05hWjh2aUtBeHVscmNITUZ1ZXloSFdaUQpiSlNyS1FZSDJUaGt3ekw4SHd6cEZ3SEQvVDRTTHpQRkF2VVc5ZkxTVm16V0N2Mkd6RzhvQWR0WHYrQ2YyOXZECmEyMFJvWnE1UDcwdnVZdGF5UXpmM0o2aHBMRGRvUFBYUVRmUVo0NlRJZmlKdjM3RTgycXVYQ0JSNUlvOEI5Z0wKWXE4PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    server: https://192.168.10.160:6443
  name: member1
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUMvakNDQWVhZ0F3SUJBZ0lCQURBTkJna3Foa2lHOXcwQkFRc0ZBREFWTVJNd0VRWURWUVFERXdwcmRXSmwKY201bGRHVnpNQjRYRFRJek1ERXdOVEExTWpNeE5Gb1hEVE16TURFd01qQTFNak14TkZvd0ZURVRNQkVHQTFVRQpBeE1LYTNWaVpYSnVaWFJsY3pDQ0FTSXdEUVlKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDQVFvQ2dnRUJBT0JlCjFRUGhjY3ZPVGRUa1gySE1VOE53WXNiM01CWWNmbG5ERW1ENE9PRE1sNi8xdTRmYVhvc2RFMFNxUTlDYU5pamUKR09OU0lXc01zTlpmWVJ6Tk9mMlBlRXJyeGEwcE12RG5oNnEwSGtqVmQxdVZTNWhrbkNxY00rU0pnYUlhSXl5Zwp0RW00NFFWdFo2MGZhU1cxMFFWQXp5ZWJEYjJ3Wm1zSnhzRE5rbHprYzY4alVIK3N1dmxzMitjb1hnRWo1ditnCnlydjh2SjlPVklIdDlhd2VMU1h1YnhtZVpUOUZ6UDNRandkdTY3NjV3bFVFQ2E5YnZVWEY4MlVuYURnTWhVR1kKR2dqSVQrd09sN0ZGQVVrOFZXMm0xRnNaWlR6bmQwaDloRTI2MkZ1V2YzL29nZlcvbUIyMEo5ZzQ5Q0NoaVFGYQpCY0xUclJuZHhaWU5uZkdIalowQ0F3RUFBYU5aTUZjd0RnWURWUjBQQVFIL0JBUURBZ0trTUE4R0ExVWRFd0VCCi93UUZNQU1CQWY4d0hRWURWUjBPQkJZRUZIblhUUk52VkVxU1dEWUpROTFROGt3Y0I4ZnFNQlVHQTFVZEVRUU8KTUF5Q0NtdDFZbVZ5Ym1WMFpYTXdEUVlKS29aSWh2Y05BUUVMQlFBRGdnRUJBS3lYMmJ4d2cySVYxUEE0OThaNApaU290VFljNFZMc3hvdUNwNUY0U2dGSVIrc0pEWVc5R1RTRFpXbW9aczlQaE4vOFpEdDFQVjJMdU1waG00YStkCm83OW9PME10OHhvMGNsdGQzaUZXWkNRK0lzcHJoNUVTd0VuSmdCYmpDWGxObCs4T256VUJaQVRtZWw4dnY4LysKektITDdTNE03K1NOclN4ZGE1VHkwU2M4Mi8wS0RoUmZDMWtOZkhFMStuNWw4d2JVa1BmNDJkanY1eEFac2pQUwo1d1VTOCs4QXBQM0ZWNkNhRmJBdUlRbXFUL1pDdG9GYUZVVGxwUEFnRjBPa1AzelVXaTBrQzR3eG5vUVRXaW4yCnhEYWkvdmRPU1Qyd2FnU3dKOXRZd3ZsQmg4ZmQwdmM3bDlvMGREeklBYlh4OTBvdkZ0bzVCZ0VsT0FrQ3hTTisKc0E0PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    server: https://192.168.10.163:6443
  name: member2
contexts:
- context:
    cluster: member1
    user: member1-admin
  name: member1
- context:
    cluster: member2
    user: member2-admin
  name: member2
current-context: member1
kind: Config
preferences: {}
users:
- name: member1-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURJVENDQWdtZ0F3SUJBZ0lJR3ljSnc3LytXNGt3RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TXpBeE1EVXdOVEl5TXpKYUZ3MHlOREF4TURVd05USXlNelJhTURReApGekFWQmdOVkJBb1REbk41YzNSbGJUcHRZWE4wWlhKek1Sa3dGd1lEVlFRREV4QnJkV0psY201bGRHVnpMV0ZrCmJXbHVNSUlCSWpBTkJna3Foa2lHOXcwQkFRRUZBQU9DQVE4QU1JSUJDZ0tDQVFFQXl3NEFmd1RYQllzSUZkZkIKcU9tWWZMbEpzS2VLZDdOS1pSZEZ4TmU5ejB6dTVnc1Zudm9HWXlmdkJXdWxTMDZjcDFuTGdOR1ZWUVN4SndKUQo5blo4cEQyV3h2QkVBRkdBdWoxUWtLaXZnMDkwSG1zbFZHbVE2blhDNkxzTm1QdFRSOVdpWnpmWjQyK2t3SGRJCjM1SGlNeEk2aXIva1BoZHBPc3ZaRWZzUGl1cDZpVDF2d1VKbFR4V00zZVF3d2ZRYW1MSHdGYUhpNFZvOTl4TUkKQllsUktpa2FYMFluQkFGZ2RVcEZ6Rk53TnpTWnFoQy9KaE1qQyt1OTVnakx5SENZVXhWU2xBRDc0TDErb1l2WQppNmZkM0RhQWx5VjRZYXRabytxSFhlbW5RdGMveEhwR3gwNVIxdnBZQmVnNGVXL0lhUER0a29UNEtzR0kyNm9DCithczZaUUlEQVFBQm8xWXdWREFPQmdOVkhROEJBZjhFQkFNQ0JhQXdFd1lEVlIwbEJBd3dDZ1lJS3dZQkJRVUgKQXdJd0RBWURWUjBUQVFIL0JBSXdBREFmQmdOVkhTTUVHREFXZ0JTUTFLR3ZoUVNFY3NKNGFqaitXMlRHQ1lGWApRVEFOQmdrcWhraUc5dzBCQVFzRkFBT0NBUUVBVGxwRlBzVW5qTGl4L0dINjMrZUY0ZEFYTmZvdW84bWl2cm1pCmVtSTUySzJZMHYzdlhBRkhHWi9GSDdML1VBMTMycmVGSlFHRmhBMHp1NnF5cUMzaHRWTnFsalQwQ3JkdjFVNnYKbE5KT2lVZnVRTXJkV3lDQ3BsdWxMREtQNnpXY0hpRXFacWx0UGVpVHZpdE5LcURvSXBwYXU3NUxCR2JGYVdxNgpESkRZZlBUL2JqM1RHV0V3VzEzWnczdjlnc3NzOVRSbHd6YzJTTmpOOHdSbktnaEh4N3dBSVlPTE51bzRXcUxwCldXdW5jYjJCRFZKQStUc0t1UTVxTUEvVHpLakVZdHR3S0VrTkdTTCt4eS9jRUIvanV4TnR0SXBkbnBhdWxJU3kKMlpuU2pxSkgrbzBxYjdzekJINlVLWVdscFYvZzVnSDlOb1RwVUxHSkdkSWZnaXRwdUE9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    client-key-data: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFcFFJQkFBS0NBUUVBeXc0QWZ3VFhCWXNJRmRmQnFPbVlmTGxKc0tlS2Q3TktaUmRGeE5lOXowenU1Z3NWCm52b0dZeWZ2Qld1bFMwNmNwMW5MZ05HVlZRU3hKd0pROW5aOHBEMld4dkJFQUZHQXVqMVFrS2l2ZzA5MEhtc2wKVkdtUTZuWEM2THNObVB0VFI5V2laemZaNDIra3dIZEkzNUhpTXhJNmlyL2tQaGRwT3N2WkVmc1BpdXA2aVQxdgp3VUpsVHhXTTNlUXd3ZlFhbUxId0ZhSGk0Vm85OXhNSUJZbFJLaWthWDBZbkJBRmdkVXBGekZOd056U1pxaEMvCkpoTWpDK3U5NWdqTHlIQ1lVeFZTbEFENzRMMStvWXZZaTZmZDNEYUFseVY0WWF0Wm8rcUhYZW1uUXRjL3hIcEcKeDA1UjF2cFlCZWc0ZVcvSWFQRHRrb1Q0S3NHSTI2b0MrYXM2WlFJREFRQUJBb0lCQVFDN3R3UUthTVVISU5LbQpyc0Vma0dRaDJZRWdTS0tmcWlYNmNwdFRNRWNPMzRaek1JZ2FZZldKc1I4c21hbERoemNYRnRJbEVwdkU3d04rCmxvdVdiVThvM3E4RzFwTm0zL0hyT2tmQ2s4ODl5elFEOHZXZHBjSU1ualZEeGJqNlZrMVZPVkJicjZ4RXI2OVYKSm5FK0RiVlpsVjU5YW94c1FtUkxzS3ZLRFpqK3g4SnFhWnhMZkp2eEJPbnBvZ3JpSHhHRjA4Sm5BMTBqZFNlMApnY1Q3dFA4Wk1IeVhiWDVsYkFYQWp3VXJnNTJ2YUFBVEZkOTNUYTkrdDRwcWt5OU93RmZHR0p2bm9VLzRIZ1hqCjVvN0lIdWcxbVNhbXYvSlVvcXRKZW54MzAxVGNNSkxqS1Zlck4wbm85MGExYnpNQThiVzBEaWpiYjl3R043bFkKM0xDdTFMdEJBb0dCQU04NE0rdUJ2c05KbE5pZU9Zd1I1UUh4TjJPV3hnQTBjYSt5S09DYjBsMUpCOE9EK0lhUQpmbVdKTUlLeEpjQUZva0EwT3E3MmFEUlhTeWorcS9hQ2VUUkxPOHFlVjJLSFo5TGRYOW9BNGhqUVFqVm5pbGZSCkJ1dlhKd040bHdLcWR4aVZqN3R2cU0yYmVnZTdRejN2STViQTdIcGNZSnJOZWpmdUdSMDJZcVBaQW9HQkFQcmEKejNjUGFyanN1dGQxK3VQUWdwN0Y1V3Fud05uSUhtWTQ2SVp0YnQ5VnNaN2tRSlJZaHNjdkhMaVhVMmhWQ244agpSOU5WNHNOejQ4azdDU0RpQXdaNFZBYUFOM1N1OFBaNHZ5RFZJZVllK0tVUnJkM1RuRk10NFptc0UvWGlyV29GCmtNSndiK2lLMVJGc1VCU0NTSVBnQjZQOXZ6R3NaV0NnaVczT1I4OXRBb0dBRyt6M0VrWHA3MmQ3SjdZckN6VmUKSjJUYWtoRS9uY2R6aXJuM3lFMDNqRnJMTVE0WDhBcUkvaVgrNDUzNytHVEorTjBSQzRNcGgrUTd2TXFWWWlNegpNbGp4TmQwZzZhWlYxNVQ5MWVOSWxROTczTGFYYmo0OU1JdE9OcW1Kc0ZKSXVvZHRWMVUwNm9DSmNZRkxEbzJyCnZpVkJ1VHU1eVNMbjFhSEF3SzhUbkFFQ2dZRUF2amR6ZitXWjJIWHh5L1d6ZEZJazZmNUgwMU0zSWl6a0dFRm8KMko1Y3AwOVVxNWFLL2JJUEtUU3BRN1BEMUdZLzJsNUhWWkpYckR2UmEwS3Z6bFp6VXRHbGJYU0dHSjJiTEZvdApHOWxocGh5d0VJTlNZdFhXUVNDV1pDK2V4eUhHdTVGU3pvM3gzZFNBY29DK1RIN3FPODJDSGJFSTdNSzc4TVJxCjBXL005aFVDZ1lFQXBWTWxQL24xQ2VKWW12RDZwanNCMy9VaE9UUDlUN0wrWk9LNnlMZEwyNzlqeVRBUm1URGcKOHhWSitZNjZLSXluS3ZFaDlmaGZRZDdtbHJyYmNSK0RwSVdFRXkxN3JQQWpjbkNhVWNZVDJXVGlYcjROWVlmUgpIakdMQ2tLb3hWci9aV2lXUUJ2UVRoemZUd0RRaWVCS2xpT0hoY3h3bnl6Q2dWdm5Wc3hWbDF3PQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQo=
- name: member2-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURJVENDQWdtZ0F3SUJBZ0lJTytGWlFKV2RpYUF3RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TXpBeE1EVXdOVEl6TVRSYUZ3MHlOREF4TURVd05USXpNVFphTURReApGekFWQmdOVkJBb1REbk41YzNSbGJUcHRZWE4wWlhKek1Sa3dGd1lEVlFRREV4QnJkV0psY201bGRHVnpMV0ZrCmJXbHVNSUlCSWpBTkJna3Foa2lHOXcwQkFRRUZBQU9DQVE4QU1JSUJDZ0tDQVFFQTV3OVB5R3EvMloxRnVtMkkKSkU0TmlONStwUnQyY01vV1RXdi9neTB0NmdMRE5yVTFnRFB1aWZ5SmhLM05veHdwWGJXTXY1dUQ5QzlwS3N2UwpjbW1IdUZQVFF6ZWpleGZuYkEwckhZSk9FK1krSWZhM1FZMTgzL0lJUXZGUGozMkJEdVVNZkNtcHFSbitZejVpCk1TVW1pWCtDelkxRC93REVJZ0FtOUZXTEV5cnkxZi8xMjhkVGRGU3JITFpab2xCbG00aWhIUUMxV0JBVFFsVlMKN2pMMmFNTGNPTDl5OXJGMkNVY3pUTTA1K2R2Z2ZFUGw4aVlVRVNieFRtVUFETmRBS2lGSitvZmFrc0RFaGxpMwpNVXNHNitLdFZVR2E0aTJJc3pYMTlNOHFZYWFNdHZyaDFlTHBaTld5NGwwSUVhd3NlaS9ZVm5OUE5hb0Jld3FnCnJ0bHFwd0lEQVFBQm8xWXdWREFPQmdOVkhROEJBZjhFQkFNQ0JhQXdFd1lEVlIwbEJBd3dDZ1lJS3dZQkJRVUgKQXdJd0RBWURWUjBUQVFIL0JBSXdBREFmQmdOVkhTTUVHREFXZ0JSNTEwMFRiMVJLa2xnMkNVUGRVUEpNSEFmSAo2akFOQmdrcWhraUc5dzBCQVFzRkFBT0NBUUVBcHJGdkNIS0k2WHlKbzZ2cTRSUmRqdUFjbHhBeTBQV2Fud2VZCnRKR2lKUlFncXJqaUNNQkZDSEdDcjZnTHY3RzUwSFNSL0UwbnpZWGdzQ2FKUFN4U2ZkSFJiRVRRMldWT2ExSVEKN1hUMnUzT1l4bDhSWXkwR2lNMWRyakxYOHQ4K0xXSVhYdFEzVGVkaFJwNEtvR2J5Z3BuVlJlKzNCOXhsbDFZQQoxRWxJL1QxV0t5Qk0waEdhdHB1Z2l2aXFaNFY2RVJkMzBtUmhmT1dqem5rNi9GTmFIRTRtL1J6cFVtNWZPbURBClVSWElBa05JZlZudENRRkVuejhDWmlaMkVyNG5HV0pwOWV1UU9Scyt5eUlGdkFWZjd5REYrUGV6SDVIUCtBL3YKbktGd0JxTUdyaHN0bEEyUHdvSE9wMnVQa01MKzdSSENQYWRMYVltejNRQWFCdGNyRWc9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    client-key-data: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFb3dJQkFBS0NBUUVBNXc5UHlHcS8yWjFGdW0ySUpFNE5pTjUrcFJ0MmNNb1dUV3YvZ3kwdDZnTEROclUxCmdEUHVpZnlKaEszTm94d3BYYldNdjV1RDlDOXBLc3ZTY21tSHVGUFRRemVqZXhmbmJBMHJIWUpPRStZK0lmYTMKUVkxODMvSUlRdkZQajMyQkR1VU1mQ21wcVJuK1l6NWlNU1VtaVgrQ3pZMUQvd0RFSWdBbTlGV0xFeXJ5MWYvMQoyOGRUZEZTckhMWlpvbEJsbTRpaEhRQzFXQkFUUWxWUzdqTDJhTUxjT0w5eTlyRjJDVWN6VE0wNStkdmdmRVBsCjhpWVVFU2J4VG1VQUROZEFLaUZKK29mYWtzREVobGkzTVVzRzYrS3RWVUdhNGkySXN6WDE5TThxWWFhTXR2cmgKMWVMcFpOV3k0bDBJRWF3c2VpL1lWbk5QTmFvQmV3cWdydGxxcHdJREFRQUJBb0lCQUFNRHNSL0ZQTUdEQ3NEVwo0dnJPUmVEdVBpcTdRLzFPdGFIRzhldHRNSGNvR0JIanBWSUoyMmZUY3B2WGhLSkhJTWNITWxIaG5vUVdCa0kzCnJJUXZta1N1VzBnNk5wakpoQXhsMDVVcitRYkxieTRVUU9uTEJjRUtNRTluUklsenNyWldDS2FxQ0h1YlNqVlQKUUFheUhHR1kxMFVGUGNqYTRyUXEybGMvc25QS2lrMFpkcEZMZlduWUljTTdKSU5TTHZTRkJVWGxHV0hnZi9UbgpBSWNQMFpuWkZ0cHZhdS9MMXk4UUNzY2ZPVWo3YjJFbG5FU2xHRFdnUVcyZDBrdXppQ2dxRmtVZm5HdWVDNExuCnlySUVRSzBSM081TUt4ODM2TWN3TytTcDgrUmtMeitKYlUzTXprelhLVGZBSU5haVFuZ2Q5Zy9JaVpnbUtjUjQKMkFKSFBKa0NnWUVBNjVWTkdORURKaDlsWWlwQWZ6NHVRa1AydmN1VExaajNuVjU0OXlucERZQnFrWnFxSFhXYwpERm1OTWhpdm5VNnprSE02KzY1RWZGOTdQZTkvUmM2QnJrcUhlYWsvcjY2ajdVSVlPVklvR1FvMVZRQ2MyR0NhCnZIVVluL01rOHBRUDdwNHpyUmFxVWFoZm1Jc1JhTlVlZytWMnZsa1krQkNNblRQSTRvRllGSnNDZ1lFQSt4V24KU1RRUmczYWE5N0pwOUFDRTNNVGRHbStPcnExM0lDTU12Q2pKM0c2VFhaOS8wSC96NG1FMlQwMUVIVnIvZStBRQptVmk3VDU1ZWIzRVdRbElsdExKUTdQK1R3YnBheUFMamZqcDVRTGtZUEcvY1UwNnAycFhXOHU0L3dsUk5YbWVmCklkRGFpOTJPNzltOG4rZ1d3b1JzL3g1b21XamE4azkxR1NuV3RPVUNnWUVBa3dIWDJtU1RVbmJGRFR6UWdwYUsKeDA4aDZjM2ZTZFRxcjRrRWN6Zno5ampzUjIvOE4rWHNPc2luRTF2VU9wV2g5OEh3VEoyeW51bjJQZS8xdTluaAprcUZ2YUx2MHdleDQzdFVmeUtVNzRHUStZNHkrVTBmMVJ5VEsrUVVCU1Y2YmtvdW1NNXl4SzhPbDQ4cmtVa2FyCmhDTHN0bHRpK1dsYVZiNjYzSjFhR1lFQ2dZQjU4MWR2OTZrMTkrcG11akk1Ly9LSUk5bmNHQ2p0OEhTMm1DOTgKU0RkYktCM05VRVhOS0FoMWdJL1hUb2p4MVJ2WHQ4T2tFM1BPeFBYTEhOc1oxVHBaSEc2djNhYVBab3JuTUhmNwovRHllVWdoU2VtWkIxQ2d0Y2ErWUNGM1JiZzZ4OXBSVTRWTDBzZVRWM0NTQWFrSjdzY1FhMlZNbWg4WW9BSzI0ClRoanBmUUtCZ0FSUWRsTTZWbVVDTE9iZTgvTFNCckxjbEg1enFwdkx2M2VEeDhuN1BKdTl5aC9jbnAvaFd0ZU0Kd1cyaTUzUTVNUnFManJ5Zk4ra0E0c3BTVk45cTVHVnRYSWE5M1JkOENsc045UEMyMG1OK0pYOUhaUThLb015MQpVNmMybVlyVFhpYm9yNVBPNlB0aUdRaTNkREZWVDhzTnhZd0FzenliankxYjZUQmVDc3lMCi0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tCg==
~~~

~~~powershell
查看可管理的集群
[root@k8s-master01 kubeconfigdir]# kubectl --kubeconfig=config12 config get-clusters
NAME
member2
member1
~~~

~~~powershell
查看可管理的集群上下文
[root@k8s-master01 kubeconfigdir]# kubectl --kubeconfig=config12 config get-contexts
CURRENT   NAME      CLUSTER   AUTHINFO        NAMESPACE
          member1   member1   member1-admin
*         member2   member2   member2-admin
~~~

~~~powershell
查看当前上下文
[root@k8s-master01 kubeconfigdir]# kubectl --kubeconfig=config12 config current-context
member2
~~~

~~~powershell
切换上下文
[root@k8s-master01 kubeconfigdir]# kubectl --kubeconfig=config12 config use-context member1
Switched to context "member1".
~~~

~~~powershell
查看切换后当前上下文
[root@k8s-master01 kubeconfigdir]# kubectl --kubeconfig=config12 config current-context
member1
~~~

### 1.3.3 使用合并后kubeconfig管理多集群

~~~powershell
查看member1集群kube-system命名空间中pod信息

[root@k8s-master01 ~]# kubectl --kubeconfig /root/kubedir/config12 config use-context member1
Switched to context "member1".
[root@k8s-master01 ~]# kubectl --kubeconfig /root/kubedir/config12 config current-context
member1
[root@k8s-master01 ~]# kubectl --kubeconfig /root/kubedir/config12 get pods -n kube-system
NAME                                   READY   STATUS    RESTARTS      AGE
coredns-57575c5f89-4nl9k               1/1     Running   3 (39h ago)   45h
coredns-57575c5f89-9hjsn               1/1     Running   3 (39h ago)   45h
etcd-k8s-master01                      1/1     Running   3 (39h ago)   45h
kube-apiserver-k8s-master01            1/1     Running   5 (39h ago)   45h
kube-controller-manager-k8s-master01   1/1     Running   3 (39h ago)   45h
kube-proxy-4wp45                       1/1     Running   3 (39h ago)   45h
kube-proxy-pxz6p                       1/1     Running   3 (39h ago)   45h
kube-proxy-wvx9g                       1/1     Running   3 (39h ago)   45h
kube-scheduler-k8s-master01            1/1     Running   3 (39h ago)   45h
~~~

~~~powershell
查看member2集群kube-system命名空间中pod信息

[root@k8s-master01 ~]# kubectl --kubeconfig /root/kubedir/config12 config use-context member2
Switched to context "member2".
[root@k8s-master01 ~]# kubectl --kubeconfig /root/kubedir/config12 config current-context
member2
[root@k8s-master01 ~]# kubectl --kubeconfig /root/kubedir/config12 get pods -n kube-system
NAME                                   READY   STATUS    RESTARTS      AGE
coredns-57575c5f89-782l5               1/1     Running   3 (14h ago)   45h
coredns-57575c5f89-9tjcn               1/1     Running   3 (14h ago)   45h
etcd-k8s-master01                      1/1     Running   3 (14h ago)   45h
kube-apiserver-k8s-master01            1/1     Running   4 (12m ago)   45h
kube-controller-manager-k8s-master01   1/1     Running   3 (14h ago)   45h
kube-proxy-5nglp                       1/1     Running   3 (14h ago)   45h
kube-proxy-d7q6c                       1/1     Running   3 (14h ago)   45h
kube-proxy-dhr9d                       1/1     Running   3 (14h ago)   45h
kube-scheduler-k8s-master01            1/1     Running   3 (14h ago)   45h
~~~

# 二、karmada介绍

# 三、karmadactl安装

![image-20221226111731872](/云原生/platform/platform-31-karmada部署及应用/image-20221226111731872.png)

![image-20221226111803270](/云原生/platform/platform-31-karmada部署及应用/image-20221226111803270.png)

![image-20221226111842928](/云原生/platform/platform-31-karmada部署及应用/image-20221226111842928.png)

![image-20221226111919521](/云原生/platform/platform-31-karmada部署及应用/image-20221226111919521.png)

![image-20221226111952632](/云原生/platform/platform-31-karmada部署及应用/image-20221226111952632.png)

~~~powershell
[root@k8s-master01 ~]# wget https://github.com/karmada-io/karmada/releases/download/v1.4.1/karmadactl-linux-amd64.tgz
~~~

~~~powershell
[root@k8s-master01 ~]# tar xf karmadactl-linux-amd64.tgz
~~~

~~~powershell
[root@k8s-master01 ~]# mv karmadactl /usr/local/bin/
~~~

# 四、使用karmadactl创建k8s联绑

~~~powershell
[root@k8s-master01 ~]# cat karmada.sh
karmadactl init \
--namespace='karmada-system' \
--port 30000
--etcd-image='registry.k8s.io/etcd:3.5.3-0' \
--etcd-pvc-size='10Gi' \
--etcd-storage-mode='PVC' \
--storage-classes-name='nfs-client' \
--etcd-replicas=1 \
--karmada-aggregated-apiserver-replicas=1 \
--karmada-apiserver-replicas=1 \
--karmada-controller-manager-replicas=1 \
--karmada-kube-controller-manager-replicas=1 \
--karmada-scheduler-replicas=1 \
--karmada-webhook-replicas=1 \
--karmada-aggregated-apiserver-image='docker.io/karmada/karmada-aggregated-apiserver:latest' \
--karmada-apiserver-image='registry.k8s.io/kube-apiserver:v1.25.5' \
--karmada-controller-manager-image='docker.io/karmada/karmada-controller-manager:latest' \
--karmada-kube-controller-manager-image='registry.k8s.io/kube-controller-manager:v1.25.5' \
--karmada-scheduler-image='docker.io/karmada/karmada-scheduler:latest' \
--karmada-webhook-image='docker.io/karmada/karmada-webhook:latest'
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl get pods -n karmada-system
NAME                                            READY   STATUS    RESTARTS   AGE
etcd-0                                          1/1     Running   0          13h
karmada-agent-7d85f6cc69-x957m                  1/1     Running   0          13h
karmada-aggregated-apiserver-6577d5769f-h8nmp   1/1     Running   0          13h
karmada-apiserver-664446c84c-l5t26              1/1     Running   0          13h
karmada-controller-manager-776f8fcbff-fwjqv     1/1     Running   0          13h
karmada-scheduler-55dfc748b7-bw2t8              1/1     Running   0          13h
karmada-webhook-6cc85d8f86-hr52h                1/1     Running   0          13h
kube-controller-manager-7767d948d4-2s4vx        1/1     Running   0          13h
~~~

~~~powershell
Karmada is installed successfully.

Register Kubernetes cluster to Karmada control plane.

Register cluster with 'Push' mode

Step 1: Use "karmadactl join" command to register the cluster to Karmada control plane. --cluster-kubeconfig is kubeconfig of the member cluster.
(In karmada)~# MEMBER_CLUSTER_NAME=$(cat ~/.kube/config  | grep current-context | sed 's/: /\n/g'| sed '1d')
(In karmada)~# karmadactl --kubeconfig /etc/karmada/karmada-apiserver.config  join ${MEMBER_CLUSTER_NAME} --cluster-kubeconfig=$HOME/.kube/config

Step 2: Show members of karmada
(In karmada)~# kubectl --kubeconfig /etc/karmada/karmada-apiserver.config get clusters

Register cluster with 'Pull' mode

Step 1: Use "karmadactl register" command to register the cluster to Karmada control plane. "--cluster-name" is set to cluster of current-context by default.
(In member cluster)~# karmadactl register 192.168.10.160:30000 --token lw3mto.jv3qeoqtt7hm1vxl --discovery-token-ca-cert-hash sha256:11d5ff60b1fbeba0a4df9926157a4ac86d89ac649b5138a81bd763dbf6a7b7b0

Step 2: Show members of karmada
(In karmada)~# kubectl --kubeconfig /etc/karmada/karmada-apiserver.config get clusters
~~~

~~~powershell
[root@k8s-master01 ~]# karmadactl register 192.168.10.160:30000 --token 2sh3py.li1p4o8gz4wqudrw --discovery-token-ca-cert-hash sha256:b1913d9f6410c2a4e19623223b141000a807cd2b15bbc3096ffc9a1dc39a5fe5
[preflight] Running pre-flight checks
error execution phase preflight: [preflight] Some fatal errors occurred:
        [ERROR]: /etc/karmada/pki/ca.crt already exists

[preflight] Please check the above errors
[root@k8s-master01 ~]# rm -rf /etc/karmada/pki/ca.crt
~~~

~~~powershell
[root@k8s-master01 ~]# karmadactl register 192.168.10.160:30000 --token 2sh3py.li1p4o8gz4wqudrw --discovery-token-ca-cert-hash sha256:b1913d9f6410c2a4e19623223b141000a807cd2b15bbc3096ffc9a1dc39a5fe5 --cluster-name member2
[preflight] Running pre-flight checks
[prefligt] All pre-flight checks were passed
[karmada-agent-start] Waiting to perform the TLS Bootstrap
[karmada-agent-start] Waiting to construct karmada-agent kubeconfig
[karmada-agent-start] Waiting the necessary secret and RBAC
[karmada-agent-start] Waiting karmada-agent Deployment
W1225 22:34:40.053232   14711 check.go:52] pod: karmada-agent-59b4b9c5f9-hgkg4 not ready. status: ContainerCreating
W1225 22:34:41.055969   14711 check.go:52] pod: karmada-agent-59b4b9c5f9-hgkg4 not ready. status: ContainerCreating
W1225 22:34:42.055721   14711 check.go:52] pod: karmada-agent-59b4b9c5f9-hgkg4 not ready. status: ContainerCreating
W1225 22:34:43.056988   14711 check.go:52] pod: karmada-agent-59b4b9c5f9-hgkg4 not ready. status: ContainerCreating
W1225 22:34:44.055803   14711 check.go:52] pod: karmada-agent-59b4b9c5f9-hgkg4 not ready. status: ContainerCreating
W1225 22:34:45.056156   14711 check.go:52] pod: karmada-agent-59b4b9c5f9-hgkg4 not ready. status: ContainerCreating
W1225 22:34:46.056110   14711 check.go:52] pod: karmada-agent-59b4b9c5f9-hgkg4 not ready. status: ContainerCreating
W1225 22:34:47.056636   14711 check.go:52] pod: karmada-agent-59b4b9c5f9-hgkg4 not ready. status: ContainerCreating
W1225 22:34:48.056440   14711 check.go:52] pod: karmada-agent-59b4b9c5f9-hgkg4 not ready. status: ContainerCreating
W1225 22:34:49.056504   14711 check.go:52] pod: karmada-agent-59b4b9c5f9-hgkg4 not ready. status: ContainerCreating
I1225 22:34:50.055580   14711 check.go:49] pod: karmada-agent-59b4b9c5f9-hgkg4 is ready. status: Running

cluster(member2) is joined successfully
~~~

~~~powershell
删除
[root@k8s-master01 ~]# karmadactl  --kubeconfig /etc/karmada/karmada-apiserver.config unjoin member2
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl --kubeconfig /etc/karmada/karmada-apiserver.config apply -f p.yaml
propagationpolicy.policy.karmada.io/example-policy created
~~~

~~~powershell
[root@k8s-master01 ~]# karmadactl --kubeconfig /etc/karmada/karmada-apiserver.config get pods
NAME                                     CLUSTER   READY   STATUS    RESTARTS      AGE
nfs-client-provisioner-dfd8488d7-hhmwh   member1   1/1     Running   3 (18h ago)   23h
nginx-8f458dc5b-fxvml                    member1   1/1     Running   0             37m
nfs-client-provisioner-dfd8488d7-rtmdj   member2   1/1     Running   2 (18h ago)   23h
~~~

~~~powershell
[root@k8s-master01 ~]# karmadactl --kubeconfig /etc/karmada/karmada-apiserver.config get deployment
NAME                     CLUSTER   READY   UP-TO-DATE   AVAILABLE   AGE   ADOPTION
nfs-client-provisioner   member1   1/1     1            1           23h   N
nginx                    member1   1/1     1            1           38m   N
nfs-client-provisioner   member2   1/1     1            1           23h   N
~~~

~~~powershell
[root@k8s-master01 ~]# karmadactl --kubeconfig /etc/karmada/karmada-apiserver.config get  pod -l app=nginx
NAME                    CLUSTER   READY   STATUS    RESTARTS   AGE
nginx-8f458dc5b-fxvml   member1   1/1     Running   0          45m
~~~

更新

~~~powershell
apiVersion: policy.karmada.io/v1alpha1
kind: PropagationPolicy
metadata:
  name: example-policy
spec:
  resourceSelectors:
    - apiVersion: apps/v1
      kind: Deployment
      name: nginx
  placement:
    clusterAffinity:
      clusterNames: # Modify the selected cluster to propagate the Deployment.
        - member2
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl --kubeconfig /etc/karmada/karmada-apiserver.config apply -f p2.yaml
propagationpolicy.policy.karmada.io/example-policy configured
~~~

~~~powershell
[root@k8s-master01 kubedir]# MEMBER_CLUSTER_NAME=$(cat ~/kubedir/config12  | grep current-context | sed 's/: /\n/g'| sed '1d')
[root@k8s-master01 kubedir]# echo ${MEMBER_CLUSTER_NAME}
member1
[root@k8s-master01 kubedir]# karmadactl --kubeconfig /etc/karmada/karmada-apiserver.config  join ${MEMBER_CLUSTER_NAME} --cluster-kubeconfig=$HOME/kubedir/config12
cluster(member1) is joined successfully
[root@k8s-master01 kubedir]# kubectl --kubeconfig=config12 config use-context member2
Switched to context "member2".
[root@k8s-master01 kubedir]# MEMBER_CLUSTER_NAME=$(cat ~/kubedir/config12  | grep current-context | sed 's/: /\n/g'| sed '1d')
[root@k8s-master01 kubedir]# echo ${MEMBER_CLUSTER_NAME}
member2
[root@k8s-master01 kubedir]# karmadactl --kubeconfig /etc/karmada/karmada-apiserver.config  join ${MEMBER_CLUSTER_NAME} --cluster-kubeconfig=$HOME/kubedir/config12
cluster(member2) is joined successfully
~~~

~~~powershell
[root@k8s-master01 kubedir]# kubectl --kubeconfig /etc/karmada/karmada-apiserver.config get clusters
NAME      VERSION   MODE   READY   AGE
member1   v1.24.9   Push   True    96s
member2   v1.24.9   Push   True    59s
~~~

~~~powershell
[root@k8s-master01 nginxdir]# cat n1.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx1                    # deployment名
spec:
  replicas: 1                                   # 副本集,deployment里使用了replicaset
  selector:
    matchLabels:
      app: nginx1                                # 匹配的pod标签,表示deployment和rs控制器控制带有此标签的pod
  template:                                         # 代表pod的配置模板
    metadata:
      labels:
        app: nginx1                              # pod的标签
    spec:
      containers:                               # 以下为pod里的容器定义
      - name: nginx1
        image: nginx:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 80
~~~

~~~powershell
不能这样部署
[root@k8s-master01 nginxdir]# kubectl apply -f n1.yaml
deployment.apps/nginx1 created
~~~

~~~powershell
像下面一样部署
[root@k8s-master01 nginxdir]# kubectl --kubeconfig /etc/karmada/karmada-apiserver.config apply -f n1.yaml
deployment.apps/nginx1 created
[root@k8s-master01 nginxdir]# kubectl get pods
NAME                                     READY   STATUS    RESTARTS      AGE
nfs-client-provisioner-dfd8488d7-hhmwh   1/1     Running   3 (25h ago)   30h
[root@k8s-master01 nginxdir]# kubectl get pods
NAME                                     READY   STATUS    RESTARTS      AGE
nfs-client-provisioner-dfd8488d7-hhmwh   1/1     Running   3 (25h ago)   30h
[root@k8s-master01 nginxdir]# kubectl --kubeconfig /etc/karmada/karmada-apiserver.config get pods
No resources found in default namespace.
~~~

~~~powershell
[root@k8s-master01 nginxdir]# karmadactl --kubeconfig /etc/karmada/karmada-apiserver.config get pods
NAME                                     CLUSTER   READY   STATUS    RESTARTS      AGE
nfs-client-provisioner-dfd8488d7-hhmwh   member1   1/1     Running   3 (24h ago)   30h
nginx1-7bff55d4bd-r927b                  member1   1/1     Running   0             27s
nfs-client-provisioner-dfd8488d7-rtmdj   member2   1/1     Running   2 (24h ago)   30h
~~~

~~~powershell
[root@k8s-master01 pdir]# cat p1.yaml
apiVersion: policy.karmada.io/v1alpha1
kind: PropagationPolicy
metadata:
  name: example-policy # The default namespace is `default`.
spec:
  resourceSelectors:
    - apiVersion: apps/v1
      kind: Deployment
      name: nginx1 # If no namespace is specified, the namespace is inherited from the parent object scope.
  placement:
    clusterAffinity:
      clusterNames:
        - member2
~~~

~~~powershell
[root@k8s-master01 pdir]# kubectl --kubeconfig /etc/karmada/karmada-apiserver.config apply -f p1.yaml
propagationpolicy.policy.karmada.io/example-policy created
~~~

~~~powershell
[root@k8s-master01 pdir]# kubectl --kubeconfig /etc/karmada/karmada-apiserver.config get pods
No resources found in default namespace.
[root@k8s-master01 pdir]# kubectl --kubeconfig /etc/karmada/karmada-apiserver.config get pods
No resources found in default namespace.
[root@k8s-master01 pdir]# kubectl get pods
NAME                                     READY   STATUS    RESTARTS      AGE
nfs-client-provisioner-dfd8488d7-hhmwh   1/1     Running   3 (25h ago)   30h
nginx1-7bff55d4bd-lcbcn                  1/1     Running   0             44s
[root@k8s-master01 pdir]# kubectl --kubeconfig /etc/karmada/karmada-apiserver.config get deployment
NAME     READY   UP-TO-DATE   AVAILABLE   AGE
nginx1   1/1     1            1           3m9s
~~~

~~~powershell
[root@k8s-master01 pdir]# karmadactl --kubeconfig /etc/karmada/karmada-apiserver.config get  pod -l app=nginx1
NAME                      CLUSTER   READY   STATUS    RESTARTS   AGE
nginx1-7bff55d4bd-lcbcn   member1   1/1     Running   0          2m29s
[root@k8s-master01 pdir]# karmadactl --kubeconfig /etc/karmada/karmada-apiserver.config get  pod
NAME                                     CLUSTER   READY   STATUS    RESTARTS      AGE
nfs-client-provisioner-dfd8488d7-hhmwh   member1   1/1     Running   3 (25h ago)   30h
nginx1-7bff55d4bd-lcbcn                  member1   1/1     Running   0             2m40s
nfs-client-provisioner-dfd8488d7-rtmdj   member2   1/1     Running   2 (25h ago)   30h
~~~

更新

~~~powershell
[root@k8s-master01 pdir]# cat p2.yaml
apiVersion: policy.karmada.io/v1alpha1
kind: PropagationPolicy
metadata:
  name: example-policy
spec:
  resourceSelectors:
    - apiVersion: apps/v1
      kind: Deployment
      name: nginx1
  placement:
    clusterAffinity:
      clusterNames: # Modify the selected cluster to propagate the Deployment.
        - member2
~~~

~~~powershell
[root@k8s-master01 pdir]# kubectl --kubeconfig /etc/karmada/karmada-apiserver.config apply -f p2.yaml
propagationpolicy.policy.karmada.io/example-policy configured
~~~

~~~powershell
[root@k8s-master01 pdir]# karmadactl --kubeconfig /etc/karmada/karmada-apiserver.config get  pod
NAME                                     CLUSTER   READY   STATUS    RESTARTS      AGE
nfs-client-provisioner-dfd8488d7-hhmwh   member1   1/1     Running   3 (25h ago)   30h
nfs-client-provisioner-dfd8488d7-rtmdj   member2   1/1     Running   2 (25h ago)   30h
nginx1-7bff55d4bd-fm7kj                  member2   1/1     Running   0             28s
~~~

~~~powershell
[root@k8s-master01 nginxdir]# cat n1.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx1                    # deployment名
spec:
  replicas: 2                                   # 副本集,deployment里使用了replicaset
  selector:
    matchLabels:
      app: nginx1                                # 匹配的pod标签,表示deployment和rs控制器控制带有此标签的pod
  template:                                         # 代表pod的配置模板
    metadata:
      labels:
        app: nginx1                              # pod的标签
    spec:
      containers:                               # 以下为pod里的容器定义
      - name: nginx1
        image: nginx:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 80
~~~

~~~powershell
[root@k8s-master01 nginxdir]# kubectl --kubeconfig /etc/karmada/karmada-apiserver.config apply -f n1.yaml
deployment.apps/nginx1 configured
~~~

~~~powershell
[root@k8s-master01 nginxdir]# karmadactl --kubeconfig /etc/karmada/karmada-apiserver.config get  pod
NAME                                     CLUSTER   READY   STATUS    RESTARTS      AGE
nfs-client-provisioner-dfd8488d7-hhmwh   member1   1/1     Running   3 (25h ago)   30h
nfs-client-provisioner-dfd8488d7-rtmdj   member2   1/1     Running   2 (25h ago)   30h
nginx1-7bff55d4bd-fm7kj                  member2   1/1     Running   0             8m46s
nginx1-7bff55d4bd-llhv2                  member2   1/1     Running   0             5m12s
~~~

