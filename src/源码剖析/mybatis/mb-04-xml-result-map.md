---
title: "04-MyBatis基于XML的详细使用——高级结果映射"
sidebarGroup: "MyBatis"
shortTitle: "04-MyBatis基于XML的详细使用——高级结果映射"
order: 4
date: 2026-08-09
category: "源码剖析"
tag:
  - "MyBatis"
description: "04-MyBatis基于XML的详细使用——高级结果映射"
---

> 来源：[04-MyBatis基于XML的详细使用——高级结果映射](https://share.note.youdao.com/ynoteshare/index.html?id=5d41fd41d970f1af9185ea2ec0647b64&type=notebook#/735C4CF2879944A99F5ED8DFF3AC52FD)

## 1、联合查询

emp.java

```java
package cn.tulingxueyuan.pojo;

import java.time.LocalDate;

/***
 * @Author 徐庶   QQ:1092002729
 * @Slogan 致敬大师，致敬未来的你
 */
public class Emp {
    private Integer id;
    private String username;
    private LocalDate createDate;
    private deptId deptId;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public LocalDate getCreateDate() {
        return createDate;
    }

    public void setCreateDate(LocalDate createDate) {
        this.createDate = createDate;
    }

    public Integer getDeptId() {
        return dept;
    }

    public void setDeptId(Integer deptId) {
        this.dept = dept;
    }

    @Override
    public String toString() {
        return "Emp{" +
                "id=" + id +
                ", username='" + username + '\'' +
                ", createDate=" + createDate +
                ", deptId=" + deptId+
                '}';
    }

}
```

EmpMapper.xml

```xml
<!-- 实现表联结查询的方式：  可以映射: DTO -->
<resultMap id="QueryEmp_Map" type="QueryEmpDTO">
    <id column="e_id" property="id"></id>
    <result column="user_name" property="username"></result>
    <result column="d_id" property="deptId"></result>
    <result column="dept_name" property="deptName"></result>
</resultMap>

<select id="QueryEmp"  resultMap="QueryEmp_Map">
    select t1.id as e_id,t1.user_name,t2.id as d_id,t2.dept_name from emp t1
    INNER JOIN dept t2 on t1.dept_id=t2.id
    where t1.id=#{id}
</select>

<!-- 实现表联结查询的方式：  可以映射map -->
<resultMap id="QueryEmp_Map" type="map">
    <id column="e_id" property="id"></id>
    <result column="user_name" property="username"></result>
    <result column="d_id" property="deptId"></result>
    <result column="dept_name" property="deptName"></result>
</resultMap>

<select id="QueryEmp"  resultMap="QueryEmp_Map">
    select t1.id as e_id,t1.user_name,t2.id as d_id,t2.dept_name from emp t1
    INNER JOIN dept t2 on t1.dept_id=t2.id
    where t1.id=#{id}
</select>
```

QueryEmpDTO

```java
package cn.tulingxueyuan.pojo;

/***
 * @Author 徐庶   QQ:1092002729
 * @Slogan 致敬大师，致敬未来的你
 */
public class QueryEmpDTO {

    private String deptName;
    private Integer deptId;
    private Integer id;
    private String username;

    public String getDeptName() {
        return deptName;
    }

    public void setDeptName(String deptName) {
        this.deptName = deptName;
    }

    public Integer getDeptId() {
        return deptId;
    }

    public void setDeptId(Integer deptId) {
        this.deptId = deptId;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    @Override
    public String toString() {
        return "QueryEmpDTO{" +
                "deptName='" + deptName + '\'' +
                ", deptId=" + deptId +
                ", id=" + id +
                ", username='" + username + '\'' +
                '}';
    }
}
```

Test

```java
  /**
 * 徐庶老师实际开发中的实现方式
 */
@Test
public void test01() {
    try(SqlSession sqlSession = sqlSessionFactory.openSession()){
        // Mybatis在getMapper就会给我们创建jdk动态代理
        EmpMapper mapper = sqlSession.getMapper(EmpMapper.class);
        QueryEmpDTO dto = mapper.QueryEmp(4);
        System.out.println(dto);
    }
}
```

## 2、嵌套结果

### 2.1多对一

EmpMapper.xml

```xml
<!--嵌套结果   多 对 一  -->
<resultMap id="QueryEmp_Map2" type="Emp">
    <id column="e_id" property="id"></id>
    <result column="user_name" property="username"></result>
    <!--
    association 实现多对一中的  “一”
        property 指定对象中的嵌套对象属性
    -->
    <association property="dept">
        <id column="d_id" property="id"></id>
        <id column="dept_name" property="deptName"></id>
    </association>
</resultMap>

<select id="QueryEmp2"  resultMap="QueryEmp_Map2">
    select t1.id as e_id,t1.user_name,t2.id as d_id,t2.dept_name from emp t1
    INNER JOIN dept t2 on t1.dept_id=t2.id
    where t1.id=#{id}
</select>
```

2.2一对多

```xml
    <!-- 嵌套结果： 一对多  查询部门及所有员工 -->
<resultMap id="SelectDeptAndEmpsMap" type="Dept">
    <id column="d_id"  property="id"></id>
    <id column="dept_name"  property="deptName"></id>
    <!--
    <collection  映射一对多中的 “多”
        property 指定需要映射的“多”的属性，一般声明为List
        ofType  需要指定list的类型
    -->
    <collection property="emps" ofType="Emp" >
        <id column="e_id" property="id"></id>
        <result column="user_name" property="username"></result>
        <result column="create_date" property="createDate"></result>
    </collection>
</resultMap>

<select id="SelectDeptAndEmps" resultMap="SelectDeptAndEmpsMap">
    select t1.id as d_id,t1.dept_name,t2.id e_id,t2.user_name,t2.create_date from dept t1
    LEFT JOIN emp t2 on t1.id=t2.dept_id
    where t1.id=#{id}
</select>
```

Emp.java

```java
package cn.tulingxueyuan.pojo;

import java.time.LocalDate;

/***
 * @Author 徐庶   QQ:1092002729
 * @Slogan 致敬大师，致敬未来的你
 */
public class Emp {
    private Integer id;
    private String username;
    private LocalDate createDate;
    private Dept dept;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public LocalDate getCreateDate() {
        return createDate;
    }

    public void setCreateDate(LocalDate createDate) {
        this.createDate = createDate;
    }

    public Dept getDept() {
        return dept;
    }

    public void setDept(Dept dept) {
        this.dept = dept;
    }

    @Override
    public String toString() {
        return "Emp{" +
                "id=" + id +
                ", username='" + username + '\'' +
                ", createDate=" + createDate +
                ", dept=" + dept +
                '}';
    }

}
```

Dept.java:

```java
package cn.tulingxueyuan.pojo;

import java.util.List;

/***
 * @Author 徐庶   QQ:1092002729
 * @Slogan 致敬大师，致敬未来的你
 */
public class Dept {
    private Integer id;
    private String deptName;
    private List<Emp> emps;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getDeptName() {
        return deptName;
    }

    public void setDeptName(String deptName) {
        this.deptName = deptName;
    }

    public List<Emp> getEmps() {
        return emps;
    }

    public void setEmps(List<Emp> emps) {
        this.emps = emps;
    }

    @Override
    public String toString() {
        return "Dept{" +
                "id=" + id +
                ", deptName='" + deptName + '\'' +
                ", emps=" + emps +
                '}';
    }
}
```

EmpMapper.java:

```java
package cn.tulingxueyuan.mapper;

import cn.tulingxueyuan.pojo.Emp;
import cn.tulingxueyuan.pojo.QueryEmpDTO;

import java.util.Map;

/***
 * @Author 徐庶   QQ:1092002729
 * @Slogan 致敬大师，致敬未来的你
  */
public interface EmpMapper {

    /*徐庶老师实际开发中的实现方式*/
    QueryEmpDTO QueryEmp(Integer id);

    /*实用嵌套结果实现联合查询  多对一 */
    Emp QueryEmp2(Integer id);

    /*实用嵌套查询实现联合查询  多对一 */
    Emp QueryEmp3(Integer id);
}
```

DeptMapper.java:

```java
package cn.tulingxueyuan.mapper;

import cn.tulingxueyuan.pojo.Dept;

/***
 * @Author 徐庶   QQ:1092002729
 * @Slogan 致敬大师，致敬未来的你
  */
public interface DeptMapper {
    //嵌套查询： 一对多   使用部门id查询员工
   Dept SelectDeptAndEmps(Integer id);

   // 嵌套查询（异步查询）： 一对多  查询部门及所有员工
    Dept SelectDeptAndEmps2(Integer id);
}
```

## 3、嵌套查询

在上述逻辑的查询中，是由我们自己来完成sql语句的关联查询的，那么，我们能让mybatis帮我们实现自动的关联查询吗?

### 3.2、多对一

EmpMapper.xml：

```xml
<!--嵌套查询（分步查询）   多 对 一
  联合查询和分步查询区别：   性能区别不大
                            分部查询支持 懒加载（延迟加载）
   需要设置懒加载，一定要使用嵌套查询的。
   要启动懒加载可以在全局配置文件中设置 lazyLoadingEnabled=true
   还可以单独为某个分步查询设置立即加载 <association fetchType="eager"
  -->
<resultMap id="QueryEmp_Map3" type="Emp">
    <id column="id" property="id"></id>
    <result column="user_name" property="username"></result>
    <!-- association 实现多对一中的  “一”
        property 指定对象中的嵌套对象属性
        column  指定将哪个字段传到分步查询中
        select 指定分步查询的 命名空间+ID
        以上3个属性是实现分步查询必须的属性
        fetchType 可选， eager|lazy   eager立即加载   lazy跟随全局配置文件中的lazyLoadingEnabled
     -->
    <association property="dept"    column="dept_id"  select="cn.tulingxueyuan.mapper.DeptMapper.SelectDept">
    </association>
</resultMap>

<select id="QueryEmp3"  resultMap="QueryEmp_Map3">
   select  * from emp where id=#{id}
</select>
```

DeptMapper.xml

```xml
<!-- 根据部门id查询部门-->
<select id="SelectDept" resultType="dept">
    SELECT * FROM dept where id=#{id}
</select>
```

### 3.2、一对多

DeptMapper.xml

```xml
<!-- 嵌套查询（异步查询）： 一对多  查询部门及所有员工 -->
<resultMap id="SelectDeptAndEmpsMap2" type="Dept">
    <id column="d_id"  property="id"></id>
    <id column="dept_name"  property="deptName"></id>
    <!--
    <collection  映射一对多中的 “多”
        property 指定需要映射的“多”的属性，一般声明为List
        ofType  需要指定list的类型
        column 需要将当前查询的字段传递到异步查询的参数
        select 指定异步查询
    -->
    <collection property="emps" ofType="Emp" column="id" select="cn.tulingxueyuan.mapper.EmpMapper.SelectEmpByDeptId" >
    </collection>
</resultMap>

<select id="SelectDeptAndEmps2" resultMap="SelectDeptAndEmpsMap2">
    SELECT * FROM dept where id=#{id}
</select>
```

EmpMapper.xml

```xml
<!-- 根据部门id所有员工 -->
<select id="SelectEmpByDeptId"  resultType="emp">
    select  * from emp where dept_id=#{id}
</select>
```

Emp.java

```java
package cn.tulingxueyuan.pojo;

import java.time.LocalDate;

/***
 * @Author 徐庶   QQ:1092002729
 * @Slogan 致敬大师，致敬未来的你
 */
public class Emp {
    private Integer id;
    private String username;
    private LocalDate createDate;
    private Dept dept;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public LocalDate getCreateDate() {
        return createDate;
    }

    public void setCreateDate(LocalDate createDate) {
        this.createDate = createDate;
    }

    public Dept getDept() {
        return dept;
    }

    public void setDept(Dept dept) {
        this.dept = dept;
    }

    @Override
    public String toString() {
        return "Emp{" +
                "id=" + id +
                ", username='" + username + '\'' +
                ", createDate=" + createDate +
                ", dept=" + dept +
                '}';
    }

}
```

Dept.java:

```java
package cn.tulingxueyuan.pojo;

import java.util.List;

/***
 * @Author 徐庶   QQ:1092002729
 * @Slogan 致敬大师，致敬未来的你
 */
public class Dept {
    private Integer id;
    private String deptName;
    private List<Emp> emps;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getDeptName() {
        return deptName;
    }

    public void setDeptName(String deptName) {
        this.deptName = deptName;
    }

    public List<Emp> getEmps() {
        return emps;
    }

    public void setEmps(List<Emp> emps) {
        this.emps = emps;
    }

    @Override
    public String toString() {
        return "Dept{" +
                "id=" + id +
                ", deptName='" + deptName + '\'' +
                ", emps=" + emps +
                '}';
    }
}
```

EmpMapper.java:

```java
package cn.tulingxueyuan.mapper;

import cn.tulingxueyuan.pojo.Emp;
import cn.tulingxueyuan.pojo.QueryEmpDTO;

import java.util.Map;

/***
 * @Author 徐庶   QQ:1092002729
 * @Slogan 致敬大师，致敬未来的你
  */
public interface EmpMapper {

    /*徐庶老师实际开发中的实现方式*/
    QueryEmpDTO QueryEmp(Integer id);

    /*实用嵌套结果实现联合查询  多对一 */
    Emp QueryEmp2(Integer id);

    /*实用嵌套查询实现联合查询  多对一 */
    Emp QueryEmp3(Integer id);
}
```

DeptMapper.java:

```java
package cn.tulingxueyuan.mapper;

import cn.tulingxueyuan.pojo.Dept;

/***
 * @Author 徐庶   QQ:1092002729
 * @Slogan 致敬大师，致敬未来的你
  */
public interface DeptMapper {
    //嵌套查询： 一对多   使用部门id查询员工
   Dept SelectDeptAndEmps(Integer id);

   // 嵌套查询（异步查询）： 一对多  查询部门及所有员工
    Dept SelectDeptAndEmps2(Integer id);
}
```

## 4、延迟查询

当我们在进行表关联的时候，有可能在查询结果的时候不需要关联对象的属性值，那么此时可以通过延迟加载来实现功能。在全局配置文件中添加如下属性

mybatis-config.xml

```java
<!-- 开启延迟加载，所有分步查询都是懒加载 （默认是立即加载）-->
<setting name="lazyLoadingEnabled" value="true"/>
<!--当开启式， 使用pojo中任意属性都会加载延迟查询 ,默认是false
<setting name="aggressiveLazyLoading" value="false"/>-->
<!--设置对象的哪些方法调用会加载延迟查询   默认：equals,clone,hashCode,toString-->
<setting name="lazyLoadTriggerMethods" value=""/>
```

如果设置了全局加载，但是希望在某一个sql语句查询的时候不使用延时策略，可以添加fetchType下属性：

```java
   <association property="dept" fetchType="eager"  column="dept_id"  select="cn.tulingxueyuan.mapper.DeptMapper.SelectDept">
    </association>
```

## 5、总结

![image](/源码剖析/mybatis/mb-04-xml-result-map/img-001.png)

三种关联guan关系都有两种关联查询的方式，嵌套查询，嵌套结果

*Mybatis的yanc延迟加载配置

在全局配置文件中加入下面代码

```xml
<settings>
<setting name=”lazyLoadingEnabled” value=”true” />
<setting name=”aggressiveLazyLoading” value=”false”/>
</settings>
```

在映射文件中,`<association>`元素和`<collection>`元素中都已默认配置了延迟加载属性,即默认属性fetchType=”lazy”（属性fetchType=”eager”表示立即加载）,所以在配置文件中开启延迟加载后,无需在映射文件中再做配置

## 1.一对一

使用`<association>`元素进行一对一关联映射非常简单,只需要参考如下两种示例配置即可

![image](/源码剖析/mybatis/mb-04-xml-result-map/img-002.png)

## 2.一对多

`<resultMap>`元素中,包含了一个`<collection>`子元素,MyBatis就是通过该元素来处理一对多关联关系的

`<collection>`子元素的属性大部分与`<association>`元素相同,但其还包含一个特殊属性–ofType

ofType属性与javaType属性对应,它用于指定实体对象中集合类属性所包含的元素类型。

`<collection >`元素的使用也非常简单,同样可以参考如下两种示例进行配置,具体代码如下:

![image](/源码剖析/mybatis/mb-04-xml-result-map/img-003.png)

3.多对多

多对多的关联关系查询,同样可以使用前面介绍的`<collection >`元素进行处理（其用法和一对多关联关系查询语句用法基本相同）
