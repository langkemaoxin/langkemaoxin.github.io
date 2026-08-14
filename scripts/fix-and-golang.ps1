#Requires -Version 5.1
$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Src = "E:\MyGithub\langkemaoxin.github.io\src\云原生"
$Pub = "E:\MyGithub\langkemaoxin.github.io\src\.vuepress\public\云原生"
$utf8 = New-Object System.Text.UTF8Encoding $false

# 1) move docker note from serverless
$srcMd = Get-ChildItem (Join-Path $Src "serverless") -Filter "*容器运行时*" -File -ErrorAction SilentlyContinue | Select-Object -First 1
if ($srcMd) {
  $dest = Join-Path $Src "docker-extra\docker-extra-02-container-runtime-docker.md"
  $c = [IO.File]::ReadAllText($srcMd.FullName, $utf8)
  $c = $c.Replace('sidebarGroup: "Serverless"', 'sidebarGroup: "Docker 进阶"')
  $c = [regex]::Replace($c, 'shortTitle: "\d+ ', 'shortTitle: "02 ')
  $c = [regex]::Replace($c, 'order: \d+', 'order: 2')
  $c = [regex]::Replace($c, '\*\*Serverless · 第 \d+ 篇\*\*', '**Docker 进阶 · 第 2 篇**')
  $oldStem = [IO.Path]::GetFileNameWithoutExtension($srcMd.Name)
  $newStem = "docker-extra-02-container-runtime-docker"
  $c = $c.Replace("/云原生/serverless/$oldStem/", "/云原生/docker-extra/$newStem/")
  [IO.File]::WriteAllText($dest, $c, $utf8)
  $imgSrc = Join-Path $Pub ("serverless\" + $oldStem)
  $imgDst = Join-Path $Pub ("docker-extra\" + $newStem)
  if (Test-Path -LiteralPath $imgSrc) {
    if (Test-Path -LiteralPath $imgDst) { Remove-Item -LiteralPath $imgDst -Recurse -Force }
    New-Item -ItemType Directory -Path (Split-Path $imgDst -Parent) -Force | Out-Null
    Move-Item -LiteralPath $imgSrc -Destination $imgDst -Force
  }
  Remove-Item -LiteralPath $srcMd.FullName -Force
  Write-Host "Moved docker runtime note"
}

# remove coming soon if still there
Remove-Item -LiteralPath (Join-Path $Src "serverless\serverless-00-coming-soon.md") -Force -ErrorAction SilentlyContinue

# 2) move containerd-02..06 to k8s-course
$k8sCourse = Join-Path $Src "k8s-course"
$existing = @(Get-ChildItem $k8sCourse -Filter *.md | Where-Object { $_.Name -ne "README.md" }).Count
Get-ChildItem (Join-Path $Src "containerd") -Filter "containerd-*.md" | Where-Object { $_.Name -notmatch 'containerd-01-' -and $_.Name -ne "README.md" } | Sort-Object Name | ForEach-Object {
  $existing++
  $suffix = $_.Name -replace '^containerd-\d+-',''
  $newName = ("k8s-course-{0:D2}-{1}" -f $existing, $suffix)
  $dest = Join-Path $k8sCourse $newName
  $c = [IO.File]::ReadAllText($_.FullName, $utf8)
  $c = $c.Replace('sidebarGroup: "Containerd"', 'sidebarGroup: "K8s 课程笔记"')
  $c = [regex]::Replace($c, 'order: \d+', "order: $existing")
  $c = [regex]::Replace($c, '\*\*Containerd · 第 \d+ 篇\*\*', "**K8s 课程笔记 · 第 $existing 篇**")
  $oldStem = [IO.Path]::GetFileNameWithoutExtension($_.Name)
  $newStem = [IO.Path]::GetFileNameWithoutExtension($newName)
  $c = $c.Replace("/云原生/containerd/$oldStem/", "/云原生/k8s-course/$newStem/")
  [IO.File]::WriteAllText($dest, $c, $utf8)
  $imgSrc = Join-Path $Pub ("containerd\" + $oldStem)
  $imgDst = Join-Path $Pub ("k8s-course\" + $newStem)
  if (Test-Path -LiteralPath $imgSrc) {
    if (Test-Path -LiteralPath $imgDst) { Remove-Item -LiteralPath $imgDst -Recurse -Force }
    New-Item -ItemType Directory -Path (Split-Path $imgDst -Parent) -Force | Out-Null
    Move-Item -LiteralPath $imgSrc -Destination $imgDst -Force
  }
  Remove-Item -LiteralPath $_.FullName -Force
  Write-Host "Moved $($_.Name)"
}

# 3) fix Sererless
Get-ChildItem (Join-Path $Src "serverless") -Filter "*.md" | ForEach-Object {
  $c = [IO.File]::ReadAllText($_.FullName, $utf8)
  if ($c.Contains("Sererless")) {
    [IO.File]::WriteAllText($_.FullName, $c.Replace("Sererless","Serverless"), $utf8)
    Write-Host "Fixed typo in $($_.Name)"
  }
}

# 4) Golang series
$goSrc = "E:\云原生\容器云-云原生架构师xin版资料\24-Golang 开发入门精讲"
$goBlog = Join-Path $Src "golang"
New-Item -ItemType Directory -Path $goBlog -Force | Out-Null

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("---")
[void]$sb.AppendLine('title: "Golang 专栏说明——课程资料形态与阅读路径"')
[void]$sb.AppendLine('sidebarGroup: "Golang"')
[void]$sb.AppendLine('shortTitle: "01 专栏说明"')
[void]$sb.AppendLine("order: 1")
[void]$sb.AppendLine("date: 2026-08-13")
[void]$sb.AppendLine('category: "云原生"')
[void]$sb.AppendLine("tag:")
[void]$sb.AppendLine('  - "Golang"')
[void]$sb.AppendLine('  - "云原生"')
[void]$sb.AppendLine('  - "课程笔记"')
[void]$sb.AppendLine('description: "说明 Golang 课程资料形态（代码、nyf 笔记）与本专栏阅读路径。"')
[void]$sb.AppendLine("---")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("> **Golang · 第 1 篇**")
[void]$sb.AppendLine(">")
[void]$sb.AppendLine("> 课程原件以代码工程与 myBase(nyf) 笔记为主；本专栏整理可博客化内容。")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("---")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("## 一、本地课程资料形态")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("| 形态 | 说明 |")
[void]$sb.AppendLine("|------|------|")
[void]$sb.AppendLine("| 代码工程 | goproject、myfirstginproject（part01～part16） |")
[void]$sb.AppendLine("| nyf 笔记 | 需 myBase 阅读器打开 |")
[void]$sb.AppendLine("| 工具包 | Goland、MySQL、Navicat、CHM 手册 |")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("## 二、建议顺序")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("1. Go 语法基础")
[void]$sb.AppendLine("2. 跟随 myfirstginproject 的 part 做 Web")
[void]$sb.AppendLine("3. 再衔接 Operator / 运维平台方向")
[void]$sb.AppendLine("")
[IO.File]::WriteAllText((Join-Path $goBlog "golang-01-overview.md"), $sb.ToString(), $utf8)

$ginRoot = Join-Path $goSrc "2-走进Golang\代码\myfirstginproject"
$order = 1
if (Test-Path -LiteralPath $ginRoot) {
  $parts = Get-ChildItem -LiteralPath $ginRoot -Directory | Where-Object { $_.Name -match '^part\d+' } | Sort-Object Name
  foreach ($p in $parts) {
    $order++
    $gos = @(Get-ChildItem -LiteralPath $p.FullName -Recurse -Filter *.go -File -ErrorAction SilentlyContinue | Select-Object -First 6)
    $body = New-Object System.Text.StringBuilder
    [void]$body.AppendLine("---")
    [void]$body.AppendLine(("title: `"Gin 示例 {0} 要点`"" -f $p.Name))
    [void]$body.AppendLine('sidebarGroup: "Golang"')
    [void]$body.AppendLine(("shortTitle: `"{0:D2} {1}`"" -f $order, $p.Name))
    [void]$body.AppendLine("order: $order")
    [void]$body.AppendLine("date: 2026-08-13")
    [void]$body.AppendLine('category: "云原生"')
    [void]$body.AppendLine("tag:")
    [void]$body.AppendLine('  - "Golang"')
    [void]$body.AppendLine('  - "Gin"')
    [void]$body.AppendLine('  - "云原生"')
    [void]$body.AppendLine(("description: `"整理 myfirstginproject/{0} 源码要点。`"" -f $p.Name))
    [void]$body.AppendLine("---")
    [void]$body.AppendLine("")
    [void]$body.AppendLine(("> **Golang · 第 {0} 篇**" -f $order))
    [void]$body.AppendLine(">")
    [void]$body.AppendLine(("> 源码目录：``myfirstginproject/{0}``" -f $p.Name))
    [void]$body.AppendLine("")
    [void]$body.AppendLine("---")
    [void]$body.AppendLine("")
    [void]$body.AppendLine("## 说明")
    [void]$body.AppendLine("")
    [void]$body.AppendLine("本篇从课程示例工程提取可读片段，完整工程请在本地打开运行。")
    [void]$body.AppendLine("")
    [void]$body.AppendLine("## 源码摘录")
    [void]$body.AppendLine("")
    foreach ($g in $gos) {
      $code = [IO.File]::ReadAllText($g.FullName)
      if ($code.Length -gt 2200) { $code = $code.Substring(0,2200) + "`r`n// ... truncated ..." }
      $rel = $g.FullName.Substring($p.FullName.Length).TrimStart('\')
      [void]$body.AppendLine("### ``$rel``")
      [void]$body.AppendLine("")
      [void]$body.AppendLine('```go')
      [void]$body.AppendLine($code.TrimEnd())
      [void]$body.AppendLine('```')
      [void]$body.AppendLine("")
    }
    $fn = ("golang-{0:D2}-{1}.md" -f $order, $p.Name)
    [IO.File]::WriteAllText((Join-Path $goBlog $fn), $body.ToString(), $utf8)
  }
}

$rb = New-Object System.Text.StringBuilder
[void]$rb.AppendLine("---")
[void]$rb.AppendLine("title: Golang")
[void]$rb.AppendLine("index: false")
[void]$rb.AppendLine("icon: golang")
[void]$rb.AppendLine("article: false")
[void]$rb.AppendLine("---")
[void]$rb.AppendLine("")
[void]$rb.AppendLine("# Golang")
[void]$rb.AppendLine("")
[void]$rb.AppendLine("基于课程「Golang 开发入门精讲」可公开整理的内容（示例工程 + 学习路径）。")
[void]$rb.AppendLine("")
[void]$rb.AppendLine("## 文章目录")
[void]$rb.AppendLine("")
[void]$rb.AppendLine("<Catalog />")
[void]$rb.AppendLine("")
[IO.File]::WriteAllText((Join-Path $goBlog "README.md"), $rb.ToString(), $utf8)
Write-Host ("Golang count: {0}" -f @(Get-ChildItem $goBlog -Filter *.md | Where-Object { $_.Name -ne "README.md" }).Count)

# 5) sidebar json
$map = @{}
Get-ChildItem -LiteralPath $Src -Directory | ForEach-Object {
  $children = @(Get-ChildItem -LiteralPath $_.FullName -Filter *.md -File | Where-Object { $_.Name -ne "README.md" } | Sort-Object Name | ForEach-Object { [IO.Path]::GetFileNameWithoutExtension($_.Name) })
  $map[$_.Name] = $children
}
($map | ConvertTo-Json -Depth 6) | Set-Content "E:\MyGithub\langkemaoxin.github.io\scripts\sidebar-cloud-native.json" -Encoding UTF8
$map.GetEnumerator() | Sort-Object Name | ForEach-Object { Write-Host ("{0,4} {1}" -f $_.Value.Count, $_.Key) }