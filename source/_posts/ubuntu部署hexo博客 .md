---
title: ubuntu部署hexo博客
date: "2022-04-21 21:40:07"
type: Ubuntu,blog
description: 使用node和npv，在Ubuntu系统中安装hexo博客，并且使用Gitee来托管静态页面。
---
# 安装环境
## 1.1 安装nodejs和npm
`CTRL + ALT +T`  打开终端
```shell
sudo apt update 
sudo apt-get install nodejs           #安装nodejs
sudo apt-get install npm              #安装npm
#查看是否安装成功
node -v
npm  -v
```
![](https://gitee.com/hellohehe1/photo/raw/master/202211201656278.png)
安装成功即显示版本号

利用npm安装cnpm(国内的快一点)
```shell
npm install -g cnpm --registry=https://registry.npm.taobao.org
cnpm -v      #查看
```
## 1.2创建gitee仓库
新建一个仓库，路径路径必须是你的用户名（不是中文，可以在个人主页看到）
例如：我的用户名为hello ,仓库路径就为  hello.gitee.io 
仓库名也为 hello

## 1.3安装git
在终端中输入：
```shell
sudo apt-get install git                                                               #安装git
git config --global user.name  "xxx"
git config --global user.email  "你的邮箱地址"
ssh-keygen -C 'you email address@gmail.com' -t rsa                                    #创建密钥
cd ~/.ssh                                                                              #密钥的路径
gedit id_rsa.pub                                                                      #打开公钥，复制所有内容
```
	打开gitee->设置->ssh公钥
	把复制的内用粘贴进去。

在终端中输入
```shell
ssh -T git@git.oschina.net   #测试连接是否畅通
```
# 搭建hexo博客框架
`CTRL + ALT +T`  打开终端
```shell
sudo su                      #切换到root用户
cnpm install  -g hexo-cli              #安装hexo
hexo -v                    #验证
```
![](https://gitee.com/hellohehe1/photo/raw/master/202211201656279.png)

```shell
pwd                #查看当前路径
mkdir  blog      #创建blog文件夹，后续出现错误，删掉文件夹重新开始
cd blog/         #进入blog目录下
sudo hexo init      #初始化博客
hexo s              #本地启动
```
`CTRL + C` 关闭
![](https://gitee.com/hellohehe1/photo/raw/master/202211201656280.png)

```shell
hexo n "我的博客"    #创建新的博客
```
![hexo n](https://gitee.com/hellohehe1/photo/raw/master/202211201656281.png)
```shell
pwd
cd source/_posts/         #进入到刚才创建的博客的目录
ls                                             #列出目录下的文件
vim 我的博客.md             #用vim打开我的博客
```
![vim](https://gitee.com/hellohehe1/photo/raw/master/202211201656282.png)
![vim](https://gitee.com/hellohehe1/photo/raw/master/202211201656283.png)

```shell
# 以及目录
## 二级目录            #后有空格
--- 分割线
按ESC键 输  ：wq   #保存退出（包括：）
```

```shell
cd ../..                                      #退回到blog目录
hexo clean                            #清理一下
hexo g                                     #生成
hexo s                                     #本地启动
```
# 推到gitee上
在blog目录下
```shell
cnpm install --save hexo-deployer-git 
 ls
 vim _config.yml
```
![git](https://gitee.com/hellohehe1/photo/raw/master/202211201656284.png)
改为

```shell
type: git                                                     #每个：后都有空格
repo: 你创建的仓库地址
branch: master
按ESC键 输 ：wq
hexo d                                                          #部署到gitee上，可能会提示你输入gitee账号和密码
```
去gitee的仓库  ->  服务->gitee pages             #申请，然后点击更新
![gritrr](https://gitee.com/hellohehe1/photo/raw/master/202211201656285.png)
访问即可






# 参考

[codesheep](https://www.bilibili.com/video/BV1Yb411a7ty?spm_id_from=333.337.search-card.all.click "codesheep")
