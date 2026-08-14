#Requires -Version 5.1
$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$CourseRoot = "E:\云原生\容器云-云原生架构师xin版资料"
$BlogRoot   = "E:\MyGithub\langkemaoxin.github.io"
$SrcRoot    = Join-Path $BlogRoot "src\云原生"
$PublicRoot = Join-Path $BlogRoot "src\.vuepress\public\云原生"
$ManifestPath = Join-Path $BlogRoot "scripts\import-manifest.json"
$LogPath = Join-Path $BlogRoot "scripts\import-cloud-native.log"

function Get-SafeSlug([string]$Text, [int]$Max = 60) {
  $s = $Text.ToLowerInvariant()
  $s = $s -replace '\.md$',''
  $s = [regex]::Replace($s, '[^\p{L}\p{Nd}]+', '-')
  $s = $s.Trim('-')
  if ([string]::IsNullOrWhiteSpace($s)) { $s = "note" }
  if ($s.Length -gt $Max) { $s = $s.Substring(0, $Max).TrimEnd('-') }
  return $s
}

function Get-SeriesFromPath([string]$Rel) {
  if ($Rel -match '23-|Serverless|OpenFaaS') { return @{ Series='serverless'; Group='Serverless'; Prefix='serverless' } }
  if ($Rel -match 'Containerd') { return @{ Series='containerd'; Group='Containerd'; Prefix='containerd' } }
  if ($Rel -match '6-容器管理工具 Docker') { return @{ Series='docker-extra'; Group='Docker 进阶'; Prefix='docker-extra' } }
  if ($Rel -match 'Prometheus应用实战') { return @{ Series='prometheus'; Group='Prometheus'; Prefix='prometheus' } }
  if ($Rel -match '云原生监控系统|Skywalking|OpenTelemetry|Pixie|KubeCost|应用性能监控') {
    return @{ Series='observability'; Group='可观测性'; Prefix='observability' }
  }
  if ($Rel -match '21-DevOps|GitOps|ArgoCD|CICD') { return @{ Series='devops'; Group='DevOps / GitOps'; Prefix='devops' } }
  if ($Rel -match '19-kubernetes网络|HybridNet|antrea|flannel|calico|网络解决方案') {
    return @{ Series='network'; Group='K8s 网络'; Prefix='network' }
  }
  if ($Rel -match '13-Kubernetes存储|Longhorn|GlusterFS') {
    return @{ Series='storage'; Group='K8s 存储'; Prefix='storage' }
  }
  if ($Rel -match '20-基于Kubernetes PaaS|kubesphere|rancher') {
    return @{ Series='paas'; Group='PaaS 平台'; Prefix='paas' }
  }
  if ($Rel -match '微服务项目部署') { return @{ Series='microservices'; Group='微服务实战'; Prefix='microservices' } }
  if ($Rel -match 'k8s多集群|karmada|ClusterMesh|terraform') {
    return @{ Series='multicluster'; Group='多集群'; Prefix='multicluster' }
  }
  if ($Rel -match 'Velero|备份') { return @{ Series='backup'; Group='备份恢复'; Prefix='backup' } }
  if ($Rel -match '主流共有云|ACK|阿里云') { return @{ Series='public-cloud'; Group='公有云'; Prefix='public-cloud' } }
  if ($Rel -match '边缘|kubeedge') { return @{ Series='edge'; Group='边缘计算'; Prefix='edge' } }
  if ($Rel -match '构建大数据|KubeFlow|HDFS|Spark|Flink') {
    return @{ Series='bigdata'; Group='大数据与 ML'; Prefix='bigdata' }
  }
  if ($Rel -match 'KubeBlocks|数据服务') { return @{ Series='data-service'; Group='数据服务'; Prefix='data-service' } }
  if ($Rel -match 'KubeVirt|管理虚拟机') { return @{ Series='kubevirt'; Group='KubeVirt'; Prefix='kubevirt' } }
  if ($Rel -match '二次开发|operator') { return @{ Series='operator'; Group='Operator 开发'; Prefix='operator' } }
  if ($Rel -match '面试') { return @{ Series='interview'; Group='面试'; Prefix='interview' } }
  if ($Rel -match '4-云原生生态|5-虚拟化') { return @{ Series='foundation'; Group='云原生基础'; Prefix='foundation' } }
  if ($Rel -match 'VIP直播') { return @{ Series='vip'; Group='VIP 专题'; Prefix='vip' } }
  if ($Rel -match '8-Kubernetes|9-Kubernetes|10-Kubernetes|11-Kubernetes|12-安全|14-Kubernetes|15-Kubernetes|16-Kubernetes|18-Kubernetes') {
    return @{ Series='k8s-course'; Group='K8s 课程笔记'; Prefix='k8s-course' }
  }
  return @{ Series='misc'; Group='云原生杂项'; Prefix='misc' }
}

function Optimize-Body([string]$Body) {
  $Body = [regex]::Replace($Body, "(\r?\n){3,}", "`n`n")
  $Body = $Body.Replace('Sererless','Serverless')
  $Body = $Body.Replace('暂无图片','(示意图)')
  return $Body.Trim()
}

$sources = New-Object System.Collections.Generic.List[object]

function Add-Source {
  param(
    [Parameter(Mandatory=$true)][string]$FullPath,
    [string]$Forced = ''
  )
  if ([string]::IsNullOrWhiteSpace($FullPath)) { return }
  if (-not (Test-Path -LiteralPath $FullPath)) { return }
  $rel = $FullPath.Substring($CourseRoot.Length).TrimStart('\')
  if ($rel -match '\\pkg\\mod\\|\\vendor\\|node_modules') { return }
  $name = [IO.Path]::GetFileName($FullPath)
  if ($name -ieq 'README.md' -and $rel -notmatch 'OpenFaaS') { return }

  if ($Forced -eq 'prometheus') {
    $meta = @{ Series='prometheus'; Group='Prometheus'; Prefix='prometheus' }
  } else {
    $meta = Get-SeriesFromPath $rel
  }

  $base = [IO.Path]::GetFileNameWithoutExtension($FullPath)
  $dir = [IO.Path]::GetDirectoryName($FullPath)
  $assets = $null
  $a1 = Join-Path $dir ($base + '.assets')
  if (Test-Path -LiteralPath $a1) { $assets = $a1 }
  else {
    $found = Get-ChildItem -LiteralPath $dir -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like '*.assets' } | Select-Object -First 1
    if ($found) { $assets = $found.FullName }
  }

  $sources.Add([PSCustomObject]@{
    FullPath=$FullPath; Rel=$rel; Series=$meta.Series; Group=$meta.Group; Prefix=$meta.Prefix; Title=$base; Assets=$assets
  }) | Out-Null
}

$allMd = Get-ChildItem -LiteralPath $CourseRoot -Recurse -Filter *.md -File
foreach ($f in $allMd) {
  $p = $f.FullName
  if ($p -match '\\pkg\\mod\\|\\vendor\\|node_modules') { continue }
  $ok = $false
  if ($p -match '\\01[_-]笔记\\|\\02-笔记-markdown') { $ok = $true }
  elseif ($p -match '笔记' -and $p -notmatch '如何打开') { $ok = $true }
  elseif ($p -match 'OpenFaaS') { $ok = $true }
  elseif ($p -match '基于Kubernetes构建大数据\\笔记') { $ok = $true }
  elseif ($p -match '容器云云原生架构师面试') { $ok = $true }
  if ($ok) { Add-Source -FullPath $p }
}

$promDoc = Join-Path $CourseRoot "Prometheus应用实战\prometheus_文档\prometheus_文档"
if (Test-Path -LiteralPath $promDoc) {
  foreach ($f in (Get-ChildItem -LiteralPath $promDoc -Filter *.md -File)) {
    Add-Source -FullPath $f.FullPath -Forced 'prometheus'
  }
}

$obs = Join-Path $CourseRoot "云原生监控系统"
if (Test-Path -LiteralPath $obs) {
  foreach ($f in (Get-ChildItem -LiteralPath $obs -Recurse -Filter *.md -File)) {
    if ($f.Name -ne 'README.md') { Add-Source -FullPath $f.FullPath }
  }
}

Write-Host "原始收集: $($sources.Count)"
$deduped = @($sources | Sort-Object { $_.Title }, { (Get-Item -LiteralPath $_.FullPath).Length }, { $_.Rel.Length } |
  Group-Object { "$($_.Title)|$((Get-Item -LiteralPath $_.FullPath).Length)" } |
  ForEach-Object { $_.Group | Select-Object -First 1 })

"=== import start $($deduped.Count) ===" | Set-Content -LiteralPath $LogPath -Encoding UTF8
Write-Host "待导入: $($deduped.Count)"

$bySeries = $deduped | Group-Object Series
$manifest = New-Object System.Collections.Generic.List[object]
$imported = 0
$failed = 0
$utf8 = New-Object System.Text.UTF8Encoding $false

foreach ($g in ($bySeries | Sort-Object Name)) {
  $prefix = $g.Group[0].Prefix
  $groupName = $g.Group[0].Group
  $seriesDir = Join-Path $SrcRoot $prefix
  $publicSeriesDir = Join-Path $PublicRoot $prefix
  New-Item -ItemType Directory -Path $seriesDir -Force | Out-Null
  New-Item -ItemType Directory -Path $publicSeriesDir -Force | Out-Null

  $order = 0
  foreach ($item in ($g.Group | Sort-Object Rel)) {
    $order++
    $maxSlug = 50
    if ($prefix -eq 'prometheus') { $maxSlug = 80 }
    $slug = Get-SafeSlug $item.Title $maxSlug
    $stem = "{0}-{1:D2}-{2}" -f $prefix, $order, $slug
    if ($stem.Length -gt 100) { $stem = "{0}-{1:D2}-{2}" -f $prefix, $order, (Get-SafeSlug $item.Title 30) }
    $fileName = $stem + ".md"
    $destMd = Join-Path $seriesDir $fileName
    $webBase = "/云原生/$prefix/$stem"
    $publicArticleDir = Join-Path $publicSeriesDir $stem

    try {
      $bytes = [IO.File]::ReadAllBytes($item.FullPath)
      $raw = [Text.Encoding]::UTF8.GetString($bytes)
      if ($raw.Contains([char]0xFFFD)) {
        $raw = [Text.Encoding]::GetEncoding(936).GetString($bytes)
      }
      if ($raw.Length -gt 0 -and [int][char]$raw[0] -eq 0xFEFF) { $raw = $raw.Substring(1) }
      if ($raw -match '(?s)^---\r?\n.*?\r?\n---\r?\n') {
        $raw = [regex]::Replace($raw, '(?s)^---\r?\n.*?\r?\n---\r?\n', '')
      }
      $body = Optimize-Body $raw

      if ($item.Assets) {
        $assetsName = Split-Path $item.Assets -Leaf
        New-Item -ItemType Directory -Path $publicArticleDir -Force | Out-Null
        Copy-Item -LiteralPath (Join-Path $item.Assets '*') -Destination $publicArticleDir -Recurse -Force -ErrorAction SilentlyContinue
        $body = $body.Replace($assetsName + '/', $webBase + '/')
        $body = $body.Replace('./' + $assetsName + '/', $webBase + '/')
      }

      $title = $item.Title
      $shortTitle = ("{0:D2} " -f $order) + $(if ($title.Length -gt 22) { $title.Substring(0,22) + '...' } else { $title })
      $plain = [regex]::Replace($body, '!\[.*?\]\(.*?\)', '')
      $plain = [regex]::Replace($plain, '[#>*`\r\n]+', ' ')
      $plain = [regex]::Replace($plain, '\s+', ' ').Trim()
      $desc = if ($plain.Length -gt 100) { $plain.Substring(0,100) + '...' } else { $plain }
      if ([string]::IsNullOrWhiteSpace($desc)) { $desc = "$groupName - $title" }
      $desc = $desc.Replace('"','')
      $titleEsc = $title.Replace('"','')
      $date = Get-Date -Format 'yyyy-MM-dd'

      $sb = New-Object System.Text.StringBuilder
      [void]$sb.AppendLine('---')
      [void]$sb.AppendLine("title: `"$titleEsc`"")
      [void]$sb.AppendLine("sidebarGroup: `"$groupName`"")
      [void]$sb.AppendLine("shortTitle: `"$shortTitle`"")
      [void]$sb.AppendLine("order: $order")
      [void]$sb.AppendLine("date: $date")
      [void]$sb.AppendLine('category: "云原生"')
      [void]$sb.AppendLine('tag:')
      [void]$sb.AppendLine("  - `"$groupName`"")
      [void]$sb.AppendLine('  - "云原生"')
      [void]$sb.AppendLine('  - "课程笔记"')
      [void]$sb.AppendLine("description: `"$desc`"")
      [void]$sb.AppendLine('---')
      [void]$sb.AppendLine('')
      [void]$sb.AppendLine("> **$groupName · 第 $order 篇**")
      [void]$sb.AppendLine('>')
      [void]$sb.AppendLine('> 来源课程笔记整理优化；插图已迁入博客静态目录。')
      [void]$sb.AppendLine('')
      [void]$sb.AppendLine('---')
      [void]$sb.AppendLine('')
      [void]$sb.AppendLine($body)
      [void]$sb.AppendLine('')

      [IO.File]::WriteAllText($destMd, $sb.ToString(), $utf8)
      $manifest.Add([PSCustomObject]@{ series=$g.Name; prefix=$prefix; order=$order; file="云原生/$prefix/$fileName"; source=$item.Rel; hasImages=[bool]$item.Assets }) | Out-Null
      $imported++
      if (($imported % 20) -eq 0) { Write-Host "  progress $imported ..." }
      "OK $prefix/$fileName" | Add-Content -LiteralPath $LogPath -Encoding UTF8
    } catch {
      $failed++
      "FAIL $($item.Rel) | $($_.Exception.Message)" | Add-Content -LiteralPath $LogPath -Encoding UTF8
      Write-Host "FAIL $($item.Rel) :: $($_.Exception.Message)" -ForegroundColor Red
    }
  }

  $rb = New-Object System.Text.StringBuilder
  [void]$rb.AppendLine('---')
  [void]$rb.AppendLine("title: $groupName")
  [void]$rb.AppendLine('index: false')
  [void]$rb.AppendLine('icon: note')
  [void]$rb.AppendLine('article: false')
  [void]$rb.AppendLine('---')
  [void]$rb.AppendLine('')
  [void]$rb.AppendLine("# $groupName")
  [void]$rb.AppendLine('')
  [void]$rb.AppendLine('本系列由《容器云-云原生架构师》课程笔记整理导入，并做了结构与笔误优化；插图尽量保留。')
  [void]$rb.AppendLine('')
  [void]$rb.AppendLine('## 文章目录')
  [void]$rb.AppendLine('')
  [void]$rb.AppendLine('<Catalog />')
  [void]$rb.AppendLine('')
  [IO.File]::WriteAllText((Join-Path $seriesDir 'README.md'), $rb.ToString(), $utf8)
}

($manifest | ConvertTo-Json -Depth 5) | Set-Content -LiteralPath $ManifestPath -Encoding UTF8
Write-Host "完成 ok=$imported fail=$failed series=$($bySeries.Count)"
$bySeries | Sort-Object Name | ForEach-Object { Write-Host ("{0,4} {1}" -f $_.Count, $_.Name) }