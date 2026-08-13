---
title: "使用Argo CD实施项目发布"
sidebarGroup: "DevOps / GitOps"
shortTitle: "05 使用Argo CD实施项目发布"
order: 5
date: 2026-08-13
category: "云原生"
tag:
  - "DevOps / GitOps"
  - "云原生"
  - "课程笔记"
description: "使用Argo CD实施项目发布 由于 Argo CD 支持部署应用到多集群，所以如果你要将应用部署到外部集群的时候，需要先将外部集群的认证信息注册到 Argo CD 中，如果是在内部部署（运行 Arg..."
---

> **DevOps / GitOps · 第 5 篇**
>
> 来源课程笔记整理优化；插图已迁入博客静态目录。

---

# 使用Argo CD实施项目发布

由于 Argo CD 支持部署应用到多集群，所以如果你要将应用部署到外部集群的时候，需要先将外部集群的认证信息注册到 Argo CD 中，如果是在内部部署（运行 Argo CD 的同一个集群，默认不需要配置），直接使用 https://kubernetes.default.svc 作为应用的 K8S APIServer 地址即可。

# 一、准备kubeconfig文件

> 准备两套K8S集群，一套已部署Argo CD，另一套没有部署Argo CD,把没有部署Argo CD的添加到Argo CD中来。

~~~powershell
[root@k8s-master01 ~]# cat ~/.kube/config
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUMvakNDQWVhZ0F3SUJBZ0lCQURBTkJna3Foa2lHOXcwQkFRc0ZBREFWTVJNd0VRWURWUVFERXdwcmRXSmwKY201bGRHVnpNQjRYRFRJek1UQXpNVEEzTURNeE9Gb1hEVE16TVRBeU9EQTNNRE14T0Zvd0ZURVRNQkVHQTFVRQpBeE1LYTNWaVpYSnVaWFJsY3pDQ0FTSXdEUVlKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDQVFvQ2dnRUJBT0d0ClB5RHNlM25XVGlJTzAzbkRhZERDeGV1SFgyTGhrT080MFZQN1BEVWpldTFmS3NFRGxQQW92MGJaUGtLZEJlVG0KcjAvVUZjWGRTUDJUemFETmFGVTh2QXVzbElrblZiaUJHQm40Q2UvM0NqdWkydjcyVXdQN2V4NktxUEsxbyt5cgpPMW1pbnQ3b0dRZGhOUW9sRzBvaGZ6OWZuNkQwNXE4Uk9QK0NxYUtFR1RnUTc3Y2NxTEV6b0JsQzV1cTQ0NVpaClNSQWk1YlJCVE9GSHRQR1U0NVVGS1VqWktmSWxsVHQwMHpYejB3VGIrV01vV3o2TDdZT3FUeGs4ejdBUlZjVkcKb0FxVmQrVWR4OG4xby9ka25oalFWc3hmWUdoanJJbW1aL09RZ3lZTzhUVi9zbGoxMFlHQmtYdVdYVTNEY1VreQpkaVhiTk5jcTBpelRMbEx3dTBFQ0F3RUFBYU5aTUZjd0RnWURWUjBQQVFIL0JBUURBZ0trTUE4R0ExVWRFd0VCCi93UUZNQU1CQWY4d0hRWURWUjBPQkJZRUZONnNCZHdsTTJpclhBT3hDSTJSMzBGUmVZQ1hNQlVHQTFVZEVRUU8KTUF5Q0NtdDFZbVZ5Ym1WMFpYTXdEUVlKS29aSWh2Y05BUUVMQlFBRGdnRUJBSmY5Q1ZqOXdzbU0xYlhCRjFTeApXcmphVWdqMUFvMTZLSTk3WllvK2F2cXdlNSs1Z0s3RldjSDd1eGlLMDAweU5vc2U4TUJXMFU2bmIxYXI1SVh6CnFySldLUkN5NjZ4R1JnaFhXaUZiWWpETWVyaFR2eVFmYytvbGNBWmh4aUNaMzRIK3dkek5JU3pjcHJYYXVlMnkKUWNwdUtjMzFibGpwYi9UOE5zV0Z4TTVqczR5b1RtSmZteHJmVDdpT2c5SmZzQkNnREtsQ2tyVFNxQTd0MC9QOApZNGpqSmpoNlU1QnR5b1FPOEtjZXFKRU5mcjZqU09uWjRuQzRlRy80THBMQ3BBUy9IRVgxZ1ZtSWlEekQ4dDZ4CjNzS3AwTEt3bGRVcVAzOWxJVVRObCswT3lUZzRpYzAyRDROSDI1bEhlemZsS1NRU0FWSjBnSkJrRFczdC9rN20KSFc0PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    server: https://192.168.10.160:6443
  name: cluster1
contexts:
- context:
    cluster: cluster1
    user: cluster1-admin
  name: cluster1
current-context: cluster1
kind: Config
preferences: {}
users:
- name: cluster1-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURJVENDQWdtZ0F3SUJBZ0lJQWw5TUJPU0dUejR3RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TXpFd016RXdOekF6TVRoYUZ3MHlOREV3TXpBd056QXpNVGxhTURReApGekFWQmdOVkJBb1REbk41YzNSbGJUcHRZWE4wWlhKek1Sa3dGd1lEVlFRREV4QnJkV0psY201bGRHVnpMV0ZrCmJXbHVNSUlCSWpBTkJna3Foa2lHOXcwQkFRRUZBQU9DQVE4QU1JSUJDZ0tDQVFFQXUyODcvdEp5dFFvbWxtR1cKdXJIdHYxc0lKd3VQNWZhZmxiVEUrRWdLWHordnpsc1krYzZ3NWtXSm84M0k3aFhjOXpTbXAzcmNDZ1NuQTJxVQpKenFFMFcxU29Ialp2WHoxN2RSR1k1dXE1TlBaQVhBZ1RJS21GVDRvT2JHMi94QVF2NE1OdFBQRUNjU0NLbDlhCjYrc3JuaHdZNCszTjJBN0hKZ0xYTjhQTlRaUjNSU3VSZVVHOFlFRWs3d2J4eVhMbUk3Q1IrT0lEQTZvdjB6dVoKWlgyOFdTakpwVyszMDVBUDRQZ0xrT0VzY0M0eVROcG5tc29oUEh4MHc4eTFLM0JPcFpwRWh3K1JtV0VUWklpbwpjcDJOd0RjdG95QUFLUnlhaWNWTzFsZHFnSExIMklSVmk0amZQUk5VYlZYZ1ZleXVWMHFXdy80T2lMYkd3Y3QxCjJDWGFud0lEQVFBQm8xWXdWREFPQmdOVkhROEJBZjhFQkFNQ0JhQXdFd1lEVlIwbEJBd3dDZ1lJS3dZQkJRVUgKQXdJd0RBWURWUjBUQVFIL0JBSXdBREFmQmdOVkhTTUVHREFXZ0JUZXJBWGNKVE5vcTF3RHNRaU5rZDlCVVhtQQpsekFOQmdrcWhraUc5dzBCQVFzRkFBT0NBUUVBQzUrVnJMUkJJd3ZBa2lJUVFOS3hjeS9vZjZXTGxCZVprUlRGClAxMVZDTkNIVE9UQkdlS0RNZ2h0LzZuZ1FTekpNS1F2c0JrYndwYS8wVldEd1lWa1QyWHZpVW50MFJQTS9zWlQKZHNlbEkvN1UxVmxwWDBKeVFCdlRQaGJMdjZSaXRCNG5SSjJ5REN3TDVLV2U4UnRId0w3elRXSXJNUnZ4WmUvQwpoREVpNGtsbmZYbzcvSi9pZWV1YWtUTzI2bk54S3ZhbEltcGxyT1RpU0ZEYVllb25Pek5MVkNNMDdObkpDNUxCCmZ6aXZWVDMzekpKMGtOMVh3bGlqSCtXYUF3SkdiMzhkbEN1OS9uY2RDYmQ5Rm9ubnNzTWxTTmxZMXpGZW1Cc24KczVnaDNha2s0TStMOXVkdFo3M2YrUi9JK2Z5OGk2bFl2OVJxelhDQWJaZFFBWXRPeEE9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    client-key-data: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFb3dJQkFBS0NBUUVBdTI4Ny90Snl0UW9tbG1HV3VySHR2MXNJSnd1UDVmYWZsYlRFK0VnS1h6K3Z6bHNZCitjNnc1a1dKbzgzSTdoWGM5elNtcDNyY0NnU25BMnFVSnpxRTBXMVNvSGpadlh6MTdkUkdZNXVxNU5QWkFYQWcKVElLbUZUNG9PYkcyL3hBUXY0TU50UFBFQ2NTQ0tsOWE2K3Nybmh3WTQrM04yQTdISmdMWE44UE5UWlIzUlN1UgplVUc4WUVFazd3Ynh5WExtSTdDUitPSURBNm92MHp1WlpYMjhXU2pKcFcrMzA1QVA0UGdMa09Fc2NDNHlUTnBuCm1zb2hQSHgwdzh5MUszQk9wWnBFaHcrUm1XRVRaSWlvY3AyTndEY3RveUFBS1J5YWljVk8xbGRxZ0hMSDJJUlYKaTRqZlBSTlViVlhnVmV5dVYwcVd3LzRPaUxiR3djdDEyQ1hhbndJREFRQUJBb0lCQUJXZ2ppR25Fc2xFOUpMaAppOHphL3YzWGVTZFlOREJxdHB0RmtueTdnMGJlU0dEZExoS1ZBT0J4SWFLZStoSk92NEpldHVRWVR3OXczZnlNCjdhOWhGelk3RVErbklpaTFKSU5ldlFoOVM4aS9rUWlUY1lhaWhKdHE0cVZWbGpIMEhwcWFlcGhva0RRNFVuU2wKTUE2TXdpbXFRRXo4Z1lYdW5wZ0tOOThkWHJFV3YrV1hkeVJ5NHpaWEN0K3N2Q2FDWWNGemJDNHpja1ZUYUxSNwpJeXBiZk9RQWJ5UDVDZnQ0MURDUmd2Ri9tOEdzVWdKaFpqWDdlWnE3MzliSlVNNVI5YTd5QjNqNWExcUhNRHpMClprVDgvSkFaWHRqLzg4dDQyOVYrWTBPbzh5VEJOUUs3bkN3SEk2ZXF1a3lsM1c4S0hqYjdEUy9McWliOHFZZm8KZHduZmRMRUNnWUVBM3B3RkNJbkMvV0RjZEI5TDFoUjNLeUNOTjk0VE9IVm9RY2FmejArdWxCRlRuUE5hdVNxNgphenhudVl2MXFlYjFmS3NrcWlIOXFiWURDTWNOdlhoRUFqK3pEaFhKVmF6eXlnTGEwclJhRDBQQlBVZ1paN0RUCmNoelc1WEhkUUprTmprZFIzdlB1a0psendobFo1dmRaK0pjb2MxRDEweWY3eEhGZ1doYWtQbTBDZ1lFQTE0eUkKTmhDcnBiT05pMm0xc3BWcDhzNzJ2dDJMclh1M2Q5WXRjR1A5Rm84RC9UZ2l2YVMrb2x4M1NRdzJzSm5mOU5pago2Y1h0ZEVTdVNCU0tLNElQUUlUSml2bDRkaWMvOHZ6eGdZQ3M3ZFBPRDdEOGpFMVdZbDdva0MvY2xSZ1FtVi9pCnJIL0xFU0pLUXhCNWtWZEdvZkZoa3dCeGMwZ2dFL2RpUmtPd3Bic0NnWUJWMlNGdnk0RHhLanVhWkw5Z1RnQXYKRjV5ZVlQeFVsNktmU3pReVJPNTBsOElCRXpCM25Hek1FajJHSnQyVXFrY2R6dnFTeWcwRE4vZ3ZtR1JLSDJsSwozTG4yd3B3a2VGQWhhN3hyNmJXWmtXMmlibjJ0cVZuQjlqRkJ4d21tY2QveWNMcTRHcVowQ1ZuRkR2WEd4cmxoCnp4bUFiMForS2p0RDVOMWRvTUd5ZVFLQmdRQzJmZGE4MzNSVHdDYndoN2s3ejJCNklGdXIwT3AzSUsxK21paXkKWlJWYnlnMjRqNVJxTjFibkk1NGlqR0twTmozMGtJNkdWL3JvVzFXcTFTaitHUWxNdUovaU44Q1RXRHUrUUFWQQpmVzdybEUxNzMzNlNVcy8yVFNCZEl3aUFlblZqUlZrbWJyUEFkK1dqemdqKzBvT01qRTd1Skl2bzdJR3NKZUJnCldPTHdEUUtCZ0NCRjcrdmo2em1KNVRTYy82bVNYVjhJYXlPSEwwM0NLZXBTVlNpRmVHL3pZNTQwTG9Ia0kwd20KMHhMUFV2Q294VUtQRnJVdFBFLzNUeU9PNVRnTnRLUi9oWnArNDc1VnJKdGNuNXJ3bDFpM1FnbDFsMWtCZjRNRwpCOS90Q0F2WTFOdVZhM0tTTDdGZXF3NmRUbGlwa3FURStueStTeUZ5WjkvN0o3WTJKUzV0Ci0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tCg==
~~~

~~~powershell
[root@k8s-master01 ~]# cat ~/.kube/config
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUMvakNDQWVhZ0F3SUJBZ0lCQURBTkJna3Foa2lHOXcwQkFRc0ZBREFWTVJNd0VRWURWUVFERXdwcmRXSmwKY201bGRHVnpNQjRYRFRJek1URXhOVEV6TXpFeU5Gb1hEVE16TVRFeE1qRXpNekV5TkZvd0ZURVRNQkVHQTFVRQpBeE1LYTNWaVpYSnVaWFJsY3pDQ0FTSXdEUVlKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDQVFvQ2dnRUJBTHhSCmxlQUswNzluMG80eUphdGdHdEtMOEU1WGNZSFNLdUdSUTVhQ1V6M0ZwQitJY1ZMdk1HOWFmUGs1V1IzZS9MV3QKOVRWbTAzN3lTQmdMMmZGN1BzSnZ4M2drNUh4RXJJZjhlaEpJZGpGWnFocUVES1liLzArb1dqaEhiemNVQ0JxSgpRNFQzWHB3M3RKenA0MU44dVlvemNpWHM0elE3NHplWVVnOUZNYXByVE5VRnRhbkdZZnF0NThhQXMyQ0w5NG9OCnYrMnlSWFRxSGFaOFJCelNORlFNblZoc0pXZUl2M1AvV0V6VldFRmpkaGl2VUVUdkp5bjNMOVVuSGpFVFppYjEKTTd6eFFhemlNMVo4VXpUMzFTbTlJMjJqVmN3WGVrRnJtYTFKdVA1cDVaTUVUUVp3dks2OXlYYzQ2dXZ4ZWJhaApQWUpsL1JHOS84dGlhSmNYVk5FQ0F3RUFBYU5aTUZjd0RnWURWUjBQQVFIL0JBUURBZ0trTUE4R0ExVWRFd0VCCi93UUZNQU1CQWY4d0hRWURWUjBPQkJZRUZEVkMyb0NiOExnVTVlVUY5cWNrWVE1NUxiZm1NQlVHQTFVZEVRUU8KTUF5Q0NtdDFZbVZ5Ym1WMFpYTXdEUVlKS29aSWh2Y05BUUVMQlFBRGdnRUJBSTBkdkNITUhtZEs3R0hRVmZzMAo3NkZhOHBmVEs1TkVuSEhvdlQzWXhNeHdEWjR3TXlFTVFHcjJGMXp4YmJkYk9qSTJqaFdrWWp1MGF4bmtOd1BZCmt3SWpjcG0wZ1BkNTVrQjBMamJqOFQxTTRtVnhHazhoNXp3Y1E4dFR2TWlsQzRkelV6QUI3ZkU3cXVVQ0pXSUUKaGRpbC82RGt0SUthRkMySlNneW8zYmZjazJvRzVxMHJHNUtHRGxNTEVOV1NCNmZyVlJmNExKelJkdmxUMVhBWQpJSk9FbGRGTHY4ZkJJMWJ1NkQ4ZEdReE9BbmxUblZaWFNMb01QWmZiSnlZcjg4a1VCci9pbFRCS0VlRWF6ZUQ4CkhwbjNsWmtQK3dqT3had29tY0YyRjJ5Q09SRlhLMjNKVzZJbU9WZjZKczI4SU1jd043Rk5lbTd4K2V0R0ZDcmoKWlNzPQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    server: https://192.168.10.140:6443
  name: cluster2
contexts:
- context:
    cluster: cluster2
    user: cluster2-admin
  name: cluster2
current-context: cluster2
kind: Config
preferences: {}
users:
- name: cluster2-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURJVENDQWdtZ0F3SUJBZ0lJUnlkeG5tMERUVE13RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TXpFeE1UVXhNek14TWpSYUZ3MHlOREV4TVRReE16TXhNalZhTURReApGekFWQmdOVkJBb1REbk41YzNSbGJUcHRZWE4wWlhKek1Sa3dGd1lEVlFRREV4QnJkV0psY201bGRHVnpMV0ZrCmJXbHVNSUlCSWpBTkJna3Foa2lHOXcwQkFRRUZBQU9DQVE4QU1JSUJDZ0tDQVFFQXRHVllZMFR0SEwxVnBtTkQKdGplTlpObjh4OGE4MjQ0OS9GWmtaOHB2czQwZ2tXTUNyNGNHT0RlVitHRFErS2ZIdnpHT21EUHhydjJLZGJYUApUejkzQnE0aWF4NkpTajRYZ3lOdFgwdVZuTCt1U2Fpcng0dG85dmltQnFNaEhnbzQxTjYrTUE5bzYxeDl5RVVsCmVBVWFPZHdaVWtBbTRXVWl3Zk9VK1JrSHFFMGJXZThxSkJHS3VXUHhESXcxUzVLRjFsaUtwRno0T3FFVmd3RloKdG5yRW1OUW5aaE95YW1YUTRYTFZSWU5jTDZuMStWMlBBYUZWOFZCa28zK0EwOWVsYXpORXVucW5TR2J3Wm5OUQorVldsREF0SkxxVkppS3ZhbGgrRlhQUDJlY1VsYlNaY3FYbjhVNllsbTUzZlZHZlc1V2NHSi91aVhTSmh0d0lXCitSQk9hd0lEQVFBQm8xWXdWREFPQmdOVkhROEJBZjhFQkFNQ0JhQXdFd1lEVlIwbEJBd3dDZ1lJS3dZQkJRVUgKQXdJd0RBWURWUjBUQVFIL0JBSXdBREFmQmdOVkhTTUVHREFXZ0JRMVF0cUFtL0M0Rk9YbEJmYW5KR0VPZVMyMwo1akFOQmdrcWhraUc5dzBCQVFzRkFBT0NBUUVBWHRLVmZoQUJ6V1R3enZHT3Iwc0dGaEdKTWxnUmN4TklOeXF3CjJpN3lEK2NZVTBaVmFkRElvalFXdmlSMjZvYkRFYXNGM25JcUp2OVZYRDFEbkt2NW5Tc1BaRG9wUU8wRW5WdUUKMG5OQld2RmVPOXlmSzc4bFR1ekhxWFd4OUQ0MmxwUTh0QnlNcjcwTnpDbys5UVpqU1ZHQ2dUQk9OSDZYNm1tQwp4MDlKVTl5NTZFYThmK2NVZFVjeGErampvM0xsNU1zNERTSjBIcmdtQjc5anVMaGx2eUVPWWI3ZUpIOGVJM3JYCmhaZ0ZteGxDSjBiSVlUcWE3YTBLSW1zV2VGYWp5WlBJWDBGSlVZTVJnN3BUWnlFQjM3SW1lN05xKy9wUHNtQTMKTVduNEdBSVFZczRDV3NiZFIza1FybDNKNDloWEVhSjUrWmh1Nzh4RXhqT3ZkekdqTlE9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    client-key-data: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFcEFJQkFBS0NBUUVBdEdWWVkwVHRITDFWcG1ORHRqZU5aTm44eDhhODI0NDkvRlprWjhwdnM0MGdrV01DCnI0Y0dPRGVWK0dEUStLZkh2ekdPbURQeHJ2MktkYlhQVHo5M0JxNGlheDZKU2o0WGd5TnRYMHVWbkwrdVNhaXIKeDR0bzl2aW1CcU1oSGdvNDFONitNQTlvNjF4OXlFVWxlQVVhT2R3WlVrQW00V1Vpd2ZPVStSa0hxRTBiV2U4cQpKQkdLdVdQeERJdzFTNUtGMWxpS3BGejRPcUVWZ3dGWnRuckVtTlFuWmhPeWFtWFE0WExWUllOY0w2bjErVjJQCkFhRlY4VkJrbzMrQTA5ZWxhek5FdW5xblNHYndabk5RK1ZXbERBdEpMcVZKaUt2YWxoK0ZYUFAyZWNVbGJTWmMKcVhuOFU2WWxtNTNmVkdmVzVXY0dKL3VpWFNKaHR3SVcrUkJPYXdJREFRQUJBb0lCQUgyZW1TYy9oekpkTWppVQpwVUZOZS91L3hNUkZRNXhNZUNPdzhXaEpVdkdnbEE1SitVUEw3ZXZWNFd3OTF5ZGdocnRBUWtFQTR3cnRhYTdBCmRXV0ZGMWlpaURzNTMzYkF1RlRNcGN3WGNVN2ZOL241SiszanlhczV5VHVUKzJyVXlYQ0t6N3ZkN3p6K2dtU2sKcWd2aTJibHk2SHNiU3pmbjJvVmZIdDA3cmRabTl5RkpKeXU0S2tjV04wR3JmcndIZE5zQk11SFg5cVRtOUl5cwp5QzNWNGF5QjF4cHVnaUtOZitMbjRobWVhOW0zTXo3WVJyRVo5SGlOYzZyYVVTYUlEbDhJcExaWlNlRFcvTEZZCkU2ajV0UGFDZThlSThDQUtnYW5saHFVWXh6eHZJcDhFZGhxOXhaSmV6SGo3MTRzYXJBY1JiOURod3RTK2pCSVoKUmxBQnhLRUNnWUVBNk85QkFIbnBNRER5SG82bDV5SDJYSk1zSTNSNUJJQXA4WjFLMW03bUtXbTYxRU1yaFFaQwpiRms3TS95ajZsRjgwNkFEV0pnRzMzdm82N2l3ZWNsbmdONHk1MjZ4Z0QvUkRxT2pIcWt0NTVtaHNIVWZnUThzCmhaZ0FTaUdXdkQrVmV0dS9NTnBZSERQcHdZRGYwckxIZU45TTgzemlCNUkrVHZrVTZIaVJodnNDZ1lFQXhrSkUKbkxYVnJsd1ZBWHVySDMwYktSamR6YnBxNFQyQ3dyTEJLUkh1V1hZS0I2WGorOTFjZWxzNEpXUUswSStRa1c3eQpLNkp6clBEUU1jM1kxcVlMUWJzV3YybGI0OEllc2JiQ2dQYWdOYXNNaHl3cVNlbmVYcGwxY01QclI3ZUhMSVdqCnM4OVZ3QTh5Y3ZpSFE2Q0ZLUm1Oak9jZnRacGd3d2g2N2xWZWUxRUNnWUErb3UrUXlEZUxiTzMraDQ5WEtzdkwKc3d1Z2NSYUZ2azBKR3FuZ0phd2dvTHpMalZCcmtmWlVtbDRRS2JTT011RmxLdGNiZ0s0QWRKcDZvSXhjQTJ1Zwp2SjlsbWwrQ3hDWmNVR1p4dlQ2SjA4Y2w0eWpZbEpMOVRaVnVXYi9sMlJkQ0ZVdEJRTVdHdC9MNHhNWHJLNFgyCkc5M2ViOHQ4QzdoVGxpa29KaHZEOXdLQmdRQ1hTeUxJNUFvNGtKU0hHVFN4UnV0ZkpWYStGREJUeW5qcTB6YU0KZk42QzdvMGc0UHRsekxzeHRFTFlaY3ZLOUlQQ09BUWVRRTQ5LzFjaGFwQzYzT05pT2I5V09yU2d6aFpXVDcyRwpaSzVGeGs0OUtQcnNoTWZwTVBwcUgxaUExaEVWYkxaTUZVQysyOW9IMnBoK2h4U1hGS1RzamNPbzlqSTVJMU9NClpTRkF3UUtCZ1FEaXY0SGtkSDEzbUdaSTA1MTlLa1F2Uk94NlVVUFlRZWJrSWxsZFpzVC9zYkd6c1l6MTRVU24KTlU2YVIvOHRuZXRHdmg3SUlzbWV4QmdHVlR4aUkyYW1CTk82SjFQTTNrRmlqNGZzSjFoVlJvcVBKTUovekhZUwo2QXduaXlyOGdBMWRqUnFZRjV3ZXpqOXJOOFdJb0IzQnMzeXZUSWtMc1dKZTBnOFJhdjNqQ0E9PQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQo=
~~~

**合并后的文件**

~~~powershell
[root@k8s-master01 ~]# cat k8s-config
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUMvakNDQWVhZ0F3SUJBZ0lCQURBTkJna3Foa2lHOXcwQkFRc0ZBREFWTVJNd0VRWURWUVFERXdwcmRXSmwKY201bGRHVnpNQjRYRFRJek1UQXpNVEEzTURNeE9Gb1hEVE16TVRBeU9EQTNNRE14T0Zvd0ZURVRNQkVHQTFVRQpBeE1LYTNWaVpYSnVaWFJsY3pDQ0FTSXdEUVlKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDQVFvQ2dnRUJBT0d0ClB5RHNlM25XVGlJTzAzbkRhZERDeGV1SFgyTGhrT080MFZQN1BEVWpldTFmS3NFRGxQQW92MGJaUGtLZEJlVG0KcjAvVUZjWGRTUDJUemFETmFGVTh2QXVzbElrblZiaUJHQm40Q2UvM0NqdWkydjcyVXdQN2V4NktxUEsxbyt5cgpPMW1pbnQ3b0dRZGhOUW9sRzBvaGZ6OWZuNkQwNXE4Uk9QK0NxYUtFR1RnUTc3Y2NxTEV6b0JsQzV1cTQ0NVpaClNSQWk1YlJCVE9GSHRQR1U0NVVGS1VqWktmSWxsVHQwMHpYejB3VGIrV01vV3o2TDdZT3FUeGs4ejdBUlZjVkcKb0FxVmQrVWR4OG4xby9ka25oalFWc3hmWUdoanJJbW1aL09RZ3lZTzhUVi9zbGoxMFlHQmtYdVdYVTNEY1VreQpkaVhiTk5jcTBpelRMbEx3dTBFQ0F3RUFBYU5aTUZjd0RnWURWUjBQQVFIL0JBUURBZ0trTUE4R0ExVWRFd0VCCi93UUZNQU1CQWY4d0hRWURWUjBPQkJZRUZONnNCZHdsTTJpclhBT3hDSTJSMzBGUmVZQ1hNQlVHQTFVZEVRUU8KTUF5Q0NtdDFZbVZ5Ym1WMFpYTXdEUVlKS29aSWh2Y05BUUVMQlFBRGdnRUJBSmY5Q1ZqOXdzbU0xYlhCRjFTeApXcmphVWdqMUFvMTZLSTk3WllvK2F2cXdlNSs1Z0s3RldjSDd1eGlLMDAweU5vc2U4TUJXMFU2bmIxYXI1SVh6CnFySldLUkN5NjZ4R1JnaFhXaUZiWWpETWVyaFR2eVFmYytvbGNBWmh4aUNaMzRIK3dkek5JU3pjcHJYYXVlMnkKUWNwdUtjMzFibGpwYi9UOE5zV0Z4TTVqczR5b1RtSmZteHJmVDdpT2c5SmZzQkNnREtsQ2tyVFNxQTd0MC9QOApZNGpqSmpoNlU1QnR5b1FPOEtjZXFKRU5mcjZqU09uWjRuQzRlRy80THBMQ3BBUy9IRVgxZ1ZtSWlEekQ4dDZ4CjNzS3AwTEt3bGRVcVAzOWxJVVRObCswT3lUZzRpYzAyRDROSDI1bEhlemZsS1NRU0FWSjBnSkJrRFczdC9rN20KSFc0PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    server: https://192.168.10.160:6443
  name: cluster1
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUMvakNDQWVhZ0F3SUJBZ0lCQURBTkJna3Foa2lHOXcwQkFRc0ZBREFWTVJNd0VRWURWUVFERXdwcmRXSmwKY201bGRHVnpNQjRYRFRJek1URXhOVEV6TXpFeU5Gb1hEVE16TVRFeE1qRXpNekV5TkZvd0ZURVRNQkVHQTFVRQpBeE1LYTNWaVpYSnVaWFJsY3pDQ0FTSXdEUVlKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDQVFvQ2dnRUJBTHhSCmxlQUswNzluMG80eUphdGdHdEtMOEU1WGNZSFNLdUdSUTVhQ1V6M0ZwQitJY1ZMdk1HOWFmUGs1V1IzZS9MV3QKOVRWbTAzN3lTQmdMMmZGN1BzSnZ4M2drNUh4RXJJZjhlaEpJZGpGWnFocUVES1liLzArb1dqaEhiemNVQ0JxSgpRNFQzWHB3M3RKenA0MU44dVlvemNpWHM0elE3NHplWVVnOUZNYXByVE5VRnRhbkdZZnF0NThhQXMyQ0w5NG9OCnYrMnlSWFRxSGFaOFJCelNORlFNblZoc0pXZUl2M1AvV0V6VldFRmpkaGl2VUVUdkp5bjNMOVVuSGpFVFppYjEKTTd6eFFhemlNMVo4VXpUMzFTbTlJMjJqVmN3WGVrRnJtYTFKdVA1cDVaTUVUUVp3dks2OXlYYzQ2dXZ4ZWJhaApQWUpsL1JHOS84dGlhSmNYVk5FQ0F3RUFBYU5aTUZjd0RnWURWUjBQQVFIL0JBUURBZ0trTUE4R0ExVWRFd0VCCi93UUZNQU1CQWY4d0hRWURWUjBPQkJZRUZEVkMyb0NiOExnVTVlVUY5cWNrWVE1NUxiZm1NQlVHQTFVZEVRUU8KTUF5Q0NtdDFZbVZ5Ym1WMFpYTXdEUVlKS29aSWh2Y05BUUVMQlFBRGdnRUJBSTBkdkNITUhtZEs3R0hRVmZzMAo3NkZhOHBmVEs1TkVuSEhvdlQzWXhNeHdEWjR3TXlFTVFHcjJGMXp4YmJkYk9qSTJqaFdrWWp1MGF4bmtOd1BZCmt3SWpjcG0wZ1BkNTVrQjBMamJqOFQxTTRtVnhHazhoNXp3Y1E4dFR2TWlsQzRkelV6QUI3ZkU3cXVVQ0pXSUUKaGRpbC82RGt0SUthRkMySlNneW8zYmZjazJvRzVxMHJHNUtHRGxNTEVOV1NCNmZyVlJmNExKelJkdmxUMVhBWQpJSk9FbGRGTHY4ZkJJMWJ1NkQ4ZEdReE9BbmxUblZaWFNMb01QWmZiSnlZcjg4a1VCci9pbFRCS0VlRWF6ZUQ4CkhwbjNsWmtQK3dqT3had29tY0YyRjJ5Q09SRlhLMjNKVzZJbU9WZjZKczI4SU1jd043Rk5lbTd4K2V0R0ZDcmoKWlNzPQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    server: https://192.168.10.140:6443
  name: cluster2
contexts:
- context:
    cluster: cluster1
    user: cluster1-admin
  name: cluster1
- context:
    cluster: cluster2
    user: cluster2-admin
  name: cluster2
current-context: cluster1
kind: Config
preferences: {}
users:
- name: cluster1-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURJVENDQWdtZ0F3SUJBZ0lJQWw5TUJPU0dUejR3RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TXpFd016RXdOekF6TVRoYUZ3MHlOREV3TXpBd056QXpNVGxhTURReApGekFWQmdOVkJBb1REbk41YzNSbGJUcHRZWE4wWlhKek1Sa3dGd1lEVlFRREV4QnJkV0psY201bGRHVnpMV0ZrCmJXbHVNSUlCSWpBTkJna3Foa2lHOXcwQkFRRUZBQU9DQVE4QU1JSUJDZ0tDQVFFQXUyODcvdEp5dFFvbWxtR1cKdXJIdHYxc0lKd3VQNWZhZmxiVEUrRWdLWHordnpsc1krYzZ3NWtXSm84M0k3aFhjOXpTbXAzcmNDZ1NuQTJxVQpKenFFMFcxU29Ialp2WHoxN2RSR1k1dXE1TlBaQVhBZ1RJS21GVDRvT2JHMi94QVF2NE1OdFBQRUNjU0NLbDlhCjYrc3JuaHdZNCszTjJBN0hKZ0xYTjhQTlRaUjNSU3VSZVVHOFlFRWs3d2J4eVhMbUk3Q1IrT0lEQTZvdjB6dVoKWlgyOFdTakpwVyszMDVBUDRQZ0xrT0VzY0M0eVROcG5tc29oUEh4MHc4eTFLM0JPcFpwRWh3K1JtV0VUWklpbwpjcDJOd0RjdG95QUFLUnlhaWNWTzFsZHFnSExIMklSVmk0amZQUk5VYlZYZ1ZleXVWMHFXdy80T2lMYkd3Y3QxCjJDWGFud0lEQVFBQm8xWXdWREFPQmdOVkhROEJBZjhFQkFNQ0JhQXdFd1lEVlIwbEJBd3dDZ1lJS3dZQkJRVUgKQXdJd0RBWURWUjBUQVFIL0JBSXdBREFmQmdOVkhTTUVHREFXZ0JUZXJBWGNKVE5vcTF3RHNRaU5rZDlCVVhtQQpsekFOQmdrcWhraUc5dzBCQVFzRkFBT0NBUUVBQzUrVnJMUkJJd3ZBa2lJUVFOS3hjeS9vZjZXTGxCZVprUlRGClAxMVZDTkNIVE9UQkdlS0RNZ2h0LzZuZ1FTekpNS1F2c0JrYndwYS8wVldEd1lWa1QyWHZpVW50MFJQTS9zWlQKZHNlbEkvN1UxVmxwWDBKeVFCdlRQaGJMdjZSaXRCNG5SSjJ5REN3TDVLV2U4UnRId0w3elRXSXJNUnZ4WmUvQwpoREVpNGtsbmZYbzcvSi9pZWV1YWtUTzI2bk54S3ZhbEltcGxyT1RpU0ZEYVllb25Pek5MVkNNMDdObkpDNUxCCmZ6aXZWVDMzekpKMGtOMVh3bGlqSCtXYUF3SkdiMzhkbEN1OS9uY2RDYmQ5Rm9ubnNzTWxTTmxZMXpGZW1Cc24KczVnaDNha2s0TStMOXVkdFo3M2YrUi9JK2Z5OGk2bFl2OVJxelhDQWJaZFFBWXRPeEE9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    client-key-data: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFb3dJQkFBS0NBUUVBdTI4Ny90Snl0UW9tbG1HV3VySHR2MXNJSnd1UDVmYWZsYlRFK0VnS1h6K3Z6bHNZCitjNnc1a1dKbzgzSTdoWGM5elNtcDNyY0NnU25BMnFVSnpxRTBXMVNvSGpadlh6MTdkUkdZNXVxNU5QWkFYQWcKVElLbUZUNG9PYkcyL3hBUXY0TU50UFBFQ2NTQ0tsOWE2K3Nybmh3WTQrM04yQTdISmdMWE44UE5UWlIzUlN1UgplVUc4WUVFazd3Ynh5WExtSTdDUitPSURBNm92MHp1WlpYMjhXU2pKcFcrMzA1QVA0UGdMa09Fc2NDNHlUTnBuCm1zb2hQSHgwdzh5MUszQk9wWnBFaHcrUm1XRVRaSWlvY3AyTndEY3RveUFBS1J5YWljVk8xbGRxZ0hMSDJJUlYKaTRqZlBSTlViVlhnVmV5dVYwcVd3LzRPaUxiR3djdDEyQ1hhbndJREFRQUJBb0lCQUJXZ2ppR25Fc2xFOUpMaAppOHphL3YzWGVTZFlOREJxdHB0RmtueTdnMGJlU0dEZExoS1ZBT0J4SWFLZStoSk92NEpldHVRWVR3OXczZnlNCjdhOWhGelk3RVErbklpaTFKSU5ldlFoOVM4aS9rUWlUY1lhaWhKdHE0cVZWbGpIMEhwcWFlcGhva0RRNFVuU2wKTUE2TXdpbXFRRXo4Z1lYdW5wZ0tOOThkWHJFV3YrV1hkeVJ5NHpaWEN0K3N2Q2FDWWNGemJDNHpja1ZUYUxSNwpJeXBiZk9RQWJ5UDVDZnQ0MURDUmd2Ri9tOEdzVWdKaFpqWDdlWnE3MzliSlVNNVI5YTd5QjNqNWExcUhNRHpMClprVDgvSkFaWHRqLzg4dDQyOVYrWTBPbzh5VEJOUUs3bkN3SEk2ZXF1a3lsM1c4S0hqYjdEUy9McWliOHFZZm8KZHduZmRMRUNnWUVBM3B3RkNJbkMvV0RjZEI5TDFoUjNLeUNOTjk0VE9IVm9RY2FmejArdWxCRlRuUE5hdVNxNgphenhudVl2MXFlYjFmS3NrcWlIOXFiWURDTWNOdlhoRUFqK3pEaFhKVmF6eXlnTGEwclJhRDBQQlBVZ1paN0RUCmNoelc1WEhkUUprTmprZFIzdlB1a0psendobFo1dmRaK0pjb2MxRDEweWY3eEhGZ1doYWtQbTBDZ1lFQTE0eUkKTmhDcnBiT05pMm0xc3BWcDhzNzJ2dDJMclh1M2Q5WXRjR1A5Rm84RC9UZ2l2YVMrb2x4M1NRdzJzSm5mOU5pago2Y1h0ZEVTdVNCU0tLNElQUUlUSml2bDRkaWMvOHZ6eGdZQ3M3ZFBPRDdEOGpFMVdZbDdva0MvY2xSZ1FtVi9pCnJIL0xFU0pLUXhCNWtWZEdvZkZoa3dCeGMwZ2dFL2RpUmtPd3Bic0NnWUJWMlNGdnk0RHhLanVhWkw5Z1RnQXYKRjV5ZVlQeFVsNktmU3pReVJPNTBsOElCRXpCM25Hek1FajJHSnQyVXFrY2R6dnFTeWcwRE4vZ3ZtR1JLSDJsSwozTG4yd3B3a2VGQWhhN3hyNmJXWmtXMmlibjJ0cVZuQjlqRkJ4d21tY2QveWNMcTRHcVowQ1ZuRkR2WEd4cmxoCnp4bUFiMForS2p0RDVOMWRvTUd5ZVFLQmdRQzJmZGE4MzNSVHdDYndoN2s3ejJCNklGdXIwT3AzSUsxK21paXkKWlJWYnlnMjRqNVJxTjFibkk1NGlqR0twTmozMGtJNkdWL3JvVzFXcTFTaitHUWxNdUovaU44Q1RXRHUrUUFWQQpmVzdybEUxNzMzNlNVcy8yVFNCZEl3aUFlblZqUlZrbWJyUEFkK1dqemdqKzBvT01qRTd1Skl2bzdJR3NKZUJnCldPTHdEUUtCZ0NCRjcrdmo2em1KNVRTYy82bVNYVjhJYXlPSEwwM0NLZXBTVlNpRmVHL3pZNTQwTG9Ia0kwd20KMHhMUFV2Q294VUtQRnJVdFBFLzNUeU9PNVRnTnRLUi9oWnArNDc1VnJKdGNuNXJ3bDFpM1FnbDFsMWtCZjRNRwpCOS90Q0F2WTFOdVZhM0tTTDdGZXF3NmRUbGlwa3FURStueStTeUZ5WjkvN0o3WTJKUzV0Ci0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tCg==
- name: cluster2-admin
  user:
    client-certificate-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURJVENDQWdtZ0F3SUJBZ0lJUnlkeG5tMERUVE13RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TXpFeE1UVXhNek14TWpSYUZ3MHlOREV4TVRReE16TXhNalZhTURReApGekFWQmdOVkJBb1REbk41YzNSbGJUcHRZWE4wWlhKek1Sa3dGd1lEVlFRREV4QnJkV0psY201bGRHVnpMV0ZrCmJXbHVNSUlCSWpBTkJna3Foa2lHOXcwQkFRRUZBQU9DQVE4QU1JSUJDZ0tDQVFFQXRHVllZMFR0SEwxVnBtTkQKdGplTlpObjh4OGE4MjQ0OS9GWmtaOHB2czQwZ2tXTUNyNGNHT0RlVitHRFErS2ZIdnpHT21EUHhydjJLZGJYUApUejkzQnE0aWF4NkpTajRYZ3lOdFgwdVZuTCt1U2Fpcng0dG85dmltQnFNaEhnbzQxTjYrTUE5bzYxeDl5RVVsCmVBVWFPZHdaVWtBbTRXVWl3Zk9VK1JrSHFFMGJXZThxSkJHS3VXUHhESXcxUzVLRjFsaUtwRno0T3FFVmd3RloKdG5yRW1OUW5aaE95YW1YUTRYTFZSWU5jTDZuMStWMlBBYUZWOFZCa28zK0EwOWVsYXpORXVucW5TR2J3Wm5OUQorVldsREF0SkxxVkppS3ZhbGgrRlhQUDJlY1VsYlNaY3FYbjhVNllsbTUzZlZHZlc1V2NHSi91aVhTSmh0d0lXCitSQk9hd0lEQVFBQm8xWXdWREFPQmdOVkhROEJBZjhFQkFNQ0JhQXdFd1lEVlIwbEJBd3dDZ1lJS3dZQkJRVUgKQXdJd0RBWURWUjBUQVFIL0JBSXdBREFmQmdOVkhTTUVHREFXZ0JRMVF0cUFtL0M0Rk9YbEJmYW5KR0VPZVMyMwo1akFOQmdrcWhraUc5dzBCQVFzRkFBT0NBUUVBWHRLVmZoQUJ6V1R3enZHT3Iwc0dGaEdKTWxnUmN4TklOeXF3CjJpN3lEK2NZVTBaVmFkRElvalFXdmlSMjZvYkRFYXNGM25JcUp2OVZYRDFEbkt2NW5Tc1BaRG9wUU8wRW5WdUUKMG5OQld2RmVPOXlmSzc4bFR1ekhxWFd4OUQ0MmxwUTh0QnlNcjcwTnpDbys5UVpqU1ZHQ2dUQk9OSDZYNm1tQwp4MDlKVTl5NTZFYThmK2NVZFVjeGErampvM0xsNU1zNERTSjBIcmdtQjc5anVMaGx2eUVPWWI3ZUpIOGVJM3JYCmhaZ0ZteGxDSjBiSVlUcWE3YTBLSW1zV2VGYWp5WlBJWDBGSlVZTVJnN3BUWnlFQjM3SW1lN05xKy9wUHNtQTMKTVduNEdBSVFZczRDV3NiZFIza1FybDNKNDloWEVhSjUrWmh1Nzh4RXhqT3ZkekdqTlE9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
    client-key-data: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFcEFJQkFBS0NBUUVBdEdWWVkwVHRITDFWcG1ORHRqZU5aTm44eDhhODI0NDkvRlprWjhwdnM0MGdrV01DCnI0Y0dPRGVWK0dEUStLZkh2ekdPbURQeHJ2MktkYlhQVHo5M0JxNGlheDZKU2o0WGd5TnRYMHVWbkwrdVNhaXIKeDR0bzl2aW1CcU1oSGdvNDFONitNQTlvNjF4OXlFVWxlQVVhT2R3WlVrQW00V1Vpd2ZPVStSa0hxRTBiV2U4cQpKQkdLdVdQeERJdzFTNUtGMWxpS3BGejRPcUVWZ3dGWnRuckVtTlFuWmhPeWFtWFE0WExWUllOY0w2bjErVjJQCkFhRlY4VkJrbzMrQTA5ZWxhek5FdW5xblNHYndabk5RK1ZXbERBdEpMcVZKaUt2YWxoK0ZYUFAyZWNVbGJTWmMKcVhuOFU2WWxtNTNmVkdmVzVXY0dKL3VpWFNKaHR3SVcrUkJPYXdJREFRQUJBb0lCQUgyZW1TYy9oekpkTWppVQpwVUZOZS91L3hNUkZRNXhNZUNPdzhXaEpVdkdnbEE1SitVUEw3ZXZWNFd3OTF5ZGdocnRBUWtFQTR3cnRhYTdBCmRXV0ZGMWlpaURzNTMzYkF1RlRNcGN3WGNVN2ZOL241SiszanlhczV5VHVUKzJyVXlYQ0t6N3ZkN3p6K2dtU2sKcWd2aTJibHk2SHNiU3pmbjJvVmZIdDA3cmRabTl5RkpKeXU0S2tjV04wR3JmcndIZE5zQk11SFg5cVRtOUl5cwp5QzNWNGF5QjF4cHVnaUtOZitMbjRobWVhOW0zTXo3WVJyRVo5SGlOYzZyYVVTYUlEbDhJcExaWlNlRFcvTEZZCkU2ajV0UGFDZThlSThDQUtnYW5saHFVWXh6eHZJcDhFZGhxOXhaSmV6SGo3MTRzYXJBY1JiOURod3RTK2pCSVoKUmxBQnhLRUNnWUVBNk85QkFIbnBNRER5SG82bDV5SDJYSk1zSTNSNUJJQXA4WjFLMW03bUtXbTYxRU1yaFFaQwpiRms3TS95ajZsRjgwNkFEV0pnRzMzdm82N2l3ZWNsbmdONHk1MjZ4Z0QvUkRxT2pIcWt0NTVtaHNIVWZnUThzCmhaZ0FTaUdXdkQrVmV0dS9NTnBZSERQcHdZRGYwckxIZU45TTgzemlCNUkrVHZrVTZIaVJodnNDZ1lFQXhrSkUKbkxYVnJsd1ZBWHVySDMwYktSamR6YnBxNFQyQ3dyTEJLUkh1V1hZS0I2WGorOTFjZWxzNEpXUUswSStRa1c3eQpLNkp6clBEUU1jM1kxcVlMUWJzV3YybGI0OEllc2JiQ2dQYWdOYXNNaHl3cVNlbmVYcGwxY01QclI3ZUhMSVdqCnM4OVZ3QTh5Y3ZpSFE2Q0ZLUm1Oak9jZnRacGd3d2g2N2xWZWUxRUNnWUErb3UrUXlEZUxiTzMraDQ5WEtzdkwKc3d1Z2NSYUZ2azBKR3FuZ0phd2dvTHpMalZCcmtmWlVtbDRRS2JTT011RmxLdGNiZ0s0QWRKcDZvSXhjQTJ1Zwp2SjlsbWwrQ3hDWmNVR1p4dlQ2SjA4Y2w0eWpZbEpMOVRaVnVXYi9sMlJkQ0ZVdEJRTVdHdC9MNHhNWHJLNFgyCkc5M2ViOHQ4QzdoVGxpa29KaHZEOXdLQmdRQ1hTeUxJNUFvNGtKU0hHVFN4UnV0ZkpWYStGREJUeW5qcTB6YU0KZk42QzdvMGc0UHRsekxzeHRFTFlaY3ZLOUlQQ09BUWVRRTQ5LzFjaGFwQzYzT05pT2I5V09yU2d6aFpXVDcyRwpaSzVGeGs0OUtQcnNoTWZwTVBwcUgxaUExaEVWYkxaTUZVQysyOW9IMnBoK2h4U1hGS1RzamNPbzlqSTVJMU9NClpTRkF3UUtCZ1FEaXY0SGtkSDEzbUdaSTA1MTlLa1F2Uk94NlVVUFlRZWJrSWxsZFpzVC9zYkd6c1l6MTRVU24KTlU2YVIvOHRuZXRHdmg3SUlzbWV4QmdHVlR4aUkyYW1CTk82SjFQTTNrRmlqNGZzSjFoVlJvcVBKTUovekhZUwo2QXduaXlyOGdBMWRqUnFZRjV3ZXpqOXJOOFdJb0IzQnMzeXZUSWtMc1dKZTBnOFJhdjNqQ0E9PQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQo=
~~~

# 二、注册K8S集群到Argo CD

> 列出指定kubeconfig文件中所有集群上下文

~~~powershell
[root@k8s-master01 ~]# kubectl config --kubeconfig=/root/k8s-config get-clusters
NAME
cluster1
cluster2
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl config --kubeconfig=/root/k8s-config get-contexts
CURRENT   NAME       CLUSTER    AUTHINFO         NAMESPACE
*         cluster1   cluster1   cluster1-admin
          cluster2   cluster2   cluster2-admin
~~~

~~~powershell
[root@k8s-master01 ~]# kubectl config --kubeconfig=/root/k8s-config get-contexts -o name
cluster1
cluster2
~~~

~~~powershell
[root@k8s-master01 ~]# argocd cluster list
SERVER                          NAME        VERSION  STATUS   MESSAGE                                                  PROJECT
https://kubernetes.default.svc  in-cluster           Unknown  Cluster has no applications and is not being monitored.
~~~

~~~powershell
[root@k8s-master01 ~]# argocd cluster  add cluster2 --kubeconfig=/root/k8s-config
WARNING: This will create a service account `argocd-manager` on the cluster referenced by context `cluster2` with full cluster level privileges. Do you want to continue [y/N]? y
INFO[0003] ServiceAccount "argocd-manager" created in namespace "kube-system"
INFO[0003] ClusterRole "argocd-manager-role" created
INFO[0003] ClusterRoleBinding "argocd-manager-role-binding" created
INFO[0008] Created bearer token secret for ServiceAccount "argocd-manager"
Cluster 'https://192.168.10.140:6443' added
~~~

~~~powershell
在新添加的集群中查看
[root@k8s-master01 ~]# kubectl get secret -n kube-system
NAME                         TYPE                                  DATA   AGE
argocd-manager-token-r9hzs   kubernetes.io/service-account-token   3      2m23s
~~~

~~~powershell
[root@k8s-master01 ~]# argocd cluster list
SERVER                          NAME        VERSION  STATUS      MESSAGE                                                  PROJECT
https://192.168.10.140:6443     cluster2    1.26     Successful
https://kubernetes.default.svc  in-cluster           Unknown     Cluster has no applications and is not being monitored.
~~~

# 三、创建应用

Git 仓库 https://github.com/argoproj/argocd-example-apps.git 是一个包含留言簿应用程序的示例库，我们可以用该应用来演示 Argo CD 的工作原理。

## 3.1 通过CLI创建应用

通过argocd app create xxx命令来创建一个应用

~~~powershell
[root@k8s-master01 ~]# argocd app create --help
Create an application

Usage:
  argocd app create APPNAME [flags]

Examples:
  # Create a directory app
  argocd app create guestbook --repo https://github.com/argoproj/argocd-example-apps.git --path guestbook --dest-namespace default --dest-server https://kubernetes.default.svc --directory-recurse

  # Create a Jsonnet app
  argocd app create jsonnet-guestbook --repo https://github.com/argoproj/argocd-example-apps.git --path jsonnet-guestbook --dest-namespace default --dest-server https://kubernetes.default.svc --jsonnet-ext-str replicas=2

  # Create a Helm app
  argocd app create helm-guestbook --repo https://github.com/argoproj/argocd-example-apps.git --path helm-guestbook --dest-namespace default --dest-server https://kubernetes.default.svc --helm-set replicaCount=2

  # Create a Helm app from a Helm repo
  argocd app create nginx-ingress --repo https://charts.helm.sh/stable --helm-chart nginx-ingress --revision 1.24.3 --dest-namespace default --dest-server https://kubernetes.default.svc

  # Create a Kustomize app
  argocd app create kustomize-guestbook --repo https://github.com/argoproj/argocd-example-apps.git --path kustomize-guestbook --dest-namespace default --dest-server https://kubernetes.default.svc --kustomize-image gcr.io/heptio-images/ks-guestbook-demo:0.1

  # Create a app using a custom tool:
  argocd app create kasane --repo https://github.com/argoproj/argocd-example-apps.git --path plugins/kasane --dest-namespace default --dest-server https://kubernetes.default.svc --config-management-plugin kasane
~~~

**直接执行如下的命令可以创建项目**

~~~powershell
[root@k8s-master01 ~]# kubectl create ns bookapp-ns
~~~

~~~powershell
[root@k8s-master01 ~]# argocd app create bookapp --repo https://github.com/argoproj/argocd-example-apps.git --path guestbook --dest-server https://kubernetes.default.svc --dest-namespace bookapp-ns
输出：
application 'bookapp' created
~~~

~~~powershell
[root@k8s-master01 ~]# argocd app list
NAME            CLUSTER                         NAMESPACE   PROJECT  STATUS     HEALTH   SYNCPOLICY  CONDITIONS  REPO                                                 PATH       TARGET
argocd/bookapp  https://kubernetes.default.svc  bookapp-ns  default  OutOfSync  Missing  <none>      <none>      https://github.com/argoproj/argocd-example-apps.git  guestbook
~~~

![image-20231117165551413](/云原生/devops/devops-05-使用argo-cd实施项目发布/image-20231117165551413.png)

![image-20231117165713149](/云原生/devops/devops-05-使用argo-cd实施项目发布/image-20231117165713149.png)

![image-20231117165734432](/云原生/devops/devops-05-使用argo-cd实施项目发布/image-20231117165734432.png)

~~~powershell
[root@k8s-master01 ~]# kubectl get ns
NAME              STATUS   AGE
argocd            Active   6h1m
bookapp-ns        Active   19m
default           Active   17d
ingress-nginx     Active   6h8m
kube-node-lease   Active   17d
kube-public       Active   17d
kube-system       Active   17d
kubekey-system    Active   17d
metallb-system    Active   6h19m
[root@k8s-master01 ~]# kubectl get svc -n bookapp-ns
NAME           TYPE        CLUSTER-IP    EXTERNAL-IP   PORT(S)   AGE
guestbook-ui   ClusterIP   10.233.40.7   <none>        80/TCP    12m
[root@k8s-master01 ~]# kubectl edit service guestbook-ui -n bookapp-ns
service/guestbook-ui edited
[root@k8s-master01 ~]# kubectl get svc -n bookapp-ns
NAME           TYPE           CLUSTER-IP    EXTERNAL-IP      PORT(S)        AGE
guestbook-ui   LoadBalancer   10.233.40.7   192.168.10.242   80:31777/TCP   12m
~~~

![image-20231117171043504](/云原生/devops/devops-05-使用argo-cd实施项目发布/image-20231117171043504.png)

**在其它集群中创建项目**

~~~powershell
[root@k8s-master01 ~]# argocd cluster list
SERVER                          NAME        VERSION  STATUS      MESSAGE                                                  PROJECT
https://192.168.10.140:6443     cluster2    1.26     Successful
https://kubernetes.default.svc  in-cluster           Unknown     Cluster has no applications and is not being monitored.
~~~

~~~powershell
# argocd app create bookapp-cluster2 --repo https://github.com/argoproj/argocd-example-apps.git --path guestbook --dest-server https://192.168.10.140:6443  --dest-namespace default
输出：
application 'bookapp-cluster2' created
~~~

![image-20231117170608198](/云原生/devops/devops-05-使用argo-cd实施项目发布/image-20231117170608198.png)

![image-20231117170639200](/云原生/devops/devops-05-使用argo-cd实施项目发布/image-20231117170639200.png)

![image-20231117170708530](/云原生/devops/devops-05-使用argo-cd实施项目发布/image-20231117170708530.png)

![image-20231117170735365](/云原生/devops/devops-05-使用argo-cd实施项目发布/image-20231117170735365.png)

~~~powershell
[root@k8s-master01 ~]# kubectl get pods
NAME                            READY   STATUS    RESTARTS   AGE
guestbook-ui-754d46fbf6-6ph8h   1/1     Running   0          31s
[root@k8s-master01 ~]# kubectl get svc
NAME           TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
guestbook-ui   ClusterIP   10.233.31.65   <none>        80/TCP    39s
kubernetes     ClusterIP   10.233.0.1     <none>        443/TCP   43h
~~~

## 3.2 通过UI创建应用

>除了可以通过 CLI 工具来创建应用，我们也可以通过 UI 界面来创建，定位到 `http.argocd.kubemsb.com` 页面，登录后，点击 `+New App` 新建应用按钮，如下图：

![image-20231117173650058](/云原生/devops/devops-05-使用argo-cd实施项目发布/image-20231117173650058.png)

将应用命名为 bookapp-cluster1，使用 default project，并将同步策略设置为 Manual：

![image-20231117173907973](/云原生/devops/devops-05-使用argo-cd实施项目发布/image-20231117173907973.png)

![image-20231117174602672](/云原生/devops/devops-05-使用argo-cd实施项目发布/image-20231117174602672.png)

![image-20231117174707173](/云原生/devops/devops-05-使用argo-cd实施项目发布/image-20231117174707173.png)

![image-20231117174801827](/云原生/devops/devops-05-使用argo-cd实施项目发布/image-20231117174801827.png)

![image-20231117174829262](/云原生/devops/devops-05-使用argo-cd实施项目发布/image-20231117174829262.png)

![image-20231117174849843](/云原生/devops/devops-05-使用argo-cd实施项目发布/image-20231117174849843.png)

![image-20231117174921958](/云原生/devops/devops-05-使用argo-cd实施项目发布/image-20231117174921958.png)

>Argo CD 默认情况下每 3 分钟会检测 Git 仓库一次，用于判断应用实际状态是否和 Git 中声明的期望状态一致，如果不一致，状态就转换为 OutOfSync。默认情况下并不会触发更新，除非通过 syncPolicy 配置了自动同步。

## 3.3 通过CRD创建

> 除了可以通过 CLI 和 Dashboard 可以创建 Application 之外，其实也可以直接通过声明一个 Application 的资源对象来创建一个应用，如下所示：

~~~powershell
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: bookweb
spec:
  destination:
    namespace: default
    server: "https://kubernetes.default.svc"
  source:
    path: guestbook
    repoURL: "https://github.com/argoproj/argocd-example-apps.git"
    targetRevision: HEAD
  project: default
  syncPolicy:
    automated: null
~~~

~~~powershell
[root@k8s-master01 ~]# cat bookweb.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: bookweb
spec:
  destination:
    namespace: default
    server: "https://kubernetes.default.svc"
  source:
    path: guestbook
    repoURL: "https://github.com/argoproj/argocd-example-apps.git"
    targetRevision: HEAD
  project: default
  syncPolicy:
    automated: null
~~~

~~~powershell
[root@k8s-master01 ~]# argocd app create bookweb -f bookweb.yaml
application 'bookweb' created
~~~

~~~powershell
[root@k8s-master01 ~]# argocd app list
NAME            CLUSTER                         NAMESPACE  PROJECT  STATUS     HEALTH   SYNCPOLICY  CONDITIONS  REPO                                                 PATH       TARGET
argocd/bookweb  https://kubernetes.default.svc  default    default  OutOfSync  Missing  <none>      <none>      https://github.com/argoproj/argocd-example-apps.git  guestbook  HEAD
~~~

![image-20231117181256406](/云原生/devops/devops-05-使用argo-cd实施项目发布/image-20231117181256406.png)

由于上面我们在创建应用的时候使用的同步策略为 Manual，所以应用创建完成后没有自动部署，需要我们手动去部署应用。同样可以通过 CLI 和 UI 界面两种同步方式。

**使用CLI同步**

应用创建完成后，我们可以通过如下所示命令查看其状态：

~~~powershell
[root@k8s-master01 ~]# argocd app get argocd/bookweb
Name:               argocd/bookweb
Project:            default
Server:             https://kubernetes.default.svc
Namespace:          default
URL:                https://grpc.argocd.kubemsb.com/applications/bookweb
Repo:               https://github.com/argoproj/argocd-example-apps.git
Target:             HEAD
Path:               guestbook
SyncWindow:         Sync Allowed
Sync Policy:        <none>
Sync Status:        OutOfSync from HEAD (d7927a2)
Health Status:      Missing

GROUP  KIND        NAMESPACE  NAME          STATUS     HEALTH   HOOK  MESSAGE
       Service     default    guestbook-ui  OutOfSync  Missing
apps   Deployment  default    guestbook-ui  OutOfSync  Missing
~~~

应用程序状态为初始 OutOfSync 状态，因为应用程序尚未部署，并且尚未创建任何 Kubernetes 资源。要同步（部署）应用程序，可以执行如下所示命令：

~~~powershell
[root@k8s-master01 ~]# argocd app sync argocd/bookweb
TIMESTAMP                  GROUP        KIND   NAMESPACE                  NAME    STATUS    HEALTH        HOOK  MESSAGE
2023-11-17T18:15:46+08:00            Service     default          guestbook-ui  OutOfSync  Missing
2023-11-17T18:15:46+08:00   apps  Deployment     default          guestbook-ui  OutOfSync  Missing
2023-11-17T18:15:46+08:00            Service     default          guestbook-ui    Synced  Healthy
2023-11-17T18:15:47+08:00            Service     default          guestbook-ui    Synced   Healthy              service/guestbook-ui created
2023-11-17T18:15:47+08:00   apps  Deployment     default          guestbook-ui  OutOfSync  Missing              deployment.apps/guestbook-ui created
2023-11-17T18:15:47+08:00   apps  Deployment     default          guestbook-ui    Synced  Progressing              deployment.apps/guestbook-ui created

Name:               argocd/bookweb
Project:            default
Server:             https://kubernetes.default.svc
Namespace:          default
URL:                https://grpc.argocd.kubemsb.com/applications/argocd/bookweb
Repo:               https://github.com/argoproj/argocd-example-apps.git
Target:             HEAD
Path:               guestbook
SyncWindow:         Sync Allowed
Sync Policy:        <none>
Sync Status:        Synced to HEAD (d7927a2)
Health Status:      Healthy

Operation:          Sync
Sync Revision:      d7927a27b4533926b7d86b5f249cd9ebe7625e90
Phase:              Succeeded
Start:              2023-11-17 18:15:46 +0800 CST
Finished:           2023-11-17 18:15:46 +0800 CST
Duration:           0s
Message:            successfully synced (all tasks run)

GROUP  KIND        NAMESPACE  NAME          STATUS  HEALTH   HOOK  MESSAGE
       Service     default    guestbook-ui  Synced  Healthy        service/guestbook-ui created
apps   Deployment  default    guestbook-ui  Synced  Healthy        deployment.apps/guestbook-ui created
~~~

![image-20231117181634095](/云原生/devops/devops-05-使用argo-cd实施项目发布/image-20231117181634095.png)

此命令从 Git 仓库中检索资源清单并执行 kubectl apply 部署应用，执行上面命令后 guestbook 应用便会运行在集群中了，现在我们就可以查看其资源组件、日志、事件和评估其健康状态了。

**通过 UI 同步**

直接添加 UI 界面上应用的 Sync 按钮即可开始同步。

