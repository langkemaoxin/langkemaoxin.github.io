import{a as e,c as t,i as n}from"./app-5UICKhjw.js";import{t as r}from"./plugin-vue_export-helper-BDNMzG2s.js";var i=JSON.parse(`{"path":"/%E4%BA%91%E5%8E%9F%E7%94%9F/extend/extend-02-%E7%AC%94%E8%AE%B0-flink%E5%9F%BA%E4%BA%8Ekubernetes%E9%83%A8%E7%BD%B2.html","title":"笔记-Flink基于Kubernetes部署","lang":"zh-CN","frontmatter":{"title":"笔记-Flink基于Kubernetes部署","sidebarGroup":"扩展专题","shortTitle":"02 笔记-Flink基于Kubernetes部署","order":2,"date":"2026-08-13T00:00:00.000Z","category":"云原生","tag":["大数据与 ML","云原生","课程笔记"],"description":"1.1 Kubernetes 介绍 Kubernetes是Google公司在2014年6月开源的一个容器集群管理系统，使用Go语言开发，也叫K8S（k8s 这个缩写是因为k和s之间有八个字符的关系）。...","head":[["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"Article\\",\\"headline\\":\\"笔记-Flink基于Kubernetes部署\\",\\"image\\":[\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/1ffd5c05d5804b12a2835ce752678ae6.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/65c590ae4fee44249a01e40aee1ee6aa.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/a574f87c70034ec1b0abb158368cc765.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/a50dae4997a14440ac578cd042c9a4cc.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/56789990f8a04f7a9d0cc2b75d727654.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/fbf2a1687a1e4d3daf73600c19fccaa5.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/0cddbf7f85004d91afec4b37a36a382d.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/8c8cde92fb3c4208a8da4ae772c5944c.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/d1c47c507a014c2cab5388b06150c29f.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/093e784b4abf42f098dfc184a36789c0.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/ce75b5426f07418d8cd0015726d6ac9e.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/b41acaf414ed41f4a24f6610f70ce116.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/3e4ea4d12e334ef28963f7ae67e70665.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/fb329bc208d247b1adbc815f869c74bf.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/6c4c01f62b5b4694ae561771377cc13d.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/61fe95ec75e0431f92de65b96fa28c67.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/55517d6f9ea94fde926c1bd7dc5473a6.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/a26b98a31a174973872fe36c21eb1c3b.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/686a99cbdaab4f9699e106a2bca4a70e.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/a5b935cd9a974e4988868eb599f66078.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/35aa773ae30d4d5faab61f122df3dd19.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/e267196b4441451fb926460c2e92806c.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/25b891e0e9d244aabc8dc144b145e393.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/11abf7c8ad4c43f7a8f1fc21aa6b8846.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/34515d8092824fa98889e3c2cb442357.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/10030137efbf418489fae3fb3db29b61.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/4c170c0c0a7f4dea9a6d4e410a5b4d19.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/3385b90f53db463ba6c742dc2b08ba29.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/b73afe0351014104a0bebd6a4ddfd50e.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/ed61cd24eb7a4b8aa9c55545d6310941.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/d3f088c0cee14494bb29bce911af0119.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/94763877583041f6a7a98440bef5196f.png\\",\\"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/dcb56b49efbe481b99049e7bcc8ce7ce.png\\"],\\"datePublished\\":\\"2026-08-13T00:00:00.000Z\\",\\"dateModified\\":\\"2026-08-14T02:04:51.000Z\\",\\"author\\":[{\\"@type\\":\\"Person\\",\\"name\\":\\"Corey\\",\\"url\\":\\"https://www.code-corey.com\\"}]}"],["meta",{"property":"og:url","content":"https://www.code-corey.com/%E4%BA%91%E5%8E%9F%E7%94%9F/extend/extend-02-%E7%AC%94%E8%AE%B0-flink%E5%9F%BA%E4%BA%8Ekubernetes%E9%83%A8%E7%BD%B2.html"}],["meta",{"property":"og:site_name","content":"Corey 知识库"}],["meta",{"property":"og:title","content":"笔记-Flink基于Kubernetes部署"}],["meta",{"property":"og:description","content":"1.1 Kubernetes 介绍 Kubernetes是Google公司在2014年6月开源的一个容器集群管理系统，使用Go语言开发，也叫K8S（k8s 这个缩写是因为k和s之间有八个字符的关系）。..."}],["meta",{"property":"og:type","content":"article"}],["meta",{"property":"og:image","content":"https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/1ffd5c05d5804b12a2835ce752678ae6.png"}],["meta",{"property":"og:locale","content":"zh-CN"}],["meta",{"property":"og:updated_time","content":"2026-08-14T02:04:51.000Z"}],["meta",{"property":"article:tag","content":"课程笔记"}],["meta",{"property":"article:tag","content":"云原生"}],["meta",{"property":"article:tag","content":"大数据与 ML"}],["meta",{"property":"article:published_time","content":"2026-08-13T00:00:00.000Z"}],["meta",{"property":"article:modified_time","content":"2026-08-14T02:04:51.000Z"}]]},"git":{"createdTime":1786673091000,"updatedTime":1786673091000,"contributors":[{"name":"chengongyi","username":"chengongyi","email":"2363613998@qq.com","commits":1,"url":"https://github.com/chengongyi"},{"name":"Cursor","username":"Cursor","email":"cursoragent@cursor.com","commits":1,"url":"https://github.com/Cursor"}]},"readingTime":{"minutes":89.13,"words":26738},"filePathRelative":"云原生/extend/extend-02-笔记-flink基于kubernetes部署.md","excerpt":"<blockquote>\\n<p><strong>大数据与 ML · 第 2 篇</strong></p>\\n<p>来源课程笔记整理优化；插图已迁入博客静态目录。</p>\\n</blockquote>\\n<hr>\\n<h2>1.1 <strong>Kubernetes 介绍</strong></h2>\\n<p>Kubernetes是Google公司在2014年6月开源的一个容器集群管理系统，使用Go语言开发，也叫K8S（k8s 这个缩写是因为k和s之间有八个字符的关系）。Kubernetes这个名字源于希腊语，意为“舵手”或“飞行员”。Kubernetes的目标是让部署容器化的应用 简单并且高效,提供应用部署，维护，规划，更新。Kubernetes一个核心的特点就是能够自主的管理容器来保证云平台中的容器按照用户的期望状态运行，让用户能够方便的部署自己的应用。</p>"}`),a={name:`extend-02-笔记-flink基于kubernetes部署.md`};function o(r,i,a,o,s,c){return t(),n(`div`,null,[...i[0]||=[e(`<blockquote><p><strong>大数据与 ML · 第 2 篇</strong></p><p>来源课程笔记整理优化；插图已迁入博客静态目录。</p></blockquote><hr><h2 id="_1-1-kubernetes-介绍" tabindex="-1"><a class="header-anchor" href="#_1-1-kubernetes-介绍"><span>1.1 <strong>Kubernetes 介绍</strong></span></a></h2><p>Kubernetes是Google公司在2014年6月开源的一个容器集群管理系统，使用Go语言开发，也叫K8S（k8s 这个缩写是因为k和s之间有八个字符的关系）。Kubernetes这个名字源于希腊语，意为“舵手”或“飞行员”。Kubernetes的目标是让部署容器化的应用 简单并且高效,提供应用部署，维护，规划，更新。Kubernetes一个核心的特点就是能够自主的管理容器来保证云平台中的容器按照用户的期望状态运行，让用户能够方便的部署自己的应用。</p><p>Kubernetes官网地址如下:<a href="https://kubernetes.io/" target="_blank" rel="noopener noreferrer">https://kubernetes.io/</a>，中文官网地址如下：<a href="https://kubernetes.io/zh-cn/" target="_blank" rel="noopener noreferrer">https://kubernetes.io/zh-cn/</a></p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/1ffd5c05d5804b12a2835ce752678ae6.png" alt="image.png" loading="lazy"></p><p>企业中应用程序的部署经历了传统部署时代、虚拟化部署时代、容器化部署时代，尤其是今天容器化部署应用在企业中应用非常广泛，Kubernetes作为容器编排管理工具也越来越重要。</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/65c590ae4fee44249a01e40aee1ee6aa.png" alt="image.png" loading="lazy"></p><h3 id="_1-1-1-传统部署时代" tabindex="-1"><a class="header-anchor" href="#_1-1-1-传统部署时代"><span>1.1.1 <strong>传统部署时代</strong></span></a></h3><p>早期，各个公司是在物理服务器上运行应用程序。由于无法限制在物理服务器中运行的应用程序资源使用，因此会导致资源分配问题。例如，如果在同一台物理服务器上运行多个应用程序，则可能会出现一个应用程序占用大部分资源的情况，而导致其他应用程序的性能下降。一种解决方案是将每个应用程序都运行在不同的物理服务器上，但是当某个应用资源利用率不高时，服务器上剩余资源无法被分配给其他应用，而且维护许多物理服务器的成本很高。</p><p><strong>物理服务器部署应用痛点如下：</strong></p><ul><li>物理服务器环境部署人力成本大，特别是在自动化手段不足的情况下，依靠人肉运维的方式解决。</li><li>当物理服务器出现宕机后，服务器重启时间过长，短则1-2分钟，长则3-5分钟，有背于服务器在线时长达到99.999999999%标准的要求。</li><li>物理服务器在应用程序运行期间硬件出现故障，解决较麻烦。</li><li>物理服务器计算资源不能有效调度使用，无法发挥其充足资源的优势。</li><li>物理服务器环境部署浪费时间，没有自动化运维手段，时间是成倍增加的。</li><li>在物理服务器上进行应用程序配置变更，需要停止之前部署重新实施部署。</li></ul><h3 id="_1-1-2-虚拟化部署时代" tabindex="-1"><a class="header-anchor" href="#_1-1-2-虚拟化部署时代"><span>1.1.2 <strong>虚拟化部署时代</strong></span></a></h3><p>由于以上原因，虚拟化技术被引入了，虚拟化技术允许你在单个物理服务器的CPU上运行多台虚拟机（VM）。虚拟化能使应用程序在不同VM之间被彼此隔离，且能提供一定程度的安全性，因为一个应用程序的信息不能被另一应用程序随意访问。每个 VM 是一台完整的计算机，在虚拟化硬件之上运行所有组件，包括其自己的操作系统。</p><p>虚拟化技术能够更好地利用物理服务器的资源，并且因为可轻松地添加或更新应用程序，因此具有更高的可扩缩性，以及降低硬件成本等等的好处。通过虚拟化，你可以将一组物理资源呈现为可丢弃的虚拟机集群。</p><p><strong>虚拟机部署应用优点：</strong></p><ul><li>虚拟机较物理服务器轻量，可借助虚拟机模板实现虚拟机快捷生成及应用。</li><li>虚拟机中部署应用与物理服务器一样可控性强，且当虚拟机出现故障时，可直接使用新的虚拟机代替。</li><li>在物理服务器中使用虚拟机可高效使用物理服务器的资源。</li><li>虚拟机与物理服务器一样可达到良好的应用程序运行环境的隔离。</li><li>当部署应用程序的虚拟机出现宕机时，可以快速启动，时间通常可达秒级，10秒或20秒即可启动，应用程序可以继续提供服务。</li><li>在虚拟机中部署应用，容易扩容及缩容实现、应用程序迁移方便。</li></ul><p><strong>虚拟机部署应用缺点：</strong></p><ul><li>虚拟机管理软件本身占用物理服务器计算资源较多，例如:VMware Workstation Pro就会占用物理服务器大量资源。</li><li>虚拟机底层硬件消耗物理服务器资源较大，例如：虚拟机操作系统硬盘，会直接占用大量物理服务器硬盘空间。</li><li>相较于容器技术，虚拟机启动时间过长，容器启动可按毫秒级计算。</li><li>虚拟机对物理服务器硬件资源调用添加了调链条，存在浪费时间的现象，所以虚拟机性能弱于物理服务器。</li><li>由于应用程序是直接部署在虚拟机硬盘上，应用程序迁移时，需要连同虚拟机硬盘中的操作系统一同迁移，会导致迁移文件过大，浪费更多的存储空间及时间消耗过长。</li></ul><h3 id="_1-1-3-容器化部署时代" tabindex="-1"><a class="header-anchor" href="#_1-1-3-容器化部署时代"><span>1.1.3 <strong>容器化部署时代</strong></span></a></h3><p>容器类似于VM，但具备更宽松的隔离特性，使容器之间可以共享操作系统（OS），因此，容器比起VM被认为是更轻量级的。容器化技术中常用的就是Docker容器引擎技术，让开发者可以打包应用以及依赖到一个可移植的镜像中，然后发布到任何平台，其与VM类似，每个容器都具有自己的文件系统、CPU、内存、进程空间等。由于它们与基础架构分离，因此可以跨云和OS发行版本进行移植。</p><p><strong><em>基于容器化技术部署应用优点</em> ：</strong></p><ul><li>不需要为容器安装操作系统，可以节约大量时间。</li><li>不需要通过手动的方式在容器中部署应用程序的运行环境，直接部署应用就可以了。</li><li>不需要管理容器网络，以自动调用的方式访问容器中应用提供的服务。</li><li>方便分享与构建应用容器，一次构建，到处运行，可在 Ubuntu、RHEL、CoreOS、本地、 Google Kubernetes Engine 等地方运行。</li><li>毫秒级启动。</li><li>资源隔离与资源高效应用。应用程序被分解成较小的独立部分，并且可以动态部署和管理，而不是在一台大型单机上整体运行，可以在一台物理机上高密度的部署容器。</li></ul><p>虽然使用容器有以上各种优点，但是 <strong>使用容器相比于物理机容器可控性不强</strong> ，例如：对容器的访问，总想按物理服务器或虚拟机的方式去管理它，其实容器与物理服务器、虚拟机管理方式上有着本质的区别的，最好不要管理。</p><h3 id="_1-1-4-为什么需要kubernetes" tabindex="-1"><a class="header-anchor" href="#_1-1-4-为什么需要kubernetes"><span>1.1.4 <strong>为什么需要Kubernetes</strong></span></a></h3><p>一般一个容器中部署运行一个服务，一般不会在一个容器运行多个服务，这样会造成容器镜像复杂度的提高，违背了容器初衷。企业中一个复杂的架构往往需要很多个应用，这就需要运行多个容器，并且需要保证这些容器之间有关联和依赖，那么如何保证各个容器自动部署、容器之间服务发现、容器故障后重新拉起正常运行，这就需要容器编排工具。</p><p>Kubernetes就是一个容器编排工具，可以实现容器集群的自动化部署、自动扩展、维护等功能，可以基于Docker技术的基础上，为容器化应用提供部署运行、资源调度、服务发现和动态伸缩等一系列完整功能，提高大规模容器集群管理的便捷性。</p><p><strong>Kubernetes</strong>优点如下：</p><ul><li>服务发现和负载均衡</li></ul><p>Kubernetes可以使用DNS名称或自己的IP地址来曝露容器。如果进入容器的流量很大，Kubernetes 可以负载均衡并分配网络流量，从而使部署稳定。</p><ul><li>存储编排</li></ul><p>Kubernetes允许你自动挂载你选择的存储系统，例如本地存储、公共云提供商等。</p><ul><li>自动部署和回滚</li></ul><p>你可以使用Kubernetes描述已部署容器的所需状态，它可以以受控的速率将实际状态更改为期望状态。例如，可以通过Kubernetes来为你部署创建新容器、删除现有容器并将它们的所有资源用于新容器。</p><ul><li>自动完成装箱计算</li></ul><p>在Kubernetes集群上运行容器化的任务时，Kubernetes可以根据运行每个容器指定的多少CPU和内存(RAM)将这些容器按实际情况调度到Kubernetes集群各个节点上，以最佳方式利用集群资源。</p><ul><li>自我修复</li></ul><p>Kubernetes将重新启动失败的容器、替换容器、杀死不响应的容器，并且在准备好服务之前不将其通告给客户端。</p><ul><li>密钥与配置管理</li></ul><p>Kubernetes允许你存储和管理敏感信息，例如密码、OAuth令牌和ssh密钥。 你可以在不重建容器镜像的情况下部署和更新密钥和应用程序配置，也无需在堆栈配置中暴露密钥。</p><h2 id="_1-2-kubernetes集群架构及组件" tabindex="-1"><a class="header-anchor" href="#_1-2-kubernetes集群架构及组件"><span>1.2 <strong>Kubernetes集群架构及组件</strong></span></a></h2><p>一个Kubernetes集群至少有一个主控制平面节点（Control Plane）和一台或者多台工作节点（Node）组成，控制面板和工作节点实例可以是物理设备或云中的实例。Kubernetes 架构如下：</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/a574f87c70034ec1b0abb158368cc765.png" alt="image.png" loading="lazy"></p><h3 id="_1-2-1-kubernetes-控制平面-contorl-plane" tabindex="-1"><a class="header-anchor" href="#_1-2-1-kubernetes-控制平面-contorl-plane"><span>1.2.1 <strong>Kubernetes 控制平面（Contorl Plane）</strong></span></a></h3><p>Kubernetes控制平面也称为主节点（Master Node），其管理集群中的工作节点（Worker Node）和Pod，在生产环境中,Master节点可以运行在多台节点实例上形成主备，提供Kubernetes集群的容错和高可用性。我们可以通过CLI或者UI页面中向Master节点输入参数控制Kubernetes集群。</p><p>Master节点是Kubernetes集群的管理中心，包含很多组件，这些组件管理Kubernetes集群各个方面，例如集群组件通信、工作负载调度和集群状态持久化。这些组件可以在集群内任意节点运行，但是为了方便会在一台实例上运行Master所有组件，并且不会在此实例上运行用户容器。</p><p><strong>Kubernetes Master主节点包含组件如下：</strong></p><ul><li><strong>kube-apiserver：</strong></li></ul><p>用于暴露kubernetes API，任何的资源请求/调用操作都是通过kube-apiserver提供的接口进行。例如:通过REST/kubectl 操作Kubernetes集群调用的就是Kube-apiserver。</p><ul><li><strong>etcd：</strong></li></ul><p>etcd是一个一致的、高度可用的键值存储库，是kubernetes提供默认的存储系统，用于存储Kubernetes集群的状态和配置数据。</p><ul><li><strong>kube-scheduler：</strong></li></ul><p>scheduler负责监视新创建、未指定运行节点的Pods并选择节点来让Pod在上面运行。如果没有合适的节点，则将Pod处于挂起的状态直到出现一个健康的Node节点。</p><ul><li><strong>kube-controller-manager：</strong></li></ul><p>controller-manager 负责运行Kubernetes中的Controller控制器，这些Controller控制器包括：</p><blockquote><ul><li>节点控制器（Node Controller）：负责在节点出现故障时进行通知和响应。</li><li>任务控制器（Job Controller）：监测代表一次性任务的 Job 对象，然后创建 Pods 来运行这些任务直至完成。</li><li>端点分片控制器（EndpointSlice controller）：填充端点分片（EndpointSlice）对象（以提供 Service 和 Pod 之间的链接）。</li><li>服务账号控制器（ServiceAccount controller）：为新的命名空间创建默认的服务账号（ServiceAccount）。</li></ul></blockquote><ul><li><strong>cloud-controller-manager</strong></li></ul><p>云控制器管理器（Cloud Controller Manager）嵌入了特定于云平台的控制逻辑，允许你将你的集群连接到云提供商的 API 之上， 并将与该云平台交互的组件同与你的集群交互的组件分离开来。cloud-controller-manager 仅运行特定于云平台的控制器。 因此如果你在自己的环境中运行 Kubernetes，或者在本地计算机中运行学习环境， 所部署的集群不需要有云控制器管理器。</p><h3 id="_1-2-2-kubernetes-node节点" tabindex="-1"><a class="header-anchor" href="#_1-2-2-kubernetes-node节点"><span>1.2.2 <strong>Kubernetes Node节点</strong></span></a></h3><p>Kubernetes Node节点又称为工作节点（Worker Node），一个Kubernetes集群至少需要一个工作节点，但通常很多，工作节点也包含很多组件，用于运行以及维护Pod及service等信息, 管理volume(CVI)和网络(CNI)。在Kubernetes集群中可以动态的添加和删除节点来扩展和缩减集群。</p><p><strong>工作节点Node上的组件如下：</strong></p><ul><li><strong>Kubelet:</strong></li></ul><p>Kubelet会在集群中每个Worker节点上运行，负责维护容器（Containers）的生命周期(创建pod，销毁pod)，确保Pod处于运行状态且健康。同时也负责Volume(CVI)和网络(CNI)的管理。Kubelet不会管理不是由Kubernetes创建的容器。</p><ul><li><strong>kube-proxy:</strong></li></ul><p>Kube-proxy是集群中每个Worker节点上运行的网络代理，管理IP转换和路由，确保每个Pod获得唯一的IP地址，维护网络规则，这些网络规则会允许从集群内部或外部的网络会话与Pod进行网络通信。</p><ul><li><strong>container Runtime:</strong></li></ul><p>容器运行时(Container Runtime)负责运行容器的软件，为了运行容器每个Worker节点都有一个Container Runtime引擎，负责镜像管理以及Pod和容器的启动停止。</p><h2 id="_1-3-kubernetes-核心概念" tabindex="-1"><a class="header-anchor" href="#_1-3-kubernetes-核心概念"><span>1.3 <strong>Kubernetes 核心概念</strong></span></a></h2><p>Kubernetes中有非常多的核心概念，下面主要介绍Kubernetes集群中常见的一些概念。</p><h3 id="_1-3-1-pod" tabindex="-1"><a class="header-anchor" href="#_1-3-1-pod"><span>1.3.1 <strong>Pod</strong></span></a></h3><p>Pod是可以在 Kubernetes 中创建和管理的、最小的可部署的计算单元，是Kubernetes调度的基本单位，Pod设计的理念是每个Pod都有一个唯一的IP。Pod就像豌豆荚一样，其中包含着一组（一个或多个）容器，这些容器共享存储、网络、文件系统以及怎样运行这些容器的声明。</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/a50dae4997a14440ac578cd042c9a4cc.png" alt="image.png" loading="lazy"></p><p><strong>Node&amp;Pod&amp;Container&amp;应用程序关系如下图所示：</strong></p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/56789990f8a04f7a9d0cc2b75d727654.png" alt="image.png" loading="lazy"></p><h3 id="_1-3-2-label" tabindex="-1"><a class="header-anchor" href="#_1-3-2-label"><span>1.3.2 <strong>Label</strong></span></a></h3><p>Label是附着到object上（例如Pod）的键值对。可以在创建object的时候指定，也可以在object创建后随时指定。Labels的值对系统本身并没有什么含义，只是对用户才有意义。</p><p>一个Label是一个key=value的键值对，其中key与value由用户自己指定。Label可以附加到各种资源对象上，例如Node、Pod、Service、RC等，一个资源对象可以定义任意数量的Label，同一个Label也可以被添加到任意数量的资源对象上去，Label通常在资源对象定义时确定，也可以在对象创建后动态添加或者删除。</p><p>我们可以通过指定的资源对象捆绑一个或多个不同的Label来实现多维度的资源分组管理功能，以便于灵活、方便地进行资源分配、调度、配置、部署等管理工作。例如：部署不同版本的应用到不同的环境中；或者监控和分析应用（日志记录、监控、告警）等。</p><p>一些常用abel示例如下所示:</p><ul><li>版本标签：&quot;release&quot; : &quot;stable&quot; , &quot;release&quot; : &quot;canary&quot;...</li><li>环境标签：&quot;environment&quot; : &quot;dev&quot; , &quot;environment&quot; : &quot;production&quot;</li><li>架构标签：&quot;tier&quot; : &quot;frontend&quot; , &quot;tier&quot; : &quot;backend&quot; , &quot;tier&quot; : &quot;middleware&quot;</li><li>分区标签：&quot;partition&quot; : &quot;customerA&quot; , &quot;partition&quot; : &quot;customerB&quot;...</li><li>质量管控标签：&quot;track&quot; : &quot;daily&quot; , &quot;track&quot; : &quot;weekly&quot;</li></ul><p>Label相当于我们熟悉的“标签”，给某个资源对象定义一个Label，就相当于给它打了一个标签，随后可以通过Label Selector（标签选择器）查询和筛选拥有某些Label的资源对象，Kubernetes通过这种方式实现了类似SQL的简单又通用的对象查询机制。</p><h3 id="_1-3-3-namespace" tabindex="-1"><a class="header-anchor" href="#_1-3-3-namespace"><span>1.3.3 <strong>NameSpace</strong></span></a></h3><p>Namespace 命名空间是对一组资源和对象的抽象集合，比如可以用来将系统内部的对象划分为不同的项目组或者用户组。常见的pod、service、replicaSet和deployment等都是属于某一个namespace的(默认是default)，而node, persistentVolumes等则不属于任何namespace。</p><p>当删除一个命名空间时会自动删除所有属于该namespace的资源，default和kube-system命名空间不可删除。</p><h3 id="_1-3-4-controller控制器" tabindex="-1"><a class="header-anchor" href="#_1-3-4-controller控制器"><span>1.3.4 <strong>Controller控制器</strong></span></a></h3><p>在 Kubernetes 中，Contorller用于管理和运行Pod的对象，控制器通过监控集群的公共状态，并致力于将当前状态转变为期望的状态。一个Controller控制器至少追踪一种类型的 Kubernetes 资源。这些对象有一个代表期望状态的spec字段。该资源的控制器负责确保其当前状态接近期望状态。</p><p>不同类型的控制器实现的控制方式不一样，以下介绍常见的几种类型的控制器。</p><h4 id="_1-3-4-1-deployments控制器" tabindex="-1"><a class="header-anchor" href="#_1-3-4-1-deployments控制器"><span>1.3.4.1 deployments控制器</span></a></h4><p>deployments控制器用来部署无状态应用。基于容器部署的应用一般分为两种，无状态应用和有状态应用。</p><ul><li>无状态应用：认为Pod都一样，没有顺序要求，随意进行扩展和伸缩。例如：nginx,请求本身包含了响应端为响应这一请求所@需的全部信息。每一个请求都像首次执行一样，不会依赖之前的数据进行响应，不需要持久化数据，无状态应用的多个实例之间互不依赖，可以无序的部署、删除或伸缩。</li><li>有状态应用：每个pod都是独立运行，有唯一的网络表示符，持久化存储，有序。例如：mysql主从，主机名称固定，而且其扩容以及升级等操作也是按顺序进行。有状态应用前后请求有关联与依赖，需要持久化数据，有状态应运用的多个实例之间有依赖，不能相互替换。</li></ul><p>在Kubernetes中，一般情况下我们不需要手动创建Pod实例，而是采用更高一层的抽象或定义来管理Pod，针对无状态类型的应用，Kubernetes使用Deloyment的Controller对象与之对应，其典型的应用场景包括：</p><blockquote><ul><li>定义Deployment来创建Pod和ReplicaSet</li><li>滚动升级和回滚应用</li><li>扩容和缩容</li><li>暂停和继续Deployment</li></ul></blockquote><h4 id="_1-3-4-2-replicaset控制器" tabindex="-1"><a class="header-anchor" href="#_1-3-4-2-replicaset控制器"><span>1.3.4.2 <strong>ReplicaSet控制器</strong></span></a></h4><p>通过改变Pod副本数量实现Pod的扩容和缩容，一般Deployment里包含并使用了ReplicaSet。对于ReplicaSet而言，它希望pod保持预期数目、持久运行下去，除非用户明确删除，否则这些对象一直存在，它们针对的是耐久性任务，如web服务等。</p><h4 id="_1-3-4-3-statefulset控制器" tabindex="-1"><a class="header-anchor" href="#_1-3-4-3-statefulset控制器"><span>1.3.4.3 <strong>statefulSet控制器</strong></span></a></h4><p>Deployments和ReplicaSets是为无状态服务设计的，StatefulSet则是为了有状态服务而设计，其应用场景包括：</p><ul><li>稳定的持久化存储，即Pod重新调度后还是能访问到相同的持久化数据，基于PVC（PersistentVolumeClaim，持久存储卷声明）来实现。</li><li>稳定的网络标志，即Pod重新调度后其PodName和HostName不变，基于Headless Service(即没有Cluster IP的Service)来实现。</li></ul><p>注意从写法上来看statefulSet与deployment几乎一致，就是类型不一样。</p><h4 id="_1-3-4-4-daemonset控制器" tabindex="-1"><a class="header-anchor" href="#_1-3-4-4-daemonset控制器"><span>1.3.4.4 <strong>DaemonSet控制器</strong></span></a></h4><p>DaemonSet保证在每个Node上都运行一个相同Pod实例，常用来部署一些集群的日志、监控或者其他系统管理应用。DaemonSet使用注意以下几点：</p><ul><li>当节点加入到Kubernetes集群中，pod会被（DaemonSet）调度到该节点上运行。</li><li>当节点从Kubernetes集群中被移除，被DaemonSet调度的pod会被移除。</li><li>如果删除一个Daemonset，所有跟这个DaemonSet相关的pods都会被删除。</li><li>如果一个DaemonSet的Pod被杀死、停止、或者崩溃，那么DaemonSet将会重新创建一个新的副本在这台计算节点上。</li><li>DaemonSet一般应用于日志收集、监控采集、分布式存储守护进程等。</li></ul><h4 id="_1-3-4-5-job控制器" tabindex="-1"><a class="header-anchor" href="#_1-3-4-5-job控制器"><span>1.3.4.5 <strong>Job控制器</strong></span></a></h4><p>ReplicaSet针对的是耐久性任务，对于非耐久性任务，比如压缩文件，任务完成后，pod需要结束运行，不需要pod继续保持在系统中，这个时候就要用到Job。Job负责批量处理短暂的一次性任务 (short lived one-off tasks)，即仅执行一次的任务，它保证批处理任务的一个或多个Pod成功结束。</p><h4 id="_1-3-4-6-cronjob控制器" tabindex="-1"><a class="header-anchor" href="#_1-3-4-6-cronjob控制器"><span>1.3.4.6 <strong>Cronjob控制器</strong></span></a></h4><p>Cronjob类似于Linux系统的crontab，在指定的时间周期运行相关的任务。</p><h3 id="_1-3-5-service" tabindex="-1"><a class="header-anchor" href="#_1-3-5-service"><span>1.3.5 <strong>Service</strong></span></a></h3><p>使用kubernetes集群运行工作负载时，由于Pod经常处于用后即焚状态，Pod经常被重新生成，因此Pod对应的IP地址也会经常变化，导致无法直接访问Pod提供的服务，Kubernetes中使用了Service来解决这一问题，即在Pod前面使用Service对Pod进行代理，无论Pod怎样变化 ，只要有Label，就可以让Service能够联系上Pod，把PodIP地址添加到Service对应的端点列表（Endpoints）实现对Pod IP跟踪，进而实现通过Service访问Pod目的。</p><p>Service有以下几个注意点：</p><ul><li>通过service为pod客户端提供访问pod方法，即可客户端访问pod入口</li><li>通过标签动态感知pod IP地址变化等</li><li>防止pod失联</li><li>定义访问pod访问策略</li><li>通过label-selector相关联</li><li>通过Service实现Pod的负载均衡</li></ul><p>Service 有如下四种类型：</p><ul><li>ClusterIP：默认，分配一个集群内部可以访问的虚拟IP。</li><li>NodePort：在每个Node上分配一个端口作为外部访问入口。nodePort端口范围为:30000-32767</li><li>LoadBalancer：工作在特定的Cloud Provider上，例如Google Cloud，AWS，OpenStack。</li><li>ExternalName：表示把集群外部的服务引入到集群内部中来，即实现了集群内部pod和集群外部的服务进行通信，适用于外部服务使用域名的方式，缺点是不能指定端口。</li></ul><h3 id="_1-3-6-volume-存储卷" tabindex="-1"><a class="header-anchor" href="#_1-3-6-volume-存储卷"><span>1.3.6 <strong>Volume 存储卷</strong></span></a></h3><p>默认情况下容器的数据是非持久化的，容器消亡以后数据也会跟着丢失。Docker容器提供了Volume机制以便将数据持久化存储。Kubernetes提供了更强大的Volume机制和插件，解决了容器数据持久化以及容器间共享数据的问题。</p><p>Kubernetes存储卷的生命周期与Pod绑定，容器挂掉后Kubelet再次重启容器时，Volume的数据依然还在，Pod删除时，Volume才会清理。数据是否丢失取决于具体的Volume类型，比如emptyDir的数据会丢失，而PV的数据则不会丢。</p><p>目前Kubernetes主要支持以下Volume类型：</p><ul><li>emptyDir：Pod存在，emptyDir就会存在，容器挂掉不会引起emptyDir目录下的数据丢失，但是pod被删除或者迁移，emptyDir也会被删除。</li><li>hostPath：hostPath允许挂载Node上的文件系统到Pod里面去。</li><li>NFS（Network File System）：网络文件系统，Kubernetes中通过简单地配置就可以挂载NFS到Pod中，而NFS中的数据是可以永久保存的，同时NFS支持同时写操作。</li><li>glusterfs：同NFS一样是一种网络文件系统，Kubernetes可以将glusterfs挂载到Pod中，并进行永久保存。</li><li>cephfs：一种分布式网络文件系统，可以挂载到Pod中，并进行永久保存。</li><li>subpath：Pod的多个容器使用同一个Volume时，会经常用到。</li><li>secret：密钥管理，可以将敏感信息进行加密之后保存并挂载到Pod中。</li><li>persistentVolumeClaim：用于将持久化存储（PersistentVolume）挂载到Pod中。</li></ul><p>除了以上几种Volume类型，Kubernetes还支持很多类型的Volume，详细可以参考：<a href="https://kubernetes.io/docs/concepts/storage/" target="_blank" rel="noopener noreferrer">https://kubernetes.io/docs/concepts/storage/</a></p><h3 id="_1-3-7-persistentvolume-pv-持久化存储卷" tabindex="-1"><a class="header-anchor" href="#_1-3-7-persistentvolume-pv-持久化存储卷"><span>1.3.7 <strong>PersistentVolume(PV) 持久化存储卷</strong></span></a></h3><p>kubernetes存储卷的分类太丰富了，每种类型都要写相应的接口与参数才行，这就让维护与管理难度加大，PersistentVolume(PV)是集群之中的一块网络存储，跟 Node 一样，也是集群的资源。PV是配置好的一段存储(可以是任意类型的存储卷)，将网络存储共享出来,配置定义成PV。PersistentVolume (PV)和PersistentVolumeClaim (PVC)提供了方便的持久化卷， PV提供网络存储资源，而PVC请求存储资源并将其挂载到Pod中，通过PVC用户不需要关心具体的volume实现细节,只需要关心使用需求。</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/fbf2a1687a1e4d3daf73600c19fccaa5.png" alt="image.png" loading="lazy"></p><h3 id="_1-3-8-configmap" tabindex="-1"><a class="header-anchor" href="#_1-3-8-configmap"><span>1.3.8 <strong>ConfigMap</strong></span></a></h3><p>ConfigMap用于保存配置数据的键值对，可以用来保存单个属性，也可以用来保存配置文件，实现对容器中应用的配置管理，可以把ConfigMap看作是一个挂载到pod中的存储卷。ConfigMap跟secret很类似，但它可以更方便地处理不包含敏感信息的明文字符串。</p><h3 id="_1-3-9-secret" tabindex="-1"><a class="header-anchor" href="#_1-3-9-secret"><span>1.3.9 <strong>Secret</strong></span></a></h3><p>Sercert-密钥解决了密码、token、密钥等敏感数据的配置问题，而不需要把这些敏感数据暴露到镜像或者Pod Spec中。</p><h3 id="_1-3-10-serviceaccount" tabindex="-1"><a class="header-anchor" href="#_1-3-10-serviceaccount"><span>1.3.10 <strong>ServiceAccount</strong></span></a></h3><p>Service account是为了方便Pod里面的进程调用Kubernetes API或其他外部服务而设计的。Service Account为服务提供了一种方便的认证机制，但它不关心授权的问题。可以配合RBAC(Role Based Access Control)来为Service Account鉴权，通过定义Role、RoleBinding、ClusterRole、ClusterRoleBinding来对sa进行授权。</p><h2 id="_1-4-kubernetes-集群搭建环境准备" tabindex="-1"><a class="header-anchor" href="#_1-4-kubernetes-集群搭建环境准备"><span>1.4 <strong>Kubernetes 集群搭建环境准备</strong></span></a></h2><p>这里使用kubeadm部署工具来进行部署Kubernetes。Kubeadm是为创建Kubernetes集群提供最佳实践并能够“快速路径”构建kubernetes集群的工具。它能够帮助我们执行必要的操作，以获得最小可行的、安全的集群，并以用户友好的方式运行。</p><h3 id="_1-4-1-节点划分" tabindex="-1"><a class="header-anchor" href="#_1-4-1-节点划分"><span>1.4.1 <strong>节点划分</strong></span></a></h3><p>kubernetes 集群搭建节点分布：</p><table><thead><tr><th><strong>节点IP</strong></th><th><strong>节点名称</strong></th><th><strong>Master</strong></th><th><strong>Worker</strong></th></tr></thead><tbody><tr><td>192.168.179.4</td><td>node1</td><td>★</td><td></td></tr><tr><td>192.168.179.5</td><td>node2</td><td></td><td>★</td></tr><tr><td>192.168.179.6</td><td>node3</td><td></td><td>★</td></tr><tr><td>192.168.179.7</td><td>node4</td><td></td><td></td></tr><tr><td>192.168.179.8</td><td>node5</td><td></td><td></td></tr></tbody></table><h3 id="_1-4-2-升级内核" tabindex="-1"><a class="header-anchor" href="#_1-4-2-升级内核"><span>1.4.2 <strong>升级内核</strong></span></a></h3><p>升级操作系统内核，升级到6.06内核版本。这里所有主机均操作，包括node4,node5节点。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#导入elrepo gpg key</span></span>
<span class="line"><span>rpm --import https://www.elrepo.org/RPM-GPG-KEY-elrepo.org</span></span>
<span class="line"><span>#安装elrepo YUM源仓库</span></span>
<span class="line"><span>yum -y install https://www.elrepo.org/elrepo-release-7.0-4.el7.elrepo.noarch.rpm</span></span>
<span class="line"><span>#安装kernel-ml版本，ml为长期稳定版本，lt为长期维护版本</span></span>
<span class="line"><span>yum --enablerepo=&quot;elrepo-kernel&quot; -y install kernel-ml.x86_64</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#设置grub2默认引导为0</span></span>
<span class="line"><span>grub2-set-default 0</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#重新生成grub2引导文件</span></span>
<span class="line"><span>grub2-mkconfig -o /boot/grub2/grub.cfg</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#更新后，需要重启，使用升级的内核生效。</span></span>
<span class="line"><span>reboot</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#重启后，需要验证内核是否为更新对应的版本</span></span>
<span class="line"><span>uname -r</span></span>
<span class="line"><span>6.0.6-1.el7.elrepo.x86_64</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-4-3-配置内核转发及网桥过滤" tabindex="-1"><a class="header-anchor" href="#_1-4-3-配置内核转发及网桥过滤"><span>1.4.3 <strong>配置内核转发及网桥过滤</strong></span></a></h3><p>在所有K8S主机配置。添加网桥过滤及内核转发配置文件：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>vim /etc/sysctl.d/k8s.conf</span></span>
<span class="line"><span>net.bridge.bridge-nf-call-ip6tables = 1</span></span>
<span class="line"><span>net.bridge.bridge-nf-call-iptables = 1</span></span>
<span class="line"><span>net.ipv4.ip_forward = 1</span></span>
<span class="line"><span>vm.swappiness = 0</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>加载br_netfilter模块：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#加载br_netfilter模块</span></span>
<span class="line"><span>modprobe br_netfilter</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#查看是否加载</span></span>
<span class="line"><span>lsmod | grep br_netfilter</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>加载网桥过滤及内核转发配置文件：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>sysctl -p /etc/sysctl.d/k8s.conf</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><h3 id="_1-4-4-安装ipset及ipvsadm" tabindex="-1"><a class="header-anchor" href="#_1-4-4-安装ipset及ipvsadm"><span>1.4.4 <strong>安装ipset及ipvsadm</strong></span></a></h3><p>所有主机均需要操作。主要用于实现service转发。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#安装ipset及ipvsadm</span></span>
<span class="line"><span>yum -y install ipset ipvsadm</span></span>
<span class="line"><span></span></span>
<span class="line"><span>配置ipvsadm模块加载方式，添加需要加载的模块</span></span>
<span class="line"><span>vim  /etc/sysconfig/modules/ipvs.modules</span></span>
<span class="line"><span>modprobe -- ip_vs</span></span>
<span class="line"><span>modprobe -- ip_vs_rr</span></span>
<span class="line"><span>modprobe -- ip_vs_wrr</span></span>
<span class="line"><span>modprobe -- ip_vs_sh</span></span>
<span class="line"><span>modprobe -- nf_conntrack</span></span>
<span class="line"><span></span></span>
<span class="line"><span>授权、运行、检查是否加载</span></span>
<span class="line"><span>chmod 755 /etc/sysconfig/modules/ipvs.modules </span></span>
<span class="line"><span>bash /etc/sysconfig/modules/ipvs.modules</span></span>
<span class="line"><span>lsmod | grep -e ip_vs -e nf_conntrack</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-4-5-关闭swap分区" tabindex="-1"><a class="header-anchor" href="#_1-4-5-关闭swap分区"><span>1.4.5 <strong>关闭SWAP分区</strong></span></a></h3><p>修改完成后需要重启操作系统，如不重启，可临时关闭，命令为swapoff -a。永远关闭swap分区，需要重启操作系统。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#永久关闭swap分区 ,在 /etc/fstab中注释掉下面一行</span></span>
<span class="line"><span>vim /etc/fstab</span></span>
<span class="line"><span>#/dev/mapper/centos-swap swap  swap    defaults        0 0</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#重启机器</span></span>
<span class="line"><span>reboot</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-4-6-安装docker" tabindex="-1"><a class="header-anchor" href="#_1-4-6-安装docker"><span>1.4.6 <strong>安装docker</strong></span></a></h3><p>所有集群主机均需操作。</p><p>获取docker repo文件</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>wget -O /etc/yum.repos.d/docker-ce.repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>查看docker可以安装的版本：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>yum list docker-ce.x86_64 --showduplicates | sort -r</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>安装docker:这里指定docker版本为20.10.9版本</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>yum -y install docker-ce-20.10.9-3.el7</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><blockquote><p>如果安装过程中报错:</p></blockquote><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>Error: Package: 3:docker-ce-20.10.9-3.el7.x86_64 (docker-ce-stable)</span></span>
<span class="line"><span>           Requires: container-selinux &gt;= 2:2.74</span></span>
<span class="line"><span>Error: Package: docker-ce-rootless-extras-20.10.9-3.el7.x86_64 (docker-ce-stable)</span></span>
<span class="line"><span>           Requires: fuse-overlayfs &gt;= 0.7</span></span>
<span class="line"><span>Error: Package: docker-ce-rootless-extras-20.10.9-3.el7.x86_64 (docker-ce-stable)</span></span>
<span class="line"><span>           Requires: slirp4netns &gt;= 0.4</span></span>
<span class="line"><span>Error: Package: containerd.io-1.4.9-3.1.el7.x86_64 (docker-ce-stable)</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><blockquote><p>缺少一些依赖，解决方式：在/etc/yum.repos.d/docker-ce.repo开头追加如下内容:</p></blockquote><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[centos-extras]</span></span>
<span class="line"><span>name=Centos extras - $basearch</span></span>
<span class="line"><span>baseurl=http://mirror.centos.org/centos/7/extras/x86_64</span></span>
<span class="line"><span>enabled=1</span></span>
<span class="line"><span>gpgcheck=0</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><blockquote><p>然后执行安装命令：</p></blockquote><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>yum -y install slirp4netns fuse-overlayfs container-selinux</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><blockquote><p>执行完以上之后，再次执行yum -y install docker-ce-20.10.9-3.el7安装docker即可。</p></blockquote><p>设置docker 开机启动，并启动docker：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>systemctl enable docker</span></span>
<span class="line"><span>systemctl start docker</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>查看docker版本</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>docker version</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>修改cgroup方式，并重启docker。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>vim /etc/docker/daemon.json</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>        &quot;exec-opts&quot;: [&quot;native.cgroupdriver=systemd&quot;]</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#重启docker</span></span>
<span class="line"><span>systemctl restart docker</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="_1-5-kubernetes-集群搭建" tabindex="-1"><a class="header-anchor" href="#_1-5-kubernetes-集群搭建"><span>1.5 <strong>Kubernetes 集群搭建</strong></span></a></h2><h3 id="_1-5-1-软件版本" tabindex="-1"><a class="header-anchor" href="#_1-5-1-软件版本"><span>1.5.1 <strong>软件版本</strong></span></a></h3><p>这里安装Kubernetes版本为1.25.3，在所有主机（node1,node2,node3）安装kubeadm，kubelet，kubectl。</p><p>kubeadm：初始化集群、管理集群等。</p><p>kubelet:用于接收api-server指令，对pod生命周期进行管理。</p><p>kubectl:集群应用命令行管理工具。</p><h3 id="_1-5-2-准备阿里yum源" tabindex="-1"><a class="header-anchor" href="#_1-5-2-准备阿里yum源"><span>1.5.2 <strong>准备阿里yum源</strong></span></a></h3><p>每台k8s节点vim /etc/yum.repos.d/k8s.repo，写入以下内容：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[kubernetes]</span></span>
<span class="line"><span>name=Kubernetes</span></span>
<span class="line"><span>baseurl=https://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64/</span></span>
<span class="line"><span>enabled=1</span></span>
<span class="line"><span>gpgcheck=1</span></span>
<span class="line"><span>repo_gpgcheck=0</span></span>
<span class="line"><span>gpgkey=https://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg https://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-5-3-集群软件安装" tabindex="-1"><a class="header-anchor" href="#_1-5-3-集群软件安装"><span>1.5.3 <strong>集群软件安装</strong></span></a></h3><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#查看指定版本</span></span>
<span class="line"><span>yum list kubeadm.x86_64 --showduplicates | sort -r</span></span>
<span class="line"><span>yum list kubelet.x86_64 --showduplicates | sort -r</span></span>
<span class="line"><span>yum list kubectl.x86_64 --showduplicates | sort -r</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#安装指定版本</span></span>
<span class="line"><span>yum -y install --setopt=obsoletes=0 kubeadm-1.25.3-0  kubelet-1.25.3-0 kubectl-1.25.3-0</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-5-4-配置kubelet" tabindex="-1"><a class="header-anchor" href="#_1-5-4-配置kubelet"><span>1.5.4 <strong>配置kubelet</strong></span></a></h3><p>为了实现docker使用的cgroup driver与kubelet使用的cgroup的一致性，建议修改如下文件内容。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#vim /etc/sysconfig/kubelet</span></span>
<span class="line"><span>KUBELET_EXTRA_ARGS=&quot;--cgroup-driver=systemd&quot;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>设置kubelet为开机自启动即可，由于没有生成配置文件，集群初始化后自动启动</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>systemctl enable kubelet</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><h3 id="_1-5-5-集群镜像准备" tabindex="-1"><a class="header-anchor" href="#_1-5-5-集群镜像准备"><span>1.5.5 <strong>集群镜像准备</strong></span></a></h3><p>只需要在node1 Master节点上执行如下下载镜像命令即可，这里先使用kubeadm查询下镜像。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]#kubeadm config images list --kubernetes-version=v1.25.3</span></span>
<span class="line"><span>registry.k8s.io/kube-apiserver:v1.25.3</span></span>
<span class="line"><span>registry.k8s.io/kube-controller-manager:v1.25.3</span></span>
<span class="line"><span>registry.k8s.io/kube-scheduler:v1.25.3</span></span>
<span class="line"><span>registry.k8s.io/kube-proxy:v1.25.3</span></span>
<span class="line"><span>registry.k8s.io/pause:3.8</span></span>
<span class="line"><span>registry.k8s.io/etcd:3.5.4-0</span></span>
<span class="line"><span>registry.k8s.io/coredns/coredns:v1.9.3</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>编写下载镜像脚本image_download.sh：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#!/bin/bash</span></span>
<span class="line"><span>images_list=&#39;</span></span>
<span class="line"><span>registry.k8s.io/kube-apiserver:v1.25.3</span></span>
<span class="line"><span>registry.k8s.io/kube-controller-manager:v1.25.3</span></span>
<span class="line"><span>registry.k8s.io/kube-scheduler:v1.25.3</span></span>
<span class="line"><span>registry.k8s.io/kube-proxy:v1.25.3</span></span>
<span class="line"><span>registry.k8s.io/pause:3.8</span></span>
<span class="line"><span>registry.k8s.io/etcd:3.5.4-0</span></span>
<span class="line"><span>registry.k8s.io/coredns/coredns:v1.9.3</span></span>
<span class="line"><span>&#39;</span></span>
<span class="line"><span>for i in $images_list</span></span>
<span class="line"><span>do</span></span>
<span class="line"><span>  docker pull $i</span></span>
<span class="line"><span>done</span></span>
<span class="line"><span>docker save -o k8s-1-25-3.tar $images_list</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>以上脚本准备完成之后，执行命令：sh image_download.sh 进行镜像下载</p><p>注意：下载时候需要科学上网，否则下载不下来。也可以使用资料中的“k8s-1-25-3.tar”下载好的包。</p><blockquote><p>#如果下载不下来，使用资料中打包好的k8s-1-25-3.tar，将镜像导入到docker中</p><p>docker load -i k8s-1-25-3.tar</p></blockquote><h3 id="_1-5-6-集群初始化" tabindex="-1"><a class="header-anchor" href="#_1-5-6-集群初始化"><span>1.5.6 <strong>集群初始化</strong></span></a></h3><p>只需要在Master节点执行如下初始化命令即可。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# kubeadm init --kubernetes-version=v1.25.3 --pod-network-cidr=10.244.0.0/16 --apiserver-advertise-address=192.168.179.4</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>注意：--apiserver-advertise-address=192.168.179.4 要写当前主机Master IP</p><blockquote><p>初始化过程中报错：</p></blockquote><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[init] Using Kubernetes version: v1.25.3</span></span>
<span class="line"><span>[preflight] Running pre-flight checks</span></span>
<span class="line"><span>error execution phase preflight: [preflight] Some fatal errors occurred:</span></span>
<span class="line"><span>	[ERROR CRI]: container runtime is not running: output: E1102 20:14:29.494424   10976 remote_runtime.go:948] &quot;Status from runtime service </span></span>
<span class="line"><span>failed&quot; err=&quot;rpc error: code = Unimplemented desc = unknown service runtime.v1alpha2.RuntimeService&quot;time=&quot;2022-11-02T20:14:29+08:00&quot; level=fatal msg=&quot;getting status of runtime: rpc error: code = Unimplemented desc = unknown service runtime.v1alp</span></span>
<span class="line"><span>ha2.RuntimeService&quot;, error: exit status 1</span></span>
<span class="line"><span>[preflight] If you know what you are doing, you can make a check non-fatal with \`--ignore-preflight-errors=...\`</span></span>
<span class="line"><span>To see the stack trace of this error execute with --v=5 or higher</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>执行如下命令，重启containerd后，再次init 初始化。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# rm -rf /etc/containerd/config.toml</span></span>
<span class="line"><span>[root@node1 ~]# systemctl restart containerd</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>初始化完成后，结果如下：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>Your Kubernetes control-plane has initialized successfully!</span></span>
<span class="line"><span></span></span>
<span class="line"><span>To start using your cluster, you need to run the following as a regular user:</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  mkdir -p $HOME/.kube</span></span>
<span class="line"><span>  sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config</span></span>
<span class="line"><span>  sudo chown $(id -u):$(id -g) $HOME/.kube/config</span></span>
<span class="line"><span></span></span>
<span class="line"><span>Alternatively, if you are the root user, you can run:</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  export KUBECONFIG=/etc/kubernetes/admin.conf</span></span>
<span class="line"><span></span></span>
<span class="line"><span>You should now deploy a pod network to the cluster.</span></span>
<span class="line"><span>Run &quot;kubectl apply -f [podnetwork].yaml&quot; with one of the options listed at:</span></span>
<span class="line"><span>  https://kubernetes.io/docs/concepts/cluster-administration/addons/</span></span>
<span class="line"><span></span></span>
<span class="line"><span>Then you can join any number of worker nodes by running the following on each as root:</span></span>
<span class="line"><span></span></span>
<span class="line"><span>kubeadm join 192.168.179.4:6443 --token tpynmm.7picylv5i83q9ghw \\</span></span>
<span class="line"><span>	--discovery-token-ca-cert-hash sha256:2924026774d657b8860fbac4ef7698e90a3811137673af45e533c91e567a1529</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-5-7-集群应用客户端管理集群文件准备" tabindex="-1"><a class="header-anchor" href="#_1-5-7-集群应用客户端管理集群文件准备"><span>1.5.7 <strong>集群应用客户端管理集群文件准备</strong></span></a></h3><p>参照初始化的内容来执行如下命令：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# mkdir -p $HOME/.kube</span></span>
<span class="line"><span>[root@node1 ~]# cp -i /etc/kubernetes/admin.conf $HOME/.kube/config</span></span>
<span class="line"><span>[root@node1 ~]# chown $(id -u):$(id -g) $HOME/.kube/config</span></span>
<span class="line"><span>[root@node1 ~]# export KUBECONFIG=/etc/kubernetes/admin.conf</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-5-8-集群网络准备" tabindex="-1"><a class="header-anchor" href="#_1-5-8-集群网络准备"><span>1.5.8 <strong>集群网络准备</strong></span></a></h3><h4 id="_1-5-8-1-calico安装" tabindex="-1"><a class="header-anchor" href="#_1-5-8-1-calico安装"><span>1.5.8.1 <strong>calico安装</strong></span></a></h4><p>K8s使用calico部署集群网络,安装参考网址：<a href="https://projectcalico.docs.tigera.io/about/about-calico%EF%BC%8Ck8s" target="_blank" rel="noopener noreferrer">https://projectcalico.docs.tigera.io/about/about-calico，k8s</a> 1.25.3 匹配 calico版本为\xA0v3.24.5。</p><p>只需要在Master节点安装即可。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#下载operator资源清单文件</span></span>
<span class="line"><span>wget https://docs.projectcalico.org/manifests/tigera-operator.yaml --no-check-certificate</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#应用资源清单文件，创建operator</span></span>
<span class="line"><span>kubectl create -f tigera-operator.yaml</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#通过自定义资源方式安装</span></span>
<span class="line"><span>wget https://docs.projectcalico.org/manifests/custom-resources.yaml --no-check-certificate</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#修改文件第13行，修改为使用kubeadm init ----pod-network-cidr对应的IP地址段</span></span>
<span class="line"><span># vim custom-resources.yaml 【修改和增加以下加粗内容】</span></span>
<span class="line"><span>apiVersion: operator.tigera.io/v1</span></span>
<span class="line"><span>kind: Installation</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  name: default</span></span>
<span class="line"><span>spec:</span></span>
<span class="line"><span>  # Configures Calico networking.</span></span>
<span class="line"><span>  calicoNetwork:</span></span>
<span class="line"><span>    # Note: The ipPools section cannot be modified post-install.</span></span>
<span class="line"><span>    ipPools:</span></span>
<span class="line"><span>    - blockSize: 26</span></span>
<span class="line"><span>      cidr: 10.244.0.0/16</span></span>
<span class="line"><span>      encapsulation: VXLANCrossSubnet</span></span>
<span class="line"><span>      natOutgoing: Enabled</span></span>
<span class="line"><span>      nodeSelector: all()</span></span>
<span class="line"><span>    nodeAddressAutodetectionV4:</span></span>
<span class="line"><span>      interface: ens.*</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#应用清单文件</span></span>
<span class="line"><span>kubectl create -f custom-resources.yaml</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#监视calico-sysem命名空间中pod运行情况</span></span>
<span class="line"><span>watch kubectl get pods -n calico-system</span></span>
<span class="line"><span>[root@node1 ~]# watch kubectl get pods -n calico-system</span></span>
<span class="line"><span></span></span>
<span class="line"><span>Every 2.0s: kubectl get pods -n calico-system                                                                            Thu Nov  3 14:14:30 2022</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                                       READY   STATUS    RESTARTS   AGE</span></span>
<span class="line"><span>calico-kube-controllers-65648cd788-flmk4   1/1     Running   0          2m21s</span></span>
<span class="line"><span>calico-node-chnd5                          1/1     Running   0          2m21s</span></span>
<span class="line"><span>calico-node-kc5bx                          1/1     Running   0          2m21s</span></span>
<span class="line"><span>calico-node-s2cp5                          1/1     Running   0          2m21s</span></span>
<span class="line"><span>calico-typha-d76595dfb-5z6mg               1/1     Running   0          2m21s</span></span>
<span class="line"><span>calico-typha-d76595dfb-hgg27               1/1     Running   0          2m19s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#删除 master 上的 taint</span></span>
<span class="line"><span>[root@node1 ~]# kubectl taint nodes --all node-role.kubernetes.io/master-</span></span>
<span class="line"><span>taint &quot;node-role.kubernetes.io/master&quot; not found</span></span>
<span class="line"><span>taint &quot;node-role.kubernetes.io/master&quot; not found</span></span>
<span class="line"><span>taint &quot;node-role.kubernetes.io/master&quot; not found</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#已经全部运行</span></span>
<span class="line"><span>[root@node1 ~]# kubectl get pods -n calico-system</span></span>
<span class="line"><span>NAME                                       READY   STATUS    RESTARTS   AGE</span></span>
<span class="line"><span>calico-kube-controllers-65648cd788-ktjrh   1/1     Running   0          110m</span></span>
<span class="line"><span>calico-node-dvprv                          1/1     Running   0          110m</span></span>
<span class="line"><span>calico-node-nhzch                          1/1     Running   0          110m</span></span>
<span class="line"><span>calico-node-q44gh                          1/1     Running   0          110m</span></span>
<span class="line"><span>calico-typha-6bc9d76554-4bv77              1/1     Running   0          110m</span></span>
<span class="line"><span>calico-typha-6bc9d76554-nkzxq              1/1     Running   0          110m</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#查看kube-system命名空间中coredns状态，处于Running状态表明联网成功。</span></span>
<span class="line"><span>[root@node1 ~]# kubectl get pods -n kube-system</span></span>
<span class="line"><span>NAME                            READY   STATUS    RESTARTS   AGE</span></span>
<span class="line"><span>coredns-565d847f94-bjtlh        1/1     Running   0          19h</span></span>
<span class="line"><span>coredns-565d847f94-wlxmf        1/1     Running   0          19h</span></span>
<span class="line"><span>etcd-node1                      1/1     Running   0          19h</span></span>
<span class="line"><span>kube-apiserver-node1            1/1     Running   0          19h</span></span>
<span class="line"><span>kube-controller-manager-node1   1/1     Running   0          19h</span></span>
<span class="line"><span>kube-proxy-bgpz2                1/1     Running   0          19h</span></span>
<span class="line"><span>kube-proxy-jlltp                1/1     Running   0          19h</span></span>
<span class="line"><span>kube-proxy-stfrx                1/1     Running   0          19h</span></span>
<span class="line"><span>kube-scheduler-node1            1/1     Running   0          19h</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h4 id="_1-5-8-2-calico客户端安装" tabindex="-1"><a class="header-anchor" href="#_1-5-8-2-calico客户端安装"><span>1.5.8.2 <strong>calico客户端安装</strong></span></a></h4><p>主要用来验证k8s集群节点网络是否正常。这里只需要在Master节点安装就可以。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#下载二进制文件，注意，这里需要检查calico 服务端的版本，客户端要与服务端版本保持一致，这里没有命令验证calico的版本，所以安装客户端的时候安装最新版本即可。</span></span>
<span class="line"><span>curl -L https://github.com/projectcalico/calico/releases/download/v3.24.3/calicoctl-linux-amd64 -o calicoctl</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#安装calicoctl</span></span>
<span class="line"><span>mv calicoctl /usr/bin/</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#为calicoctl添加可执行权限</span></span>
<span class="line"><span>chmod +x /usr/bin/calicoctl</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#查看添加权限后文件</span></span>
<span class="line"><span>ls /usr/bin/calicoctl</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#查看calicoctl版本</span></span>
<span class="line"><span>[root@node1 ~]# calicoctl  version</span></span>
<span class="line"><span>Client Version:    v3.24.1</span></span>
<span class="line"><span>Git commit:        83493da01</span></span>
<span class="line"><span>Cluster Version:   v3.24.3</span></span>
<span class="line"><span>Cluster Type:      typha,kdd,k8s,operator,bgp,kubeadm</span></span>
<span class="line"><span></span></span>
<span class="line"><span>通过~/.kube/config连接kubernetes集群，查看已运行节点</span></span>
<span class="line"><span>[root@node1 ~]#  DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl get nodes</span></span>
<span class="line"><span>NAME  </span></span>
<span class="line"><span>node1</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-5-9-集群工作节点添加" tabindex="-1"><a class="header-anchor" href="#_1-5-9-集群工作节点添加"><span>1.5.9 <strong>集群工作节点添加</strong></span></a></h3><p>这里在node2,node3 worker节点上执行命令，将worker节点加入到k8s集群。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node2 ~]# kubeadm join 192.168.179.4:6443 --token tpynmm.7picylv5i83q9ghw \\</span></span>
<span class="line"><span>	--discovery-token-ca-cert-hash sha256:2924026774d657b8860fbac4ef7698e90a3811137673af45e533c91e567a1529</span></span>
<span class="line"><span>[root@node3 ~]# kubeadm join 192.168.179.4:6443 --token tpynmm.7picylv5i83q9ghw \\</span></span>
<span class="line"><span>	--discovery-token-ca-cert-hash sha256:2924026774d657b8860fbac4ef7698e90a3811137673af45e533c91e567a1529</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><blockquote><p>注意：如果以上node2,node3 Worker节点已经错误的加入到Master节点，需要在Worker节点执行如下命令清除对应的信息，然后再次加入即可。</p></blockquote><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#重置kubeadm </span></span>
<span class="line"><span>[root@node2 ~]# kubeadm reset</span></span>
<span class="line"><span>#删除k8s配置文件和证书文件</span></span>
<span class="line"><span>[root@node2 kubernetes]# rm -f /etc/kubernetes/kubelet.conf </span></span>
<span class="line"><span>[root@node2 kubernetes]# rm -f /etc/kubernetes/pki/ca.crt</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#重置kubeadm </span></span>
<span class="line"><span>[root@node3 ~]# kubeadm reset</span></span>
<span class="line"><span>#删除k8s配置文件和证书文件</span></span>
<span class="line"><span>[root@node3 kubernetes]# rm -f /etc/kubernetes/kubelet.conf </span></span>
<span class="line"><span>[root@node3 kubernetes]# rm -f /etc/kubernetes/pki/ca.crt</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><blockquote><p>此外如果忘记了node join加入master节点的命令，可以按照以下步骤操作：</p></blockquote><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#查看discovery-token-ca-cert-hash</span></span>
<span class="line"><span>[root@node1 ~]# openssl x509 -pubkey -in /etc/kubernetes/pki/ca.crt | openssl rsa -pubin -outform der 2&gt;/dev/null | openssl dgst -sha256 -hex | sed &#39;s/^.* //&#39;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#查看token</span></span>
<span class="line"><span>[root@node1 ~]# kubeadm token list</span></span>
<span class="line"><span>TOKEN                     TTL         EXPIRES                USAGES                   DESCRIPTION  </span></span>
<span class="line"><span>EXTRA GROUPS1945mk.ved91lifrc8l0zj9   23h         2022-11-10T08:14:46Z   authentication,signing   The default bootstrap token generated by &#39;kubeadm init&#39;.   </span></span>
<span class="line"><span>system:bootstrappers:kubeadm:default-node-token</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#Node节点加入集群</span></span>
<span class="line"><span>[root@node1 ~]# kubeadm join 192.168.179.4:6443 --token 查询出来的token \\</span></span>
<span class="line"><span>	--discovery-token-ca-cert-hash 查询出来的hash码</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>在master节点上操作，查看网络节点是否添加</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl get nodes</span></span>
<span class="line"><span>NAME  </span></span>
<span class="line"><span>node1   </span></span>
<span class="line"><span>node2   </span></span>
<span class="line"><span>node3</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-5-10-验证集群可用性" tabindex="-1"><a class="header-anchor" href="#_1-5-10-验证集群可用性"><span>1.5.10 <strong>验证集群可用性</strong></span></a></h3><p>使用命令查看所有的节点：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# kubectl get nodes</span></span>
<span class="line"><span>NAME    STATUS   ROLES           AGE   VERSION</span></span>
<span class="line"><span>node1   Ready    control-plane   20h   v1.25.3</span></span>
<span class="line"><span>node2   Ready    &lt;none&gt;          20h   v1.25.3</span></span>
<span class="line"><span>node3   Ready    &lt;none&gt;          20h   v1.25.3</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>查看集群健康情况：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# kubectl get cs</span></span>
<span class="line"><span>Warning: v1 ComponentStatus is deprecated in v1.19+</span></span>
<span class="line"><span>NAME                 STATUS    MESSAGE                         ERROR</span></span>
<span class="line"><span>etcd-0               Healthy   {&quot;health&quot;:&quot;true&quot;,&quot;reason&quot;:&quot;&quot;}   </span></span>
<span class="line"><span>scheduler            Healthy   ok  </span></span>
<span class="line"><span>controller-manager   Healthy   ok</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>查看kubernetes集群pod运行情况:</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# kubectl get pods -n kube-system</span></span>
<span class="line"><span>NAME                            READY   STATUS    RESTARTS   AGE</span></span>
<span class="line"><span>coredns-565d847f94-bjtlh        1/1     Running   0          20h</span></span>
<span class="line"><span>coredns-565d847f94-wlxmf        1/1     Running   0          20h</span></span>
<span class="line"><span>etcd-node1                      1/1     Running   0          20h</span></span>
<span class="line"><span>kube-apiserver-node1            1/1     Running   0          20h</span></span>
<span class="line"><span>kube-controller-manager-node1   1/1     Running   0          20h</span></span>
<span class="line"><span>kube-proxy-bgpz2                1/1     Running   1          20h</span></span>
<span class="line"><span>kube-proxy-jlltp                1/1     Running   1          20h</span></span>
<span class="line"><span>kube-proxy-stfrx                1/1     Running   0          20h</span></span>
<span class="line"><span>kube-scheduler-node1            1/1     Running   0          20h</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>查看集群信息:</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# kubectl cluster-info</span></span>
<span class="line"><span>Kubernetes control plane is running at https://192.168.179.4:6443</span></span>
<span class="line"><span>CoreDNS is running at https://192.168.179.4:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy</span></span>
<span class="line"><span></span></span>
<span class="line"><span>To further debug and diagnose cluster problems, use &#39;kubectl cluster-info dump&#39;.</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-5-11-k8s集群其他一些配置" tabindex="-1"><a class="header-anchor" href="#_1-5-11-k8s集群其他一些配置"><span>1.5.11 <strong>K8s集群其他一些配置</strong></span></a></h3><p>当在Worker节点上执行kubectl命令管理时会报如下错误：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>The connection to the server localhost:8080 was refused - did you specify the right host or port?</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>只要把master上的管理文件/etc/kubernetes/admin.conf拷贝到Worker节点的$HOME/.kube/config就可以让Worker节点也可以实现kubectl命令管理。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#在Worker节点创建.kube目录</span></span>
<span class="line"><span>[root@node2 ~]# mkdir /root/.kube</span></span>
<span class="line"><span>[root@node3 ~]# mkdir /root/.kube</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#在master节点做如下操作</span></span>
<span class="line"><span>[root@node1 ~]# scp /etc/kubernetes/admin.conf node2:/root/.kube/config</span></span>
<span class="line"><span>[root@node1 ~]# scp /etc/kubernetes/admin.conf node3:/root/.kube/config</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#在worker 节点验证</span></span>
<span class="line"><span> [root@node2 ~]# kubectl get nodes</span></span>
<span class="line"><span>NAME    STATUS   ROLES           AGE   VERSION</span></span>
<span class="line"><span>node1   Ready    control-plane   24h   v1.25.3</span></span>
<span class="line"><span>node2   Ready    &lt;none&gt;          24h   v1.25.3</span></span>
<span class="line"><span>node3   Ready    &lt;none&gt;          24h   v1.25.3</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[root@node3 ~]# kubectl get nodes</span></span>
<span class="line"><span>NAME    STATUS   ROLES           AGE   VERSION</span></span>
<span class="line"><span>node1   Ready    control-plane   24h   v1.25.3</span></span>
<span class="line"><span>node2   Ready    &lt;none&gt;          24h   v1.25.3</span></span>
<span class="line"><span>node3   Ready    &lt;none&gt;          24h   v1.25.3</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>此外，无论在Master节点还是Worker节点使用kubenetes 命令时，默认不能自动补全，例如：kubectl describe 命令中describe不能自动补全，使用非常不方便，那么这里配置命令自动补全功能。</p><p>在所有的kubernetes节点上安装bash-completion并source执行，同时配置下开机自动source，每次开机能自动补全命令。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#安装bash-completion 并 source</span></span>
<span class="line"><span>yum install -y bash-completion</span></span>
<span class="line"><span>source /usr/share/bash-completion/bash_completion</span></span>
<span class="line"><span>kubectl completion bash &gt; ~/.kube/completion.bash.inc</span></span>
<span class="line"><span>source &#39;/root/.kube/completion.bash.inc&#39; </span></span>
<span class="line"><span></span></span>
<span class="line"><span>#实现用户登录主机自动source ,自动使用命令补全</span></span>
<span class="line"><span>vim ~/.bash_profile 【加入加粗这一句】</span></span>
<span class="line"><span># .bash_profile</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Get the aliases and functions</span></span>
<span class="line"><span>if [ -f ~/.bashrc ]; then</span></span>
<span class="line"><span>        . ~/.bashrc</span></span>
<span class="line"><span>fi</span></span>
<span class="line"><span></span></span>
<span class="line"><span># User specific environment and startup programs</span></span>
<span class="line"><span>source &#39;/root/.kube/completion.bash.inc&#39;</span></span>
<span class="line"><span>PATH=$PATH:$HOME/bin</span></span>
<span class="line"><span></span></span>
<span class="line"><span>export PATH</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="_1-6-kubernetes集群ui及主机资源监控" tabindex="-1"><a class="header-anchor" href="#_1-6-kubernetes集群ui及主机资源监控"><span>1.6 <strong>Kubernetes集群UI及主机资源监控</strong></span></a></h2><h3 id="_1-6-1-kubernetes-dashboard作用" tabindex="-1"><a class="header-anchor" href="#_1-6-1-kubernetes-dashboard作用"><span>1.6.1 <strong>Kubernetes dashboard作用</strong></span></a></h3><p>通过Kubernetes dashboard能够直观了解Kubernetes集群中运行的资源对象，通过dashboard可以直接管理（创建、删除、重启等操作）资源对象。</p><h3 id="_1-6-2-获取kubernetes-dashboard资源清单文件" tabindex="-1"><a class="header-anchor" href="#_1-6-2-获取kubernetes-dashboard资源清单文件"><span>1.6.2 <strong>获取Kubernetes dashboard资源清单文件</strong></span></a></h3><p>这里只需要在Kubernetes Master节点上来下载应用资源清单文件即可。<a href="http://xn--github-o05js580blxd.com" target="_blank" rel="noopener noreferrer">这里去github.com</a> 搜索“kubernetes dashboard”即可，找到匹配Kubernetes 版本的dashboard，下载对应版本的dashboard yaml文件。</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/0cddbf7f85004d91afec4b37a36a382d.png" alt="image.png" loading="lazy"></p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/8c8cde92fb3c4208a8da4ae772c5944c.png" alt="image.png" loading="lazy"></p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/d1c47c507a014c2cab5388b06150c29f.png" alt="image.png" loading="lazy"></p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# mkdir kube-dashboard</span></span>
<span class="line"><span>[root@node1 ~]# cd kube-dashboard/</span></span>
<span class="line"><span>[root@node1 kube-dashboard]# wget  https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>对应yaml文件下载完成后，为了方便后续在容器主机上访问，在yaml文件中添加对应的NodePort类型、端口以及修改登录kubernetes dashboard的用户。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#vi recommended.yaml 【只需要添加或修改以下加粗部分】</span></span>
<span class="line"><span>... ...</span></span>
<span class="line"><span></span></span>
<span class="line"><span>kind: Service</span></span>
<span class="line"><span>apiVersion: v1</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  labels:</span></span>
<span class="line"><span>    k8s-app: kubernetes-dashboard</span></span>
<span class="line"><span>  name: kubernetes-dashboard</span></span>
<span class="line"><span>  namespace: kubernetes-dashboard</span></span>
<span class="line"><span>spec:</span></span>
<span class="line"><span>  type: NodePort</span></span>
<span class="line"><span>  ports:</span></span>
<span class="line"><span>    - port: 443</span></span>
<span class="line"><span>      targetPort: 8443</span></span>
<span class="line"><span>      nodePort: 30000</span></span>
<span class="line"><span>  selector:</span></span>
<span class="line"><span>    k8s-app: kubernetes-dashboard</span></span>
<span class="line"><span></span></span>
<span class="line"><span>... ....</span></span>
<span class="line"><span>---</span></span>
<span class="line"><span></span></span>
<span class="line"><span>apiVersion: rbac.authorization.k8s.io/v1</span></span>
<span class="line"><span>kind: ClusterRoleBinding</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  name: kubernetes-dashboard</span></span>
<span class="line"><span>roleRef:</span></span>
<span class="line"><span>  apiGroup: rbac.authorization.k8s.io</span></span>
<span class="line"><span>  kind: ClusterRole</span></span>
<span class="line"><span>  name: cluster-admin</span></span>
<span class="line"><span>subjects:</span></span>
<span class="line"><span>  - kind: ServiceAccount</span></span>
<span class="line"><span>    name: kubernetes-dashboard</span></span>
<span class="line"><span>    namespace: kubernetes-dashboard</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>注意：一定要把原来kind为ClusterRole下的name对应值kubernetes-dashboard修改为cluster-admin，不然进入UI后会报错。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#部署Kubernetes dashboard</span></span>
<span class="line"><span>[root@node1 kube-dashboard]# kubectl apply -f recommended.yaml </span></span>
<span class="line"><span></span></span>
<span class="line"><span>#查看部署是否成功，出现kubenetes-dashboard命名空间即可。</span></span>
<span class="line"><span>[root@node1 kube-dashboard]# kubectl get ns</span></span>
<span class="line"><span>NAME                   STATUS   AGE</span></span>
<span class="line"><span>calico-apiserver       Active   5h33m</span></span>
<span class="line"><span>calico-system          Active   5h35m</span></span>
<span class="line"><span>default                Active   23h</span></span>
<span class="line"><span>kube-node-lease        Active   23h</span></span>
<span class="line"><span>kube-public            Active   23h</span></span>
<span class="line"><span>kube-system            Active   23h</span></span>
<span class="line"><span>kubernetes-dashboard   Active   6s</span></span>
<span class="line"><span>tigera-operator        Active   5h36m</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[root@node1 kube-dashboard]# kubectl get pod,svc -n kubernetes-dashboard</span></span>
<span class="line"><span>NAME                                             READY   STATUS    RESTARTS   AGE</span></span>
<span class="line"><span>pod/dashboard-metrics-scraper-64bcc67c9c-gsqsn   1/1     Running   0          112s</span></span>
<span class="line"><span>pod/kubernetes-dashboard-5c8bd6b59-x4p8r         1/1     Running   0          112s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                                TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)         AGE</span></span>
<span class="line"><span>service/dashboard-metrics-scraper   ClusterIP   10.106.178.119   &lt;none&gt;        8000/TCP        112s</span></span>
<span class="line"><span>service/kubernetes-dashboard        NodePort    10.96.4.46       &lt;none&gt;        443:30000/TCP   113s</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-6-3-访问kubernetes-dashboard" tabindex="-1"><a class="header-anchor" href="#_1-6-3-访问kubernetes-dashboard"><span>1.6.3 <strong>访问Kubernetes dashboard</strong></span></a></h3><p>WebUI访问Kubernetes dashboard：<a href="http://192.168.179.4:3000" target="_blank" rel="noopener noreferrer">https://192.168.179.4:3000</a>0</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/093e784b4abf42f098dfc184a36789c0.png" alt="image.png" loading="lazy"></p><p>选择“Token”，使用如下命令获取Kubernetes的Token:</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#注意最后的kubernetes-dashboard 为部署dashboard创建的serviceaccounts</span></span>
<span class="line"><span>[root@node1 kube-dashboard]# kubectl -n kubernetes-dashboard create token kubernetes-dashboard</span></span>
<span class="line"><span>eyJhbGciOiJSUzI1NiIsImtpZCI6IlFDVlB4Wng3REtPNGZhd05sYnJvbFBWbE9iS2pDYmtEYUZyQ2VaSjA0MjAifQ.eyJhdWQiOlsiaHR0cHM6Ly9rdWJlcm5ldGVzLmRlZmF1bHQuc3ZjLmNsdXN0ZXIubG9jYWwiXSwiZXhwIjoxNjY3NDgxODQ0LCJpYXQiOjE2Njc0NzgyNDQsImlzcyI6Imh0dHBzOi8va3ViZXJuZXRlcy5kZWZhdWx0LnN2Yy5jbHVzdGVyLmxvY2FsIiwia3ViZXJuZXRlcy5pbyI6eyJuYW1lc3BhY2UiOiJrdWJlcm5ldGVzLWRhc2hib2FyZCIsInNlcnZpY2VhY2NvdW50Ijp7Im5hbWUiOiJrdWJlcm5ldGVzLWRhc2hib2FyZCIsInVpZCI6ImY3ZGQ0YTI1LTEwOTAtNDYyZC04N2JhLTM4NjNlM2Q3MjQxNCJ9fSwibmJmIjoxNjY3NDc4MjQ0LCJzdWIiOiJzeXN0ZW06c2VydmljZWFjY291bnQ6a3ViZXJuZXRlcy1kYXNoYm9hcmQ6a3ViZXJuZXRlcy1kYXNoYm9hcmQifQ.b0S3YAJrFTUb-pgiPLp3kuB510sL7r9LPvmeO5kXM86ZRJhbGOFsD-CK-ONQnDF2EVAg76YsV_I7Afv_P_RkSspfy0AnBDUFj-LBufocX1cofCHc1_dErVbCQ5MvUsnw67PvpdcZMWuAndYhMVorOIxOc_RxhUM6tre3kuZJ40r2W-8Kbgd4b3HvLeaE2gJNTofn5ChYLkDd7TQYqRtmZN14l6CFZMUSl1dHqSuWhUncNHELhI8uRRD1pfFmMlYrqkZOTqzkw5_czMFrE9yIFKktMqT3wpvRVWFzYZFd9SpGMoQtshKjR3h508N-KG2Ob3PQYbvpBdoap2UjOjQJVg</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>将以上生成的Token复制粘贴到登录的WebUI页面中登录Kubernetes DashBoard。注意：以上token复制时不要有空格。</p><h2 id="_1-7-kuberneters-部署案例" tabindex="-1"><a class="header-anchor" href="#_1-7-kuberneters-部署案例"><span>1.7 <strong>Kuberneters 部署案例</strong></span></a></h2><p>这里为了强化对Kubernetes集群的理解，我们基于Kubernetes集群进行部署nginx服务，nginx服务我们设置2个副本，同时将nginx服务端口80暴露到宿主机上。在kubernetes中，我们可以通过WebUI来添加服务，也可以在命令行中通过应用yaml来部署服务，下面以命令行部署nginx服务为例：</p><ol><li><strong>创建资源清单文件</strong></li></ol><ul><li><strong>nginx.yaml</strong> <strong>：</strong></li></ul><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>apiVersion: apps/v1</span></span>
<span class="line"><span>kind: Deployment</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  name: nginx-test</span></span>
<span class="line"><span>spec:</span></span>
<span class="line"><span>  selector:</span></span>
<span class="line"><span>    matchLabels:</span></span>
<span class="line"><span>      app: nginx</span></span>
<span class="line"><span>      env: test</span></span>
<span class="line"><span>      owner: rancher</span></span>
<span class="line"><span>  replicas: 2 # tells deployment to run 2 pods matching the template</span></span>
<span class="line"><span>  template:</span></span>
<span class="line"><span>    metadata:</span></span>
<span class="line"><span>      labels:</span></span>
<span class="line"><span>        app: nginx</span></span>
<span class="line"><span>        env: test</span></span>
<span class="line"><span>        owner: rancher</span></span>
<span class="line"><span>    spec:</span></span>
<span class="line"><span>      containers:</span></span>
<span class="line"><span>        - name: nginx-test</span></span>
<span class="line"><span>          image: nginx:1.19.9</span></span>
<span class="line"><span>          ports:</span></span>
<span class="line"><span>            - containerPort: 80</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li><strong>nginx-service.yaml</strong> <strong>：</strong></li></ul><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>apiVersion: v1</span></span>
<span class="line"><span>kind: Service</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  name: nginx-test</span></span>
<span class="line"><span>  labels:</span></span>
<span class="line"><span>    run: nginx</span></span>
<span class="line"><span>spec:</span></span>
<span class="line"><span>  type: NodePort</span></span>
<span class="line"><span>  ports:</span></span>
<span class="line"><span>  - port: 80</span></span>
<span class="line"><span>    protocol: TCP</span></span>
<span class="line"><span>    nodePort: 30080</span></span>
<span class="line"><span>  selector:</span></span>
<span class="line"><span>    owner: rancher</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="2"><li><strong>应用资源清单文件</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 nginx-test]# kubectl apply -f nginx.yaml</span></span>
<span class="line"><span>[root@node1 nginx-test]# kubectl apply -f nginx-service.yaml</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><ol start="3"><li><strong>验证</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 test]# kubectl get all</span></span>
<span class="line"><span>NAME                              READY   STATUS    RESTARTS   AGE</span></span>
<span class="line"><span>pod/nginx-test-74845c57fb-7tl86   1/1     Running   0          45s</span></span>
<span class="line"><span>pod/nginx-test-74845c57fb-qjc6d   1/1     Running   0          45s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                 TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE</span></span>
<span class="line"><span>service/kubernetes   ClusterIP   10.96.0.1       &lt;none&gt;        443/TCP        123m</span></span>
<span class="line"><span>service/nginx-test   NodePort    10.107.171.29   &lt;none&gt;        80:30204/TCP   21s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                         READY   UP-TO-DATE   AVAILABLE   AGE</span></span>
<span class="line"><span>deployment.apps/nginx-test   2/2     2            2           45s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                                    DESIRED   CURRENT   READY   AGE</span></span>
<span class="line"><span>replicaset.apps/nginx-test-74845c57fb   2         2         2       45s</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="4"><li><strong>访问验证</strong></li></ol><p>访问任意kubernetes集群的节点30080端口查看nginx服务是正常，例如：浏览器输入node1:30080</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/ce75b5426f07418d8cd0015726d6ac9e.png" alt="image.png" loading="lazy"></p><ol start="5"><li><strong>删除nginix服务</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 nginx-test]# kubectl delete -f nginx-service.yaml</span></span>
<span class="line"><span>[root@node1 nginx-test]# kubectl delete -f nginx.yaml</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="_1-8-flink基于kubernetes部署" tabindex="-1"><a class="header-anchor" href="#_1-8-flink基于kubernetes部署"><span>1.8 <strong>Flink基于Kubernetes部署</strong></span></a></h2><p>Flink基于Kubernetes部署时支持两种模式：Kubernetes部署模式和Native Kubernetes 部署模式。Flink从1.2版本开始支持Kubernetes部署模式，从Flink1.10版本开始Flink支持Native Kubernetes部署模式。</p><ul><li><strong>Kubernetes部署模式</strong></li></ul><p>Flink Kubernetes这种部署模式是把JobManager和TaskManager等进程放入容器，在Kubernetes管理和运行，这与我们将Java Web应用做成docker镜像再运行在Kubernetes中道理一样，都是使用kubernetes中的kubectl命令来操作。</p><ul><li><strong>Native Kubernetes部署模式</strong></li></ul><p>Native Kubernetes部署模式是在Flink安装包中有个工具，此工具可以向Kubernetes的Api Server 发送请求，例如:创建Flink Master ，并且可以和FlinkMaster通讯，用于提交任务，我们只要用好Flink 安装包中的工具即可，无需在Kuberbetes上执行kubectl操作。</p><p>Flink与Kubernetes整合时要求Kubernetes版本不能低于1.9，我们这里使用的Kubernetes版本是1.25.3版本。</p><h3 id="_1-8-1-kubernetes部署" tabindex="-1"><a class="header-anchor" href="#_1-8-1-kubernetes部署"><span>1.8.1 <strong>Kubernetes部署</strong></span></a></h3><p>Flink 基于Kubernetes部署支持Session Cluster模式和Application Cluster模式部署。Session Cluster模式即可以在一个Flink集群中运行多个作业，这些作业公用JobManager和TaskManager。Application Cluster模式即一个作业使用单独的一个专用Flink集群，每个Flink作业的JobManager和TaskManager隔离。无论是Session Cluster模式还是Application Cluster模式都支持JobManager的HA 部署。下面分别介绍并测试。</p><h4 id="_1-8-1-1-session-cluster部署" tabindex="-1"><a class="header-anchor" href="#_1-8-1-1-session-cluster部署"><span>1.8.1.1 <em>Session Cluster部署</em></span></a></h4><p>Flink Session集群作为Kubernetes Deployment来运行的，可以在一个基于K8s 部署的Session Cluster 中运行多个Flink job，在Kubernetes 上部署Flink Session 集群时，一般至少包含三个组件：</p><ul><li>运行JobManager的Deployment</li><li>运行TaskManager的Deployment</li><li>暴露JobManager上的REST和UI端口的Service</li></ul><h5 id="_1-8-1-1-1-非ha-session-cluster部署及测试" tabindex="-1"><a class="header-anchor" href="#_1-8-1-1-1-非ha-session-cluster部署及测试"><span>1.8.1.1.1 <strong>非HA Session Cluster部署及测试</strong></span></a></h5><h6 id="_1-8-1-1-1-1-准备deployment文件" tabindex="-1"><a class="header-anchor" href="#_1-8-1-1-1-1-准备deployment文件"><span>1.8.1.1.1.1 <strong>准备deployment文件</strong></span></a></h6><ul><li><strong>flink-configuration-configmap.yaml</strong></li></ul><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>apiVersion: v1</span></span>
<span class="line"><span>kind: ConfigMap</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  name: flink-config</span></span>
<span class="line"><span>  labels:</span></span>
<span class="line"><span>    app: flink</span></span>
<span class="line"><span>data:</span></span>
<span class="line"><span>  flink-conf.yaml: |+</span></span>
<span class="line"><span>    jobmanager.rpc.address: flink-jobmanager</span></span>
<span class="line"><span>    taskmanager.numberOfTaskSlots: 2</span></span>
<span class="line"><span>    blob.server.port: 6124</span></span>
<span class="line"><span>    jobmanager.rpc.port: 6123</span></span>
<span class="line"><span>    taskmanager.rpc.port: 6122</span></span>
<span class="line"><span>    queryable-state.proxy.ports: 6125</span></span>
<span class="line"><span>    jobmanager.memory.process.size: 1600m</span></span>
<span class="line"><span>    taskmanager.memory.process.size: 1728m</span></span>
<span class="line"><span>    parallelism.default: 2  </span></span>
<span class="line"><span>  log4j-console.properties: |+</span></span>
<span class="line"><span>    # This affects logging for both user code and Flink</span></span>
<span class="line"><span>    rootLogger.level = INFO</span></span>
<span class="line"><span>    rootLogger.appenderRef.console.ref = ConsoleAppender</span></span>
<span class="line"><span>    rootLogger.appenderRef.rolling.ref = RollingFileAppender</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    # Uncomment this if you want to _only_ change Flink&#39;s logging</span></span>
<span class="line"><span>    #logger.flink.name = org.apache.flink</span></span>
<span class="line"><span>    #logger.flink.level = INFO</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    # The following lines keep the log level of common libraries/connectors on</span></span>
<span class="line"><span>    # log level INFO. The root logger does not override this. You have to manually</span></span>
<span class="line"><span>    # change the log levels here.</span></span>
<span class="line"><span>    logger.akka.name = akka</span></span>
<span class="line"><span>    logger.akka.level = INFO</span></span>
<span class="line"><span>    logger.kafka.name= org.apache.kafka</span></span>
<span class="line"><span>    logger.kafka.level = INFO</span></span>
<span class="line"><span>    logger.hadoop.name = org.apache.hadoop</span></span>
<span class="line"><span>    logger.hadoop.level = INFO</span></span>
<span class="line"><span>    logger.zookeeper.name = org.apache.zookeeper</span></span>
<span class="line"><span>    logger.zookeeper.level = INFO</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    # Log all infos to the console</span></span>
<span class="line"><span>    appender.console.name = ConsoleAppender</span></span>
<span class="line"><span>    appender.console.type = CONSOLE</span></span>
<span class="line"><span>    appender.console.layout.type = PatternLayout</span></span>
<span class="line"><span>    appender.console.layout.pattern = %d{yyyy-MM-dd HH:mm:ss,SSS} %-5p %-60c %x - %m%n</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    # Log all infos in the given rolling file</span></span>
<span class="line"><span>    appender.rolling.name = RollingFileAppender</span></span>
<span class="line"><span>    appender.rolling.type = RollingFile</span></span>
<span class="line"><span>    appender.rolling.append = false</span></span>
<span class="line"><span>    appender.rolling.fileName = \${sys:log.file}</span></span>
<span class="line"><span>    appender.rolling.filePattern = \${sys:log.file}.%i</span></span>
<span class="line"><span>    appender.rolling.layout.type = PatternLayout</span></span>
<span class="line"><span>    appender.rolling.layout.pattern = %d{yyyy-MM-dd HH:mm:ss,SSS} %-5p %-60c %x - %m%n</span></span>
<span class="line"><span>    appender.rolling.policies.type = Policies</span></span>
<span class="line"><span>    appender.rolling.policies.size.type = SizeBasedTriggeringPolicy</span></span>
<span class="line"><span>    appender.rolling.policies.size.size=100MB</span></span>
<span class="line"><span>    appender.rolling.strategy.type = DefaultRolloverStrategy</span></span>
<span class="line"><span>    appender.rolling.strategy.max = 10</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    # Suppress the irrelevant (wrong) warnings from the Netty channel handler</span></span>
<span class="line"><span>    logger.netty.name = org.jboss.netty.channel.DefaultChannelPipeline</span></span>
<span class="line"><span>    logger.netty.level = OFF</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li>jobmanager-service.yaml</li></ul><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>apiVersion: v1</span></span>
<span class="line"><span>kind: Service</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  name: flink-jobmanager</span></span>
<span class="line"><span>spec:</span></span>
<span class="line"><span>  type: ClusterIP</span></span>
<span class="line"><span>  ports:</span></span>
<span class="line"><span>  - name: rpc</span></span>
<span class="line"><span>    port: 6123</span></span>
<span class="line"><span>  - name: blob-server</span></span>
<span class="line"><span>    port: 6124</span></span>
<span class="line"><span>  - name: webui</span></span>
<span class="line"><span>    port: 8081</span></span>
<span class="line"><span>  selector:</span></span>
<span class="line"><span>    app: flink</span></span>
<span class="line"><span>    component: jobmanager</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li>jobmanager-rest-service.yaml</li></ul><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>apiVersion: v1</span></span>
<span class="line"><span>kind: Service</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  name: flink-jobmanager-rest</span></span>
<span class="line"><span>spec:</span></span>
<span class="line"><span>  type: NodePort</span></span>
<span class="line"><span>  ports:</span></span>
<span class="line"><span>  - name: rest</span></span>
<span class="line"><span>    port: 8081</span></span>
<span class="line"><span>    targetPort: 8081</span></span>
<span class="line"><span>    nodePort: 30081</span></span>
<span class="line"><span>  selector:</span></span>
<span class="line"><span>    app: flink</span></span>
<span class="line"><span>    component: jobmanager</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li>jobmanager-session-deployment-non-ha.yaml</li></ul><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>apiVersion: apps/v1</span></span>
<span class="line"><span>kind: Deployment</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  name: flink-jobmanager</span></span>
<span class="line"><span>spec:</span></span>
<span class="line"><span>  replicas: 1</span></span>
<span class="line"><span>  selector:</span></span>
<span class="line"><span>    matchLabels:</span></span>
<span class="line"><span>      app: flink</span></span>
<span class="line"><span>      component: jobmanager</span></span>
<span class="line"><span>  template:</span></span>
<span class="line"><span>    metadata:</span></span>
<span class="line"><span>      labels:</span></span>
<span class="line"><span>        app: flink</span></span>
<span class="line"><span>        component: jobmanager</span></span>
<span class="line"><span>    spec:</span></span>
<span class="line"><span>      containers:</span></span>
<span class="line"><span>      - name: jobmanager</span></span>
<span class="line"><span>        image: flink:1.16.0-scala_2.12-java8 #指定Flink的镜像，可以从https://hub.docker.com/ 网站上查找</span></span>
<span class="line"><span>        args: [&quot;jobmanager&quot;]</span></span>
<span class="line"><span>        ports:</span></span>
<span class="line"><span>        - containerPort: 6123</span></span>
<span class="line"><span>          name: rpc</span></span>
<span class="line"><span>        - containerPort: 6124</span></span>
<span class="line"><span>          name: blob-server</span></span>
<span class="line"><span>        - containerPort: 8081</span></span>
<span class="line"><span>          name: webui</span></span>
<span class="line"><span>        livenessProbe:</span></span>
<span class="line"><span>          tcpSocket:</span></span>
<span class="line"><span>            port: 6123</span></span>
<span class="line"><span>          initialDelaySeconds: 30</span></span>
<span class="line"><span>          periodSeconds: 60</span></span>
<span class="line"><span>        volumeMounts:</span></span>
<span class="line"><span>        - name: flink-config-volume</span></span>
<span class="line"><span>          mountPath: /opt/flink/conf</span></span>
<span class="line"><span>        - name: localtime  #挂载localtime文件，使容器时间与宿主机一致</span></span>
<span class="line"><span>          mountPath: /etc/localtime </span></span>
<span class="line"><span>        securityContext:</span></span>
<span class="line"><span>          runAsUser: 9999  # refers to user _flink_ from official flink image, change if necessary</span></span>
<span class="line"><span>      volumes:</span></span>
<span class="line"><span>      - name: flink-config-volume</span></span>
<span class="line"><span>        configMap:</span></span>
<span class="line"><span>          name: flink-config</span></span>
<span class="line"><span>          items:</span></span>
<span class="line"><span>          - key: flink-conf.yaml</span></span>
<span class="line"><span>            path: flink-conf.yaml</span></span>
<span class="line"><span>          - key: log4j-console.properties</span></span>
<span class="line"><span>            path: log4j-console.properties</span></span>
<span class="line"><span>      - name: localtime #挂载localtime文件，使容器时间与宿主机一致</span></span>
<span class="line"><span>        hostPath:</span></span>
<span class="line"><span>          path: /etc/localtime</span></span>
<span class="line"><span>          type: &#39;&#39;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li>taskmanager-session-deployment.yaml</li></ul><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>apiVersion: apps/v1</span></span>
<span class="line"><span>kind: Deployment</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  name: flink-taskmanager</span></span>
<span class="line"><span>spec:</span></span>
<span class="line"><span>  replicas: 2</span></span>
<span class="line"><span>  selector:</span></span>
<span class="line"><span>    matchLabels:</span></span>
<span class="line"><span>      app: flink</span></span>
<span class="line"><span>      component: taskmanager</span></span>
<span class="line"><span>  template:</span></span>
<span class="line"><span>    metadata:</span></span>
<span class="line"><span>      labels:</span></span>
<span class="line"><span>        app: flink</span></span>
<span class="line"><span>        component: taskmanager</span></span>
<span class="line"><span>    spec:</span></span>
<span class="line"><span>      containers:</span></span>
<span class="line"><span>      - name: taskmanager</span></span>
<span class="line"><span>        image: flink:1.16.0-scala_2.12-java8</span></span>
<span class="line"><span>        args: [&quot;taskmanager&quot;]</span></span>
<span class="line"><span>        ports:</span></span>
<span class="line"><span>        - containerPort: 6122</span></span>
<span class="line"><span>          name: rpc</span></span>
<span class="line"><span>        - containerPort: 6125</span></span>
<span class="line"><span>          name: query-state</span></span>
<span class="line"><span>        livenessProbe:</span></span>
<span class="line"><span>          tcpSocket:</span></span>
<span class="line"><span>            port: 6122</span></span>
<span class="line"><span>          initialDelaySeconds: 30</span></span>
<span class="line"><span>          periodSeconds: 60</span></span>
<span class="line"><span>        volumeMounts:</span></span>
<span class="line"><span>        - name: flink-config-volume</span></span>
<span class="line"><span>          mountPath: /opt/flink/conf/</span></span>
<span class="line"><span>        - name: localtime #挂载localtime文件，使容器时间与宿主机一致</span></span>
<span class="line"><span>          mountPath: /etc/localtime</span></span>
<span class="line"><span>        securityContext:</span></span>
<span class="line"><span>          runAsUser: 9999  # refers to user _flink_ from official flink image, change if necessary</span></span>
<span class="line"><span>      volumes:</span></span>
<span class="line"><span>      - name: flink-config-volume</span></span>
<span class="line"><span>        configMap:</span></span>
<span class="line"><span>          name: flink-config</span></span>
<span class="line"><span>          items:</span></span>
<span class="line"><span>          - key: flink-conf.yaml</span></span>
<span class="line"><span>            path: flink-conf.yaml</span></span>
<span class="line"><span>          - key: log4j-console.properties</span></span>
<span class="line"><span>            path: log4j-console.properties</span></span>
<span class="line"><span>      - name: localtime #挂载localtime文件，使容器时间与宿主机一致</span></span>
<span class="line"><span>        hostPath: </span></span>
<span class="line"><span>          path: /etc/localtime</span></span>
<span class="line"><span>          type: &#39;&#39;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>注意：关于Flink的镜像可以从<a href="https://hub.docker.com/%E7%BD%91%E7%AB%99%E4%B8%AD%E6%90%9C%E7%B4%A2%E4%B8%8B%E8%BD%BD%E3%80%82%E4%BB%A5%E4%B8%8A%E9%85%8D%E7%BD%AE%E6%96%87%E4%BB%B6%E5%8F%AF%E4%BB%A5%E4%BB%8E%E8%B5%84%E6%96%99%E2%80%9Cflink-nonha-session.zip%E2%80%9D%E4%B8%AD%E8%8E%B7%E5%8F%96%E3%80%82" target="_blank" rel="noopener noreferrer">https://hub.docker.com/网站中搜索下载。以上配置文件可以从资料“flink-nonha-session.zip”中获取。</a></p><h6 id="_1-8-1-1-1-2-部署yaml-文件" tabindex="-1"><a class="header-anchor" href="#_1-8-1-1-1-2-部署yaml-文件"><span>1.8.1.1.1.2 <strong>部署yaml 文件</strong></span></a></h6><p>在对应的目录中执行如下命令：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>kubectl create -f ./flink-configuration-configmap.yaml</span></span>
<span class="line"><span>kubectl create -f ./jobmanager-rest-service.yaml</span></span>
<span class="line"><span>kubectl create -f ./jobmanager-service.yaml</span></span>
<span class="line"><span>kubectl create -f ./jobmanager-session-deployment-non-ha.yaml</span></span>
<span class="line"><span>kubectl create -f ./taskmanager-session-deployment.yaml</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>注意：也可以进入对应yaml文件目录，直接执行 kubectl create -f ./ 全部部署也可以。</p><h6 id="_1-8-1-1-1-3-验证部署情况" tabindex="-1"><a class="header-anchor" href="#_1-8-1-1-1-3-验证部署情况"><span>1.8.1.1.1.3 <strong>验证部署情况</strong></span></a></h6><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 flink-nonha-session]# kubectl get all</span></span>
<span class="line"><span>NAME                                    READY   STATUS    RESTARTS   AGE</span></span>
<span class="line"><span>pod/flink-jobmanager-6f45bb68f5-rnd5p   1/1     Running   0          81s</span></span>
<span class="line"><span>pod/flink-taskmanager-d5f89bb47-jjtz7   1/1     Running   0          81s</span></span>
<span class="line"><span>pod/flink-taskmanager-d5f89bb47-rmfff   1/1     Running   0          81s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                            TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)                      AGE</span></span>
<span class="line"><span>service/flink-jobmanager        ClusterIP   10.107.162.123   &lt;none&gt;        6123/TCP,6124/TCP,8081/TCP   82s</span></span>
<span class="line"><span>service/flink-jobmanager-rest   NodePort    10.102.57.189    &lt;none&gt;        8081:30081/TCP               82s</span></span>
<span class="line"><span>service/kubernetes              ClusterIP   10.96.0.1        &lt;none&gt;        443/TCP                      2d18h</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                                READY   UP-TO-DATE   AVAILABLE   AGE</span></span>
<span class="line"><span>deployment.apps/flink-jobmanager    1/1     1            1           81s</span></span>
<span class="line"><span>deployment.apps/flink-taskmanager   2/2     2            2           81s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                                          DESIRED   CURRENT   READY   AGE</span></span>
<span class="line"><span>replicaset.apps/flink-jobmanager-6f45bb68f5   1         1         1       81s</span></span>
<span class="line"><span>replicaset.apps/flink-taskmanager-d5f89bb47   2         2         2       81s</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>在浏览器输入：<a href="http://node1:30081/%E5%8D%B3%E5%8F%AF%E8%AE%BF%E9%97%AEFlink" target="_blank" rel="noopener noreferrer">http://192.168.179.4:30081/即可访问Flink</a> Session集群WebUI。浏览器中输入的ip可以是K8s集群中任意节点的IP。</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/b41acaf414ed41f4a24f6610f70ce116.png" alt="image.png" loading="lazy"></p><h6 id="_1-8-1-1-1-4-停止集群" tabindex="-1"><a class="header-anchor" href="#_1-8-1-1-1-4-停止集群"><span>1.8.1.1.1.4 <strong>停止集群</strong></span></a></h6><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>kubectl delete -f ./flink-configuration-configmap.yaml</span></span>
<span class="line"><span>kubectl delete -f ./jobmanager-rest-service.yaml</span></span>
<span class="line"><span>kubectl delete -f ./jobmanager-service.yaml</span></span>
<span class="line"><span>kubectl delete -f ./jobmanager-session-deployment-non-ha.yaml</span></span>
<span class="line"><span>kubectl delete -f ./taskmanager-session-deployment.yaml</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>注意：也可以进入对应yaml文件目录，直接执行 kubectl delete -f ./ 全部部署也可以。</p><h6 id="_1-8-1-1-1-5任务提交与测试" tabindex="-1"><a class="header-anchor" href="#_1-8-1-1-1-5任务提交与测试"><span>1.8.1.1.1.5<strong>任务提交与测试</strong></span></a></h6><p>基于K8s的Flink Standalone 集群我们可以通过Flink WebUI来提交Flink任务，也可以通过Flink客户端命令提交任务。</p><ol><li><strong>基于WebUI提交Flink任务</strong></li></ol><p>这里编写读取socket端口数据实时统计WordCount的Flink代码，代码如下：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>package com.mashibing.flinkjava.code.chapter_k8s;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>import org.apache.flink.api.common.functions.FlatMapFunction;</span></span>
<span class="line"><span>import org.apache.flink.api.java.functions.KeySelector;</span></span>
<span class="line"><span>import org.apache.flink.api.java.tuple.Tuple2;</span></span>
<span class="line"><span>import org.apache.flink.streaming.api.datastream.DataStreamSource;</span></span>
<span class="line"><span>import org.apache.flink.streaming.api.datastream.KeyedStream;</span></span>
<span class="line"><span>import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;</span></span>
<span class="line"><span>import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;</span></span>
<span class="line"><span>import org.apache.flink.util.Collector;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>/**</span></span>
<span class="line"><span> *  Flink 基于K8s 测试代码：</span></span>
<span class="line"><span> *      读取socket端口数据实时统计WordCount</span></span>
<span class="line"><span> */</span></span>
<span class="line"><span>public class WordCount {</span></span>
<span class="line"><span>    public static void main(String[] args) throws Exception {</span></span>
<span class="line"><span>        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();</span></span>
<span class="line"><span>        DataStreamSource&lt;String&gt; sourceDS = env.socketTextStream(&quot;192.168.179.8&quot;, 9999);</span></span>
<span class="line"><span>        SingleOutputStreamOperator&lt;Tuple2&lt;String, Long&gt;&gt; tupleDS = sourceDS.flatMap(new FlatMapFunction&lt;String, Tuple2&lt;String, Long&gt;&gt;() {</span></span>
<span class="line"><span>            @Override</span></span>
<span class="line"><span>            public void flatMap(String line, Collector&lt;Tuple2&lt;String, Long&gt;&gt; collector) throws Exception {</span></span>
<span class="line"><span>                String[] words = line.split(&quot; &quot;);</span></span>
<span class="line"><span>                for (String word : words) {</span></span>
<span class="line"><span>                    collector.collect(Tuple2.of(word, 1L));</span></span>
<span class="line"><span>                }</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>        });</span></span>
<span class="line"><span></span></span>
<span class="line"><span>        KeyedStream&lt;Tuple2&lt;String, Long&gt;, String&gt; keyedStream = tupleDS.keyBy(new KeySelector&lt;Tuple2&lt;String, Long&gt;, String&gt;() {</span></span>
<span class="line"><span>            @Override</span></span>
<span class="line"><span>            public String getKey(Tuple2&lt;String, Long&gt; stringLongTuple2) throws Exception {</span></span>
<span class="line"><span>                return stringLongTuple2.f0;</span></span>
<span class="line"><span>            }</span></span>
<span class="line"><span>        });</span></span>
<span class="line"><span></span></span>
<span class="line"><span>        keyedStream.sum(1).print();</span></span>
<span class="line"><span></span></span>
<span class="line"><span>        env.execute();</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>注意：后续基于Kubernetes运行Flink任务都基于此任务测试。</p><p>编写好代码后将以上代码进行打包，在对应的节点上启动对应的socket服务（nc -lk 9999），这里代码中选择的是node5 9999端口。通过WebUI进行上传执行，具体操作如下：</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/3e4ea4d12e334ef28963f7ae67e70665.png" alt="image.png" loading="lazy"></p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/fb329bc208d247b1adbc815f869c74bf.png" alt="image.png" loading="lazy"></p><p>在node5 socket 9999端口输入数据：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span> [root@node5 ~]# nc -lk 9999</span></span>
<span class="line"><span>hello zhangsan</span></span>
<span class="line"><span>hello lisi</span></span>
<span class="line"><span>hello wangwu</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>向K8S部署的Flink集群中提交应用程序如果打印结果到控制台不支持在WebUI中的TaskManager中查看对应的Console日志，主要原因是K8S 基于Docker运行Flink TaskExecutor和JobMaster 进程时不会将STDOUT日志重定向到文件中。这里可以通过kubectl logs + pod 来查看对应的输出日志。</p><p>首先在WebUI页面中查看对应sink运行所在的TaskManager IP。</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/6c4c01f62b5b4694ae561771377cc13d.png" alt="image.png" loading="lazy"></p><p>通过TaskManager ip 确定输出结果的TaskManager Pod ：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 flink]# kubectl get pod -o wide</span></span>
<span class="line"><span>NAME                                READY   STATUS    RESTARTS   AGE   IP              NODE    NOMINATED NODE   READINESS GATES</span></span>
<span class="line"><span>flink-jobmanager-6f45bb68f5-4dbkp   1/1     Running   0          14m   10.244.135.27   node3   &lt;none&gt;           &lt;none&gt;</span></span>
<span class="line"><span>flink-taskmanager-d5f89bb47-d5ljm   1/1     Running   0          14m   10.244.104.19   node2   &lt;none&gt;           &lt;none&gt;</span></span>
<span class="line"><span>flink-taskmanager-d5f89bb47-jmlmr   1/1     Running   0          14m   10.244.135.28   node3   &lt;none&gt;           &lt;none&gt;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>通过以上查询可以根据TaskManager IP 可以找到名为“flink-taskmanager-d5f89bb47-jmlmr”的Pod。查看该pod日志，就可以看到输出的结果：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 flink]# kubectl logs flink-taskmanager-d5f89bb47-jmlmr</span></span>
<span class="line"><span>... ...</span></span>
<span class="line"><span>2022-11-04 07:49:48,208 INFO  org.apache.flink.streaming.api.functions.source.SocketTextStreamFunction [] - Connecting to server socket 192.168.1</span></span>
<span class="line"><span>79.8:99992022-11-04 07:49:48,210 INFO  org.apache.flink.runtime.taskmanager.Task                    [] - Keyed Aggregation -&gt; Sink: Print to Std. Out (1/1</span></span>
<span class="line"><span>)#0 (124df880f6de0d84f0d085586c52b6d9_90bea66de1c231edf33913ecd54406c1_0_0) switched from INITIALIZING to RUNNING.(hello,1)</span></span>
<span class="line"><span>(zhangsan,1)</span></span>
<span class="line"><span>(hello,2)</span></span>
<span class="line"><span>(lisi,1)</span></span>
<span class="line"><span>(hello,3)</span></span>
<span class="line"><span>(wangwu,1)</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="2"><li><strong>通过客户端命令方式提交任务</strong></li></ol><p>这种方式只需要在任意能连接到Kubernetes集群的节点上通过Flink客户端命令提交Flink任务节即可。该节点需要有Flink的安装包,这里选择node4节点上传Flink的安装包并解压到“/software/flink-1.16.0”路径中。</p><p>在node5节点上启动对应的Socket服务，执行如下命令进行客户端命令提交Flink任务：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node4 ~]# cd /software/flink-1.16.0/bin/</span></span>
<span class="line"><span>[root@node4 bin]# ./flink run -m 192.168.179.4:30081 -c com.mashibing.flinkjava.code.chapter_k8s.WordCount /software/FlinkJavaCode-1.0-SNAPSHOT-jar-with-dependencies.jar</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>向socket端口输入数据，通过kubectl logs + pods 方式查看对应的实时结果即可。</p><h5 id="_1-8-1-1-2-ha-session-cluster部署及测试" tabindex="-1"><a class="header-anchor" href="#_1-8-1-1-2-ha-session-cluster部署及测试"><span>1.8.1.1.2 <strong>HA Session Cluster部署及测试</strong></span></a></h5><p>通过以上基于Kubernetes 部署Flink Session集群，我们部署了1个JobManager和2个TaskManager，这里说的HA Session集群部署，就是当JobManager挂掉时，能正常切换到另外的JobManager中继续调度任务。实际上在Kubernets集群中当JobManager容器挂掉之后，Kubernetes集群会自动重新运行新的JobManager。所以基于Kubernets不部署HA 模式模式也没有问题，这里为了更快的进行恢复Flink任务，我们也可以基于Kubernetes配置HA Session模式。</p><p>配置HA Session模式与非HA Session模式相比不再需要jobmanager-server.yaml文件。</p><h6 id="_1-8-1-1-2-1-准备deployment文件" tabindex="-1"><a class="header-anchor" href="#_1-8-1-1-2-1-准备deployment文件"><span>1.8.1.1.2.1 <strong>准备deployment文件</strong></span></a></h6><ul><li><strong>flink-configuration-configmap.yaml</strong></li></ul><p>该yaml文件相比于非HA Session模式增加了以下行：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>kubernetes.cluster-id: myk8s #给kubernets集群取个名字</span></span>
<span class="line"><span>high-availability: kubernetes #指定高可用模式</span></span>
<span class="line"><span>high-availability.storageDir: hdfs://mycluster/flink/recovery #指定元数据存储目录为hdfs路径</span></span>
<span class="line"><span>restart-strategy: fixed-delay #指定重启策略</span></span>
<span class="line"><span>restart-strategy.fixed-delay.attempts: 10 #指定重启尝试次数</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>以上配置使用kubernetes来进行协调FlinkHA，部署相应flink-configuration-configmap.yaml文件后在Kubernetes中会额外生成&lt;cluster-id&gt;-xxx对应的configmap对象，此对象记录Flink 集群中提交的job元数据。</p><p>完整的flink-configuration-configmap.yaml文件如下：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>apiVersion: v1</span></span>
<span class="line"><span>kind: ConfigMap</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  name: flink-config</span></span>
<span class="line"><span>  labels:</span></span>
<span class="line"><span>    app: flink</span></span>
<span class="line"><span>data:</span></span>
<span class="line"><span>  flink-conf.yaml: |+</span></span>
<span class="line"><span>    jobmanager.rpc.address: flink-jobmanager</span></span>
<span class="line"><span>    taskmanager.numberOfTaskSlots: 2</span></span>
<span class="line"><span>    blob.server.port: 6124</span></span>
<span class="line"><span>    jobmanager.rpc.port: 6123</span></span>
<span class="line"><span>    taskmanager.rpc.port: 6122</span></span>
<span class="line"><span>    queryable-state.proxy.ports: 6125</span></span>
<span class="line"><span>    jobmanager.memory.process.size: 1600m</span></span>
<span class="line"><span>    taskmanager.memory.process.size: 1728m</span></span>
<span class="line"><span>    parallelism.default: 2  </span></span>
<span class="line"><span>    kubernetes.cluster-id: myk8s #给kubernets集群取个名字</span></span>
<span class="line"><span>    high-availability: kubernetes #指定高可用模式</span></span>
<span class="line"><span>    high-availability.storageDir: hdfs://mycluster/flink/recovery #指定元数据存储目录为hdfs路径</span></span>
<span class="line"><span>    restart-strategy: fixed-delay #指定重启策略</span></span>
<span class="line"><span>    restart-strategy.fixed-delay.attempts: 10 #指定重启尝试次数</span></span>
<span class="line"><span>  log4j-console.properties: |+</span></span>
<span class="line"><span>    # This affects logging for both user code and Flink</span></span>
<span class="line"><span>    rootLogger.level = INFO</span></span>
<span class="line"><span>    rootLogger.appenderRef.console.ref = ConsoleAppender</span></span>
<span class="line"><span>    rootLogger.appenderRef.rolling.ref = RollingFileAppender</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    # Uncomment this if you want to _only_ change Flink&#39;s logging</span></span>
<span class="line"><span>    #logger.flink.name = org.apache.flink</span></span>
<span class="line"><span>    #logger.flink.level = INFO</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    # The following lines keep the log level of common libraries/connectors on</span></span>
<span class="line"><span>    # log level INFO. The root logger does not override this. You have to manually</span></span>
<span class="line"><span>    # change the log levels here.</span></span>
<span class="line"><span>    logger.akka.name = akka</span></span>
<span class="line"><span>    logger.akka.level = INFO</span></span>
<span class="line"><span>    logger.kafka.name= org.apache.kafka</span></span>
<span class="line"><span>    logger.kafka.level = INFO</span></span>
<span class="line"><span>    logger.hadoop.name = org.apache.hadoop</span></span>
<span class="line"><span>    logger.hadoop.level = INFO</span></span>
<span class="line"><span>    logger.zookeeper.name = org.apache.zookeeper</span></span>
<span class="line"><span>    logger.zookeeper.level = INFO</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    # Log all infos to the console</span></span>
<span class="line"><span>    appender.console.name = ConsoleAppender</span></span>
<span class="line"><span>    appender.console.type = CONSOLE</span></span>
<span class="line"><span>    appender.console.layout.type = PatternLayout</span></span>
<span class="line"><span>    appender.console.layout.pattern = %d{yyyy-MM-dd HH:mm:ss,SSS} %-5p %-60c %x - %m%n</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    # Log all infos in the given rolling file</span></span>
<span class="line"><span>    appender.rolling.name = RollingFileAppender</span></span>
<span class="line"><span>    appender.rolling.type = RollingFile</span></span>
<span class="line"><span>    appender.rolling.append = false</span></span>
<span class="line"><span>    appender.rolling.fileName = \${sys:log.file}</span></span>
<span class="line"><span>    appender.rolling.filePattern = \${sys:log.file}.%i</span></span>
<span class="line"><span>    appender.rolling.layout.type = PatternLayout</span></span>
<span class="line"><span>    appender.rolling.layout.pattern = %d{yyyy-MM-dd HH:mm:ss,SSS} %-5p %-60c %x - %m%n</span></span>
<span class="line"><span>    appender.rolling.policies.type = Policies</span></span>
<span class="line"><span>    appender.rolling.policies.size.type = SizeBasedTriggeringPolicy</span></span>
<span class="line"><span>    appender.rolling.policies.size.size=100MB</span></span>
<span class="line"><span>    appender.rolling.strategy.type = DefaultRolloverStrategy</span></span>
<span class="line"><span>    appender.rolling.strategy.max = 10</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    # Suppress the irrelevant (wrong) warnings from the Netty channel handler</span></span>
<span class="line"><span>    logger.netty.name = org.jboss.netty.channel.DefaultChannelPipeline</span></span>
<span class="line"><span>    logger.netty.level = OFF</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li><strong>jobmanager-rest-service.yaml</strong></li></ul><p>该文件与非HA Session模式对应文件部署一样。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>apiVersion: v1</span></span>
<span class="line"><span>kind: Service</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  name: flink-jobmanager-rest</span></span>
<span class="line"><span>spec:</span></span>
<span class="line"><span>  type: NodePort</span></span>
<span class="line"><span>  ports:</span></span>
<span class="line"><span>  - name: rest</span></span>
<span class="line"><span>    port: 8081</span></span>
<span class="line"><span>    targetPort: 8081</span></span>
<span class="line"><span>    nodePort: 30081</span></span>
<span class="line"><span>  selector:</span></span>
<span class="line"><span>    app: flink</span></span>
<span class="line"><span>    component: jobmanager</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li>jobmanager-cluster-role.yaml</li></ul><p>在k8s中是基于角色授权的，创建用户时需要绑定对应的角色，在JobManager HA 部署案例中需要操作对应的配置ConfigMap文件。这里通过jobmanager-cluster-role.yaml创建一个ClusterRole，然后再创建用户，将用户绑定到该集群角色，拥有对ConfigMap操作权限。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>kind: ClusterRole</span></span>
<span class="line"><span>apiVersion: rbac.authorization.k8s.io/v1</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  namespace: default</span></span>
<span class="line"><span>  name: configmaps-role #创建ClusterRole的名称</span></span>
<span class="line"><span>rules:</span></span>
<span class="line"><span>- apiGroups: [&quot;&quot;] # &quot;&quot; indicates the core API group</span></span>
<span class="line"><span>  resources: [&quot;configmaps&quot;] #指定操作的资源为configmaps</span></span>
<span class="line"><span>  verbs: [&quot;create&quot;, &quot;edit&quot;, &quot;delete&quot;,&quot;get&quot;, &quot;watch&quot;, &quot;list&quot;,&quot;update&quot;] #指定操作的权限</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>以上创建完成，再创建一个用户叫flink-service-account，后续将用户绑定到该角色。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>kubectl create serviceaccount flink-service-account</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>把flink-service-account用户绑定到集群角色：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>kubectl create clusterrolebinding flink-role-binding-serviceaccount  --clusterrole=configmaps-role --serviceaccount=default:flink-service-account</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><ul><li><strong>jobmanager-session-deployment-ha.yaml</strong></li></ul><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>apiVersion: apps/v1</span></span>
<span class="line"><span>kind: Deployment</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  name: flink-jobmanager</span></span>
<span class="line"><span>spec:</span></span>
<span class="line"><span>  replicas: 2 #这里配置2个副本# Set the value to greater than 1 to start standby JobManagers</span></span>
<span class="line"><span>  selector:</span></span>
<span class="line"><span>    matchLabels:</span></span>
<span class="line"><span>      app: flink</span></span>
<span class="line"><span>      component: jobmanager</span></span>
<span class="line"><span>  template:</span></span>
<span class="line"><span>    metadata:</span></span>
<span class="line"><span>      labels:</span></span>
<span class="line"><span>        app: flink</span></span>
<span class="line"><span>        component: jobmanager</span></span>
<span class="line"><span>    spec:</span></span>
<span class="line"><span>      hostAliases: #向容器/etc/hosts中加入ip与节点名称映射，pod找HDFS集群时需要使用</span></span>
<span class="line"><span>      - ip: 192.168.179.4</span></span>
<span class="line"><span>        hostnames: </span></span>
<span class="line"><span>          - &quot;node1&quot;</span></span>
<span class="line"><span>      - ip: 192.168.179.5</span></span>
<span class="line"><span>        hostnames:</span></span>
<span class="line"><span>          - &quot;node2&quot;</span></span>
<span class="line"><span>      - ip: 192.168.179.6</span></span>
<span class="line"><span>        hostnames:</span></span>
<span class="line"><span>          - &quot;node3&quot;</span></span>
<span class="line"><span>      - ip: 192.168.179.7</span></span>
<span class="line"><span>        hostnames:</span></span>
<span class="line"><span>          - &quot;node4&quot;</span></span>
<span class="line"><span>      - ip: 192.168.179.8</span></span>
<span class="line"><span>        hostnames:</span></span>
<span class="line"><span>          - &quot;node5&quot;</span></span>
<span class="line"><span>      containers:</span></span>
<span class="line"><span>      - name: jobmanager</span></span>
<span class="line"><span>        image: flink:1.16.0-scala_2.12-java8 #指定Flink的镜像，可以从https://hub.docker.com/ 网站上查找</span></span>
<span class="line"><span>        env:</span></span>
<span class="line"><span>        - name: POD_IP</span></span>
<span class="line"><span>          valueFrom:</span></span>
<span class="line"><span>            fieldRef:</span></span>
<span class="line"><span>              apiVersion: v1</span></span>
<span class="line"><span>              fieldPath: status.podIP</span></span>
<span class="line"><span>        - name: HADOOP_CLASSPATH #这里由于在flink pod内使用到HDFS ，需要把宿主机的HDFS配置文件挂载进来，并配置HADOOP_CLASSPATH环境变量，可以通过在宿主机执行echo \`hadoop classpath\`来参考这里导入的路径，记得要把Hadoop路径改成挂载到Pod中的路径</span></span>
<span class="line"><span>          value: /opt/hadoop/etc/hadoop:/opt/hadoop/share/hadoop/common/lib/*:/opt/hadoop/share/hadoop/common/*:/opt/hadoop/share/hadoop/hdfs:/opt/hadoop/share/hadoop/hdfs/lib/*:/opt/hadoop/share/hadoop/hdfs/*:/opt/hadoop/share/hadoop/mapreduce/*:/opt/hadoop/share/hadoop/yarn:/opt/hadoop/share/hadoop/yarn/lib/*:/opt/hadoop/share/hadoop/yarn/*</span></span>
<span class="line"><span>        # The following args overwrite the value of jobmanager.rpc.address configured in the configuration config map to POD_IP.</span></span>
<span class="line"><span>        args: [&quot;jobmanager&quot;, &quot;$(POD_IP)&quot;]</span></span>
<span class="line"><span>        ports:</span></span>
<span class="line"><span>        - containerPort: 6123</span></span>
<span class="line"><span>          name: rpc</span></span>
<span class="line"><span>        - containerPort: 6124</span></span>
<span class="line"><span>          name: blob-server</span></span>
<span class="line"><span>        - containerPort: 8081</span></span>
<span class="line"><span>          name: webui</span></span>
<span class="line"><span>        livenessProbe:</span></span>
<span class="line"><span>          tcpSocket:</span></span>
<span class="line"><span>            port: 6123</span></span>
<span class="line"><span>          initialDelaySeconds: 30</span></span>
<span class="line"><span>          periodSeconds: 60</span></span>
<span class="line"><span>        volumeMounts:</span></span>
<span class="line"><span>        - name: flink-config-volume</span></span>
<span class="line"><span>          mountPath: /opt/flink/conf</span></span>
<span class="line"><span>        - name: localtime #挂载localtime文件，使容器时间与宿主机一致</span></span>
<span class="line"><span>          mountPath: /etc/localtime</span></span>
<span class="line"><span>        - name: hadoop-conf #将宿主机中的配置好的hadoop的安装包挂载到容器</span></span>
<span class="line"><span>          mountPath: /opt/hadoop</span></span>
<span class="line"><span>        securityContext:</span></span>
<span class="line"><span>          runAsUser: 9999  # refers to user _flink_ from official flink image, change if necessary</span></span>
<span class="line"><span>      serviceAccountName: flink-service-account #指定seviceAccountName 用户名</span></span>
<span class="line"><span>      volumes:</span></span>
<span class="line"><span>      - name: flink-config-volume</span></span>
<span class="line"><span>        configMap:</span></span>
<span class="line"><span>          name: flink-config</span></span>
<span class="line"><span>          items:</span></span>
<span class="line"><span>          - key: flink-conf.yaml</span></span>
<span class="line"><span>            path: flink-conf.yaml</span></span>
<span class="line"><span>          - key: log4j-console.properties</span></span>
<span class="line"><span>            path: log4j-console.properties</span></span>
<span class="line"><span>      - name: localtime #挂载localtime文件，使容器时间与宿主机一致</span></span>
<span class="line"><span>        hostPath:</span></span>
<span class="line"><span>          path: /etc/localtime</span></span>
<span class="line"><span>          type: &#39;&#39;</span></span>
<span class="line"><span>      - name: hadoop-conf #将宿主机中的配置好的hadoop的安装包挂载到容器</span></span>
<span class="line"><span>        hostPath:</span></span>
<span class="line"><span>          path: /software/hadoop-3.3.4</span></span>
<span class="line"><span>          type: &#39;&#39;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li><strong>taskmanager-session-deployment.yaml</strong></li></ul><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>apiVersion: apps/v1</span></span>
<span class="line"><span>kind: Deployment</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  name: flink-taskmanager</span></span>
<span class="line"><span>spec:</span></span>
<span class="line"><span>  replicas: 2</span></span>
<span class="line"><span>  selector:</span></span>
<span class="line"><span>    matchLabels:</span></span>
<span class="line"><span>      app: flink</span></span>
<span class="line"><span>      component: taskmanager</span></span>
<span class="line"><span>  template:</span></span>
<span class="line"><span>    metadata:</span></span>
<span class="line"><span>      labels:</span></span>
<span class="line"><span>        app: flink</span></span>
<span class="line"><span>        component: taskmanager</span></span>
<span class="line"><span>    spec:</span></span>
<span class="line"><span>      hostAliases: #向容器/etc/hosts中加入ip与节点名称映射，pod找HDFS集群时需要使用</span></span>
<span class="line"><span>      - ip: 192.168.179.4</span></span>
<span class="line"><span>        hostnames:</span></span>
<span class="line"><span>          - &quot;node1&quot;</span></span>
<span class="line"><span>      - ip: 192.168.179.5</span></span>
<span class="line"><span>        hostnames:</span></span>
<span class="line"><span>          - &quot;node2&quot;</span></span>
<span class="line"><span>      - ip: 192.168.179.6</span></span>
<span class="line"><span>        hostnames:</span></span>
<span class="line"><span>          - &quot;node3&quot;</span></span>
<span class="line"><span>      - ip: 192.168.179.7</span></span>
<span class="line"><span>        hostnames:</span></span>
<span class="line"><span>          - &quot;node4&quot;</span></span>
<span class="line"><span>      - ip: 192.168.179.8</span></span>
<span class="line"><span>        hostnames:</span></span>
<span class="line"><span>          - &quot;node5&quot;</span></span>
<span class="line"><span>      containers:</span></span>
<span class="line"><span>      - name: taskmanager</span></span>
<span class="line"><span>        image: flink:1.16.0-scala_2.12-java8 #指定Flink的镜像，可以从https://hub.docker.com/ 网站上查找</span></span>
<span class="line"><span>        env:</span></span>
<span class="line"><span>        - name: HADOOP_CLASSPATH #这里由于在flink pod内使用到HDFS ，需要把宿主机的HDFS配置文件挂载进来，并配置HADOOP_CLASSPATH环境变量，可以通过在宿主机执行echo \`hadoop classpath\`来参考这里导入的路径，记得要把Hadoop路径改成挂载到Pod中的路径</span></span>
<span class="line"><span>          value: /opt/hadoop/etc/hadoop:/opt/hadoop/share/hadoop/common/lib/*:/opt/hadoop/share/hadoop/common/*:/opt/hadoop/share/hadoop/hdfs:/opt/hadoop/share/hadoop/hdfs/lib/*:/opt/hadoop/share/hadoop/hdfs/*:/opt/hadoop/share/hadoop/mapreduce/*:/opt/hadoop/share/hadoop/yarn:/opt/hadoop/share/hadoop/yarn/lib/*:/opt/hadoop/share/hadoop/yarn/*</span></span>
<span class="line"><span>        args: [&quot;taskmanager&quot;]</span></span>
<span class="line"><span>        ports:</span></span>
<span class="line"><span>        - containerPort: 6122</span></span>
<span class="line"><span>          name: rpc</span></span>
<span class="line"><span>        - containerPort: 6125</span></span>
<span class="line"><span>          name: query-state</span></span>
<span class="line"><span>        livenessProbe:</span></span>
<span class="line"><span>          tcpSocket:</span></span>
<span class="line"><span>            port: 6122</span></span>
<span class="line"><span>          initialDelaySeconds: 30</span></span>
<span class="line"><span>          periodSeconds: 60</span></span>
<span class="line"><span>        volumeMounts:</span></span>
<span class="line"><span>        - name: flink-config-volume</span></span>
<span class="line"><span>          mountPath: /opt/flink/conf/</span></span>
<span class="line"><span>        - name: localtime #挂载localtime文件，使容器时间与宿主机一致</span></span>
<span class="line"><span>          mountPath: /etc/localtime</span></span>
<span class="line"><span>        - name: hadoop-conf #将宿主机中的配置好的hadoop的安装包挂载到容器</span></span>
<span class="line"><span>          mountPath: /opt/hadoop</span></span>
<span class="line"><span>        securityContext:</span></span>
<span class="line"><span>          runAsUser: 9999  # refers to user _flink_ from official flink image, change if necessary</span></span>
<span class="line"><span>      serviceAccountName: flink-service-account #指定seviceAccountName 用户名</span></span>
<span class="line"><span>      volumes:</span></span>
<span class="line"><span>      - name: flink-config-volume</span></span>
<span class="line"><span>        configMap:</span></span>
<span class="line"><span>          name: flink-config</span></span>
<span class="line"><span>          items:</span></span>
<span class="line"><span>          - key: flink-conf.yaml</span></span>
<span class="line"><span>            path: flink-conf.yaml</span></span>
<span class="line"><span>          - key: log4j-console.properties</span></span>
<span class="line"><span>            path: log4j-console.properties</span></span>
<span class="line"><span>      - name: localtime #挂载localtime文件，使容器时间与宿主机一致</span></span>
<span class="line"><span>        hostPath: </span></span>
<span class="line"><span>          path: /etc/localtime</span></span>
<span class="line"><span>          type: &#39;&#39;</span></span>
<span class="line"><span>      - name: hadoop-conf #将宿主机中的配置好的hadoop的安装包挂载到容器</span></span>
<span class="line"><span>        hostPath:</span></span>
<span class="line"><span>          path: /software/hadoop-3.3.4</span></span>
<span class="line"><span>          type: &#39;&#39;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>注意：关于Flink的镜像可以从<a href="https://hub.docker.com/%E7%BD%91%E7%AB%99%E4%B8%AD%E6%90%9C%E7%B4%A2%E4%B8%8B%E8%BD%BD%E3%80%82" target="_blank" rel="noopener noreferrer">https://hub.docker.com/网站中搜索下载。</a></p><p>由于在flink pod内使用到HDFS ，需要把宿主机的HDFS配置文件挂到Flink JobManager和TaskManager中并配置HADOOP_CLASSPATH环境变量，可以通过在宿主机执行echo <code>hadoop classpath</code>来参考HADOOP_CLASSPATH环境变量对应的value值路径，记得要把Hadoop路径改成挂载到Pod中的路径。</p><p>以上配置文件可以从资料“flink-ha-session.zip”中获取。</p><h6 id="_1-8-1-1-2-2-部署yaml-文件" tabindex="-1"><a class="header-anchor" href="#_1-8-1-1-2-2-部署yaml-文件"><span>1.8.1.1.2.2 <strong>部署yaml 文件</strong></span></a></h6><p>由于HA模式使用到了HDFS集群，所以这里应该首先启动HDFS集群然后再部署对应的yaml文件。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#启动zookeeper </span></span>
<span class="line"><span>[root@node3 ~]# zkServer.sh start</span></span>
<span class="line"><span>[root@node4 ~]# zkServer.sh start</span></span>
<span class="line"><span>[root@node5 ~]# zkServer.sh start</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#启动HDFS集群</span></span>
<span class="line"><span>[root@node1 ~]# start-all.sh</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>部署之前记得执行上一小节中创建用户与绑定用户到角色命令，如果执行过不必重复创建执行。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>kubectl create serviceaccount flink-service-account</span></span>
<span class="line"><span>kubectl create clusterrolebinding flink-role-binding-serviceaccount  --clusterrole=configmaps-role --serviceaccount=default:flink-service-account</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>在对应的目录中执行如下命令，部署yaml文件</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>kubectl create -f ./flink-configuration-configmap.yaml </span></span>
<span class="line"><span>kubectl create -f ./jobmanager-cluster-role.yaml </span></span>
<span class="line"><span>kubectl create -f ./jobmanager-rest-service.yaml </span></span>
<span class="line"><span>kubectl create -f ./jobmanager-session-deployment-ha.yaml </span></span>
<span class="line"><span>kubectl create -f ./taskmanager-session-deployment.yaml</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>注意：也可以进入对应yaml文件目录，直接执行 kubectl create -f ./ 全部部署也可以。</p><h6 id="_1-8-1-1-2-3-验证部署情况" tabindex="-1"><a class="header-anchor" href="#_1-8-1-1-2-3-验证部署情况"><span>1.8.1.1.2.3 <strong>验证部署情况</strong></span></a></h6><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 flink-ha-session]# kubectl get all</span></span>
<span class="line"><span>NAME                                     READY   STATUS    RESTARTS   AGE</span></span>
<span class="line"><span>pod/flink-jobmanager-7bbc68889f-jvp7d    1/1     Running   0          6m40s</span></span>
<span class="line"><span>pod/flink-jobmanager-7bbc68889f-vn7l4    1/1     Running   0          6m41s</span></span>
<span class="line"><span>pod/flink-taskmanager-7766758754-kvg64   1/1     Running   0          6m40s</span></span>
<span class="line"><span>pod/flink-taskmanager-7766758754-mfjgd   1/1     Running   0          6m41s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                            TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)                      AGE</span></span>
<span class="line"><span>service/flink-jobmanager-rest   NodePort    10.100.75.167    &lt;none&gt;        8081:30081/TCP               6m41s</span></span>
<span class="line"><span>service/kubernetes              ClusterIP   10.96.0.1        &lt;none&gt;        443/TCP                      2d20h</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                                READY   UP-TO-DATE   AVAILABLE   AGE</span></span>
<span class="line"><span>deployment.apps/flink-jobmanager    2/2     2            2           6m41s</span></span>
<span class="line"><span>deployment.apps/flink-taskmanager   2/2     2            2           6m41s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                                           DESIRED   CURRENT   READY   AGE</span></span>
<span class="line"><span>replicaset.apps/flink-jobmanager-7bbc68889f    2         2         2       6m41s</span></span>
<span class="line"><span>replicaset.apps/flink-taskmanager-7766758754   2         2         2       6m41s</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>在浏览器输入：<a href="http://node1:30081/%E5%8D%B3%E5%8F%AF%E8%AE%BF%E9%97%AEFlink" target="_blank" rel="noopener noreferrer">http://192.168.179.4:30081/即可访问Flink</a> Session集群WebUI。浏览器中输入的ip可以是K8s集群中任意节点的IP。</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/61fe95ec75e0431f92de65b96fa28c67.png" alt="image.png" loading="lazy"></p><h6 id="_1-8-1-1-2-4-ha高可用验证" tabindex="-1"><a class="header-anchor" href="#_1-8-1-1-2-4-ha高可用验证"><span>1.8.1.1.2.4 <strong>HA高可用验证</strong></span></a></h6><p>登录HDFS WebUI查看是否生成“hdfs://mycluster/flink/recovery”目录：</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/55517d6f9ea94fde926c1bd7dc5473a6.png" alt="image.png" loading="lazy"></p><p>下面我们测试JobManager是否能正常切换。首先通过WebUI查看Active JobManager对应的IP信息：</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/a26b98a31a174973872fe36c21eb1c3b.png" alt="image.png" loading="lazy"></p><p>然后在Kubernetes集群中根据这个IP找到对应的的Active JobManager节点并删除：</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/686a99cbdaab4f9699e106a2bca4a70e.png" alt="image.png" loading="lazy"></p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 flink-ha-session]# kubectl delete pod flink-jobmanager-7bbc68889f-vn7l4</span></span>
<span class="line"><span>pod &quot;flink-jobmanager-7bbc68889f-vn7l4&quot; deleted</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>以上删除该Active JobManager对应的pod后，Kubernetes机制本身会尝试重启新的Pod，当然由于我们配置了Flink HA ,所以Kubernetes会在新启动的JobManager Pod与原来运行的Standby JobManager Pod中进行自动选主，有一定概率会选择原来一直运行的JobManager Pod当做Active JobManager。</p><p>重新查看Flink WebUI中JobManager IP:</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/a5b935cd9a974e4988868eb599f66078.png" alt="image.png" loading="lazy"></p><p>通过以上验证我们发现原来备用的JobManager已经切换成Active JobManager。</p><p>注意：删除原来Activate JobManager后有可能将Kubernetes重新启动的JobManager选择为Active JobManager，可以尝试多次delete进行验证HA 切换。</p><h6 id="_1-8-1-1-2-5-任务提交与测试" tabindex="-1"><a class="header-anchor" href="#_1-8-1-1-2-5-任务提交与测试"><span>1.8.1.1.2.5 <strong>任务提交与测试</strong></span></a></h6><p>这里基于命令行方式来进行任务提交，不再以WebUI方式提交Flink任务。</p><p>在任意能连接到Kubernetes集群的节点上上传Flink安装包，并解压，将打包好的Flink WordCountjar包进行上传，同时在node5节点上启动对应的Socket服务，执行如下命令提交Flink任务：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node4 ~]# cd /software/flink-1.16.0/bin/</span></span>
<span class="line"><span>[root@node4 bin]# ./flink run -m 192.168.179.4:30081 -c com.mashibing.flinkjava.code.chapter_k8s.WordCount /software/FlinkJavaCode-1.0-SNAPSHOT-jar-with-dependencies.jar</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>向socket端口输入数据，通过kubectl logs + pods 方式查看对应的实时结果即可。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#在node5节点上启动socket 服务，并输入数据</span></span>
<span class="line"><span>[root@node5 ~]# nc -lk 9999</span></span>
<span class="line"><span>hello zhangsan  </span></span>
<span class="line"><span>hello lisi</span></span>
<span class="line"><span>hello wangwu</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#通过kubectl logs 查看对应的结果</span></span>
<span class="line"><span>[root@node1 flink-ha-session]# kubectl logs flink-taskmanager-7766758754-mfjgd</span></span>
<span class="line"><span>... ...</span></span>
<span class="line"><span>(zhangsan,1)</span></span>
<span class="line"><span>(hello,2)</span></span>
<span class="line"><span>(lisi,1)</span></span>
<span class="line"><span>(hello,3)</span></span>
<span class="line"><span>(wangwu,1)</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h6 id="_1-8-1-1-2-6-停止集群" tabindex="-1"><a class="header-anchor" href="#_1-8-1-1-2-6-停止集群"><span>1.8.1.1.2.6 <strong>停止集群</strong></span></a></h6><p>HA Session Cluster 集群停止时，在对应的目录下执行如下命令停止相应服务：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>kubectl delete -f ./flink-configuration-configmap.yaml</span></span>
<span class="line"><span>kubectl delete -f ./jobmanager-cluster-role.yaml</span></span>
<span class="line"><span>kubectl delete -f ./jobmanager-rest-service.yaml</span></span>
<span class="line"><span>kubectl delete -f ./jobmanager-service.yaml</span></span>
<span class="line"><span>kubectl delete -f ./jobmanager-session-deployment-ha.yaml</span></span>
<span class="line"><span>kubectl delete -f ./taskmanager-session-deployment.yaml</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>注意：也可以进入对应yaml文件目录，直接执行 kubectl delete -f ./ 全部部署也可以。除了执行以上命令之外，还需要删除生成的额外的&lt;cluster-id&gt;-xxx configmap对象，命令如下：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#查看kubernetes 集群configmap 对象</span></span>
<span class="line"><span>[root@node1 flink-ha-session]# kubectl get configmap</span></span>
<span class="line"><span>NAME                       DATA   AGE</span></span>
<span class="line"><span>kube-root-ca.crt           1      3d</span></span>
<span class="line"><span>myk8s-cluster-config-map   3      30m</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#删除对应的configmap对象</span></span>
<span class="line"><span>[root@node1 flink-ha-session]# kubectl delete configmap myk8s-cluster-config-map</span></span>
<span class="line"><span>configmap &quot;myk8s-cluster-config-map&quot; deleted</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h4 id="_1-8-1-2-application-cluster部署" tabindex="-1"><a class="header-anchor" href="#_1-8-1-2-application-cluster部署"><span>1.8.1.2 <em>Application Cluster部署</em></span></a></h4><p>Application模式即一个作业使用单独的一个专用Flink集群，每个Flink作业的JobManager和TaskManager隔离。在Kubernetes 上部署Application Cluster集群时，与Session Cluster集群部署一样，一般至少包含三个组件：</p><ul><li>运行JobManager的Deployment</li><li>运行TaskManager的Deployment</li><li>暴露JobManager上的REST和UI端口的Service</li></ul><h5 id="_1-8-1-2-1-非ha-application-cluster部署及测试" tabindex="-1"><a class="header-anchor" href="#_1-8-1-2-1-非ha-application-cluster部署及测试"><span>1.8.1.2.1 <strong>非HA Application Cluster部署及测试</strong></span></a></h5><h6 id="_1-8-1-2-1-1-准备deployment文件" tabindex="-1"><a class="header-anchor" href="#_1-8-1-2-1-1-准备deployment文件"><span>1.8.1.2.1.1 <strong>准备deployment文件</strong></span></a></h6><ul><li><strong>flink-configuration-configmap.yaml</strong></li></ul><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>apiVersion: v1</span></span>
<span class="line"><span>kind: ConfigMap</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  name: flink-config</span></span>
<span class="line"><span>  labels:</span></span>
<span class="line"><span>    app: flink</span></span>
<span class="line"><span>data:</span></span>
<span class="line"><span>  flink-conf.yaml: |+</span></span>
<span class="line"><span>    jobmanager.rpc.address: flink-jobmanager</span></span>
<span class="line"><span>    taskmanager.numberOfTaskSlots: 2</span></span>
<span class="line"><span>    blob.server.port: 6124</span></span>
<span class="line"><span>    jobmanager.rpc.port: 6123</span></span>
<span class="line"><span>    taskmanager.rpc.port: 6122</span></span>
<span class="line"><span>    queryable-state.proxy.ports: 6125</span></span>
<span class="line"><span>    jobmanager.memory.process.size: 1600m</span></span>
<span class="line"><span>    taskmanager.memory.process.size: 1728m</span></span>
<span class="line"><span>    parallelism.default: 2  </span></span>
<span class="line"><span>  log4j-console.properties: |+</span></span>
<span class="line"><span>    # This affects logging for both user code and Flink</span></span>
<span class="line"><span>    rootLogger.level = INFO</span></span>
<span class="line"><span>    rootLogger.appenderRef.console.ref = ConsoleAppender</span></span>
<span class="line"><span>    rootLogger.appenderRef.rolling.ref = RollingFileAppender</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    # Uncomment this if you want to _only_ change Flink&#39;s logging</span></span>
<span class="line"><span>    #logger.flink.name = org.apache.flink</span></span>
<span class="line"><span>    #logger.flink.level = INFO</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    # The following lines keep the log level of common libraries/connectors on</span></span>
<span class="line"><span>    # log level INFO. The root logger does not override this. You have to manually</span></span>
<span class="line"><span>    # change the log levels here.</span></span>
<span class="line"><span>    logger.akka.name = akka</span></span>
<span class="line"><span>    logger.akka.level = INFO</span></span>
<span class="line"><span>    logger.kafka.name= org.apache.kafka</span></span>
<span class="line"><span>    logger.kafka.level = INFO</span></span>
<span class="line"><span>    logger.hadoop.name = org.apache.hadoop</span></span>
<span class="line"><span>    logger.hadoop.level = INFO</span></span>
<span class="line"><span>    logger.zookeeper.name = org.apache.zookeeper</span></span>
<span class="line"><span>    logger.zookeeper.level = INFO</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    # Log all infos to the console</span></span>
<span class="line"><span>    appender.console.name = ConsoleAppender</span></span>
<span class="line"><span>    appender.console.type = CONSOLE</span></span>
<span class="line"><span>    appender.console.layout.type = PatternLayout</span></span>
<span class="line"><span>    appender.console.layout.pattern = %d{yyyy-MM-dd HH:mm:ss,SSS} %-5p %-60c %x - %m%n</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    # Log all infos in the given rolling file</span></span>
<span class="line"><span>    appender.rolling.name = RollingFileAppender</span></span>
<span class="line"><span>    appender.rolling.type = RollingFile</span></span>
<span class="line"><span>    appender.rolling.append = false</span></span>
<span class="line"><span>    appender.rolling.fileName = \${sys:log.file}</span></span>
<span class="line"><span>    appender.rolling.filePattern = \${sys:log.file}.%i</span></span>
<span class="line"><span>    appender.rolling.layout.type = PatternLayout</span></span>
<span class="line"><span>    appender.rolling.layout.pattern = %d{yyyy-MM-dd HH:mm:ss,SSS} %-5p %-60c %x - %m%n</span></span>
<span class="line"><span>    appender.rolling.policies.type = Policies</span></span>
<span class="line"><span>    appender.rolling.policies.size.type = SizeBasedTriggeringPolicy</span></span>
<span class="line"><span>    appender.rolling.policies.size.size=100MB</span></span>
<span class="line"><span>    appender.rolling.strategy.type = DefaultRolloverStrategy</span></span>
<span class="line"><span>    appender.rolling.strategy.max = 10</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    # Suppress the irrelevant (wrong) warnings from the Netty channel handler</span></span>
<span class="line"><span>    logger.netty.name = org.jboss.netty.channel.DefaultChannelPipeline</span></span>
<span class="line"><span>    logger.netty.level = OFF</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li><strong>jobmanager-rest-service.yaml</strong></li></ul><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>apiVersion: v1</span></span>
<span class="line"><span>kind: Service</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  name: flink-jobmanager-rest</span></span>
<span class="line"><span>spec:</span></span>
<span class="line"><span>  type: NodePort</span></span>
<span class="line"><span>  ports:</span></span>
<span class="line"><span>  - name: rest</span></span>
<span class="line"><span>    port: 8081</span></span>
<span class="line"><span>    targetPort: 8081</span></span>
<span class="line"><span>    nodePort: 30081</span></span>
<span class="line"><span>  selector:</span></span>
<span class="line"><span>    app: flink</span></span>
<span class="line"><span>    component: jobmanager</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li><strong>jobmanager-service.yaml</strong></li></ul><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>apiVersion: v1</span></span>
<span class="line"><span>kind: Service</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  name: flink-jobmanager</span></span>
<span class="line"><span>spec:</span></span>
<span class="line"><span>  type: ClusterIP</span></span>
<span class="line"><span>  ports:</span></span>
<span class="line"><span>  - name: rpc</span></span>
<span class="line"><span>    port: 6123</span></span>
<span class="line"><span>  - name: blob-server</span></span>
<span class="line"><span>    port: 6124</span></span>
<span class="line"><span>  - name: webui</span></span>
<span class="line"><span>    port: 8081</span></span>
<span class="line"><span>  selector:</span></span>
<span class="line"><span>    app: flink</span></span>
<span class="line"><span>    component: jobmanager</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li><strong>jobmanager-application-deployment-non-ha.yaml</strong></li></ul><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>apiVersion: batch/v1</span></span>
<span class="line"><span>kind: Job</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  name: flink-jobmanager</span></span>
<span class="line"><span>spec:</span></span>
<span class="line"><span>  template:</span></span>
<span class="line"><span>    metadata:</span></span>
<span class="line"><span>      labels:</span></span>
<span class="line"><span>        app: flink</span></span>
<span class="line"><span>        component: jobmanager</span></span>
<span class="line"><span>    spec:</span></span>
<span class="line"><span>      restartPolicy: OnFailure</span></span>
<span class="line"><span>      containers:</span></span>
<span class="line"><span>        - name: jobmanager</span></span>
<span class="line"><span>          image: flink:1.16.0-scala_2.12-java8 #指定Flink的镜像，可以从https://hub.docker.com/ 网站上查找</span></span>
<span class="line"><span>          # 以下参数中 standalone-job、--job-classname 是固定的，后面一个参数是运行的Flink 主类，还可以继续跟参数，例如：&quot;--input&quot;,&quot;/xxx/xx&quot;</span></span>
<span class="line"><span>          args: [&quot;standalone-job&quot;, &quot;--job-classname&quot;, &quot;com.mashibing.flinkjava.code.chapter_k8s.WordCount&quot;] # optional arguments: [&quot;--job-id&quot;, &quot;&lt;job id&gt;&quot;, &quot;--fromSavepoint&quot;, &quot;/path/to/savepoint&quot;, &quot;--allowNonRestoredState&quot;]</span></span>
<span class="line"><span>          ports:</span></span>
<span class="line"><span>            - containerPort: 6123</span></span>
<span class="line"><span>              name: rpc</span></span>
<span class="line"><span>            - containerPort: 6124</span></span>
<span class="line"><span>              name: blob-server</span></span>
<span class="line"><span>            - containerPort: 8081</span></span>
<span class="line"><span>              name: webui</span></span>
<span class="line"><span>          livenessProbe:</span></span>
<span class="line"><span>            tcpSocket:</span></span>
<span class="line"><span>              port: 6123</span></span>
<span class="line"><span>            initialDelaySeconds: 30</span></span>
<span class="line"><span>            periodSeconds: 60</span></span>
<span class="line"><span>          volumeMounts:</span></span>
<span class="line"><span>            - name: flink-config-volume</span></span>
<span class="line"><span>              mountPath: /opt/flink/conf</span></span>
<span class="line"><span>            - name: localtime #挂载localtime文件，使容器时间与宿主机一致</span></span>
<span class="line"><span>              mountPath: /etc/localtime</span></span>
<span class="line"><span>            - name: job-artifacts-volume</span></span>
<span class="line"><span>              mountPath: /opt/flink/usrlib  #这里必须指定该路径，注意是usrlib ，Flink会从该路径读取用户自己的jar包</span></span>
<span class="line"><span>          securityContext:</span></span>
<span class="line"><span>            runAsUser: 9999  # refers to user _flink_ from official flink image, change if necessary</span></span>
<span class="line"><span>      volumes:</span></span>
<span class="line"><span>        - name: flink-config-volume</span></span>
<span class="line"><span>          configMap:</span></span>
<span class="line"><span>            name: flink-config</span></span>
<span class="line"><span>            items:</span></span>
<span class="line"><span>              - key: flink-conf.yaml</span></span>
<span class="line"><span>                path: flink-conf.yaml</span></span>
<span class="line"><span>              - key: log4j-console.properties</span></span>
<span class="line"><span>                path: log4j-console.properties</span></span>
<span class="line"><span>        - name: job-artifacts-volume</span></span>
<span class="line"><span>          hostPath:</span></span>
<span class="line"><span>            path: /software/flinkjar #将主类对应的jar包放入到该路径下(该路径要在k8s集群所有节点都要有才可以)，可以自定义路径，直接会挂载到容器中</span></span>
<span class="line"><span>        - name: localtime  #同步本机时间到容器</span></span>
<span class="line"><span>          hostPath:</span></span>
<span class="line"><span>            path: /etc/localtime</span></span>
<span class="line"><span>            type: &#39;&#39;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>注意：本地/software/flinkjar 中需要上传运行Flink 主类对应的jar包，并且所有的Kubernetes节点都要有。最好采用nfs公共磁盘挂载。</p><ul><li><strong>taskmanager-application-deployment.yaml</strong></li></ul><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>apiVersion: apps/v1</span></span>
<span class="line"><span>kind: Deployment</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  name: flink-taskmanager</span></span>
<span class="line"><span>spec:</span></span>
<span class="line"><span>  replicas: 2</span></span>
<span class="line"><span>  selector:</span></span>
<span class="line"><span>    matchLabels:</span></span>
<span class="line"><span>      app: flink</span></span>
<span class="line"><span>      component: taskmanager</span></span>
<span class="line"><span>  template:</span></span>
<span class="line"><span>    metadata:</span></span>
<span class="line"><span>      labels:</span></span>
<span class="line"><span>        app: flink</span></span>
<span class="line"><span>        component: taskmanager</span></span>
<span class="line"><span>    spec:</span></span>
<span class="line"><span>      containers:</span></span>
<span class="line"><span>      - name: taskmanager</span></span>
<span class="line"><span>        image: flink:1.16.0-scala_2.12-java8 #指定Flink的镜像，可以从https://hub.docker.com/ 网站上查找</span></span>
<span class="line"><span>        args: [&quot;taskmanager&quot;]</span></span>
<span class="line"><span>        ports:</span></span>
<span class="line"><span>        - containerPort: 6122</span></span>
<span class="line"><span>          name: rpc</span></span>
<span class="line"><span>        - containerPort: 6125</span></span>
<span class="line"><span>          name: query-state</span></span>
<span class="line"><span>        livenessProbe:</span></span>
<span class="line"><span>          tcpSocket:</span></span>
<span class="line"><span>            port: 6122</span></span>
<span class="line"><span>          initialDelaySeconds: 30</span></span>
<span class="line"><span>          periodSeconds: 60</span></span>
<span class="line"><span>        volumeMounts:</span></span>
<span class="line"><span>        - name: flink-config-volume</span></span>
<span class="line"><span>          mountPath: /opt/flink/conf/</span></span>
<span class="line"><span>        - name: localtime #挂载localtime文件，使容器时间与宿主机一致</span></span>
<span class="line"><span>          mountPath: /etc/localtime</span></span>
<span class="line"><span>        - name: job-artifacts-volume #这里必须指定该路径，注意是usrlib ，Flink会从该路径读取用户自己的jar包</span></span>
<span class="line"><span>          mountPath: /opt/flink/usrlib</span></span>
<span class="line"><span>        securityContext:</span></span>
<span class="line"><span>          runAsUser: 9999  # refers to user _flink_ from official flink image, change if necessary</span></span>
<span class="line"><span>      volumes:</span></span>
<span class="line"><span>      - name: flink-config-volume</span></span>
<span class="line"><span>        configMap:</span></span>
<span class="line"><span>          name: flink-config</span></span>
<span class="line"><span>          items:</span></span>
<span class="line"><span>          - key: flink-conf.yaml</span></span>
<span class="line"><span>            path: flink-conf.yaml</span></span>
<span class="line"><span>          - key: log4j-console.properties</span></span>
<span class="line"><span>            path: log4j-console.properties</span></span>
<span class="line"><span>      - name: job-artifacts-volume #将主类对应的jar包放入到该路径下(该路径要在k8s集群所有节点都要有才可以)，可以自定义路径，直接会挂载到容器中</span></span>
<span class="line"><span>        hostPath:</span></span>
<span class="line"><span>          path: /software/flinkjar</span></span>
<span class="line"><span>      - name: localtime #挂载localtime文件，使容器时间与宿主机一致</span></span>
<span class="line"><span>        hostPath: </span></span>
<span class="line"><span>          path: /etc/localtime</span></span>
<span class="line"><span>          type: &#39;&#39;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h6 id="_1-8-1-2-1-2-部署yaml文件" tabindex="-1"><a class="header-anchor" href="#_1-8-1-2-1-2-部署yaml文件"><span>1.8.1.2.1.2 <strong>部署yaml文件</strong></span></a></h6><p>由于Application模式部署即执行对应的Flink job，所以部署yaml文件前，需要在Kubernetes集群每台节点创建“/software/flinkjar”目录中上传对应的Flink jar包，然后在对应节点上启动socket服务：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node5 ~]# nc -lk 9999</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>然后在对应的目录中执行如下命令，进行yaml文件部署</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>kubectl create -f flink-configuration-configmap.yaml</span></span>
<span class="line"><span>kubectl create -f jobmanager-application-deployment-non-ha.yaml</span></span>
<span class="line"><span>kubectl create -f jobmanager-rest-service.yaml</span></span>
<span class="line"><span>kubectl create -f taskmanager-application-deployment.yaml</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>注意：也可以进入对应yaml文件目录，直接执行 kubectl create -f ./ 全部部署也可以。</p><h6 id="_1-8-1-2-1-3-验证部署情况" tabindex="-1"><a class="header-anchor" href="#_1-8-1-2-1-3-验证部署情况"><span>1.8.1.2.1.3 <strong>验证部署情况</strong></span></a></h6><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 flink-nonha-application]# kubectl get all</span></span>
<span class="line"><span>NAME                                     READY   STATUS    RESTARTS   AGE</span></span>
<span class="line"><span>pod/flink-jobmanager-r86z9               1/1     Running   0          8s</span></span>
<span class="line"><span>pod/flink-taskmanager-7b7b7d9758-7k7bc   1/1     Running   0          7s</span></span>
<span class="line"><span>pod/flink-taskmanager-7b7b7d9758-crkpw   1/1     Running   0          7s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                            TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)                      AGE</span></span>
<span class="line"><span>service/flink-jobmanager-rest   NodePort    10.103.201.10   &lt;none&gt;        8081:30081/TCP               8s</span></span>
<span class="line"><span>service/kubernetes              ClusterIP   10.96.0.1       &lt;none&gt;        443/TCP                      2d22h</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                                READY   UP-TO-DATE   AVAILABLE   AGE</span></span>
<span class="line"><span>deployment.apps/flink-taskmanager   2/2     2            2           7s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                                           DESIRED   CURRENT   READY   AGE</span></span>
<span class="line"><span>replicaset.apps/flink-taskmanager-7b7b7d9758   2         2         2       7s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                         COMPLETIONS   DURATION   AGE</span></span>
<span class="line"><span>job.batch/flink-jobmanager   0/1           8s         8s</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>在浏览器输入：<a href="http://node1:30081/%E5%8D%B3%E5%8F%AF%E8%AE%BF%E9%97%AEFlink" target="_blank" rel="noopener noreferrer">http://192.168.179.4:30081/即可访问Flink</a> Application集群WebUI。浏览器中输入的ip可以是K8s集群中任意节点的IP。</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/35aa773ae30d4d5faab61f122df3dd19.png" alt="image.png" loading="lazy"></p><p>向node5 socket端口中输入数据并查询结果：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#向node5节点socket输入数据</span></span>
<span class="line"><span>[root@node5 ~]# nc -lk 9999</span></span>
<span class="line"><span>hello a  </span></span>
<span class="line"><span>hello b</span></span>
<span class="line"><span>hello c</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#查看结果</span></span>
<span class="line"><span>[root@node1 flink-nonha-application]# kubectl logs flink-taskmanager-7b7b7d9758-crkpw</span></span>
<span class="line"><span>... ...</span></span>
<span class="line"><span>1&gt; (hello,1)</span></span>
<span class="line"><span>2&gt; (a,1)</span></span>
<span class="line"><span>1&gt; (hello,2)</span></span>
<span class="line"><span>1&gt; (b,1)</span></span>
<span class="line"><span>1&gt; (hello,3)</span></span>
<span class="line"><span>1&gt; (c,1)</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h5 id="_1-8-1-2-2-ha-application-cluster部署及测试" tabindex="-1"><a class="header-anchor" href="#_1-8-1-2-2-ha-application-cluster部署及测试"><span>1.8.1.2.2 <strong>HA Application Cluster部署及测试</strong></span></a></h5><p>同样，基于Kubernetes Application Cluster 部署模式也支持HA模式。配置HA \xA0Application模式与非HA Application模式相比不再需要jobmanager-server.yaml文件。</p><h6 id="_1-8-1-2-2-1-准备deployment文件" tabindex="-1"><a class="header-anchor" href="#_1-8-1-2-2-1-准备deployment文件"><span>1.8.1.2.2.1 <strong>准备deployment文件</strong></span></a></h6><ul><li><strong>flink-configuration-configmap.yaml</strong></li></ul><p>该文件相比于非HA Session模式对应文件增加了以下行：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>kubernetes.cluster-id: myk8s #给kubernets集群取个名字</span></span>
<span class="line"><span>high-availability: kubernetes #指定高可用模式</span></span>
<span class="line"><span>high-availability.storageDir: hdfs://mycluster/flink/recovery #指定元数据存储目录为hdfs路径</span></span>
<span class="line"><span>restart-strategy: fixed-delay #指定重启策略</span></span>
<span class="line"><span>restart-strategy.fixed-delay.attempts: 10 #指定重启尝试次数</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>以上配置使用kubernetes来进行协调FlinkHA，部署相应flink-configuration-configmap.yaml文件后在Kubernetes中会额外生成&lt;cluster-id&gt;-xxx对应的configmap对象，此对象记录Flink 集群中提交的job元数据。完整的flink-configuration-configmap.yaml文件如下：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>apiVersion: v1</span></span>
<span class="line"><span>kind: ConfigMap</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  name: flink-config</span></span>
<span class="line"><span>  labels:</span></span>
<span class="line"><span>    app: flink</span></span>
<span class="line"><span>data:</span></span>
<span class="line"><span>  flink-conf.yaml: |+</span></span>
<span class="line"><span>    jobmanager.rpc.address: flink-jobmanager</span></span>
<span class="line"><span>    taskmanager.numberOfTaskSlots: 2</span></span>
<span class="line"><span>    blob.server.port: 6124</span></span>
<span class="line"><span>    jobmanager.rpc.port: 6123</span></span>
<span class="line"><span>    taskmanager.rpc.port: 6122</span></span>
<span class="line"><span>    queryable-state.proxy.ports: 6125</span></span>
<span class="line"><span>    jobmanager.memory.process.size: 1600m</span></span>
<span class="line"><span>    taskmanager.memory.process.size: 1728m</span></span>
<span class="line"><span>    parallelism.default: 2  </span></span>
<span class="line"><span>    kubernetes.cluster-id: myk8s #给kubernets集群取个名字</span></span>
<span class="line"><span>    high-availability: kubernetes #指定高可用模式</span></span>
<span class="line"><span>    high-availability.storageDir: hdfs://mycluster/flink/recovery #指定元数据存储目录为hdfs路径</span></span>
<span class="line"><span>    restart-strategy: fixed-delay #指定重启策略</span></span>
<span class="line"><span>    restart-strategy.fixed-delay.attempts: 10 #指定重启尝试次数</span></span>
<span class="line"><span>  log4j-console.properties: |+</span></span>
<span class="line"><span>    # This affects logging for both user code and Flink</span></span>
<span class="line"><span>    rootLogger.level = INFO</span></span>
<span class="line"><span>    rootLogger.appenderRef.console.ref = ConsoleAppender</span></span>
<span class="line"><span>    rootLogger.appenderRef.rolling.ref = RollingFileAppender</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    # Uncomment this if you want to _only_ change Flink&#39;s logging</span></span>
<span class="line"><span>    #logger.flink.name = org.apache.flink</span></span>
<span class="line"><span>    #logger.flink.level = INFO</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    # The following lines keep the log level of common libraries/connectors on</span></span>
<span class="line"><span>    # log level INFO. The root logger does not override this. You have to manually</span></span>
<span class="line"><span>    # change the log levels here.</span></span>
<span class="line"><span>    logger.akka.name = akka</span></span>
<span class="line"><span>    logger.akka.level = INFO</span></span>
<span class="line"><span>    logger.kafka.name= org.apache.kafka</span></span>
<span class="line"><span>    logger.kafka.level = INFO</span></span>
<span class="line"><span>    logger.hadoop.name = org.apache.hadoop</span></span>
<span class="line"><span>    logger.hadoop.level = INFO</span></span>
<span class="line"><span>    logger.zookeeper.name = org.apache.zookeeper</span></span>
<span class="line"><span>    logger.zookeeper.level = INFO</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    # Log all infos to the console</span></span>
<span class="line"><span>    appender.console.name = ConsoleAppender</span></span>
<span class="line"><span>    appender.console.type = CONSOLE</span></span>
<span class="line"><span>    appender.console.layout.type = PatternLayout</span></span>
<span class="line"><span>    appender.console.layout.pattern = %d{yyyy-MM-dd HH:mm:ss,SSS} %-5p %-60c %x - %m%n</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    # Log all infos in the given rolling file</span></span>
<span class="line"><span>    appender.rolling.name = RollingFileAppender</span></span>
<span class="line"><span>    appender.rolling.type = RollingFile</span></span>
<span class="line"><span>    appender.rolling.append = false</span></span>
<span class="line"><span>    appender.rolling.fileName = \${sys:log.file}</span></span>
<span class="line"><span>    appender.rolling.filePattern = \${sys:log.file}.%i</span></span>
<span class="line"><span>    appender.rolling.layout.type = PatternLayout</span></span>
<span class="line"><span>    appender.rolling.layout.pattern = %d{yyyy-MM-dd HH:mm:ss,SSS} %-5p %-60c %x - %m%n</span></span>
<span class="line"><span>    appender.rolling.policies.type = Policies</span></span>
<span class="line"><span>    appender.rolling.policies.size.type = SizeBasedTriggeringPolicy</span></span>
<span class="line"><span>    appender.rolling.policies.size.size=100MB</span></span>
<span class="line"><span>    appender.rolling.strategy.type = DefaultRolloverStrategy</span></span>
<span class="line"><span>    appender.rolling.strategy.max = 10</span></span>
<span class="line"><span></span></span>
<span class="line"><span>    # Suppress the irrelevant (wrong) warnings from the Netty channel handler</span></span>
<span class="line"><span>    logger.netty.name = org.jboss.netty.channel.DefaultChannelPipeline</span></span>
<span class="line"><span>    logger.netty.level = OFF</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li><strong>jobmanager-rest-service.yaml</strong></li></ul><p>改文件与非HA Application模式部署对应的文件一样。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>apiVersion: v1</span></span>
<span class="line"><span>kind: Service</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  name: flink-jobmanager-rest</span></span>
<span class="line"><span>spec:</span></span>
<span class="line"><span>  type: NodePort</span></span>
<span class="line"><span>  ports:</span></span>
<span class="line"><span>  - name: rest</span></span>
<span class="line"><span>    port: 8081</span></span>
<span class="line"><span>    targetPort: 8081</span></span>
<span class="line"><span>    nodePort: 30081</span></span>
<span class="line"><span>  selector:</span></span>
<span class="line"><span>    app: flink</span></span>
<span class="line"><span>    component: jobmanager</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li><strong>jobmanager-cluster-role.yaml</strong></li></ul><p>在k8s中是基于角色授权的，创建用户时需要绑定对应的角色，在JobManager HA 部署案例中需要操作对应的配置ConfigMap文件。这里通过jobmanager-cluster-role.yaml创建一个ClusterRole，然后再创建用户，将用户绑定到该集群角色，拥有对ConfigMap操作权限。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>kind: ClusterRole</span></span>
<span class="line"><span>apiVersion: rbac.authorization.k8s.io/v1</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  namespace: default</span></span>
<span class="line"><span>  name: configmaps-role #创建ClusterRole的名称</span></span>
<span class="line"><span>rules:</span></span>
<span class="line"><span>- apiGroups: [&quot;&quot;] # &quot;&quot; indicates the core API group</span></span>
<span class="line"><span>  resources: [&quot;configmaps&quot;] #指定操作的资源为configmaps</span></span>
<span class="line"><span>  verbs: [&quot;create&quot;, &quot;edit&quot;, &quot;delete&quot;,&quot;get&quot;, &quot;watch&quot;, &quot;list&quot;,&quot;update&quot;] #指定操作的权限</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>以上创建完成，再创建一个用户叫flink-service-account，后续将用户绑定到该角色。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>kubectl create serviceaccount flink-service-account</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>把flink-service-account用户绑定到集群角色：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>kubectl create clusterrolebinding flink-role-binding-serviceaccount  --clusterrole=configmaps-role --serviceaccount=default:flink-service-account</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><ul><li><strong>jobmanager-application-deployment-ha.yaml</strong></li></ul><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>apiVersion: batch/v1</span></span>
<span class="line"><span>kind: Job</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  name: flink-jobmanager</span></span>
<span class="line"><span>spec:</span></span>
<span class="line"><span>  #这里配置2个副本</span></span>
<span class="line"><span>  parallelism: 2 # Set the value to greater than 1 to start standby JobManagers</span></span>
<span class="line"><span>  template:</span></span>
<span class="line"><span>    metadata:</span></span>
<span class="line"><span>      labels:</span></span>
<span class="line"><span>        app: flink</span></span>
<span class="line"><span>        component: jobmanager</span></span>
<span class="line"><span>    spec:</span></span>
<span class="line"><span>      hostAliases: #向容器/etc/hosts中加入ip与节点名称映射，pod找HDFS集群时需要使用</span></span>
<span class="line"><span>      - ip: 192.168.179.4</span></span>
<span class="line"><span>        hostnames: </span></span>
<span class="line"><span>          - &quot;node1&quot;</span></span>
<span class="line"><span>      - ip: 192.168.179.5</span></span>
<span class="line"><span>        hostnames:</span></span>
<span class="line"><span>          - &quot;node2&quot;</span></span>
<span class="line"><span>      - ip: 192.168.179.6</span></span>
<span class="line"><span>        hostnames:</span></span>
<span class="line"><span>          - &quot;node3&quot;</span></span>
<span class="line"><span>      - ip: 192.168.179.7</span></span>
<span class="line"><span>        hostnames:</span></span>
<span class="line"><span>          - &quot;node4&quot;</span></span>
<span class="line"><span>      - ip: 192.168.179.8</span></span>
<span class="line"><span>        hostnames:</span></span>
<span class="line"><span>          - &quot;node5&quot;</span></span>
<span class="line"><span>      restartPolicy: OnFailure</span></span>
<span class="line"><span>      containers:</span></span>
<span class="line"><span>        - name: jobmanager</span></span>
<span class="line"><span>          image: flink:1.16.0-scala_2.12-java8 #指定Flink的镜像，可以从https://hub.docker.com/ 网站上查找</span></span>
<span class="line"><span>          env:</span></span>
<span class="line"><span>          - name: POD_IP</span></span>
<span class="line"><span>            valueFrom:</span></span>
<span class="line"><span>              fieldRef:</span></span>
<span class="line"><span>                apiVersion: v1</span></span>
<span class="line"><span>                fieldPath: status.podIP</span></span>
<span class="line"><span>          - name: HADOOP_CLASSPATH #这里由于在flink pod内使用到HDFS ，需要把宿主机的HDFS配置文件挂载进来，并配置HADOOP_CLASSPATH环境变量，可以通过在宿主机执行echo \`hadoop classpath\`来参考这里导入的路径，记得要把Hadoop路径改成挂载到Pod中的路径</span></span>
<span class="line"><span>            value: /opt/hadoop/etc/hadoop:/opt/hadoop/share/hadoop/common/lib/*:/opt/hadoop/share/hadoop/common/*:/opt/hadoop/share/hadoop/hdfs:/opt/hadoop/share/hadoop/hdfs/lib/*:/opt/hadoop/share/hadoop/hdfs/*:/opt/hadoop/share/hadoop/mapreduce/*:/opt/hadoop/share/hadoop/yarn:/opt/hadoop/share/hadoop/yarn/lib/*:/opt/hadoop/share/hadoop/yarn/*</span></span>
<span class="line"><span>          # The following args overwrite the value of jobmanager.rpc.address configured in the configuration config map to POD_IP.</span></span>
<span class="line"><span>          # 以下参数中 standalone-job、--job-classname 是固定的，后面一个参数是运行的Flink 主类，还可以继续跟参数，例如：&quot;--input&quot;,&quot;/xxx/xx&quot;</span></span>
<span class="line"><span>          args: [&quot;standalone-job&quot;,&quot;--host&quot;,&quot;$(POD_IP)&quot;, &quot;--job-classname&quot;, &quot;com.mashibing.flinkjava.code.chapter_k8s.WordCount&quot;] # optional arguments: [&quot;--job-id&quot;, &quot;&lt;job id&gt;&quot;, &quot;--fromSavepoint&quot;, &quot;/path/to/savepoint&quot;, &quot;--allowNonRestoredState&quot;]</span></span>
<span class="line"><span>          ports:</span></span>
<span class="line"><span>            - containerPort: 6123</span></span>
<span class="line"><span>              name: rpc</span></span>
<span class="line"><span>            - containerPort: 6124</span></span>
<span class="line"><span>              name: blob-server</span></span>
<span class="line"><span>            - containerPort: 8081</span></span>
<span class="line"><span>              name: webui</span></span>
<span class="line"><span>          livenessProbe:</span></span>
<span class="line"><span>            tcpSocket:</span></span>
<span class="line"><span>              port: 6123</span></span>
<span class="line"><span>            initialDelaySeconds: 30</span></span>
<span class="line"><span>            periodSeconds: 60</span></span>
<span class="line"><span>          volumeMounts:</span></span>
<span class="line"><span>            - name: flink-config-volume</span></span>
<span class="line"><span>              mountPath: /opt/flink/conf</span></span>
<span class="line"><span>            - name: localtime #挂载localtime文件，使容器时间与宿主机一致</span></span>
<span class="line"><span>              mountPath: /etc/localtime  </span></span>
<span class="line"><span>            - name: job-artifacts-volume</span></span>
<span class="line"><span>              mountPath: /opt/flink/usrlib  #这里必须指定该路径，注意是usrlib ，Flink会从该路径读取用户自己的jar包</span></span>
<span class="line"><span>            - name: hadoop-conf #将宿主机中的配置好的hadoop的安装包挂载到容器</span></span>
<span class="line"><span>              mountPath: /opt/hadoop</span></span>
<span class="line"><span>          securityContext:</span></span>
<span class="line"><span>            runAsUser: 9999  # refers to user _flink_ from official flink image, change if necessary</span></span>
<span class="line"><span>      serviceAccountName: flink-service-account # Service account which has the permissions to create, edit, delete ConfigMaps</span></span>
<span class="line"><span>      volumes:</span></span>
<span class="line"><span>        - name: flink-config-volume</span></span>
<span class="line"><span>          configMap:</span></span>
<span class="line"><span>            name: flink-config</span></span>
<span class="line"><span>            items:</span></span>
<span class="line"><span>              - key: flink-conf.yaml</span></span>
<span class="line"><span>                path: flink-conf.yaml</span></span>
<span class="line"><span>              - key: log4j-console.properties</span></span>
<span class="line"><span>                path: log4j-console.properties</span></span>
<span class="line"><span>        - name: job-artifacts-volume</span></span>
<span class="line"><span>          hostPath:</span></span>
<span class="line"><span>            path: /software/flinkjar #将主类对应的jar包放入到该路径下(该路径要在k8s集群所有节点都要有才可以)，可以自定义路径，直接会挂载到容器中</span></span>
<span class="line"><span>        - name: localtime  #同步本机时间到容器</span></span>
<span class="line"><span>          hostPath:</span></span>
<span class="line"><span>            path: /etc/localtime</span></span>
<span class="line"><span>            type: &#39;&#39;  </span></span>
<span class="line"><span>        - name: hadoop-conf #将宿主机中的配置好的hadoop的安装包挂载到容器</span></span>
<span class="line"><span>          hostPath:</span></span>
<span class="line"><span>            path: /software/hadoop-3.3.4</span></span>
<span class="line"><span>            type: &#39;&#39;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li><strong>taskmanager-application-deployment.yaml</strong></li></ul><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>apiVersion: apps/v1</span></span>
<span class="line"><span>kind: Deployment</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  name: flink-taskmanager</span></span>
<span class="line"><span>spec:</span></span>
<span class="line"><span>  replicas: 2</span></span>
<span class="line"><span>  selector:</span></span>
<span class="line"><span>    matchLabels:</span></span>
<span class="line"><span>      app: flink</span></span>
<span class="line"><span>      component: taskmanager</span></span>
<span class="line"><span>  template:</span></span>
<span class="line"><span>    metadata:</span></span>
<span class="line"><span>      labels:</span></span>
<span class="line"><span>        app: flink</span></span>
<span class="line"><span>        component: taskmanager</span></span>
<span class="line"><span>    spec:</span></span>
<span class="line"><span>      hostAliases: #向容器/etc/hosts中加入ip与节点名称映射，pod找HDFS集群时需要使用</span></span>
<span class="line"><span>      - ip: 192.168.179.4</span></span>
<span class="line"><span>        hostnames:</span></span>
<span class="line"><span>          - &quot;node1&quot;</span></span>
<span class="line"><span>      - ip: 192.168.179.5</span></span>
<span class="line"><span>        hostnames:</span></span>
<span class="line"><span>          - &quot;node2&quot;</span></span>
<span class="line"><span>      - ip: 192.168.179.6</span></span>
<span class="line"><span>        hostnames:</span></span>
<span class="line"><span>          - &quot;node3&quot;</span></span>
<span class="line"><span>      - ip: 192.168.179.7</span></span>
<span class="line"><span>        hostnames:</span></span>
<span class="line"><span>          - &quot;node4&quot;</span></span>
<span class="line"><span>      - ip: 192.168.179.8</span></span>
<span class="line"><span>        hostnames:</span></span>
<span class="line"><span>          - &quot;node5&quot;</span></span>
<span class="line"><span>      containers:</span></span>
<span class="line"><span>      - name: taskmanager</span></span>
<span class="line"><span>        image: flink:1.16.0-scala_2.12-java8 #指定Flink的镜像，可以从https://hub.docker.com/ 网站上查找</span></span>
<span class="line"><span>        env:</span></span>
<span class="line"><span>        - name: HADOOP_CLASSPATH #这里由于在flink pod内使用到HDFS ，需要把宿主机的HDFS配置文件挂载进来，并配置HADOOP_CLASSPATH环境变量，可以通过在宿主机执行echo \`hadoop classpath\`来参考这里导入的路径，记得要把Hadoop路径改成挂载到Pod中的路径</span></span>
<span class="line"><span>          value: /opt/hadoop/etc/hadoop:/opt/hadoop/share/hadoop/common/lib/*:/opt/hadoop/share/hadoop/common/*:/opt/hadoop/share/hadoop/hdfs:/opt/hadoop/share/hadoop/hdfs/lib/*:/opt/hadoop/share/hadoop/hdfs/*:/opt/hadoop/share/hadoop/mapreduce/*:/opt/hadoop/share/hadoop/yarn:/opt/hadoop/share/hadoop/yarn/lib/*:/opt/hadoop/share/hadoop/yarn/*</span></span>
<span class="line"><span>        args: [&quot;taskmanager&quot;]</span></span>
<span class="line"><span>        ports:</span></span>
<span class="line"><span>        - containerPort: 6122</span></span>
<span class="line"><span>          name: rpc</span></span>
<span class="line"><span>        - containerPort: 6125</span></span>
<span class="line"><span>          name: query-state</span></span>
<span class="line"><span>        livenessProbe:</span></span>
<span class="line"><span>          tcpSocket:</span></span>
<span class="line"><span>            port: 6122</span></span>
<span class="line"><span>          initialDelaySeconds: 30</span></span>
<span class="line"><span>          periodSeconds: 60</span></span>
<span class="line"><span>        volumeMounts:</span></span>
<span class="line"><span>        - name: flink-config-volume</span></span>
<span class="line"><span>          mountPath: /opt/flink/conf/</span></span>
<span class="line"><span>        - name: localtime #挂载localtime文件，使容器时间与宿主机一致</span></span>
<span class="line"><span>          mountPath: /etc/localtime</span></span>
<span class="line"><span>        - name: hadoop-conf #将宿主机中的配置好的hadoop的安装包挂载到容器</span></span>
<span class="line"><span>          mountPath: /opt/hadoop</span></span>
<span class="line"><span>        - name: job-artifacts-volume #这里必须指定该路径，注意是usrlib ，Flink会从该路径读取用户自己的jar包</span></span>
<span class="line"><span>          mountPath: /opt/flink/usrlib</span></span>
<span class="line"><span>        securityContext:</span></span>
<span class="line"><span>          runAsUser: 9999  # refers to user _flink_ from official flink image, change if necessary</span></span>
<span class="line"><span>      serviceAccountName: flink-service-account #指定seviceAccountName 用户名</span></span>
<span class="line"><span>      volumes:</span></span>
<span class="line"><span>      - name: flink-config-volume</span></span>
<span class="line"><span>        configMap:</span></span>
<span class="line"><span>          name: flink-config</span></span>
<span class="line"><span>          items:</span></span>
<span class="line"><span>          - key: flink-conf.yaml</span></span>
<span class="line"><span>            path: flink-conf.yaml</span></span>
<span class="line"><span>          - key: log4j-console.properties</span></span>
<span class="line"><span>            path: log4j-console.properties</span></span>
<span class="line"><span>      - name: job-artifacts-volume #将主类对应的jar包放入到该路径下(该路径要在k8s集群所有节点都要有才可以)，可以自定义路径，直接会挂载到容器中</span></span>
<span class="line"><span>        hostPath:</span></span>
<span class="line"><span>          path: /software/flinkjar</span></span>
<span class="line"><span>      - name: localtime #挂载localtime文件，使容器时间与宿主机一致</span></span>
<span class="line"><span>        hostPath: </span></span>
<span class="line"><span>          path: /etc/localtime</span></span>
<span class="line"><span>          type: &#39;&#39;</span></span>
<span class="line"><span>      - name: hadoop-conf #将宿主机中的配置好的hadoop的安装包挂载到容器</span></span>
<span class="line"><span>        hostPath:</span></span>
<span class="line"><span>          path: /software/hadoop-3.3.4</span></span>
<span class="line"><span>          type: &#39;&#39;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>注意：关于Flink的镜像可以从<a href="https://hub.docker.com/%E7%BD%91%E7%AB%99%E4%B8%AD%E6%90%9C%E7%B4%A2%E4%B8%8B%E8%BD%BD%E3%80%82" target="_blank" rel="noopener noreferrer">https://hub.docker.com/网站中搜索下载。</a></p><p>由于在flink pod内使用到HDFS ，需要把宿主机的HDFS配置文件挂到Flink JobManager和TaskManager中并配置HADOOP_CLASSPATH环境变量，可以通过在宿主机执行echo <code>hadoop classpath</code>来参考HADOOP_CLASSPATH环境变量对应的value值路径，记得要把Hadoop路径改成挂载到Pod中的路径。</p><p>以上配置文件可以从资料“flink-ha-application.zip”中获取。</p><h6 id="_1-8-1-2-2-2-部署yaml文件" tabindex="-1"><a class="header-anchor" href="#_1-8-1-2-2-2-部署yaml文件"><span>1.8.1.2.2.2 <strong>部署yaml文件</strong></span></a></h6><p>由于HA模式使用到了HDFS集群，所以这里应该首先启动HDFS集群然后再部署对应的yaml文件。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#启动zookeeper </span></span>
<span class="line"><span>[root@node3 ~]# zkServer.sh start</span></span>
<span class="line"><span>[root@node4 ~]# zkServer.sh start</span></span>
<span class="line"><span>[root@node5 ~]# zkServer.sh start</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#启动HDFS集群</span></span>
<span class="line"><span>[root@node1 ~]# start-all.sh</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>部署之前记得执行上一小节中创建用户与绑定用户到角色命令，如果执行过不必重复创建执行。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>kubectl create serviceaccount flink-service-account</span></span>
<span class="line"><span>kubectl create clusterrolebinding flink-role-binding-serviceaccount  --clusterrole=configmaps-role --serviceaccount=default:flink-service-account</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>在对应的目录中执行如下命令，部署yaml文件</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>kubectl create -f ./flink-configuration-configmap.yaml</span></span>
<span class="line"><span>kubectl create -f ./jobmanager-application-deployment-ha.yaml</span></span>
<span class="line"><span>kubectl create -f ./jobmanager-cluster-role.yaml</span></span>
<span class="line"><span>kubectl create -f ./jobmanager-rest-service.yaml</span></span>
<span class="line"><span>kubectl create -f ./taskmanager-application-deployment.yaml</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>注意：也可以进入对应yaml文件目录，直接执行 kubectl create -f ./ 全部部署也可以。</p><h6 id="_1-8-1-2-2-3-验证部署情况" tabindex="-1"><a class="header-anchor" href="#_1-8-1-2-2-3-验证部署情况"><span>1.8.1.2.2.3 <strong>验证部署情况</strong></span></a></h6><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 flink-ha-application]# kubectl get all</span></span>
<span class="line"><span>NAME                                     READY   STATUS    RESTARTS   AGE</span></span>
<span class="line"><span>pod/flink-jobmanager-bbp97               1/1     Running   0          60s</span></span>
<span class="line"><span>pod/flink-jobmanager-xvjts               1/1     Running   0          60s</span></span>
<span class="line"><span>pod/flink-taskmanager-58685d568f-7lhhg   1/1     Running   0          60s</span></span>
<span class="line"><span>pod/flink-taskmanager-58685d568f-nj6nf   1/1     Running   0          60s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                            TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)                      AGE</span></span>
<span class="line"><span>service/flink-jobmanager-rest   NodePort    10.97.107.147   &lt;none&gt;        8081:30081/TCP               60s</span></span>
<span class="line"><span>service/kubernetes              ClusterIP   10.96.0.1       &lt;none&gt;        443/TCP                      3d1h</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                                READY   UP-TO-DATE   AVAILABLE   AGE</span></span>
<span class="line"><span>deployment.apps/flink-taskmanager   2/2     2            2           60s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                                           DESIRED   CURRENT   READY   AGE</span></span>
<span class="line"><span>replicaset.apps/flink-taskmanager-58685d568f   2         2         2       60s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                         COMPLETIONS   DURATION   AGE</span></span>
<span class="line"><span>job.batch/flink-jobmanager   0/1 of 2      60s        60s</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>在浏览器输入：<a href="http://node1:30081/%E5%8D%B3%E5%8F%AF%E8%AE%BF%E9%97%AEFlink" target="_blank" rel="noopener noreferrer">http://192.168.179.4:30081/即可访问Flink</a> Application集群WebUI，可以看到对应主类的Flink job已经处于运行状态。</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/e267196b4441451fb926460c2e92806c.png" alt="image.png" loading="lazy"></p><h6 id="_1-8-1-2-2-4-ha高可用验证" tabindex="-1"><a class="header-anchor" href="#_1-8-1-2-2-4-ha高可用验证"><span>1.8.1.2.2.4 <strong>HA高可用验证</strong></span></a></h6><p>HA验证方式与HA Session Cluster 部署方式验证方式一样。可以参考HA Session Cluster 部署方式HA高可用验证。</p><h3 id="_1-8-2-native-kubernetes部署" tabindex="-1"><a class="header-anchor" href="#_1-8-2-native-kubernetes部署"><span>1.8.2 <strong>Native Kubernetes部署</strong></span></a></h3><p>Flink的Native Kubernetes集成允许我们直接将Flink部署到正在运行的Kubernetes集群上，Flink能够根据所需的资源通过与Kubernetes 集群通信动态分配和取消分配taskmanager，其部署原理图如下：</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/25b891e0e9d244aabc8dc144b145e393.png" alt="image.png" loading="lazy"></p><p>Flink Native kubernetes集成需要一个Kubernetes集群，并且Kubernetes版本需要大于等于1.9 版本，Flink Native kubernetes支持Flink Client 创建Session Cluster和Application Cluster集群部署并进行任务提交，也支持对应HA的任务执行，但是需要自定义pod的yaml资源清单文件实现，这与基于Kubernetes中Session Cluster和Application Cluster类似，这里不再两种模式的HA方式，具体HA方式参考Kubernetes部署。</p><p>Flink Native kubernetes的Session Cluster和Application Cluster集群部署两种方式都需要指定具备RBAC(Role-based access control)权限的serviceaccount，以便创建、删除集群内的Pod。</p><p>下面首先创建serviceaccount，并绑定到edit的ClusterRole角色，方便创建和删除集群pod。</p><ol><li><strong>创建名称为flink的serviceaccount</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#创建 serviceaccount ，名称为flink</span></span>
<span class="line"><span>[root@node1 ~]# kubectl create serviceaccount flink</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>查看创建好的seviceaccount:</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# kubectl get serviceaccount</span></span>
<span class="line"><span>NAME      SECRETS   AGE</span></span>
<span class="line"><span>default   0         5d21h</span></span>
<span class="line"><span>flink     0         7m26s</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="2"><li><strong>为serviceaccount flink绑定角色</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#这里创建clusterrolebinding名称为flink-role-binding-flink，绑定的serviceaccount 名称是flink，绑定到的clusterrole角色为edit</span></span>
<span class="line"><span>[root@node1 ~]# kubectl create clusterrolebinding flink-role-binding-flink --clusterrole=edit --serviceaccount=default:flink</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>查看创建的clusterrolebinding：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# kubectl get clusterrolebinding |grep flink-role-binding-flink</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><h4 id="_1-8-2-1-session-cluster模式" tabindex="-1"><a class="header-anchor" href="#_1-8-2-1-session-cluster模式"><span>1.8.2.1 <strong>Session Cluster模式</strong></span></a></h4><p>Session Cluster模式通过Flink Client连接Kubernetes集群进行创建，Flink Client必须在Kubernetes集群内的某台节点，否则Flink Client 连接不上Kubernetes集群。这里选择node3节点当做Flink客户端，将Flink安装包上传至node3节点，并解压。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#将Flink安装包上传到/software目录下，并解压</span></span>
<span class="line"><span>[root@node3 ~]# cd /software/</span></span>
<span class="line"><span>[root@node3 software]# tar -zxvf ./flink-1.16.0-bin-scala_2.12.tgz</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>通过以下步骤创建Session Cluster并提交任务、操作任务。</p><h5 id="_1-8-2-1-1-启动session集群" tabindex="-1"><a class="header-anchor" href="#_1-8-2-1-1-启动session集群"><span>1.8.2.1.1 <strong>启动Session集群</strong></span></a></h5><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node3 ~]# cd /software/flink-1.16.0/bin/</span></span>
<span class="line"><span>[root@node3 bin]#./kubernetes-session.sh \\</span></span>
<span class="line"><span> -Dkubernetes.container.image=flink:1.16.0-scala_2.12-java8\\</span></span>
<span class="line"><span> -Dkubernetes.jobmanager.service-account=flink \\</span></span>
<span class="line"><span> -Dkubernetes.cluster-id=my-first-flink-cluster\\</span></span>
<span class="line"><span> -Dkubernetes.rest-service.exposed.type=NodePort\\</span></span>
<span class="line"><span> -Dtaskmanager.memory.process.size=1024m \\</span></span>
<span class="line"><span> -Dkubernetes.taskmanager.cpu=1 \\</span></span>
<span class="line"><span> -Dtaskmanager.numberOfTaskSlots=4 \\</span></span>
<span class="line"><span> -Dresourcemanager.taskmanager-timeout=60000</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>以上参数解释如下:</p><ul><li>kubernetes.container.image：指定Flink image镜像。</li><li>kubernetes.jobmanager.service-account：指定操作的serviceaccount名称</li><li>kubernetes.cluster-id：指定Flink Session Cluster对应Kubernetes集群的id,名字随意，指定后在Kubernetes集群中会有对应名称的Deployment。</li><li>kubernetes.rest-service.exposed.type：指定创建的JobManager rest ui服务对外暴露服务的方式。</li><li>taskmanager.memory.process.size：指定每个TaskManager使用的总内存。</li><li>kubernetes.taskmanager.cpu：指定TaskManager使用的cup个数，默认为1。</li><li>taskmanager.numberOfTaskSlots：指定TaskManager 对应的slot个数，默认为1。</li><li>resourcemanager.taskmanager-timeout:Flink默认会自动取消空闲的TaskManager以避免浪费资源，一旦对应的TaskManager Pod停止，就不能再查看对应Pod的日志，可以设置该参数指定空闲的TaskManager多久可以被销毁，默认30000，即30s。</li></ul><p>更多参数可以参考Flink官网配置：</p><p><a href="https://nightlies.apache.org/flink/flink-docs-release-1.16/docs/deployment/config/#kubernetes" target="_blank" rel="noopener noreferrer">https://nightlies.apache.org/flink/flink-docs-release-1.16/docs/deployment/config/#kubernetes</a></p><p>此外，以上flink:1.16.0-scala_2.12-java8 镜像下载需要科学上网工具，如何下载不下来也可以直接导入资料中的“flink1.16.0-scala_2.12-java8.tar”镜像，方法如下：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#将flink1.16.0-scala_2.12-java8.tar上传到对应节点，这里上传至Master节点，然后执行如下命令导入镜像</span></span>
<span class="line"><span>[root@node1 ~]# docker load -i /software/flink1.16.0-scala_2.12-java8.tar </span></span>
<span class="line"><span>f4a670ac65b6: Loading layer [==================================================&gt;]  80.31MB/80.31MB</span></span>
<span class="line"><span>aa2e51f5ab8a: Loading layer [==================================================&gt;]   36.6MB/36.6MB</span></span>
<span class="line"><span>9b110457aa6d: Loading layer [==================================================&gt;]  108.8MB/108.8MB</span></span>
<span class="line"><span>6428f4fb9d66: Loading layer [==================================================&gt;]   2.56kB/2.56kB</span></span>
<span class="line"><span>2da66d05adf1: Loading layer [==================================================&gt;]   11.8MB/11.8MB</span></span>
<span class="line"><span>2d441efefbd5: Loading layer [==================================================&gt;]    2.3MB/2.3MB</span></span>
<span class="line"><span>4463bbe0b1a3: Loading layer [==================================================&gt;]  3.254MB/3.254MB</span></span>
<span class="line"><span>0236f57a147f: Loading layer [==================================================&gt;]   2.56kB/2.56kB</span></span>
<span class="line"><span>3d6f741552ee: Loading layer [==================================================&gt;]  520.8MB/520.8MB</span></span>
<span class="line"><span>eb617b6c57b4: Loading layer [==================================================&gt;]  7.168kB/7.168kB</span></span>
<span class="line"><span>Loaded image: flink:1.16.0-scala_2.12-java8</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#查看导入的镜像</span></span>
<span class="line"><span>[root@node1 ~]# docker images</span></span>
<span class="line"><span>REPOSITORY   TAG                       IMAGE ID       CREATED       SIZE</span></span>
<span class="line"><span>flink        1.16.0-scala_2.12-java8   584a51fe68ac   10 days ago   759MB</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>启动Kubernetes Session Cluster 集群后，可以看到打印出外网访问的IP及端口，可以登录检查启动的Session集群是否正常。</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/11abf7c8ad4c43f7a8f1fc21aa6b8846.png" alt="image.png" loading="lazy"></p><h5 id="_1-8-2-1-2-停止session-cluster集群" tabindex="-1"><a class="header-anchor" href="#_1-8-2-1-2-停止session-cluster集群"><span>1.8.2.1.2 <strong>停止Session Cluster集群</strong></span></a></h5><p>当启动Session Cluster后，在Kubernetes集群中会有名称与“kubernetes.cluster-id”参数配置一样的deployment，查看方式如下：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# kubectl get all</span></span>
<span class="line"><span>NAME                                          READY   STATUS    RESTARTS   AGE</span></span>
<span class="line"><span>pod/my-first-flink-cluster-577f9d9d9b-wk9c7   1/1     Running   0          6m10s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                                  TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)             AGE</span></span>
<span class="line"><span>service/kubernetes                    ClusterIP   10.96.0.1      &lt;none&gt;        443/TCP             5d21h</span></span>
<span class="line"><span>service/my-first-flink-cluster        ClusterIP   None           &lt;none&gt;        6123/TCP,6124/TCP   6m10s</span></span>
<span class="line"><span>service/my-first-flink-cluster-rest   NodePort    10.101.64.92   &lt;none&gt;        8081:32755/TCP      6m10s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                                     READY   UP-TO-DATE   AVAILABLE   AGE</span></span>
<span class="line"><span>deployment.apps/my-first-flink-cluster   1/1     1            1           6m10s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                                                DESIRED   CURRENT   READY   AGE</span></span>
<span class="line"><span>replicaset.apps/my-first-flink-cluster-577f9d9d9b   1         1         1       6m10s</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>停止对应的Session Cluster集群有两种方式，一种是通过Kubernetes命令停止对应的Deployment，另一种是通过Flink Client停止。</p><ul><li><strong>Kubernetes命令停止Session Cluster集群：</strong></li></ul><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# kubectl delete deployment.apps/my-first-flink-cluster</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><ul><li><strong>Flink Client停止Session Cluster集群：</strong></li></ul><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node3 bin]#  echo &#39;stop&#39; | ./kubernetes-session.sh  -Dkubernetes.cluster-id=my-first-flink-cluster -Dexecution.attached=true</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><h5 id="_1-8-2-1-3-提交任务" tabindex="-1"><a class="header-anchor" href="#_1-8-2-1-3-提交任务"><span>1.8.2.1.3 <strong>提交任务</strong></span></a></h5><p>这里向启动的Flink Session Cluster 集群中提交任务，任务与之前Flink测试任务一样：读取node5节点上socket 9999 端口数据实时统计WordCount。按照以下步骤来进行任务提交：</p><ol><li><strong>在node5节点上启动Socket服务。</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node5 ~]# nc -lk 9999</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><ol start="2"><li><strong>在node3节点上传用户打好的jar包，放入/software/flinkjar目录中</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node3 ~]# mkdir -p /software/flinkjar</span></span>
<span class="line"><span>[root@node3 flinkjar]# ls</span></span>
<span class="line"><span>FlinkJavaCode-1.0-SNAPSHOT-jar-with-dependencies.jar</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="3"><li><strong>执行如下命令提交任务并测试：</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node3 ~]# cd /software/flink-1.16.0/bin/</span></span>
<span class="line"><span>[root@node3 bin]# ./flink run \\</span></span>
<span class="line"><span> --target kubernetes-session \\</span></span>
<span class="line"><span> -Dkubernetes.cluster-id=my-first-flink-cluster \\</span></span>
<span class="line"><span> -c com.mashibing.flinkjava.code.chapter_k8s.WordCount \\</span></span>
<span class="line"><span> /software/flinkjar/FlinkJavaCode-1.0-SNAPSHOT-jar-with-dependencies.jar</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/34515d8092824fa98889e3c2cb442357.png" alt="image.png" loading="lazy"></p><p>session集群中提交任务需要指定--target为kubernetes-session即可，另外可以在提交任务时指定参数-d ，在向Kubernetes中Flink Session Cluster集群提交任务后退出客户端。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node3 bin]# ./flink run -d \\</span></span>
<span class="line"><span> --target kubernetes-session \\</span></span>
<span class="line"><span> -Dkubernetes.cluster-id=my-first-flink-cluster \\</span></span>
<span class="line"><span> -c com.mashibing.flinkjava.code.chapter_k8s.WordCount \\</span></span>
<span class="line"><span> /software/flinkjar/FlinkJavaCode-1.0-SNAPSHOT-jar-with-dependencies.jar</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>可以在node5节点socket中输入以下数据：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node5 ~]# nc -lk 9999</span></span>
<span class="line"><span>hello a</span></span>
<span class="line"><span>hello b</span></span>
<span class="line"><span>hello c</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>查看stdout结果需要使用kubernetes集群命令来查询：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 software]# kubectl logs my-first-flink-cluster-taskmanager-1-1</span></span>
<span class="line"><span>... ....</span></span>
<span class="line"><span>(hello,1)</span></span>
<span class="line"><span>(a,1)</span></span>
<span class="line"><span>(hello,2)</span></span>
<span class="line"><span>(b,1)</span></span>
<span class="line"><span>(hello,3)</span></span>
<span class="line"><span>(c,1)</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h5 id="_1-8-2-1-4-测试资源申请与释放" tabindex="-1"><a class="header-anchor" href="#_1-8-2-1-4-测试资源申请与释放"><span>1.8.2.1.4 <strong>测试资源申请与释放</strong></span></a></h5><p>默认创建Flink Session Cluster集群指定了每个TaskManager 具备1core和4个slot,当向Flink Session Cluster 集群中提交一个任务时（默认1个并行度）会使用1个slot，当提交多次Flink任务时可以看到FlinkSession Cluster集群可以动态申请TaskManager</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/10030137efbf418489fae3fb3db29b61.png" alt="image.png" loading="lazy"></p><p>通过以上测试会发现，当提交多个Flink 任务时，这些任务共用一个Flink Session Cluster集群，每提交一个Flink任务会分配1个slot，当Session Cluster Slot不够时Kubernetes集群会动态启动新的TaskManager。查看集群中提交的任务：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node3 bin]# ./flink list \\</span></span>
<span class="line"><span> --target kubernetes-session \\</span></span>
<span class="line"><span> -Dkubernetes.cluster-id=my-first-flink-cluster</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>可以通过以下命令取消对应任务执行：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>./flink cancel \\</span></span>
<span class="line"><span> --target kubernetes-session \\</span></span>
<span class="line"><span> -Dkubernetes.cluster-id=my-first-flink-cluster \\</span></span>
<span class="line"><span> 任务id</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>当把集群任务一个个取消后，集群TaskManager会经过“resourcemanager.taskmanager-timeout”参数指定的时间后动态释放以便节省资源，在创建Flink Session Cluster集群时该参数指定60000ms ,即1分钟，Kubernetes集群会在1分钟后自动删除空闲的TaskManager。</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/4c170c0c0a7f4dea9a6d4e410a5b4d19.png" alt="image.png" loading="lazy"></p><h4 id="_1-8-2-2-application-cluster模式" tabindex="-1"><a class="header-anchor" href="#_1-8-2-2-application-cluster模式"><span>1.8.2.2 <strong>Application Cluster模式</strong></span></a></h4><p>在生产环境中，建议基于Application Cluster集群来部署Flink应用程序，因为这些模式为应用程序提供了更好的隔离。Flink基于Native Kubernetes 同样也支持Application Cluster模式，在Flink客户端指定对应的命令可以直接为每个Flink Application 创建一个单独的集群。Flink Application Cluster 中通过Flink客户端提交Flink任务需要自己提前构建flink的镜像，将用户对应执行的jar包上传到镜像内，目前官方没有提供外部指定参数方式来指定用户jar包。</p><h5 id="_1-8-2-2-1-harbor构建私有镜像仓库" tabindex="-1"><a class="header-anchor" href="#_1-8-2-2-1-harbor构建私有镜像仓库"><span>1.8.2.2.1 <strong>Harbor构建私有镜像仓库</strong></span></a></h5><p>在企业中使用Kubernetes时，为了方便下载和管理镜像一般都会构建本地的私有镜像仓库。Harbor正是一个用于存储镜像的企业级Registry服务，我们可以通过Harbor来存储容器镜像构建企业本地的镜像仓库。</p><p>这里我们选择一台Kubernetes集群外的一台节点搭建Harbor，当然也可以选择Kubernetes集群内的一台节点。</p><table><thead><tr><th><strong>节点IP</strong></th><th><strong>节点名称</strong></th><th><strong>Harbor</strong></th></tr></thead><tbody><tr><td>192.168.179.4</td><td>node1</td><td></td></tr><tr><td>192.168.179.5</td><td>node2</td><td></td></tr><tr><td>192.168.179.6</td><td>node3</td><td></td></tr><tr><td>192.168.179.7</td><td>node4</td><td>★</td></tr><tr><td>192.168.179.8</td><td>node5</td><td></td></tr></tbody></table><ol><li><strong>安装docker</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#准备docker-ce对应的repo文件</span></span>
<span class="line"><span>[root@node4 ~]# wget https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo -O /etc/yum.repos.d/docker-ce.repo</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#安装docker-ce</span></span>
<span class="line"><span>[root@node4 ~]# yum -y install docker-ce</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#设置docker开机启动，并启动docker</span></span>
<span class="line"><span>[root@node4 ~]# systemctl enable docker</span></span>
<span class="line"><span>[root@node4 ~]# systemctl start docker</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="2"><li><strong>安装docker-compose</strong></li></ol><p>后续需要docker-compose编排工具进行harbor的启停，这里需要安装docker-compose。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#下载docker-compose的二进制文件,改文件如果下载不下来可以参照资料中“docker-compose-Linux-x86_64”文件</span></span>
<span class="line"><span>[root@node4 ~]# wget https://github.com/docker/compose/releases/download/1.25.0/docker-compose-Linux-x86_64</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#移动二进制文件到/usr/bin目录，并更名为docker-compose</span></span>
<span class="line"><span>[root@node4 ~]# mv docker-compose-Linux-x86_64 /usr/bin/docker-compose</span></span>
<span class="line"><span></span></span>
<span class="line"><span># 为二进制文件添加可执行权限</span></span>
<span class="line"><span>chmod +x /usr/bin/docker-compose</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#以上操作完成后，查看docker-compse版本</span></span>
<span class="line"><span>[root@node4 ~]# docker-compose version</span></span>
<span class="line"><span>docker-compose version 1.25.0, build 0a186604</span></span>
<span class="line"><span>docker-py version: 4.1.0</span></span>
<span class="line"><span>CPython version: 3.7.4</span></span>
<span class="line"><span>OpenSSL version: OpenSSL 1.1.0l  10 Sep 2019</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="3"><li><strong>获取Harbor安装文件并解压</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#下载harbor离线安装包，如果下载不下来参考资料中“harbor-offline-installer-v2.5.1.tgz”文件</span></span>
<span class="line"><span>[root@node4 ~]# wget https://github.com/goharbor/harbor/releases/download/v2.5.1/harbor-offline-installer-v2.5.1.tgz</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#解压下载好的安装包</span></span>
<span class="line"><span>[root@node4 ~]# tar -zxvf ./harbor-offline-installer-v2.5.1.tgz</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="4"><li><strong>修改Harbor配置文件</strong></li></ol><p>搭建Harbor本地镜像仓库时，可以使用ssl安全访问私有镜像仓库，但是Flink Native Kubernetes中Application模式提交任务下载镜像默认是https方式访问仓库地址，所以这里需要给Harbor配置ssl证书，具体证书参照资料“6864844_kubemsb.com_nginx.zip”文件。</p><ul><li><strong>准备Harbor的harbor.yml配置文件：</strong></li></ul><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node4 ~]# cd harbor</span></span>
<span class="line"><span>[root@node4 harbor]# mv harbor.yml.tmpl harbor.yml</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#将资料中“6864844_kubemsb.com_nginx.zip”压缩文件进行解压，然后把证书的pem文件和key文件上传到该目录</span></span>
<span class="line"><span>[root@node4 harbor]# ls /root/harbor</span></span>
<span class="line"><span>6864844_kubemsb.com.key  6864844_kubemsb.com.pem</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ul><li><strong>修改harbor.yml文件内容如下：</strong></li></ul><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># Configuration file of Harbor</span></span>
<span class="line"><span># The IP address or hostname to access admin UI and registry service.</span></span>
<span class="line"><span># DO NOT use localhost or 127.0.0.1, because Harbor needs to be accessed by external clients.</span></span>
<span class="line"><span>hostname: www.kubemsb.com</span></span>
<span class="line"><span></span></span>
<span class="line"><span># http related config</span></span>
<span class="line"><span>http:</span></span>
<span class="line"><span>  # port for http, default is 80. If https enabled, this port will redirect to https port</span></span>
<span class="line"><span>  port: 80</span></span>
<span class="line"><span></span></span>
<span class="line"><span># https related config</span></span>
<span class="line"><span>https:</span></span>
<span class="line"><span>  # https port for harbor, default is 443</span></span>
<span class="line"><span>  port: 443</span></span>
<span class="line"><span>  # The path of cert and key files for nginx</span></span>
<span class="line"><span>  certificate: /root/harbor/6864844_kubemsb.com.pem</span></span>
<span class="line"><span>  private_key: /root/harbor/6864844_kubemsb.com.key</span></span>
<span class="line"><span></span></span>
<span class="line"><span># # Uncomment following will enable tls communication between all harbor components</span></span>
<span class="line"><span># internal_tls:</span></span>
<span class="line"><span>#   # set enabled to true means internal tls is enabled</span></span>
<span class="line"><span>#   enabled: true</span></span>
<span class="line"><span>#   # put your cert and key files on dir</span></span>
<span class="line"><span>#   dir: /etc/harbor/tls/internal</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Uncomment external_url if you want to enable external proxy</span></span>
<span class="line"><span># And when it enabled the hostname will no longer used</span></span>
<span class="line"><span># external_url: https://reg.mydomain.com:8433</span></span>
<span class="line"><span></span></span>
<span class="line"><span># The initial password of Harbor admin</span></span>
<span class="line"><span># It only works in first time to install harbor</span></span>
<span class="line"><span># Remember Change the admin password from UI after launching Harbor.</span></span>
<span class="line"><span>harbor_admin_password: 123456</span></span>
<span class="line"><span>... ...</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>注意harbor.yml文件中只需要配置hostname、certificate、private_key、harbor_admin_password即可。</p><ol start="5"><li><strong>执行预备脚本并安装</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#执行预备脚本，检查安装所需镜像</span></span>
<span class="line"><span>[root@node4 harbor]# ./prepare </span></span>
<span class="line"><span>prepare base dir is set to /root/harbor</span></span>
<span class="line"><span>Clearing the configuration file: /config/portal/nginx.conf</span></span>
<span class="line"><span>Clearing the configuration file: /config/log/logrotate.conf</span></span>
<span class="line"><span>Clearing the configuration file: /config/log/rsyslog_docker.conf</span></span>
<span class="line"><span>Clearing the configuration file: /config/nginx/nginx.conf</span></span>
<span class="line"><span>Clearing the configuration file: /config/core/env</span></span>
<span class="line"><span>Clearing the configuration file: /config/core/app.conf</span></span>
<span class="line"><span>Clearing the configuration file: /config/registry/passwd</span></span>
<span class="line"><span>Clearing the configuration file: /config/registry/config.yml</span></span>
<span class="line"><span>Clearing the configuration file: /config/registryctl/env</span></span>
<span class="line"><span>Clearing the configuration file: /config/registryctl/config.yml</span></span>
<span class="line"><span>Clearing the configuration file: /config/db/env</span></span>
<span class="line"><span>Clearing the configuration file: /config/jobservice/env</span></span>
<span class="line"><span>Clearing the configuration file: /config/jobservice/config.yml</span></span>
<span class="line"><span>Generated configuration file: /config/portal/nginx.conf</span></span>
<span class="line"><span>Generated configuration file: /config/log/logrotate.conf</span></span>
<span class="line"><span>Generated configuration file: /config/log/rsyslog_docker.conf</span></span>
<span class="line"><span>Generated configuration file: /config/nginx/nginx.conf</span></span>
<span class="line"><span>Generated configuration file: /config/core/env</span></span>
<span class="line"><span>Generated configuration file: /config/core/app.conf</span></span>
<span class="line"><span>Generated configuration file: /config/registry/config.yml</span></span>
<span class="line"><span>Generated configuration file: /config/registryctl/env</span></span>
<span class="line"><span>Generated configuration file: /config/registryctl/config.yml</span></span>
<span class="line"><span>Generated configuration file: /config/db/env</span></span>
<span class="line"><span>Generated configuration file: /config/jobservice/env</span></span>
<span class="line"><span>Generated configuration file: /config/jobservice/config.yml</span></span>
<span class="line"><span>loaded secret from file: /data/secret/keys/secretkey</span></span>
<span class="line"><span>Generated configuration file: /compose_location/docker-compose.yml</span></span>
<span class="line"><span>Clean up the input dir</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#执行安装脚本</span></span>
<span class="line"><span>[root@node4 harbor]# ./install.sh </span></span>
<span class="line"><span>...</span></span>
<span class="line"><span>[Step 5]: starting Harbor ...</span></span>
<span class="line"><span>Creating network &quot;harbor_harbor&quot; with the default driver</span></span>
<span class="line"><span>Creating harbor-log ... done</span></span>
<span class="line"><span>Creating registryctl   ... done</span></span>
<span class="line"><span>Creating harbor-db     ... done</span></span>
<span class="line"><span>Creating registry      ... done</span></span>
<span class="line"><span>Creating harbor-portal ... done</span></span>
<span class="line"><span>Creating redis         ... done</span></span>
<span class="line"><span>Creating harbor-core   ... done</span></span>
<span class="line"><span>Creating nginx             ... done</span></span>
<span class="line"><span>Creating harbor-jobservice ... done</span></span>
<span class="line"><span>✔ ----Harbor has been installed and started successfully.----</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="6"><li><strong>验证Harbor情况</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#使用docker ps 命令检查是否是运行9个镜像，如下</span></span>
<span class="line"><span>[root@node4 harbor]# docker ps </span></span>
<span class="line"><span>CONTAINER ID   IMAGE                                                                                  a81fbd05dc13   goharbor/harbor-jobservice:v2.5.1                                                      c374cf3d741a   goharbor/nginx-photon:v2.5.1</span></span>
<span class="line"><span>152c165b0804   goharbor/harbor-core:v2.5.1                                                            4e48926df8b0   goharbor/redis-photon:v2.5.1                                                           6d514441a600   goharbor/harbor-db:v2.5.1                                                              0a170f716955   goharbor/registry-photon:v2.5.1                                                        a8d99c7b2421   goharbor/harbor-portal:v2.5.1                                                          2b808612f108   goharbor/harbor-registryctl:v2.5.1                                                     69c2c7818e6a   goharbor/harbor-log:v2.5.1</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>注意：安装harbor后，查看对应的 docker images 是否是9个，不是9个需要重新启动harbor。重启Harbor的命令如下：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node4 harbor]# cd /root/harbor</span></span>
<span class="line"><span>#停止harbor服务</span></span>
<span class="line"><span>[root@node4 harbor]# docker-compose down</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#启动harbor服务</span></span>
<span class="line"><span>[root@node4 harbor]# docker-compose up -d</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="7"><li><strong>配置Kubernetes节点及harbor节点访问harbor服务</strong></li></ol><p>后续Kubernetes各个节点（包括harbor节点本身）需要连接Harbor上传或者下载镜像，所以这里配置各个节点访问harbor。配置各个节点hosts文件配置www.kubemsb.com的映射:</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#这里在node1-node4各个节点修改/etc/hosts文件，加入以下配置</span></span>
<span class="line"><span>192.168.179.7 www.kubemsb.com</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>kubernetes集群所有节点配置harbor仓库（包括harbor节点本身也要配置）：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#kubernetes 集群各个节点配置/etc/docker/daemon.json文件，追加&quot;insecure-registries&quot;: [&quot;https://www.kubemsb.com&quot;]</span></span>
<span class="line"><span>vim /etc/docker/daemon.json</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>        &quot;exec-opts&quot;: [&quot;native.cgroupdriver=systemd&quot;],</span></span>
<span class="line"><span>        &quot;insecure-registries&quot;: [&quot;https://www.kubemsb.com&quot;]</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#harbor节点配置 /etc/docker/daemon.json文件</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>        &quot;insecure-registries&quot;: [&quot;https://www.kubemsb.com&quot;]   </span></span>
<span class="line"><span>}</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>以上配置完成后，配置的每台节点需要重启docker，重点需要注意harbor节点docker重启后是否是对应有9个image，如果不是9个需要使用docker-compose down 停止harbor集群后再次使用命令docker-compse up -d 启动。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>systemctl restart docker</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>检查每个节点是否能正常连接Harbor，这里每台节点连接harbor前必须需要执行如下命令登录下harbor私有镜像仓库。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>docker login www.kubemsb.com</span></span>
<span class="line"><span>输入用户：admin</span></span>
<span class="line"><span>输入密码：123456</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="8"><li><strong>访问Harbor UI界面</strong></li></ol><p>在window本地“C:\\Windows\\System32\\drivers\\etc\\hosts”中加入对应的映射。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>192.168.179.7 www.kubemsb.com</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>然后浏览器访问harbor(只能是域名访问，不能IP访问)，用户名为admin，密码为配置的123456。</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/3385b90f53db463ba6c742dc2b08ba29.png" alt="image.png" loading="lazy"></p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/b73afe0351014104a0bebd6a4ddfd50e.png" alt="image.png" loading="lazy"></p><ol start="9"><li><strong>测试Harbor</strong></li></ol><p>使用docker下载nginx镜像并上传至harbor，然后通过docker从harbor中下载该上传镜像，测试是否能正常从harbor下载存储管理的镜像。具体操作如下：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#docker 下载nginx镜像</span></span>
<span class="line"><span>[root@node1 ~]# docker pull nginx:1.15-alpine</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#检查镜像</span></span>
<span class="line"><span>[root@node1 ~]# docker images</span></span>
<span class="line"><span>REPOSITORY                                TAG                       IMAGE ID       CREATED        SIZE</span></span>
<span class="line"><span>nginx                                     1.15-alpine               dd025cdfe837   3 years ago    16.1MB</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#对nginx镜像进行标记打tag</span></span>
<span class="line"><span>[root@node1 ~]# docker tag nginx:1.15-alpine www.kubemsb.com/library/nginx:v1</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#检查镜像</span></span>
<span class="line"><span>[root@node1 software]# docker images</span></span>
<span class="line"><span>REPOSITORY                                TAG                       IMAGE ID       CREATED        SIZE</span></span>
<span class="line"><span>nginx                                     1.15-alpine               dd025cdfe837   3 years ago    16.1MB</span></span>
<span class="line"><span>www.kubemsb.com/library/nginx             v1                        dd025cdfe837   3 years ago    16.1MB</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#推送本地镜像到harbor镜像仓库</span></span>
<span class="line"><span>[root@node1 ~]# docker push www.kubemsb.com/library/nginx:v1</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>将本地镜像推送到harbor镜像仓库后，可以通过WebUI查看对应内容：</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/ed61cd24eb7a4b8aa9c55545d6310941.png" alt="image.png" loading="lazy"></p><p>可以在本地任何一台节点上从Harbor镜像仓库中下载镜像到本地：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node2 ~]# docker pull www.kubemsb.com/library/nginx:v1</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><h5 id="_1-8-2-2-2-制作flink-镜像" tabindex="-1"><a class="header-anchor" href="#_1-8-2-2-2-制作flink-镜像"><span>1.8.2.2.2 <strong>制作Flink 镜像</strong></span></a></h5><p>Native kubernetes 中Flink Application Cluster 模式提交一个任务会直接执行对应Flink任务，该任务独立生成并使用Flink Application Cluster，Flink 客户端提交命令时没有提供指定外部用户jar包的指令，所以这里需要将用户的jar包打入到flink镜像内，然后在客户端提交任务时直接指定对应的镜像即可。</p><p>这里通过Dockerflie将用户jar包打入到镜像内，并将制作好的镜像上传到harbor镜像服务器中，方便后续使用。这里可以在Kubernetes任意一台节点制作Flink镜像。</p><ol><li><strong>使用docker下载flink镜像</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# docker pull flink:1.16.0-scala_2.12-java8</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><ol start="2"><li><strong>准备Dockerflie</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#在node1节点创建myflink目录</span></span>
<span class="line"><span>[root@node1 ~]# mkdir myflink &amp;&amp; cd myflink</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#将用户jar包上传至myflink目录下，方便后续制作镜像</span></span>
<span class="line"><span>[root@node1 myflink]# ls</span></span>
<span class="line"><span>FlinkJavaCode-1.0-SNAPSHOT-jar-with-dependencies.jar</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#创建Dockerfile，写入如下内容</span></span>
<span class="line"><span>FROM flink:1.16.0-scala_2.12-java8</span></span>
<span class="line"><span>RUN mkdir -p $FLINK_HOME/usrlib</span></span>
<span class="line"><span>COPY ./FlinkJavaCode-1.0-SNAPSHOT-jar-with-dependencies.jar $FLINK_HOME/usrlib/</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>注意：以上构建的镜像中是将用户的jar包上传到镜像中的$FLINK_HOME/usrlib中，即/opt/flink/usrlib中。</p><ol start="3"><li><strong>构建docker镜像</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#构建docker 镜像</span></span>
<span class="line"><span>[root@node1 myflink]# docker build -t myflink:v1 .</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#查看制作好的镜像</span></span>
<span class="line"><span>[root@node1 myflink]# docker images</span></span>
<span class="line"><span>REPOSITORY                                TAG   </span></span>
<span class="line"><span>myflink                                   v1</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="4"><li><strong>上传docker镜像到Harbor服务器</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#对制作好的myflink:v1镜像打标签</span></span>
<span class="line"><span>[root@node1 myflink]# docker tag myflink:v1 www.kubemsb.com/library/myflink:v1</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#查看镜像</span></span>
<span class="line"><span>[root@node1 myflink]# docker images</span></span>
<span class="line"><span>REPOSITORY                                TAG </span></span>
<span class="line"><span>www.kubemsb.com/library/myflink           v1  </span></span>
<span class="line"><span>myflink                                   v1  </span></span>
<span class="line"><span></span></span>
<span class="line"><span>#将镜像上传至harbor服务器</span></span>
<span class="line"><span>[root@node1 myflink]# docker push www.kubemsb.com/library/myflink:v1</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>通过Harbor WebUI检查对应的镜像：</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/d3f088c0cee14494bb29bce911af0119.png" alt="image.png" loading="lazy"></p><h5 id="_1-8-2-2-3-提交flink-任务及测试" tabindex="-1"><a class="header-anchor" href="#_1-8-2-2-3-提交flink-任务及测试"><span>1.8.2.2.3 <strong>提交Flink 任务及测试</strong></span></a></h5><p>Flink Application Cluster模式提交任务后当前任务独自使用集群，Application Cluster集群启动同时任务也就运行了，所以需要在node5节点中启动socket服务，然后再执行任务提交明林，命令如下：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node3 ~]# cd /software/flink-1.16.0/bin/</span></span>
<span class="line"><span>[root@node3 ~]# ./flink run-application \\</span></span>
<span class="line"><span>   --target kubernetes-application \\</span></span>
<span class="line"><span>   -Dkubernetes.cluster-id=my-first-application-cluster \\</span></span>
<span class="line"><span>   -Dkubernetes.container.image=www.kubemsb.com/library/myflink:v1 \\</span></span>
<span class="line"><span>   -Dkubernetes.rest-service.exposed.type=NodePort\\</span></span>
<span class="line"><span>   -Dkubernetes.jobmanager.service-account=flink\\</span></span>
<span class="line"><span>   -Dtaskmanager.memory.process.size=1024m \\</span></span>
<span class="line"><span>   -Dkubernetes.taskmanager.cpu=1 \\</span></span>
<span class="line"><span>   -Dtaskmanager.numberOfTaskSlots=4 \\</span></span>
<span class="line"><span>   -c com.mashibing.flinkjava.code.chapter_k8s.WordCount \\</span></span>
<span class="line"><span>   local:///opt/flink/usrlib/FlinkJavaCode-1.0-SNAPSHOT-jar-with-dependencies.jar</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>以上命令中--target 指定为kubernetes-application即是Application模式提交任务，其他参数与Session Cluster模式一样。</p><p>提交任务之后，可以看到对应的WebUI 的IP及端口，通过浏览器查看WebUI，可以看到一个Flink任务独立使用单独集群：</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/94763877583041f6a7a98440bef5196f.png" alt="image.png" loading="lazy"></p><p>当再次提交Flink任务时，新提交Flink任务同样也会创建新的Flink集群，需要指定的“kubernetes.cluster-id”名称与其他任务不同，例如提交新的Flink任务：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node3 ~]# ./flink run-application \\</span></span>
<span class="line"><span>   --target kubernetes-application \\</span></span>
<span class="line"><span>   -Dkubernetes.cluster-id=my-first-application-cluster1 \\</span></span>
<span class="line"><span>   -Dkubernetes.container.image=www.kubemsb.com/library/myflink:v1 \\</span></span>
<span class="line"><span>   -Dkubernetes.rest-service.exposed.type=NodePort\\</span></span>
<span class="line"><span>   -Dkubernetes.jobmanager.service-account=flink\\</span></span>
<span class="line"><span>   -Dtaskmanager.memory.process.size=1024m \\</span></span>
<span class="line"><span>   -Dkubernetes.taskmanager.cpu=1 \\</span></span>
<span class="line"><span>   -Dtaskmanager.numberOfTaskSlots=4 \\</span></span>
<span class="line"><span>   -c com.mashibing.flinkjava.code.chapter_k8s.WordCount \\</span></span>
<span class="line"><span>   local:///opt/flink/usrlib/FlinkJavaCode-1.0-SNAPSHOT-jar-with-dependencies.jar</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>提交新的任务后，同时通过Kubernetes 客户端可以看到不同名称的deployment。</p><p><img src="https://fynotefile.oss-cn-zhangjiakou.aliyuncs.com/fynote/fyfile/20/1667826904074/dcb56b49efbe481b99049e7bcc8ce7ce.png" alt="image.png" loading="lazy"></p><h5 id="_1-8-2-2-4-停止flink集群" tabindex="-1"><a class="header-anchor" href="#_1-8-2-2-4-停止flink集群"><span>1.8.2.2.4 <strong>停止Flink集群</strong></span></a></h5><p>可以通过Kubernets命令停止Flink Application集群。命令如下：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#查看Kubernetes中执行的Flink deployment</span></span>
<span class="line"><span>[root@node1 myflink]# kubectl get deployment </span></span>
<span class="line"><span>NAME                            READY   UP-TO-DATE   AVAILABLE   AGE</span></span>
<span class="line"><span>my-first-application-cluster    1/1     1            1           17m</span></span>
<span class="line"><span>my-first-application-cluster1   1/1     1            1           9m59s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#停止对应的Flink deployment</span></span>
<span class="line"><span>[root@node1 ~]# kubectl delete deployment/my-first-application-cluster</span></span>
<span class="line"><span>[root@node1 ~]# kubectl delete deployment/my-first-application-cluster1</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="_1-9-kubernetes-基于docker-runtime" tabindex="-1"><a class="header-anchor" href="#_1-9-kubernetes-基于docker-runtime"><span>1.9 <strong>Kubernetes 基于Docker Runtime</strong></span></a></h2><p>从kubernetes 1.24开始，dockershim已经从kubelet中移除（dockershim 是 Kubernetes 的一个组件，主要目的是为了通过 CRI 操作 Docker），但因为历史问题docker却不支持kubernetes主推的CRI（容器运行时接口）标准，所以docker不能再作为kubernetes的容器运行时了，即从kubernetesv1.24开始不再使用docker了，默认使用的容器运行时是containerd。目前containerd比较新，可能存在一些功能不稳定的情况，所以这里我们也可以选择docker作为kubernetes容器运行时。</p><p>如果想继续使用docker的话，可以在kubelet和docker之间加上一个中间层cri-docker。cri-docker是一个支持CRI标准的shim（垫片）。一头通过CRI跟kubelet交互，另一头跟docker api交互，从而间接的实现了kubernetes以docker作为容器运行时。</p><h3 id="_1-9-1-节点划分" tabindex="-1"><a class="header-anchor" href="#_1-9-1-节点划分"><span>1.9.1 <strong>节点划分</strong></span></a></h3><p>kubernetes 集群搭建节点分布：</p><table><thead><tr><th><strong>节点IP</strong></th><th><strong>节点名称</strong></th><th><strong>Master</strong></th><th><strong>Worker</strong></th></tr></thead><tbody><tr><td>192.168.179.4</td><td>node1</td><td>★</td><td></td></tr><tr><td>192.168.179.5</td><td>node2</td><td></td><td>★</td></tr><tr><td>192.168.179.6</td><td>node3</td><td></td><td>★</td></tr><tr><td>192.168.179.7</td><td>node4</td><td></td><td></td></tr><tr><td>192.168.179.8</td><td>node5</td><td></td><td></td></tr></tbody></table><h3 id="_1-9-2-升级内核" tabindex="-1"><a class="header-anchor" href="#_1-9-2-升级内核"><span>1.9.2 <strong>升级内核</strong></span></a></h3><p>升级操作系统内核，升级到6.06内核版本。这里所有主机均操作，包括node4,node5节点。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#导入elrepo gpg key</span></span>
<span class="line"><span>rpm --import https://www.elrepo.org/RPM-GPG-KEY-elrepo.org</span></span>
<span class="line"><span>#安装elrepo YUM源仓库</span></span>
<span class="line"><span>yum -y install https://www.elrepo.org/elrepo-release-7.0-4.el7.elrepo.noarch.rpm</span></span>
<span class="line"><span>#安装kernel-ml版本，ml为长期稳定版本，lt为长期维护版本</span></span>
<span class="line"><span>yum --enablerepo=&quot;elrepo-kernel&quot; -y install kernel-ml.x86_64</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#设置grub2默认引导为0</span></span>
<span class="line"><span>grub2-set-default 0</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#重新生成grub2引导文件</span></span>
<span class="line"><span>grub2-mkconfig -o /boot/grub2/grub.cfg</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#更新后，需要重启，使用升级的内核生效。</span></span>
<span class="line"><span>reboot</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#重启后，需要验证内核是否为更新对应的版本</span></span>
<span class="line"><span>uname -r</span></span>
<span class="line"><span>6.0.6-1.el7.elrepo.x86_64</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-9-3-配置内核转发及网桥过滤" tabindex="-1"><a class="header-anchor" href="#_1-9-3-配置内核转发及网桥过滤"><span>1.9.3 <strong>配置内核转发及网桥过滤</strong></span></a></h3><p>在所有K8S主机配置。添加网桥过滤及内核转发配置文件：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>vim /etc/sysctl.d/k8s.conf</span></span>
<span class="line"><span>net.bridge.bridge-nf-call-ip6tables = 1</span></span>
<span class="line"><span>net.bridge.bridge-nf-call-iptables = 1</span></span>
<span class="line"><span>net.ipv4.ip_forward = 1</span></span>
<span class="line"><span>vm.swappiness = 0</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>加载br_netfilter模块：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#加载br_netfilter模块</span></span>
<span class="line"><span>modprobe br_netfilter</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#查看是否加载</span></span>
<span class="line"><span>lsmod | grep br_netfilter</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>加载网桥过滤及内核转发配置文件：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>sysctl -p /etc/sysctl.d/k8s.conf</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><h3 id="_1-9-4-安装ipset及ipvsadm" tabindex="-1"><a class="header-anchor" href="#_1-9-4-安装ipset及ipvsadm"><span>1.9.4 <strong>安装ipset及ipvsadm</strong></span></a></h3><p>所有主机均需要操作。主要用于实现service转发。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#安装ipset及ipvsadm</span></span>
<span class="line"><span>yum -y install ipset ipvsadm</span></span>
<span class="line"><span></span></span>
<span class="line"><span>配置ipvsadm模块加载方式，添加需要加载的模块</span></span>
<span class="line"><span>vim  /etc/sysconfig/modules/ipvs.modules</span></span>
<span class="line"><span>modprobe -- ip_vs</span></span>
<span class="line"><span>modprobe -- ip_vs_rr</span></span>
<span class="line"><span>modprobe -- ip_vs_wrr</span></span>
<span class="line"><span>modprobe -- ip_vs_sh</span></span>
<span class="line"><span>modprobe -- nf_conntrack</span></span>
<span class="line"><span></span></span>
<span class="line"><span>授权、运行、检查是否加载</span></span>
<span class="line"><span>chmod 755 /etc/sysconfig/modules/ipvs.modules </span></span>
<span class="line"><span>bash /etc/sysconfig/modules/ipvs.modules</span></span>
<span class="line"><span>lsmod | grep -e ip_vs -e nf_conntrack</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-9-5-关闭swap分区" tabindex="-1"><a class="header-anchor" href="#_1-9-5-关闭swap分区"><span>1.9.5 <strong>关闭SWAP分区</strong></span></a></h3><p>修改完成后需要重启操作系统，如不重启，可临时关闭，命令为swapoff -a。永远关闭swap分区，需要重启操作系统。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#永久关闭swap分区 ,在 /etc/fstab中注释掉下面一行</span></span>
<span class="line"><span>vim /etc/fstab</span></span>
<span class="line"><span>#/dev/mapper/centos-swap swap  swap    defaults        0 0</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#重启机器</span></span>
<span class="line"><span>reboot</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-9-6-安装docker" tabindex="-1"><a class="header-anchor" href="#_1-9-6-安装docker"><span>1.9.6 <strong>安装docker</strong></span></a></h3><p>所有集群主机均需操作。</p><p>获取docker repo文件</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>wget -O /etc/yum.repos.d/docker-ce.repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>查看docker可以安装的版本：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>yum list docker-ce.x86_64 --showduplicates | sort -r</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>安装docker:这里指定docker版本为20.10.9版本</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>yum -y install docker-ce-20.10.9-3.el7</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><blockquote><p>如果安装过程中报错:</p></blockquote><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>Error: Package: 3:docker-ce-20.10.9-3.el7.x86_64 (docker-ce-stable)</span></span>
<span class="line"><span>           Requires: container-selinux &gt;= 2:2.74</span></span>
<span class="line"><span>Error: Package: docker-ce-rootless-extras-20.10.9-3.el7.x86_64 (docker-ce-stable)</span></span>
<span class="line"><span>           Requires: fuse-overlayfs &gt;= 0.7</span></span>
<span class="line"><span>Error: Package: docker-ce-rootless-extras-20.10.9-3.el7.x86_64 (docker-ce-stable)</span></span>
<span class="line"><span>           Requires: slirp4netns &gt;= 0.4</span></span>
<span class="line"><span>Error: Package: containerd.io-1.4.9-3.1.el7.x86_64 (docker-ce-stable)</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><blockquote><p>缺少一些依赖，解决方式：在/etc/yum.repos.d/docker-ce.repo开头追加如下内容:</p></blockquote><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[centos-extras]</span></span>
<span class="line"><span>name=Centos extras - $basearch</span></span>
<span class="line"><span>baseurl=http://mirror.centos.org/centos/7/extras/x86_64</span></span>
<span class="line"><span>enabled=1</span></span>
<span class="line"><span>gpgcheck=0</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><blockquote><p>然后执行安装命令：</p></blockquote><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>yum -y install slirp4netns fuse-overlayfs container-selinux</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><blockquote><p>执行完以上之后，再次执行yum -y install docker-ce-20.10.9-3.el7安装docker即可。</p></blockquote><p>设置docker 开机启动，并启动docker：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>systemctl enable docker</span></span>
<span class="line"><span>systemctl start docker</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>查看docker版本</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>docker version</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>修改cgroup方式，并重启docker。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>vim /etc/docker/daemon.json</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>        &quot;exec-opts&quot;: [&quot;native.cgroupdriver=systemd&quot;]</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#重启docker</span></span>
<span class="line"><span>systemctl restart docker</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-9-7-cri-docker安装" tabindex="-1"><a class="header-anchor" href="#_1-9-7-cri-docker安装"><span>1.9.7 <strong>cri-docker安装</strong></span></a></h3><p>这里需要在全部节点执行cri-docker安装。</p><ol><li><strong>下载cri-docker源码</strong></li></ol><p>可以从</p><p><a href="https://github.com/Mirantis/cri-dockerd/archive/refs/tags/v0.2.6.tar.gz%E5%9C%B0%E5%9D%80%E4%B8%8B%E8%BD%BDcri-docker%E6%BA%90%E7%A0%81%EF%BC%8C%E7%84%B6%E5%90%8E%E4%BD%BF%E7%94%A8go%E8%BF%9B%E8%A1%8C%E7%BC%96%E8%AF%91%E5%AE%89%E8%A3%85%E3%80%82" target="_blank" rel="noopener noreferrer">https://github.com/Mirantis/cri-dockerd/archive/refs/tags/v0.2.6.tar.gz地址下载cri-docker源码，然后使用go进行编译安装。</a> cri-docker源码下载完成后，上传到Master并解压，改名:</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# tar -zxvf ./cri-dockerd-0.2.6.tar.gz </span></span>
<span class="line"><span>[root@node1 ~]# mv cri-dockerd-0.2.6 cri-dockerd</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><ol start="2"><li><strong>安装go</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# wget https://storage.googleapis.com/golang/getgo/installer_linux</span></span>
<span class="line"><span>[root@node1 ~]# chmod +x ./installer_linux</span></span>
<span class="line"><span>[root@node1 ~]# ./installer_linux</span></span>
<span class="line"><span>[root@node1 ~]# source ~/.bash_profile</span></span>
<span class="line"><span>[root@node1 ~]#  go version</span></span>
<span class="line"><span>go version go1.19.3 linux/amd64</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><ol start="3"><li><strong>编译安装cri-docker</strong></li></ol><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#进入 cri-dockerd 中，并创建目录bin</span></span>
<span class="line"><span>[root@node1 ~]# cd cri-dockerd &amp;&amp; mkdir bin</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#编译，大概等待1分钟</span></span>
<span class="line"><span>[root@node1 cri-dockerd]# go build -o bin/cri-dockerd</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#安装cri-docker，安装-o指定owner -g指定group -m指定指定权限</span></span>
<span class="line"><span>[root@node1 cri-dockerd]# mkdir -p /usr/local/bin</span></span>
<span class="line"><span>[root@node1 cri-dockerd]# install -o root -g root -m 0755 bin/cri-dockerd /usr/local/bin/cri-dockerd</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#复制服务管理文件至/etc/systemd/system目录中</span></span>
<span class="line"><span>[root@node1 cri-dockerd]# cp -a packaging/systemd/* /etc/systemd/system</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#指定cri-dockerd运行位置</span></span>
<span class="line"><span>[root@node1 cri-dockerd]# sed -i -e &#39;s,/usr/bin/cri-dockerd,/usr/local/bin/cri-dockerd,&#39; /etc/systemd/system/cri-docker.service</span></span>
<span class="line"><span>[root@node1 cri-dockerd]# systemctl daemon-reload</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#启动服务</span></span>
<span class="line"><span>[root@node1 cri-dockerd]# systemctl enable cri-docker.service</span></span>
<span class="line"><span>[root@node1 cri-dockerd]# systemctl enable --now cri-docker</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-9-8-软件版本" tabindex="-1"><a class="header-anchor" href="#_1-9-8-软件版本"><span>1.9.8 <strong>软件版本</strong></span></a></h3><p>这里安装Kubernetes版本为1.25.3，在所有主机（node1,node2,node3）安装kubeadm，kubelet，kubectl。</p><ul><li>kubeadm：初始化集群、管理集群等。</li><li>kubelet:用于接收api-server指令，对pod生命周期进行管理。</li><li>kubectl:集群应用命令行管理工具。</li></ul><h3 id="_1-9-9-准备阿里yum源" tabindex="-1"><a class="header-anchor" href="#_1-9-9-准备阿里yum源"><span>1.9.9 <strong>准备阿里yum源</strong></span></a></h3><p>每台k8s节点vim /etc/yum.repos.d/k8s.repo，写入以下内容：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[kubernetes]</span></span>
<span class="line"><span>name=Kubernetes</span></span>
<span class="line"><span>baseurl=https://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64/</span></span>
<span class="line"><span>enabled=1</span></span>
<span class="line"><span>gpgcheck=1</span></span>
<span class="line"><span>repo_gpgcheck=0</span></span>
<span class="line"><span>gpgkey=https://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg https://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-9-10-集群软件安装" tabindex="-1"><a class="header-anchor" href="#_1-9-10-集群软件安装"><span>1.9.10 <strong>集群软件安装</strong></span></a></h3><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#查看指定版本</span></span>
<span class="line"><span>yum list kubeadm.x86_64 --showduplicates | sort -r</span></span>
<span class="line"><span>yum list kubelet.x86_64 --showduplicates | sort -r</span></span>
<span class="line"><span>yum list kubectl.x86_64 --showduplicates | sort -r</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#安装指定版本</span></span>
<span class="line"><span>yum -y install --setopt=obsoletes=0 kubeadm-1.25.3-0  kubelet-1.25.3-0 kubectl-1.25.3-0</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>安装过程有有如下错误：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>Error: Package: kubelet-1.25.3-0.x86_64 (kubernetes)</span></span>
<span class="line"><span>           Requires: conntrack</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>解决方式：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>wget http://mirrors.aliyun.com/repo/Centos-7.repo -O /etc/yum.repos.d/Centos-7.repo</span></span>
<span class="line"><span>yum install -y conntrack-tools</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-9-11-配置kubelet" tabindex="-1"><a class="header-anchor" href="#_1-9-11-配置kubelet"><span>1.9.11 <strong>配置kubelet</strong></span></a></h3><p>为了实现docker使用的cgroup driver与kubelet使用的cgroup的一致性，建议修改如下文件内容。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#vim /etc/sysconfig/kubelet</span></span>
<span class="line"><span>KUBELET_EXTRA_ARGS=&quot;--cgroup-driver=systemd&quot;</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>设置kubelet为开机自启动即可，由于没有生成配置文件，集群初始化后自动启动</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>systemctl enable kubelet</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><h3 id="_1-9-12-集群镜像准备" tabindex="-1"><a class="header-anchor" href="#_1-9-12-集群镜像准备"><span>1.9.12 <strong>集群镜像准备</strong></span></a></h3><p>只需要在node1 Master节点上执行如下下载镜像命令即可，这里先使用kubeadm查询下镜像。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]#kubeadm config images list --kubernetes-version=v1.25.3</span></span>
<span class="line"><span>registry.k8s.io/kube-apiserver:v1.25.3</span></span>
<span class="line"><span>registry.k8s.io/kube-controller-manager:v1.25.3</span></span>
<span class="line"><span>registry.k8s.io/kube-scheduler:v1.25.3</span></span>
<span class="line"><span>registry.k8s.io/kube-proxy:v1.25.3</span></span>
<span class="line"><span>registry.k8s.io/pause:3.8</span></span>
<span class="line"><span>registry.k8s.io/etcd:3.5.4-0</span></span>
<span class="line"><span>registry.k8s.io/coredns/coredns:v1.9.3</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>编写下载镜像脚本image_download.sh：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#!/bin/bash</span></span>
<span class="line"><span>images_list=&#39;</span></span>
<span class="line"><span>registry.k8s.io/kube-apiserver:v1.25.3</span></span>
<span class="line"><span>registry.k8s.io/kube-controller-manager:v1.25.3</span></span>
<span class="line"><span>registry.k8s.io/kube-scheduler:v1.25.3</span></span>
<span class="line"><span>registry.k8s.io/kube-proxy:v1.25.3</span></span>
<span class="line"><span>registry.k8s.io/pause:3.8</span></span>
<span class="line"><span>registry.k8s.io/etcd:3.5.4-0</span></span>
<span class="line"><span>registry.k8s.io/coredns/coredns:v1.9.3</span></span>
<span class="line"><span>&#39;</span></span>
<span class="line"><span>for i in $images_list</span></span>
<span class="line"><span>do</span></span>
<span class="line"><span>  docker pull $i</span></span>
<span class="line"><span>done</span></span>
<span class="line"><span>docker save -o k8s-1-25-3.tar $images_list</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>以上脚本准备完成之后，执行命令：sh image_download.sh 进行镜像下载</p><p>注意：下载时候需要科学上网，否则下载不下来。也可以使用资料中的“k8s-1-25-3.tar”下载好的包。</p><blockquote><p>#如果下载不下来，使用资料中打包好的k8s-1-25-3.tar，将镜像导入到docker中</p><p>docker load -i k8s-1-25-3.tar</p></blockquote><h3 id="_1-9-13-集群初始化" tabindex="-1"><a class="header-anchor" href="#_1-9-13-集群初始化"><span>1.9.13 <strong>集群初始化</strong></span></a></h3><p>只需要在Master节点执行如下初始化命令即可。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# kubeadm init --kubernetes-version=v1.25.3 --pod-network-cidr=10.244.0.0/16 --apiserver-advertise-address=192.168.179.4 --cri-socket unix:///var/run/cri-dockerd.sock</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>注意：--apiserver-advertise-address=192.168.179.4 要写当前主机Master IP</p><blockquote><p>初始化过程中报错：</p></blockquote><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[init] Using Kubernetes version: v1.25.3</span></span>
<span class="line"><span>[preflight] Running pre-flight checks</span></span>
<span class="line"><span>error execution phase preflight: [preflight] Some fatal errors occurred:</span></span>
<span class="line"><span>	[ERROR CRI]: container runtime is not running: output: E1102 20:14:29.494424   10976 remote_runtime.go:948] &quot;Status from runtime service </span></span>
<span class="line"><span>failed&quot; err=&quot;rpc error: code = Unimplemented desc = unknown service runtime.v1alpha2.RuntimeService&quot;time=&quot;2022-11-02T20:14:29+08:00&quot; level=fatal msg=&quot;getting status of runtime: rpc error: code = Unimplemented desc = unknown service runtime.v1alp</span></span>
<span class="line"><span>ha2.RuntimeService&quot;, error: exit status 1</span></span>
<span class="line"><span>[preflight] If you know what you are doing, you can make a check non-fatal with \`--ignore-preflight-errors=...\`</span></span>
<span class="line"><span>To see the stack trace of this error execute with --v=5 or higher</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>执行如下命令，重启containerd后，再次init 初始化。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# rm -rf /etc/containerd/config.toml</span></span>
<span class="line"><span>[root@node1 ~]# systemctl restart containerd</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div></div></div><p>初始化完成后，结果如下：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>Your Kubernetes control-plane has initialized successfully!</span></span>
<span class="line"><span></span></span>
<span class="line"><span>To start using your cluster, you need to run the following as a regular user:</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  mkdir -p $HOME/.kube</span></span>
<span class="line"><span>  sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config</span></span>
<span class="line"><span>  sudo chown $(id -u):$(id -g) $HOME/.kube/config</span></span>
<span class="line"><span></span></span>
<span class="line"><span>Alternatively, if you are the root user, you can run:</span></span>
<span class="line"><span></span></span>
<span class="line"><span>  export KUBECONFIG=/etc/kubernetes/admin.conf</span></span>
<span class="line"><span></span></span>
<span class="line"><span>You should now deploy a pod network to the cluster.</span></span>
<span class="line"><span>Run &quot;kubectl apply -f [podnetwork].yaml&quot; with one of the options listed at:</span></span>
<span class="line"><span>  https://kubernetes.io/docs/concepts/cluster-administration/addons/</span></span>
<span class="line"><span></span></span>
<span class="line"><span>Then you can join any number of worker nodes by running the following on each as root:</span></span>
<span class="line"><span></span></span>
<span class="line"><span>kubeadm join 192.168.179.4:6443 --token tpynmm.7picylv5i83q9ghw \\</span></span>
<span class="line"><span>	--discovery-token-ca-cert-hash sha256:2924026774d657b8860fbac4ef7698e90a3811137673af45e533c91e567a1529</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-9-14-集群应用客户端管理集群文件准备" tabindex="-1"><a class="header-anchor" href="#_1-9-14-集群应用客户端管理集群文件准备"><span>1.9.14 <strong>集群应用客户端管理集群文件准备</strong></span></a></h3><p>参照初始化的内容来执行如下命令：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# mkdir -p $HOME/.kube</span></span>
<span class="line"><span>[root@node1 ~]# cp -i /etc/kubernetes/admin.conf $HOME/.kube/config</span></span>
<span class="line"><span>[root@node1 ~]# chown $(id -u):$(id -g) $HOME/.kube/config</span></span>
<span class="line"><span>[root@node1 ~]# export KUBECONFIG=/etc/kubernetes/admin.conf</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-9-15-集群网络准备" tabindex="-1"><a class="header-anchor" href="#_1-9-15-集群网络准备"><span>1.9.15 <strong>集群网络准备</strong></span></a></h3><h4 id="_1-9-15-1-calico安装" tabindex="-1"><a class="header-anchor" href="#_1-9-15-1-calico安装"><span>1.9.15.1 <strong>calico安装</strong></span></a></h4><p>K8s使用calico部署集群网络,安装参考网址：<a href="https://projectcalico.docs.tigera.io/about/about-calico%E3%80%82" target="_blank" rel="noopener noreferrer">https://projectcalico.docs.tigera.io/about/about-calico。</a></p><p>只需要在Master节点安装即可。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#下载operator资源清单文件</span></span>
<span class="line"><span>wget https://docs.projectcalico.org/manifests/tigera-operator.yaml --no-check-certificate</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#应用资源清单文件，创建operator</span></span>
<span class="line"><span>kubectl create -f tigera-operator.yaml</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#通过自定义资源方式安装</span></span>
<span class="line"><span>wget https://docs.projectcalico.org/manifests/custom-resources.yaml --no-check-certificate</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#修改文件第13行，修改为使用kubeadm init ----pod-network-cidr对应的IP地址段</span></span>
<span class="line"><span># vim custom-resources.yaml 【修改和增加以下加粗内容】</span></span>
<span class="line"><span>apiVersion: operator.tigera.io/v1</span></span>
<span class="line"><span>kind: Installation</span></span>
<span class="line"><span>metadata:</span></span>
<span class="line"><span>  name: default</span></span>
<span class="line"><span>spec:</span></span>
<span class="line"><span>  # Configures Calico networking.</span></span>
<span class="line"><span>  calicoNetwork:</span></span>
<span class="line"><span>    # Note: The ipPools section cannot be modified post-install.</span></span>
<span class="line"><span>    ipPools:</span></span>
<span class="line"><span>    - blockSize: 26</span></span>
<span class="line"><span>      cidr: 10.244.0.0/16</span></span>
<span class="line"><span>      encapsulation: VXLANCrossSubnet</span></span>
<span class="line"><span>      natOutgoing: Enabled</span></span>
<span class="line"><span>      nodeSelector: all()</span></span>
<span class="line"><span>    nodeAddressAutodetectionV4:</span></span>
<span class="line"><span>      interface: ens.*</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#应用清单文件</span></span>
<span class="line"><span>kubectl create -f custom-resources.yaml</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#监视calico-sysem命名空间中pod运行情况</span></span>
<span class="line"><span>watch kubectl get pods -n calico-system</span></span>
<span class="line"><span>[root@node1 ~]# watch kubectl get pods -n calico-system</span></span>
<span class="line"><span></span></span>
<span class="line"><span>Every 2.0s: kubectl get pods -n calico-system                                                                            Thu Nov  3 14:14:30 2022</span></span>
<span class="line"><span></span></span>
<span class="line"><span>NAME                                       READY   STATUS    RESTARTS   AGE</span></span>
<span class="line"><span>calico-kube-controllers-65648cd788-flmk4   1/1     Running   0          2m21s</span></span>
<span class="line"><span>calico-node-chnd5                          1/1     Running   0          2m21s</span></span>
<span class="line"><span>calico-node-kc5bx                          1/1     Running   0          2m21s</span></span>
<span class="line"><span>calico-node-s2cp5                          1/1     Running   0          2m21s</span></span>
<span class="line"><span>calico-typha-d76595dfb-5z6mg               1/1     Running   0          2m21s</span></span>
<span class="line"><span>calico-typha-d76595dfb-hgg27               1/1     Running   0          2m19s</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#删除 master 上的 taint</span></span>
<span class="line"><span>[root@node1 ~]# kubectl taint nodes --all node-role.kubernetes.io/master-</span></span>
<span class="line"><span>taint &quot;node-role.kubernetes.io/master&quot; not found</span></span>
<span class="line"><span>taint &quot;node-role.kubernetes.io/master&quot; not found</span></span>
<span class="line"><span>taint &quot;node-role.kubernetes.io/master&quot; not found</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#已经全部运行</span></span>
<span class="line"><span>[root@node1 ~]# kubectl get pods -n calico-system</span></span>
<span class="line"><span>NAME                                       READY   STATUS    RESTARTS   AGE</span></span>
<span class="line"><span>calico-kube-controllers-65648cd788-ktjrh   1/1     Running   0          110m</span></span>
<span class="line"><span>calico-node-dvprv                          1/1     Running   0          110m</span></span>
<span class="line"><span>calico-node-nhzch                          1/1     Running   0          110m</span></span>
<span class="line"><span>calico-node-q44gh                          1/1     Running   0          110m</span></span>
<span class="line"><span>calico-typha-6bc9d76554-4bv77              1/1     Running   0          110m</span></span>
<span class="line"><span>calico-typha-6bc9d76554-nkzxq              1/1     Running   0          110m</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#查看kube-system命名空间中coredns状态，处于Running状态表明联网成功。</span></span>
<span class="line"><span>[root@node1 ~]# kubectl get pods -n kube-system</span></span>
<span class="line"><span>NAME                            READY   STATUS    RESTARTS   AGE</span></span>
<span class="line"><span>coredns-565d847f94-bjtlh        1/1     Running   0          19h</span></span>
<span class="line"><span>coredns-565d847f94-wlxmf        1/1     Running   0          19h</span></span>
<span class="line"><span>etcd-node1                      1/1     Running   0          19h</span></span>
<span class="line"><span>kube-apiserver-node1            1/1     Running   0          19h</span></span>
<span class="line"><span>kube-controller-manager-node1   1/1     Running   0          19h</span></span>
<span class="line"><span>kube-proxy-bgpz2                1/1     Running   0          19h</span></span>
<span class="line"><span>kube-proxy-jlltp                1/1     Running   0          19h</span></span>
<span class="line"><span>kube-proxy-stfrx                1/1     Running   0          19h</span></span>
<span class="line"><span>kube-scheduler-node1            1/1     Running   0          19h</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h4 id="_1-9-15-2-calico客户端安装" tabindex="-1"><a class="header-anchor" href="#_1-9-15-2-calico客户端安装"><span>1.9.15.2 <strong>calico客户端安装</strong></span></a></h4><p>主要用来验证k8s集群节点网络是否正常。这里只需要在Master节点安装就可以。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#下载二进制文件，注意，这里需要检查calico 服务端的版本，客户端要与服务端版本保持一致，这里没有命令验证calico的版本，所以安装客户端的时候安装最新版本即可。</span></span>
<span class="line"><span>curl -L https://github.com/projectcalico/calico/releases/download/v3.24.5/calicoctl-linux-amd64 -o calicoctl</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#安装calicoctl</span></span>
<span class="line"><span>mv calicoctl /usr/bin/</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#为calicoctl添加可执行权限</span></span>
<span class="line"><span>chmod +x /usr/bin/calicoctl</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#查看添加权限后文件</span></span>
<span class="line"><span>ls /usr/bin/calicoctl</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#查看calicoctl版本</span></span>
<span class="line"><span>[root@node1 ~]# calicoctl  version</span></span>
<span class="line"><span>Client Version:    v3.24.5</span></span>
<span class="line"><span>Git commit:        83493da01</span></span>
<span class="line"><span>Cluster Version:   v3.24.5</span></span>
<span class="line"><span>Cluster Type:      typha,kdd,k8s,operator,bgp,kubeadm</span></span>
<span class="line"><span></span></span>
<span class="line"><span>通过~/.kube/config连接kubernetes集群，查看已运行节点</span></span>
<span class="line"><span>[root@node1 ~]#  DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl get nodes</span></span>
<span class="line"><span>NAME  </span></span>
<span class="line"><span>node1</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-9-16-集群工作节点添加" tabindex="-1"><a class="header-anchor" href="#_1-9-16-集群工作节点添加"><span>1.9.16 <strong>集群工作节点添加</strong></span></a></h3><p>这里在node2,node3 worker节点上执行命令，将worker节点加入到k8s集群。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node2 ~]# kubeadm join 192.168.179.4:6443 --token tpynmm.7picylv5i83q9ghw \\</span></span>
<span class="line"><span>	--discovery-token-ca-cert-hash sha256:2924026774d657b8860fbac4ef7698e90a3811137673af45e533c91e567a1529 --cri-socket unix:///var/run/cri-dockerd.sock</span></span>
<span class="line"><span>[root@node3 ~]# kubeadm join 192.168.179.4:6443 --token tpynmm.7picylv5i83q9ghw \\</span></span>
<span class="line"><span>	--discovery-token-ca-cert-hash sha256:2924026774d657b8860fbac4ef7698e90a3811137673af45e533c91e567a1529 --cri-socket unix:///var/run/cri-dockerd.sock</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>在master节点上操作，查看网络节点是否添加</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl get nodes</span></span>
<span class="line"><span>NAME  </span></span>
<span class="line"><span>node1   </span></span>
<span class="line"><span>node2   </span></span>
<span class="line"><span>node3</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-9-17-验证集群可用性" tabindex="-1"><a class="header-anchor" href="#_1-9-17-验证集群可用性"><span>1.9.17 <strong>验证集群可用性</strong></span></a></h3><p>使用命令查看所有的节点：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# kubectl get nodes</span></span>
<span class="line"><span>NAME    STATUS   ROLES           AGE   VERSION</span></span>
<span class="line"><span>node1   Ready    control-plane   20h   v1.25.3</span></span>
<span class="line"><span>node2   Ready    &lt;none&gt;          20h   v1.25.3</span></span>
<span class="line"><span>node3   Ready    &lt;none&gt;          20h   v1.25.3</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>查看集群健康情况：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# kubectl get cs</span></span>
<span class="line"><span>Warning: v1 ComponentStatus is deprecated in v1.19+</span></span>
<span class="line"><span>NAME                 STATUS    MESSAGE                         ERROR</span></span>
<span class="line"><span>etcd-0               Healthy   {&quot;health&quot;:&quot;true&quot;,&quot;reason&quot;:&quot;&quot;}   </span></span>
<span class="line"><span>scheduler            Healthy   ok  </span></span>
<span class="line"><span>controller-manager   Healthy   ok</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>查看kubernetes集群pod运行情况:</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# kubectl get pods -n kube-system</span></span>
<span class="line"><span>NAME                            READY   STATUS    RESTARTS   AGE</span></span>
<span class="line"><span>coredns-565d847f94-bjtlh        1/1     Running   0          20h</span></span>
<span class="line"><span>coredns-565d847f94-wlxmf        1/1     Running   0          20h</span></span>
<span class="line"><span>etcd-node1                      1/1     Running   0          20h</span></span>
<span class="line"><span>kube-apiserver-node1            1/1     Running   0          20h</span></span>
<span class="line"><span>kube-controller-manager-node1   1/1     Running   0          20h</span></span>
<span class="line"><span>kube-proxy-bgpz2                1/1     Running   1          20h</span></span>
<span class="line"><span>kube-proxy-jlltp                1/1     Running   1          20h</span></span>
<span class="line"><span>kube-proxy-stfrx                1/1     Running   0          20h</span></span>
<span class="line"><span>kube-scheduler-node1            1/1     Running   0          20h</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>查看集群信息:</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>[root@node1 ~]# kubectl cluster-info</span></span>
<span class="line"><span>Kubernetes control plane is running at https://192.168.179.4:6443</span></span>
<span class="line"><span>CoreDNS is running at https://192.168.179.4:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy</span></span>
<span class="line"><span></span></span>
<span class="line"><span>To further debug and diagnose cluster problems, use &#39;kubectl cluster-info dump&#39;.</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h3 id="_1-9-18-k8s集群其他一些配置" tabindex="-1"><a class="header-anchor" href="#_1-9-18-k8s集群其他一些配置"><span>1.9.18 <strong>K8s集群其他一些配置</strong></span></a></h3><p>当在Worker节点上执行kubectl命令管理时会报如下错误：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>The connection to the server localhost:8080 was refused - did you specify the right host or port?</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>只要把master上的管理文件/etc/kubernetes/admin.conf拷贝到Worker节点的$HOME/.kube/config就可以让Worker节点也可以实现kubectl命令管理。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#在Worker节点创建.kube目录</span></span>
<span class="line"><span>[root@node2 ~]# mkdir /root/.kube</span></span>
<span class="line"><span>[root@node3 ~]# mkdir /root/.kube</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#在master节点做如下操作</span></span>
<span class="line"><span>[root@node1 ~]# scp /etc/kubernetes/admin.conf node2:/root/.kube/config</span></span>
<span class="line"><span>[root@node1 ~]# scp /etc/kubernetes/admin.conf node3:/root/.kube/config</span></span>
<span class="line"><span></span></span>
<span class="line"><span>#在worker 节点验证</span></span>
<span class="line"><span> [root@node2 ~]# kubectl get nodes</span></span>
<span class="line"><span>NAME    STATUS   ROLES           AGE   VERSION</span></span>
<span class="line"><span>node1   Ready    control-plane   24h   v1.25.3</span></span>
<span class="line"><span>node2   Ready    &lt;none&gt;          24h   v1.25.3</span></span>
<span class="line"><span>node3   Ready    &lt;none&gt;          24h   v1.25.3</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[root@node3 ~]# kubectl get nodes</span></span>
<span class="line"><span>NAME    STATUS   ROLES           AGE   VERSION</span></span>
<span class="line"><span>node1   Ready    control-plane   24h   v1.25.3</span></span>
<span class="line"><span>node2   Ready    &lt;none&gt;          24h   v1.25.3</span></span>
<span class="line"><span>node3   Ready    &lt;none&gt;          24h   v1.25.3</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>此外，无论在Master节点还是Worker节点使用kubenetes 命令时，默认不能自动补全，例如：kubectl describe 命令中describe不能自动补全，使用非常不方便，那么这里配置命令自动补全功能。</p><p>在所有的kubernetes节点上安装bash-completion并source执行，同时配置下开机自动source，每次开机能自动补全命令。</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>#安装bash-completion 并 source</span></span>
<span class="line"><span>yum install -y bash-completion</span></span>
<span class="line"><span>source /usr/share/bash-completion/bash_completion</span></span>
<span class="line"><span>kubectl completion bash &gt; ~/.kube/completion.bash.inc</span></span>
<span class="line"><span>source &#39;/root/.kube/completion.bash.inc&#39; </span></span>
<span class="line"><span></span></span>
<span class="line"><span>#实现用户登录主机自动source ,自动使用命令补全</span></span>
<span class="line"><span>vim ~/.bash_profile 【加入加粗这一句】</span></span>
<span class="line"><span># .bash_profile</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Get the aliases and functions</span></span>
<span class="line"><span>if [ -f ~/.bashrc ]; then</span></span>
<span class="line"><span>        . ~/.bashrc</span></span>
<span class="line"><span>fi</span></span>
<span class="line"><span></span></span>
<span class="line"><span># User specific environment and startup programs</span></span>
<span class="line"><span>source &#39;/root/.kube/completion.bash.inc&#39;</span></span>
<span class="line"><span>PATH=$PATH:$HOME/bin</span></span>
<span class="line"><span></span></span>
<span class="line"><span>export PATH</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>默认K8S我们只要设置了systemctl enable kubelet 后，会在开机自动启动K8S集群，如果想要停止kubernetes集群，我们可以通过systemctl stop kubelet 命令停止集群，但是必须先将节点上的docker停止，命令如下：</p><h3 id="_1-9-19-k8s集群启停" tabindex="-1"><a class="header-anchor" href="#_1-9-19-k8s集群启停"><span>1.9.19 <strong>K8s集群启停</strong></span></a></h3><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>systemctl stop docker</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>然后再停止k8s集群：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span>systemctl stop kubelet</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>启动Kubernetes集群步骤如下：</p><div class="language- line-numbers-mode" data-highlighter="shiki" data-ext="" style="--shiki-light:#383A42;--shiki-dark:#abb2bf;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282c34;"><pre class="shiki shiki-themes one-light one-dark-pro vp-code"><code class="language-"><span class="line"><span># 先启动docker</span></span>
<span class="line"><span>systemctl start docker</span></span>
<span class="line"><span></span></span>
<span class="line"><span># 再启动kubelet</span></span>
<span class="line"><span>systemctl start kubelet</span></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,726)]])}var s=r(a,[[`render`,o]]);export{i as _pageData,s as default};